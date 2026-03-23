import { z } from "zod";

// ── Reusable sub-schemas ──────────────────────────────────────────────────────

const addressSchema = z.object({
  street:  z.string().trim().max(200).optional().default(""),
  city:    z.string().trim().max(100).optional().default(""),
  state:   z.string().trim().max(100).optional().default(""),
  country: z.string().trim().max(100).optional().default(""),
  zip:     z.string().trim().max(20).optional().default(""),
}).optional().default({});

const contactSchema = z.object({
  name:  z.string().trim().min(1, "Contact name is required").max(100),
  email: z.string().email("Invalid contact email").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().default(""),
  role:  z.string().trim().max(100).optional().default(""),
});

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "SGD", "AED"];
const VALID_PAYMENT_TERMS  = [0, 7, 14, 15, 30, 45, 60, 90];

// ── Create client ─────────────────────────────────────────────────────────────
export const createClientSchema = z.object({
  name: z
    .string({ required_error: "Client name is required" })
    .trim()
    .min(1, "Name cannot be empty")
    .max(100, "Name too long"),

  company: z.string().trim().max(200).optional().default(""),

  email: z
    .string({ required_error: "Client email is required" })
    .email("Invalid email address")
    .toLowerCase(),

  phone:   z.string().trim().max(30).optional().default(""),
  website: z.string().trim().url("Invalid website URL").optional().or(z.literal("")).default(""),

  address:  addressSchema,
  contacts: z.array(contactSchema).optional().default([]),

  currency: z
    .string()
    .toUpperCase()
    .refine((v) => SUPPORTED_CURRENCIES.includes(v), {
      message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(", ")}`,
    })
    .optional()
    .default("USD"),

  paymentTerms: z
    .number()
    .refine((v) => VALID_PAYMENT_TERMS.includes(v), {
      message: `Payment terms must be one of: ${VALID_PAYMENT_TERMS.join(", ")} days`,
    })
    .optional()
    .default(30),

  taxId: z.string().trim().max(50).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
});

// ── Update client — all fields optional ──────────────────────────────────────
export const updateClientSchema = createClientSchema.partial();

// ── Add contact to client ─────────────────────────────────────────────────────
export const addContactSchema = contactSchema;

// ── Query params for listing clients ─────────────────────────────────────────
export const listClientsSchema = z.object({
  page:       z.coerce.number().int().positive().optional().default(1),
  limit:      z.coerce.number().int().min(1).max(100).optional().default(20),
  search:     z.string().trim().optional(),
  currency:   z.string().toUpperCase().optional(),
  archived:   z.enum(["true", "false"]).optional().default("false"),
  sortBy:     z.enum(["name", "createdAt", "totalInvoiced", "lastInvoicedAt"]).optional().default("createdAt"),
  sortOrder:  z.enum(["asc", "desc"]).optional().default("desc"),
});

// ── Middleware factory ─────────────────────────────────────────────────────────
export const validate = (schema, source = "body") => (req, res, next) => {
  const data = source === "query" ? req.query : req.body;
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((e) => ({
      field:   e.path.join("."),
      message: e.message,
    }));
    return res.status(400).json({ success: false, errors });
  }

  if (source === "query") req.query = result.data;
  else req.body = result.data;

  next();
};