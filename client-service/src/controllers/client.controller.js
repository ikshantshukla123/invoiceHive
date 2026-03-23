import mongoose from "mongoose";
import Client from "../models/client.model.js";

// ── POST /clients ─────────────────────────────────────────────────────────────
export const createClient = async (req, res, next) => {
  try {
    const client = await Client.create({
      ...req.body,
      userId: req.userId, // from protect middleware
    });

    res.status(201).json({
      success: true,
      message: "Client created",
      data:    client.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /clients ──────────────────────────────────────────────────────────────
export const listClients = async (req, res, next) => {
  try {
    const {
      page, limit, search, currency,
      archived, sortBy, sortOrder,
    } = req.query;

    // ── Build filter ───────────────────────────────────
    const filter = {
      userId:     req.userId,
      isArchived: archived === "true", // default false — only show active clients
    };

    // Text search across name, company, email
    if (search) {
      filter.$or = [
        { name:    { $regex: search, $options: "i" } },
        { company: { $regex: search, $options: "i" } },
        { email:   { $regex: search, $options: "i" } },
      ];
    }

    if (currency) filter.currency = currency.toUpperCase();

    // ── Build sort ─────────────────────────────────────
    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // ── Pagination ─────────────────────────────────────
    const skip  = (page - 1) * limit;
    const total = await Client.countDocuments(filter);
    const pages = Math.ceil(total / limit);

    const clients = await Client.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(); // .lean() returns plain JS objects — faster than Mongoose docs for reads

    res.json({
      success: true,
      data: clients,
      pagination: {
        total,
        page,
        pages,
        limit,
        hasNext: page < pages,
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /clients/:id ──────────────────────────────────────────────────────────
export const getClient = async (req, res, next) => {
  try {
    const client = await findClientOrFail(req.params.id, req.userId);
    if (!client) return clientNotFound(res);

    res.json({ success: true, data: client.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// ── PUT /clients/:id ──────────────────────────────────────────────────────────
export const updateClient = async (req, res, next) => {
  try {
    const client = await findClientOrFail(req.params.id, req.userId);
    if (!client) return clientNotFound(res);

    // Merge updates — Object.assign keeps existing fields intact
    Object.assign(client, req.body);
    await client.save();

    res.json({
      success: true,
      message: "Client updated",
      data:    client.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /clients/:id ───────────────────────────────────────────────────────
// Soft delete — archives instead of destroying
// Hard delete is blocked because invoices still reference this client
export const archiveClient = async (req, res, next) => {
  try {
    const client = await findClientOrFail(req.params.id, req.userId);
    if (!client) return clientNotFound(res);

    if (client.isArchived) {
      return res.status(400).json({ success: false, message: "Client is already archived" });
    }

    client.isArchived = true;
    client.archivedAt = new Date();
    await client.save();

    res.json({ success: true, message: "Client archived" });
  } catch (err) {
    next(err);
  }
};

// ── POST /clients/:id/restore ─────────────────────────────────────────────────
export const restoreClient = async (req, res, next) => {
  try {
    // Need to look up including archived for this one
    const client = await Client.findOne({ _id: req.params.id, userId: req.userId });
    if (!client) return clientNotFound(res);

    if (!client.isArchived) {
      return res.status(400).json({ success: false, message: "Client is not archived" });
    }

    client.isArchived = false;
    client.archivedAt = null;
    await client.save();

    res.json({ success: true, message: "Client restored", data: client.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// ── GET /clients/stats ────────────────────────────────────────────────────────
// Summary numbers for the dashboard — total clients, top clients, outstanding
export const getStats = async (req, res, next) => {
  try {
    const [stats] = await Client.aggregate([
      { $match: { userId: req.userId, isArchived: false } },
      {
        $group: {
          _id:              null,
          totalClients:     { $sum: 1 },
          totalInvoiced:    { $sum: "$totalInvoiced" },
          totalPaid:        { $sum: "$totalPaid" },
          totalOutstanding: { $sum: "$totalOutstanding" },
        },
      },
    ]);

    // Top 5 clients by revenue
    const topClients = await Client.find({ userId: req.userId, isArchived: false })
      .sort({ totalPaid: -1 })
      .limit(5)
      .select("name company totalPaid totalInvoiced invoiceCount currency")
      .lean();

    // Clients with outstanding balance
    const withOutstanding = await Client.find({
      userId:           req.userId,
      isArchived:       false,
      totalOutstanding: { $gt: 0 },
    })
      .sort({ totalOutstanding: -1 })
      .select("name company email totalOutstanding currency lastInvoicedAt")
      .lean();

    res.json({
      success: true,
      data: {
        summary: stats || {
          totalClients: 0, totalInvoiced: 0, totalPaid: 0, totalOutstanding: 0,
        },
        topClients,
        withOutstanding,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── POST /clients/:id/contacts ────────────────────────────────────────────────
export const addContact = async (req, res, next) => {
  try {
    const client = await findClientOrFail(req.params.id, req.userId);
    if (!client) return clientNotFound(res);

    client.contacts.push(req.body);
    await client.save();

    const newContact = client.contacts[client.contacts.length - 1];
    res.status(201).json({
      success: true,
      message: "Contact added",
      data:    newContact,
    });
  } catch (err) {
    next(err);
  }
};

// ── DELETE /clients/:id/contacts/:contactId ───────────────────────────────────
export const removeContact = async (req, res, next) => {
  try {
    const client = await findClientOrFail(req.params.id, req.userId);
    if (!client) return clientNotFound(res);

    const contact = client.contacts.id(req.params.contactId);
    if (!contact) {
      return res.status(404).json({ success: false, message: "Contact not found" });
    }

    contact.deleteOne(); // Mongoose subdocument removal
    await client.save();

    res.json({ success: true, message: "Contact removed" });
  } catch (err) {
    next(err);
  }
};

// ── INTERNAL: POST /internal/clients/:id/update-stats ─────────────────────────
// Called by Invoice Service when an invoice is paid/created/deleted
// NOT exposed through Nginx — internal service-to-service only
export const updateClientStats = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const { totalInvoiced, totalPaid, totalOutstanding, invoiceCount, lastInvoicedAt } = req.body;

    // Validate it's a real ObjectId before querying
    if (!mongoose.isValidObjectId(clientId)) {
      return res.status(400).json({ success: false, message: "Invalid client ID" });
    }

    const client = await Client.findByIdAndUpdate(
      clientId,
      {
        $set: {
          totalInvoiced,
          totalPaid,
          totalOutstanding,
          invoiceCount,
          ...(lastInvoicedAt && { lastInvoicedAt }),
        },
      },
      { new: true }
    );

    if (!client) return clientNotFound(res);

    res.json({ success: true, message: "Client stats updated" });
  } catch (err) {
    next(err);
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Find a client that belongs to the requesting user — prevents accessing other users' data
const findClientOrFail = (id, userId) => {
  if (!mongoose.isValidObjectId(id)) return null;
  return Client.findOne({ _id: id, userId, isArchived: false });
};

const clientNotFound = (res) =>
  res.status(404).json({ success: false, message: "Client not found" });