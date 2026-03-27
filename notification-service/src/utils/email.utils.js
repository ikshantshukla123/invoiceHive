import { sendMail } from "../config/mailer.js";
import { renderTemplate } from "./template.utils.js";

const CLIENT_URL    = () => process.env.CLIENT_URL || "http://localhost:3000";
const DASHBOARD_URL = () => `${CLIENT_URL()}/dashboard`;

// ── Format currency for display ───────────────────────────────────────────────
const CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", GBP: "£", CAD: "CA$",
  AUD: "A$", INR: "₹", JPY: "¥", SGD: "S$", AED: "د.إ",
};

const formatAmount = (amount, currency) => {
  const sym = CURRENCY_SYMBOLS[currency?.toUpperCase()] || "";
  return `${sym}${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits:  2,
    maximumFractionDigits:  2,
  })}`;
};

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
};

// ── Welcome email ─────────────────────────────────────────────────────────────
export const sendWelcomeEmail = async ({ email, name }) => {
  const html = renderTemplate("welcome", {
    name,
    dashboardUrl: DASHBOARD_URL(),
  });

  await sendMail({
    to:      email,
    subject: `Welcome to InvoiceHive, ${name}!`,
    html,
  });
};

// ── Invoice sent — email to CLIENT with PDF attachment ────────────────────────
export const sendInvoiceSentEmail = async (data) => {
  const {
    clientEmail, clientName, fromName,
    invoiceNumber, total, currency,
    dueDate, pdfUrl, paymentUrl,
  } = data;

  const formattedAmount = formatAmount(total, currency);
  const formattedDue    = formatDate(dueDate);
  const isOverdue       = dueDate && new Date(dueDate) < new Date();

  const html = renderTemplate("invoice-sent", {
    clientName,
    fromName,
    invoiceNumber,
    amount:     formattedAmount,
    currency:   currency?.toUpperCase(),
    dueDate:    formattedDue,
    isOverdue,
    paymentUrl,
    pdfUrl,
  });

  // Build attachments array — attach PDF if URL provided
  // Note: we link to the PDF rather than downloading and re-attaching
  // for simplicity. For a real attachment, fetch the PDF buffer from MinIO first.
  await sendMail({
    to:      clientEmail,
    subject: `Invoice ${invoiceNumber} from ${fromName} — ${currency} ${formattedAmount}`,
    html,
  });

  console.log(`✉️  Invoice sent email delivered to ${clientEmail} [${invoiceNumber}]`);
};

// ── Payment received — email to FREELANCER ────────────────────────────────────
export const sendPaymentReceivedEmail = async (data) => {
  const {
    userId, clientName, invoiceNumber,
    amount, currency, paidAt,
    cardLast4, cardBrand,
    freelancerEmail, // fetched or passed from event
  } = data;

  if (!freelancerEmail) {
    console.warn(`⚠️  No freelancer email for payment notification [invoice: ${invoiceNumber}]`);
    return;
  }

  const formattedAmount = formatAmount(amount, currency);

  const html = renderTemplate("payment-received", {
    clientName,
    invoiceNumber,
    amount:       formattedAmount,
    currency:     currency?.toUpperCase(),
    paidAt:       formatDate(paidAt),
    cardLast4,
    cardBrand:    cardBrand
      ? cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1)
      : null,
    dashboardUrl: DASHBOARD_URL(),
  });

  await sendMail({
    to:      freelancerEmail,
    subject: `Payment received — ${currency} ${formattedAmount} from ${clientName}`,
    html,
  });

  console.log(`  Payment received email sent to ${freelancerEmail}`);
};

// ── Invoice overdue — reminder email to CLIENT ────────────────────────────────
export const sendOverdueReminderEmail = async (data) => {
  const {
    clientEmail, clientName, fromName,
    invoiceNumber, amount, currency,
    dueDate, daysOverdue, paymentUrl,
  } = data;

  if (!clientEmail) {
    console.warn(`  No client email for overdue reminder [${invoiceNumber}]`);
    return;
  }

  const formattedAmount = formatAmount(amount, currency);

  const html = renderTemplate("invoice-overdue", {
    clientName,
    fromName:      fromName || "Your service provider",
    invoiceNumber,
    amount:        formattedAmount,
    currency:      currency?.toUpperCase(),
    dueDate:       formatDate(dueDate),
    daysOverdue:   daysOverdue || 1,
    multipleDays:  (daysOverdue || 1) > 1,
    paymentUrl,
  });

  await sendMail({
    to:      clientEmail,
    subject: `Payment reminder — Invoice ${invoiceNumber} is ${daysOverdue} day(s) overdue`,
    html,
  });

  console.log(`✉️  Overdue reminder sent to ${clientEmail} [${invoiceNumber}]`);
};

// ── Password reset email ──────────────────────────────────────────────────────
export const sendPasswordResetEmail = async ({ email, name, resetToken }) => {
  const resetUrl = `${CLIENT_URL()}/reset-password?token=${resetToken}`;

  const html = renderTemplate("password-reset", {
    name,
    resetUrl,
  });

  await sendMail({
    to:      email,
    subject: "Reset your InvoiceHive password",
    html,
  });
};