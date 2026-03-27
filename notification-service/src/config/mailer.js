import nodemailer from "nodemailer";

// ── Create reusable transporter ───────────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Connection pool — reuse SMTP connections instead of opening a new one per email
    pool:           true,
    maxConnections: 5,
    maxMessages:    100,
  });

let transporter = createTransporter();

// ── Verify connection on startup ──────────────────────────────────────────────
export const verifyMailer = async () => {
  try {
    await transporter.verify();
    console.log("✅ SMTP mailer connected");
  } catch (err) {
    console.error("❌ SMTP connection failed:", err.message);
    console.warn("   Emails will fail until SMTP is fixed — check your .env");
    // Don't exit — service can still consume events, just can't send emails
  }
};

// ── Send email with retry ─────────────────────────────────────────────────────
export const sendMail = async ({ to, subject, html, attachments = [] }, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const info = await transporter.sendMail({
        from:    process.env.EMAIL_FROM || "InvoiceHive <noreply@invoicehive.io>",
        to,
        subject,
        html,
        attachments,
      });

      console.log(`✉️  Email sent to ${to} — Message ID: ${info.messageId}`);
      return info;
    } catch (err) {
      if (attempt === retries) {
        console.error(`❌ Email to ${to} failed after ${retries + 1} attempts:`, err.message);
        throw err;
      }
      const wait = (attempt + 1) * 1000;
      console.warn(`⚠️  Email attempt ${attempt + 1} failed — retrying in ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
};