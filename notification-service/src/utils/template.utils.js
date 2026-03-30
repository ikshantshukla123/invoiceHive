import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "../templates");

// ── Cache compiled templates — compiling is expensive ────────────────────────
const cache = new Map();

const loadTemplate = (name) => {
  if (cache.has(name)) return cache.get(name);
  const filePath = path.join(TEMPLATES_DIR, `${name}.hbs`);
  const source   = fs.readFileSync(filePath, "utf8");
  const compiled = Handlebars.compile(source);
  cache.set(name, compiled);
  return compiled;
};

// ── Register Handlebars helpers ───────────────────────────────────────────────
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("gt", (a, b) => a > b);

Handlebars.registerHelper("formatCurrency", (amount, currency) => {
  if (amount === undefined || amount === null) return "0.00";
  const symbol = { USD: "$", EUR: "€", GBP: "£", INR: "₹", CAD: "CA$" }[currency] || "";
  return `${symbol}${Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
});

Handlebars.registerHelper("formatDate", (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
});

// ── Render a template with context ────────────────────────────────────────────
// Wraps content template inside the base layout
export const renderTemplate = (templateName, context) => {
  const baseTemplate    = loadTemplate("base");
  const contentTemplate = loadTemplate(templateName);

  // First render the content template
  const content = contentTemplate({
    ...context,
    clientUrl: process.env.CLIENT_URL || "http://localhost",
  });

  // Then inject content into the base layout
  return baseTemplate({
    ...context,
    content,
    clientUrl: process.env.CLIENT_URL || "http://localhost",
  });
};