import cron from "node-cron";
import Invoice from "../models/invoice.model.js";
import { publish } from "../config/rabbitmq.js";
import { getPresignedUrl } from "../config/minio.js";

// ── Runs every night at midnight ──────────────────────────────────────────────
// Finds all sent/viewed invoices past their due date and marks them overdue
// Then fires invoice.overdue events → Notification Service sends reminders

export const startOverdueCron = () => {
  // Cron syntax: "0 0 * * *" = at 00:00 every day
  // For testing, use "*/1 * * * *" (every minute)
  cron.schedule("0 0 * * *", async () => {
    console.log(`[${new Date().toISOString()}]  Running overdue invoice check...`);

    try {
      const now = new Date();

      // Find all invoices that are past due but not yet marked overdue
      const overdueInvoices = await Invoice.find({
        status:  { $in: ["sent", "viewed"] },
        dueDate: { $lt: now },
      });

      if (overdueInvoices.length === 0) {
        console.log(" No new overdue invoices found");
        return;
      }

      console.log(`  Found ${overdueInvoices.length} overdue invoice(s) — processing...`);

      // Process in batches to avoid hammering the DB + RabbitMQ
      const BATCH_SIZE = 50;
      for (let i = 0; i < overdueInvoices.length; i += BATCH_SIZE) {
        const batch = overdueInvoices.slice(i, i + BATCH_SIZE);

        // Bulk update status to overdue
        const ids = batch.map((inv) => inv._id);
        await Invoice.updateMany(
          { _id: { $in: ids } },
          { $set: { status: "overdue" } }
        );

        // Fire events for each — Notification Service will send reminder emails
        for (const invoice of batch) {
            const presignedPdfUrl = await getPresignedUrl(invoice.userId, invoice._id.toString());
            await publish("invoice.overdue", {
              invoiceId:     invoice._id.toString(),
              invoiceNumber: invoice.invoiceNumber,
              userId:        invoice.userId,
              clientId:      invoice.clientId,
              clientEmail:   invoice.toDetails?.email,
              clientName:    invoice.toDetails?.name,
              amount:        invoice.total,
              currency:      invoice.currency,
              dueDate:       invoice.dueDate,
              pdfUrl:        presignedPdfUrl,
            paymentUrl:    invoice.razorpayPaymentLinkUrl,
            daysOverdue:   Math.floor((now - invoice.dueDate) / (1000 * 60 * 60 * 24)),
          });
        }
      }

      console.log(`✅ Marked ${overdueInvoices.length} invoice(s) as overdue`);
    } catch (err) {
      console.error("❌ Overdue cron failed:", err.message);
      // Don't crash the process — just log and wait for next run
    }
  });

  console.log("⏰ Overdue invoice cron scheduled (daily at midnight)");
};