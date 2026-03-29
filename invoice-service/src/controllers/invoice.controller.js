import mongoose from "mongoose";
import axios from "axios";
import Invoice from "../models/invoice.model.js";
import { generateInvoicePDF } from "../utils/pdf.utils.js";
import { uploadPDF, getPresignedUrl } from "../config/minio.js";
import { publish } from "../config/rabbitmq.js";

// ── POST /invoices ────────────────────────────────────────────────────────────
export const createInvoice = async (req, res, next) => {
  try {
    const { clientId, fromDetails, ...rest } = req.body;

    // Auto-generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber(req.userId);

    // Fetch client details to snapshot onto the invoice
    // If client service is down, we still create the invoice with what we have
    let toDetails = {};
    try {
      const { data } = await axios.get(
        `${process.env.CLIENT_SERVICE_URL}/clients/${clientId}`,
        { headers: { Authorization: req.headers.authorization }, timeout: 3000 }
      );
      const c = data.data;
      toDetails = {
        name:    c.name,
        company: c.company || "",
        email:   c.email,
        address: [c.address?.street, c.address?.city, c.address?.country]
          .filter(Boolean).join(", "),
      };
    } catch (err) {
      console.warn("Could not fetch client details:", err.message);
    }

    const invoice = await Invoice.create({
      ...rest,
      clientId,
      userId:        req.userId,
      invoiceNumber,
      fromDetails:   fromDetails || {},
      toDetails,
      status:        "draft",
    });

    res.status(201).json({
      success: true,
      message: "Invoice created",
      data:    invoice,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /invoices ─────────────────────────────────────────────────────────────
export const listInvoices = async (req, res, next) => {
  try {
    const { page, limit, status, clientId, search, startDate, endDate, sortBy, sortOrder } = req.query;

    const filter = { userId: req.userId };

    if (status)   filter.status   = status;
    if (clientId) filter.clientId = clientId;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate)   filter.createdAt.$lte = endDate;
    }

    if (search) {
      filter.$or = [
        { invoiceNumber:    { $regex: search, $options: "i" } },
        { "toDetails.name": { $regex: search, $options: "i" } },
        { "toDetails.company": { $regex: search, $options: "i" } },
      ];
    }

    const sort  = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    const skip  = (page - 1) * limit;
    const total = await Invoice.countDocuments(filter);

    const invoices = await Invoice.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data:    invoices,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /invoices/stats ───────────────────────────────────────────────────────
export const getStats = async (req, res, next) => {
  try {
    const userId = req.userId;

    const [summary] = await Invoice.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id:            null,
          totalRevenue:   { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] } },
          totalOutstanding: { $sum: { $cond: [{ $in: ["$status", ["sent", "viewed", "overdue"]] }, "$total", 0] } },
          totalOverdue:   { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, "$total", 0] } },
          countPaid:      { $sum: { $cond: [{ $eq: ["$status", "paid"] }, 1, 0] } },
          countOverdue:   { $sum: { $cond: [{ $eq: ["$status", "overdue"] }, 1, 0] } },
          countDraft:     { $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] } },
          countSent:      { $sum: { $cond: [{ $in: ["$status", ["sent", "viewed"]] }, 1, 0] } },
          totalCount:     { $sum: 1 },
        },
      },
    ]);

    // Monthly revenue for chart (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyRevenue = await Invoice.aggregate([
      { $match: { userId, status: "paid", paidAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id:   { $dateToString: { format: "%Y-%m", date: "$paidAt" } },
          total: { $sum: "$total" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        summary: summary || {
          totalRevenue: 0, totalOutstanding: 0, totalOverdue: 0,
          countPaid: 0, countOverdue: 0, countDraft: 0, countSent: 0, totalCount: 0,
        },
        monthlyRevenue,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /invoices/:id ─────────────────────────────────────────────────────────
export const getInvoice = async (req, res, next) => {
  try {
    const invoice = await findInvoiceOrFail(req.params.id, req.userId);
    if (!invoice) return invoiceNotFound(res);

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

// ── PUT /invoices/:id ─────────────────────────────────────────────────────────
// Only draft invoices can be edited
export const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await findInvoiceOrFail(req.params.id, req.userId);
    if (!invoice) return invoiceNotFound(res);

    if (invoice.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a ${invoice.status} invoice — only drafts can be modified`,
      });
    }

    Object.assign(invoice, req.body);
    await invoice.save(); // Pre-save hook recalculates totals

    res.json({ success: true, message: "Invoice updated", data: invoice });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /invoices/:id ──────────────────────────────────────────────────────
// Only drafts can be deleted — sent/paid invoices are cancelled instead
export const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await findInvoiceOrFail(req.params.id, req.userId);
    if (!invoice) return invoiceNotFound(res);

    if (invoice.status === "paid") {
      return res.status(400).json({
        success: false,
        message: "Paid invoices cannot be deleted",
      });
    }

    if (invoice.status === "draft" || invoice.status === "cancelled") {
      await Invoice.findByIdAndDelete(invoice._id);
      return res.json({ success: true, message: "Invoice deleted permanently" });
    }

    // For sent/viewed/overdue — cancel instead of delete
    if (["sent", "viewed", "overdue"].includes(invoice.status)) {
      invoice.status = "cancelled";
      await invoice.save();

      await publish("invoice.cancelled", {
        invoiceId: invoice._id,
        userId:    invoice.userId,
        clientId:  invoice.clientId,
        total:     invoice.total,
      });

      return res.json({ success: true, message: "Invoice cancelled" });
    }
  } catch (err) {
    next(err);
  }
};

// ── POST /invoices/:id/send ───────────────────────────────────────────────────
// 1. Generate PDF
// 2. Upload to MinIO
// 3. Update status to "sent"
// 4. Publish invoice.sent event → Notification Service emails the client
export const sendInvoice = async (req, res, next) => {
  try {
    const invoice = await findInvoiceOrFail(req.params.id, req.userId);
    if (!invoice) return invoiceNotFound(res);

    if (!["draft", "overdue"].includes(invoice.status)) {
      return res.status(400).json({
        success: false,
        message: `Invoice is already ${invoice.status}`,
      });
    }

    // ── 1. Generate PDF ───────────────────────────────
    console.log(`Generating PDF for invoice ${invoice.invoiceNumber}...`);
    const pdfBuffer = await generateInvoicePDF(invoice);

    // ── 2. Upload to MinIO ────────────────────────────
    console.log(` Uploading PDF to MinIO...`);
    const pdfUrl = await uploadPDF(invoice.userId, invoice._id.toString(), pdfBuffer);

    // ── 3. Update invoice ─────────────────────────────
    invoice.status = "sent";
    invoice.sentAt = new Date();
    invoice.pdfUrl = pdfUrl;
    await invoice.save();

    // ── 4. Publish event → Notification Service ───────
const emailPdfUrl = await getPresignedUrl(invoice.userId, invoice._id.toString());
      await publish("invoice.sent", {
        invoiceId:     invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        userId:        invoice.userId,
        clientId:      invoice.clientId,
        clientEmail:   invoice.toDetails.email,
        clientName:    invoice.toDetails.name,
        total:         invoice.total,
        currency:      invoice.currency,
        dueDate:       invoice.dueDate,
        pdfUrl:        emailPdfUrl,
      paymentUrl:    invoice.razorpayPaymentLinkUrl,
      fromName:      invoice.fromDetails.name,
    });

    console.log(`Invoice ${invoice.invoiceNumber} sent`);

    res.json({
      success: true,
      message: `Invoice ${invoice.invoiceNumber} sent successfully`,
      data:    invoice,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /invoices/:id/download ────────────────────────────────────────────────
// Returns a presigned URL for downloading the PDF
export const downloadInvoice = async (req, res, next) => {
  try {
    const invoice = await findInvoiceOrFail(req.params.id, req.userId);
    if (!invoice) return invoiceNotFound(res);

    if (!invoice.pdfUrl) {
      // PDF not generated yet — generate on the fly (for preview)
      const pdfBuffer = await generateInvoicePDF(invoice);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${invoice.invoiceNumber}.pdf"`
      );
      return res.send(pdfBuffer);
    }

    // Get presigned URL from MinIO (expires in 1hr)
    const url = await getPresignedUrl(invoice.userId, invoice._id.toString());
    res.json({ success: true, url });
  } catch (err) {
    next(err);
  }
};

// ── POST /invoices/:id/mark-viewed ────────────────────────────────────────────
// Called when the client opens the payment page on the frontend
export const markViewed = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return invoiceNotFound(res);

    if (invoice.status === "sent") {
      invoice.status   = "viewed";
      invoice.viewedAt = new Date();
      await invoice.save();

      await publish("invoice.viewed", {
        invoiceId: invoice._id.toString(),
        userId:    invoice.userId,
        clientId:  invoice.clientId,
      });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ── POST /invoices/:id/mark-paid ──────────────────────────────────────────────
// Manual payment marking (for cash/bank transfer payments)
// razorpay payments are marked paid automatically via webhook in Payment Service
export const markPaid = async (req, res, next) => {
  try {
    const invoice = await findInvoiceOrFail(req.params.id, req.userId);
    if (!invoice) return invoiceNotFound(res);

    if (invoice.status === "paid") {
      return res.status(400).json({ success: false, message: "Invoice is already paid" });
    }

    invoice.status = "paid";
    invoice.paidAt = req.body.paidAt ? new Date(req.body.paidAt) : new Date();
    await invoice.save();

    await publish("invoice.paid", {
      invoiceId:     invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      userId:        invoice.userId,
      clientId:      invoice.clientId,
      clientName:    invoice.toDetails.name,
      amount:        invoice.total,
      currency:      invoice.currency,
      paidAt:        invoice.paidAt,
      method:        "manual",
    });

    await syncClientStats(invoice.clientId, invoice.userId, req.headers.authorization);

    res.json({ success: true, message: "Invoice marked as paid", data: invoice });
  } catch (err) {
    next(err);
  }
};

// ── INTERNAL: POST /internal/invoices/:id/razorpay-paid ─────────────────────────
// Called by Payment Service after razorpay webhook fires
export const razorpayWebhookPaid = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { razorpayPaymentId, amount } = req.body;

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return invoiceNotFound(res);
    if (invoice.status === "paid") {
      // Idempotency — Razorpay can fire the same webhook twice
      return res.json({ success: true, message: "Already paid — skipped" });
    }

    // 🚨 SECURITY FIX: Check if they actually paid the full amount!
    if (amount < invoice.total) {
      invoice.status = "partially_paid";
      console.warn(`Partial payment detected for invoice ${invoiceId}!`);
    } else {
      invoice.status = "paid";
    }

    invoice.paidAt             = new Date();
    invoice.razorpayPaymentId  = razorpayPaymentId;
    await invoice.save();

    await publish("invoice.paid", {
      invoiceId:     invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      userId:        invoice.userId,
      clientId:      invoice.clientId,
      clientName:    invoice.toDetails.name,
      amount:        invoice.total,
      currency:      invoice.currency,
      paidAt:        invoice.paidAt,
      method:        "razorpay",
    });

    await syncClientStats(invoice.clientId, invoice.userId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
// ── INTERNAL: Store Razorpay Payment Link on invoice ────────────────────────────
export const setPaymentLink = async (req, res, next) => {
  try {
    const { invoiceId } = req.params;
    const { razorpayOrderId, checkoutUrl } = req.body;

    await Invoice.findByIdAndUpdate(invoiceId, {
      razorpayOrderId: razorpayOrderId,
      razorpayPaymentLinkUrl: checkoutUrl,
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const findInvoiceOrFail = (id, userId) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Invoice.findOne({ _id: id, userId });
};

const invoiceNotFound = (res) =>
  res.status(404).json({ success: false, message: "Invoice not found" });

// Notify Client Service to recalculate this client's stats
const syncClientStats = async (clientId, userId, authHeader) => {
  try {
    // Aggregate current stats for this client
    const [stats] = await Invoice.aggregate([
      { $match: { clientId, userId } },
      {
        $group: {
          _id:              null,
          totalInvoiced:    { $sum: "$total" },
          totalPaid:        { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$total", 0] } },
          totalOutstanding: { $sum: { $cond: [{ $in: ["$status", ["sent", "viewed", "overdue"]] }, "$total", 0] } },
          invoiceCount:     { $sum: 1 },
          lastInvoicedAt:   { $max: "$createdAt" },
        },
      },
    ]);

    if (!stats) return;

    await axios.post(
      `${process.env.CLIENT_SERVICE_URL}/internal/clients/${clientId}/update-stats`,
      {
        totalInvoiced:    stats.totalInvoiced,
        totalPaid:        stats.totalPaid,
        totalOutstanding: stats.totalOutstanding,
        invoiceCount:     stats.invoiceCount,
        lastInvoicedAt:   stats.lastInvoicedAt,
      },
      {
        headers: { "x-internal-secret": process.env.INTERNAL_SECRET },
        timeout: 3000,
      }
    );
  } catch (err) {
    // Don't fail the main operation if stats sync fails
    console.warn("Client stats sync failed:", err.message);
  }
};