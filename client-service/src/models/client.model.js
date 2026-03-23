import mongoose from "mongoose";

// ── Address sub-schema ────────────────────────────────────────────────────────
const addressSchema = new mongoose.Schema(
  {
    street:  { type: String, trim: true, default: "" },
    city:    { type: String, trim: true, default: "" },
    state:   { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    zip:     { type: String, trim: true, default: "" },
  },
  { _id: false } // No separate _id for subdocuments
);

// ── Contact person sub-schema ─────────────────────────────────────────────────
// A client (company) can have multiple contact people
const contactSchema = new mongoose.Schema(
  {
    name:  { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    role:  { type: String, trim: true }, // e.g. "Project Manager", "CEO"
  },
  { _id: true }
);

// ── Main Client schema ────────────────────────────────────────────────────────
const clientSchema = new mongoose.Schema(
  {
    // Which freelancer owns this client
    userId: {
      type:     String,
      required: true,
      index:    true, // Fast lookups by user
    },

    // ── Basic info ─────────────────────────────────────
    name: {
      type:     String,
      required: [true, "Client name is required"],
      trim:     true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    company: {
      type:    String,
      trim:    true,
      default: "",
    },
    email: {
      type:      String,
      required:  [true, "Client email is required"],
      trim:      true,
      lowercase: true,
      match:     [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    phone: {
      type:    String,
      trim:    true,
      default: "",
    },
    website: {
      type:    String,
      trim:    true,
      default: "",
    },

    // ── Address ────────────────────────────────────────
    address: {
      type:    addressSchema,
      default: () => ({}),
    },

    // ── Multiple contacts per client (optional) ────────
    contacts: {
      type:    [contactSchema],
      default: [],
    },

    // ── Billing preferences ────────────────────────────
    currency: {
      type:    String,
      default: "USD",
      uppercase: true,
      enum: {
        values:   ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "JPY", "SGD", "AED"],
        message:  "{VALUE} is not a supported currency",
      },
    },
    paymentTerms: {
      type:    Number,
      default: 30,      // Net 30 — client has 30 days to pay
      enum: {
        values:  [0, 7, 14, 15, 30, 45, 60, 90],
        message: "Payment terms must be 0, 7, 14, 15, 30, 45, 60, or 90 days",
      },
    },
    taxId: {
      type:    String,
      trim:    true,
      default: "",
      // GST/VAT number — appears on invoice
    },

    // ── Internal notes (visible only to freelancer) ────
    notes: {
      type:      String,
      trim:      true,
      default:   "",
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
    },

    // ── Denormalized stats (updated by Invoice Service via events) ─────────
    // Storing these here avoids a cross-service query every time we render client list
    totalInvoiced:    { type: Number, default: 0 }, // Total $ invoiced ever
    totalPaid:        { type: Number, default: 0 }, // Total $ actually received
    totalOutstanding: { type: Number, default: 0 }, // totalInvoiced - totalPaid
    invoiceCount:     { type: Number, default: 0 }, // How many invoices sent
    lastInvoicedAt:   { type: Date,   default: null },

    // ── Soft delete ────────────────────────────────────
    // We never hard-delete — invoices still need to reference the client
    isArchived: {
      type:    Boolean,
      default: false,
      index:   true,
    },
    archivedAt: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt

    // Allow virtual fields to show up in JSON responses
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Compound index: fast query for "all clients belonging to user X" ──────────
clientSchema.index({ userId: 1, isArchived: 1 });
clientSchema.index({ userId: 1, createdAt: -1 });

// ── Virtual: full formatted address string ────────────────────────────────────
clientSchema.virtual("formattedAddress").get(function () {
  const a = this.address;
  if (!a) return "";
  return [a.street, a.city, a.state, a.zip, a.country]
    .filter(Boolean)
    .join(", ");
});

// ── Virtual: outstanding balance ──────────────────────────────────────────────
// Always calculated — totalOutstanding kept in sync by invoice events
clientSchema.virtual("hasOutstanding").get(function () {
  return this.totalOutstanding > 0;
});

// ── Instance method: safe object for API responses ────────────────────────────
clientSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

const Client = mongoose.model("Client", clientSchema);
export default Client;