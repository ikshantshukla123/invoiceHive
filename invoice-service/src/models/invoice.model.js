import mongoose from "mongoose";

// ── Line item sub-schema ──────────────────────────────────────────────────────
const lineItemSchema = new mongoose.Schema(
  {
    description: {
      type:     String,
      required: [true, "Line item description is required"],
      trim:     true,
      maxlength: [500, "Description too long"],
    },
    quantity: {
      type:    Number,
      required: [true, "Quantity is required"],
      min:     [0.01, "Quantity must be greater than 0"],
    },
    rate: {
      type:    Number,
      required: [true, "Rate is required"],
      min:     [0, "Rate cannot be negative"],
    },
    amount: {
      type: Number, // Auto-calculated: quantity × rate
    },
    unit: {
      type:    String,
      trim:    true,
      default: "",
      // e.g. "hrs", "days", "pages" — shown on invoice
    },
  },
  { _id: true }
);

// Auto-calculate amount before validation
lineItemSchema.pre("validate", function () {
  this.amount = parseFloat((this.quantity * this.rate).toFixed(2));
});

// ── Main invoice schema ───────────────────────────────────────────────────────
const invoiceSchema = new mongoose.Schema(
  {
    // ── Ownership ──────────────────────────────────────
    userId:   { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },

    // ── Invoice number ─────────────────────────────────
    // Auto-generated: INV-0001, INV-0002 per user
    invoiceNumber: {
      type:   String,
      index:  true,
    },


    
    // ── Status lifecycle ───────────────────────────────
    // draft → sent → viewed → paid
    //                       ↘ overdue (if past dueDate and not paid)
    status: {
      type:    String,
      enum:    ["draft", "sent", "viewed", "paid", "partially_paid", "overdue", "cancelled"],
      default: "draft",
      index:   true,
    },

    // ── Line items ─────────────────────────────────────
    lineItems: {
      type:     [lineItemSchema],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message:   "At least one line item is required",
      },
    },

    // ── Financials (all calculated, stored for fast reads) ─────────────────
    subtotal:  { type: Number, default: 0 },
    taxRate:   { type: Number, default: 0, min: 0, max: 100 }, // Percentage: 10 = 10%
    taxAmount: { type: Number, default: 0 },
    discount:  { type: Number, default: 0 },  // Fixed $ discount off subtotal
    total:     { type: Number, default: 0 },
    currency:  { type: String, default: "USD", uppercase: true },

    // ── Dates ──────────────────────────────────────────
    issuedDate: { type: Date, default: Date.now },
    dueDate:    { type: Date, required: [true, "Due date is required"] },
    sentAt:     { type: Date, default: null },
    viewedAt:   { type: Date, default: null },
    paidAt:     { type: Date, default: null },

    // ── Payment details ────────────────────────────────
    razorpayOrderId:         { type: String, default: null },
    razorpayPaymentLinkId:   { type: String, default: null },
    razorpayPaymentLinkUrl:  { type: String, default: null },
    razorpayPaymentIntentId: { type: String, default: null },

    // ── PDF storage ────────────────────────────────────
    pdfUrl: { type: String, default: null }, // MinIO public URL

    // ── Extra info shown on invoice ────────────────────
    notes:      { type: String, trim: true, default: "", maxlength: 2000 },
    terms:      { type: String, trim: true, default: "", maxlength: 1000 },
    // e.g. "Payment due within 30 days. Late fee of 1.5% per month applies."

    // ── Freelancer's billing info snapshot ────────────
    // We snapshot this so the PDF is correct even if the user updates their info later
    fromDetails: {
      name:    { type: String, default: "" },
      email:   { type: String, default: "" },
      address: { type: String, default: "" },
      phone:   { type: String, default: "" },
      logo:    { type: String, default: "" }, // URL to freelancer's logo
    },

    // ── Client details snapshot ────────────────────────
    toDetails: {
      name:    { type: String, default: "" },
      company: { type: String, default: "" },
      email:   { type: String, default: "" },
      address: { type: String, default: "" },
    },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
invoiceSchema.index({ userId: 1, status: 1 });
invoiceSchema.index({ userId: 1, createdAt: -1 });
invoiceSchema.index({ userId: 1, dueDate: 1, status: 1 }); // For overdue cron
invoiceSchema.index({ clientId: 1, status: 1 });
invoiceSchema.index({ userId: 1, invoiceNumber: 1 }, { unique: true });
// ── Pre-save: recalculate financials ──────────────────────────────────────────
invoiceSchema.pre("save", function (next) {
  if (this.isModified("lineItems") || this.isModified("taxRate") || this.isModified("discount")) {
    const subtotal = this.lineItems.reduce((sum, item) => sum + item.amount, 0);
    const discount = this.discount || 0;
    
    // Prevent negative taxable amounts
    const taxable = Math.max(subtotal - discount, 0); 
    
    const taxAmount = parseFloat(((taxable * this.taxRate) / 100).toFixed(2));
    const total = parseFloat((taxable + taxAmount).toFixed(2));

    this.subtotal = parseFloat(subtotal.toFixed(2));
    this.taxAmount = taxAmount;
    this.total = total;
  }
  next();
});

// ── Static: generate next invoice number for a user ───────────────────────────
invoiceSchema.statics.generateInvoiceNumber = async function (userId) {
    // We must find the absolute highest numeric value, not just the latest created 
    // (in case they were imported out of order)
    const latest = await this.findOne({ 
      userId, 
      invoiceNumber: { $regex: /^INV-\d+$/ } 
    })
      .sort({ invoiceNumber: -1 })
    .lean();

  if (!latest?.invoiceNumber) return "INV-0001";

  const num = parseInt(latest.invoiceNumber.replace("INV-", ""), 10);
  return `INV-${String(num + 1).padStart(4, "0")}`;
};

// ── Virtual: is this invoice overdue? ─────────────────────────────────────────
invoiceSchema.virtual("isOverdue").get(function () {
  return (
    !["paid", "cancelled"].includes(this.status) &&
    this.dueDate < new Date()
  );
});

// ── Virtual: days until/since due ────────────────────────────────────────────
invoiceSchema.virtual("daysUntilDue").get(function () {
  const diff = this.dueDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;