import puppeteer from "puppeteer";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Load and compile template once at startup ─────────────────────────────────
const templatePath = path.join(__dirname, "../templates/invoice.hbs");
const templateSource = fs.readFileSync(templatePath, "utf8");

// ── Register Handlebars helpers ───────────────────────────────────────────────

// Format numbers with 2 decimal places: 1234.5 → "1,234.50"
Handlebars.registerHelper("formatNumber", (num) => {
  if (num === undefined || num === null) return "0.00";
  return Number(num).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
});

// Currency symbol map
const CURRENCY_SYMBOLS = {
  USD: "$", EUR: "€", GBP: "£", CAD: "CA$",
  AUD: "A$", INR: "₹", JPY: "¥", SGD: "S$", AED: "د.إ",
};

Handlebars.registerHelper("currencySymbol", function () {
  return CURRENCY_SYMBOLS[this.currency] || "$";
});

const compiledTemplate = Handlebars.compile(templateSource);

// ── Currency symbol helper (used in template context) ─────────────────────────
const getCurrencySymbol = (currency) => CURRENCY_SYMBOLS[currency] || "$";

// ── Format date for display ───────────────────────────────────────────────────
const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
};

// ── Main PDF generation function ──────────────────────────────────────────────
export const generateInvoicePDF = async (invoice) => {
  // Build template context
  const context = {
    ...invoice.toObject ? invoice.toObject() : invoice,
    issuedDateFormatted: formatDate(invoice.issuedDate),
    dueDateFormatted:    formatDate(invoice.dueDate),
    paidAtFormatted:     formatDate(invoice.paidAt),
    isOverdue:           invoice.dueDate < new Date() && !["paid", "cancelled"].includes(invoice.status),
    currencySymbol:      getCurrencySymbol(invoice.currency),
  };

  // Render HTML from template
  const html = compiledTemplate(context);

  // Launch Puppeteer
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage", // Critical in Docker — avoids /dev/shm overflow
      "--disable-gpu",
    ],
  });

  try {
    const page = await browser.newPage();

    // Set HTML content — waitUntil: networkidle0 ensures all resources load
    await page.setContent(html, { waitUntil: "networkidle0" });

    // Generate PDF buffer
    const pdfBuffer = await page.pdf({
      format:          "A4",
      printBackground: true, // Include background colors
      margin: {
        top:    "20mm",
        bottom: "20mm",
        left:   "15mm",
        right:  "15mm",
      },
    });

    return pdfBuffer;
  } finally {
    // Always close browser — memory leak if you forget this
    await browser.close();
  }
};