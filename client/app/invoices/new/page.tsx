"use client";
import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight, Plus, Trash2, Send, Save,
  User, List, FileText, Zap, Building2, Loader2, X,
  IndianRupee,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  useClients, useCreateInvoice, useSendInvoice,
  useCreatePaymentOrder, useInvoice, useUpdateInvoice,
} from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LineItem {
  id: string; description: string;
  quantity: number; rate: number; unit: string;
}

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "CAD", "AUD", "SGD", "AED"];

// ── Field component ───────────────────────────────────────────────────────────
function Field({
  label, children, col2,
}: {
  label: string; children: React.ReactNode; col2?: boolean;
}) {
  return (
    <div className={col2 ? "md:col-span-2" : ""}>
      <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── Form Content Component ────────────────────────────────────────────────────
function InvoiceFormContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user }     = useAuth();

  // Pre-fill clientId from query param (e.g. navigated from clients page)
  const preClientId = searchParams.get("clientId") || "";

  const { data: clientsData } = useClients({ limit: 100 });
  const createInvoice         = useCreateInvoice();
  const sendInvoice           = useSendInvoice();
  const createPaymentOrder    = useCreatePaymentOrder();

  const clients = clientsData?.data || [];

  // ── Form state ──────────────────────────────────────────────────
  const [clientId,  setClientId]  = useState(preClientId);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate,   setDueDate]   = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [currency,  setCurrency]  = useState("INR");
  const [taxRate,   setTaxRate]   = useState(0);
  const [discount,  setDiscount]  = useState(0);
  const [notes,     setNotes]     = useState("");
  const [terms,     setTerms]     = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { id: "1", description: "", quantity: 1, rate: 0, unit: "" },
  ]);

  const [saving,  setSaving]  = useState(false);
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState("");

  const selectedClient = clients.find((c: any) => c._id === clientId);

  // ── Line item helpers ────────────────────────────────────────────
  const updateItem = useCallback(
    (id: string, field: keyof LineItem, value: string | number) =>
      setItems(prev =>
        prev.map(item => item.id === id ? { ...item, [field]: value } : item)
      ),
    []
  );

  const addItem = () =>
    setItems(prev => [
      ...prev,
      { id: Date.now().toString(), description: "", quantity: 1, rate: 0, unit: "" },
    ]);

  const removeItem = (id: string) =>
    setItems(prev => prev.filter(i => i.id !== id));

  // ── Financials ───────────────────────────────────────────────────
  const subtotal  = items.reduce((s, i) => s + i.quantity * i.rate, 0);
  const taxable   = Math.max(0, subtotal - discount);
  const taxAmount = (taxable * taxRate) / 100;
  const total     = taxable + taxAmount;

  // ── Payload ──────────────────────────────────────────────────────
  const buildPayload = () => ({
    clientId,
    dueDate,
    issuedDate: issueDate,
    currency,
    taxRate,
    discount,
    notes,
    terms,
    lineItems: items
      .filter(i => i.description.trim())
      .map(({ description, quantity, rate, unit }) => ({ description, quantity, rate, unit })),
    fromDetails: {
      name:  user?.name  || "",
      email: user?.email || "",
    },
  });

  const validate = () => {
    if (!clientId)          { setError("Please select a client"); return false; }
    if (clientId === "__new__") { setError("Please add and select a client first"); return false; }
    if (items.filter(i => i.description.trim()).length === 0) {
      setError("Add at least one line item with a description");
      return false;
    }
    if (new Date(dueDate) <= new Date(issueDate)) {
      setError("Due date must be after issue date");
      return false;
    }
    return true;
  };

  // ── Save draft ───────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!validate()) return;
    setError(""); setSaving(true);
    try {
      await createInvoice.mutateAsync(buildPayload());
      router.push("/invoices");
    } catch (e: any) {
      setError(
        e?.response?.data?.errors?.[0]?.message ||
        e?.response?.data?.message ||
        "Failed to save draft"
      );
    } finally { setSaving(false); }
  };

  // ── Send now ─────────────────────────────────────────────────────
  const handleSendNow = async () => {
    if (!validate()) return;
    setError(""); setSending(true);
    try {
      // 1. Create invoice record
      const inv = await createInvoice.mutateAsync(buildPayload());

      // 2. Create Razorpay order (non-fatal if fails)
      try {
        await createPaymentOrder.mutateAsync({
          invoiceId:    inv._id,
          invoiceNumber:inv.invoiceNumber,
          amount:       inv.total,
          currency:     inv.currency,
          clientId:     inv.clientId,
          clientEmail:  inv.toDetails?.email,
          clientName:   inv.toDetails?.name,
        });
      } catch (payErr) {
        console.warn("Razorpay order creation failed — continuing:", payErr);
      }

      // 3. Generate PDF + email client
      await sendInvoice.mutateAsync(inv._id);
      router.push("/invoices");
    } catch (e: any) {
      setError(
        e?.response?.data?.errors?.[0]?.message ||
        e?.response?.data?.message ||
        "Failed to send invoice"
      );
    } finally { setSending(false); }
  };

  const busy = saving || sending;

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-16">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <nav className="flex items-center gap-2 text-xs font-medium text-on-surface-variant mb-2">
            <Link href="/invoices" className="hover:text-primary transition-colors">
              Invoices
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-on-background">New Invoice</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tighter text-on-background">
            Create Invoice
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Fill in the details — a professional PDF will be generated on send.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={handleSaveDraft}
            disabled={busy}
            className="btn-secondary flex-1 sm:flex-none justify-center"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            onClick={handleSendNow}
            disabled={busy}
            className="btn-primary flex-1 sm:flex-none justify-center"
          >
            {sending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
            Send Invoice
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-error-container/30 border border-error/20 text-error text-sm font-medium">
          <X className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError("")} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6 items-start">

        {/* ── LEFT: form panels ──────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-7 space-y-5">

          {/* Panel: Client & Dates */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-surface-container bg-surface-container-lowest/60">
              <User className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-on-background">Client Details</h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-5">
              <Field label="Client *" col2>
                <div className="relative">
                  <select
                    value={clientId}
                    onChange={e => setClientId(e.target.value)}
                    className="input-field appearance-none pr-8 cursor-pointer"
                  >
                    <option value="" disabled>Select a client…</option>
                    {clients.map((c: any) => (
                      <option key={c._id} value={c._id}>
                        {c.name}{c.company ? ` — ${c.company}` : ""}
                      </option>
                    ))}
                    <option value="__new__">+ Add new client</option>
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-3.5 h-3.5 text-outline pointer-events-none" />
                </div>
                {clientId === "__new__" && (
                  <Link
                    href="/clients"
                    className="text-xs text-primary mt-1.5 block hover:underline"
                  >
                    Go to Clients page to add a new client →
                  </Link>
                )}
              </Field>

              <Field label="Issue Date">
                <input
                  type="date"
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  className="input-field"
                />
              </Field>

              <Field label="Due Date">
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="input-field"
                />
              </Field>

              <Field label="Currency">
                <div className="relative">
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="input-field appearance-none pr-8 cursor-pointer"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 w-3.5 h-3.5 text-outline pointer-events-none" />
                </div>
              </Field>

              <Field label="Tax Rate (%)">
                <input
                  type="number"
                  value={taxRate}
                  onChange={e => setTaxRate(Number(e.target.value))}
                  min={0} max={100} step={0.5}
                  className="input-field"
                />
              </Field>

              <Field label="Discount (flat ₹)">
                <input
                  type="number"
                  value={discount}
                  onChange={e => setDiscount(Number(e.target.value))}
                  min={0}
                  className="input-field"
                />
              </Field>
            </div>
          </div>

          {/* Panel: Line Items */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-surface-container bg-surface-container-lowest/60">
              <List className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-on-background">Line Items</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="bg-surface-container-low/30">
                    {["Description", "Qty", "Rate", "Unit", "Amount", ""].map(h => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left last:w-8"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="group hover:bg-surface-container-low/20 transition-colors">
                      <td className="px-3 py-2.5 w-[38%]">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => updateItem(item.id, "description", e.target.value)}
                          placeholder="e.g. Web Design"
                          className="w-full bg-transparent border-none outline-none text-sm font-medium placeholder:text-outline focus:ring-0"
                        />
                      </td>
                      <td className="px-3 py-2.5 w-16">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, "quantity", Number(e.target.value))}
                          className="w-full bg-transparent border-none outline-none text-sm mono-num focus:ring-0"
                          min={0} step={1}
                        />
                      </td>
                      <td className="px-3 py-2.5 w-28">
                        <input
                          type="number"
                          value={item.rate}
                          onChange={e => updateItem(item.id, "rate", Number(e.target.value))}
                          className="w-full bg-transparent border-none outline-none text-sm mono-num focus:ring-0"
                          min={0}
                        />
                      </td>
                      <td className="px-3 py-2.5 w-20">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => updateItem(item.id, "unit", e.target.value)}
                          placeholder="hrs"
                          className="w-full bg-transparent border-none outline-none text-sm text-on-surface-variant focus:ring-0"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-sm font-semibold mono-num text-on-background whitespace-nowrap">
                        {formatCurrency(item.quantity * item.rate, currency)}
                      </td>
                      <td className="px-2 py-2.5">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-outline hover:text-error transition-all p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-3 border-t border-surface-container">
              <button onClick={addItem} className="btn-ghost text-sm">
                <Plus className="w-3.5 h-3.5" /> Add line item
              </button>
            </div>
          </div>

          {/* Panel: Notes + Terms */}
          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-surface-container bg-surface-container-lowest/60">
              <FileText className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-on-background">Notes & Terms</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="input-label">Notes (visible to client)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Payment instructions, bank details, thank-you message…"
                  className="input-field resize-none"
                />
              </div>
              <div>
                <label className="input-label">Terms & Conditions</label>
                <textarea
                  value={terms}
                  onChange={e => setTerms(e.target.value)}
                  rows={3}
                  placeholder="Late fee policy, warranty, delivery terms…"
                  className="input-field resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: live preview ─────────────────────────────────── */}
        <div className="col-span-12 lg:col-span-5 lg:sticky lg:top-6 space-y-4">
          <div
            className="bg-white rounded-2xl p-8 relative overflow-hidden"
            style={{ boxShadow: "0 20px 60px rgba(20,28,36,0.12)" }}
          >
            {/* Decorative bg shape */}
            <div
              className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-40 pointer-events-none"
              style={{ background: "linear-gradient(225deg,rgba(53,37,205,0.08),transparent)" }}
            />

            <div className="relative space-y-6">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg primary-gradient flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white fill-white" />
                  </div>
                  <span className="font-headline font-extrabold text-on-background tracking-tight">
                    InvoiceHive
                  </span>
                </div>
                <div className="text-right">
                  <h2 className="text-xl font-black text-on-background tracking-tight">INVOICE</h2>
                  <p className="text-[10px] mono-num text-slate-400 mt-0.5">#INV-XXXX</p>
                </div>
              </div>

              {/* From / To */}
              <div className="grid grid-cols-2 gap-5 py-4 border-y border-slate-100">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    From
                  </p>
                  <p className="text-sm font-bold text-on-background">{user?.name || "Your Name"}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Bill To
                  </p>
                  {selectedClient ? (
                    <>
                      <p className="text-sm font-bold text-on-background truncate">
                        {selectedClient.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">
                        {selectedClient.email}
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Select a client above</p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">
                    Issue Date
                  </p>
                  <p className="font-semibold text-on-background">{issueDate}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold mb-0.5">
                    Due Date
                  </p>
                  <p className="font-semibold text-on-background">{dueDate}</p>
                </div>
              </div>

              {/* Line items preview */}
              <div className="space-y-2 min-h-[80px]">
                {items.filter(i => i.description).slice(0, 4).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs gap-2">
                    <span className="text-slate-600 truncate flex-1 font-medium">
                      {item.quantity > 1 && `${item.quantity}× `}{item.description}
                      {item.unit && ` (${item.unit})`}
                    </span>
                    <span className="mono-num font-semibold text-on-background flex-shrink-0">
                      {formatCurrency(item.quantity * item.rate, currency)}
                    </span>
                  </div>
                ))}
                {items.filter(i => i.description).length > 4 && (
                  <p className="text-[10px] text-slate-400 text-center pt-1">
                    +{items.filter(i => i.description).length - 4} more items
                  </p>
                )}
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span className="mono-num font-medium">{formatCurrency(subtotal, currency)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-xs text-error">
                    <span>Discount</span>
                    <span className="mono-num">− {formatCurrency(discount, currency)}</span>
                  </div>
                )}
                {taxRate > 0 && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Tax ({taxRate}%)</span>
                    <span className="mono-num font-medium">{formatCurrency(taxAmount, currency)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <span className="text-sm font-bold text-on-background">Total Due</span>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary mono-num">
                      {formatCurrency(total, currency)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Payment due {dueDate}</p>
                  </div>
                </div>
              </div>

              {/* Razorpay badge */}
              <div className="bg-surface-container-low rounded-xl p-3.5 flex items-center gap-3 border border-outline-variant/10">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-primary border border-slate-100 flex-shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Payment via
                  </p>
                  <p className="text-xs font-semibold text-on-background mt-0.5">
                    Razorpay · Secure Checkout
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="card p-4 border border-outline-variant/10">
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              What happens on Send
            </p>
            <ul className="space-y-1.5">
              {[
                "PDF invoice generated automatically",
                "Razorpay payment link created",
                "Client receives email with Pay Now button",
                "You get notified when they pay",
              ].map(tip => (
                <li key={tip} className="flex items-start gap-2 text-xs text-on-surface-variant">
                  <span className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page Export with Suspense ────────────────────────────────────────────
export default function CreateInvoicePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <InvoiceFormContent />
    </Suspense>
  );
}