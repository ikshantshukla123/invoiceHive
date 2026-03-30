"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Loader2, Send, Download, CheckCircle2, Trash2,
  Calendar, Clock, AlertCircle, FileText, Copy, ExternalLink,
  Zap, Building2,
} from "lucide-react";
import {
  useInvoice, useSendInvoice, useMarkInvoicePaid,
  useDeleteInvoice, useDownloadInvoice,
  usePaymentByInvoice, useCreatePaymentOrder,
} from "@/hooks/useApi";
import { formatCurrency, formatDate, formatRelative } from "@/lib/utils";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  paid:      { label: "Paid",           cls: "bg-tertiary-fixed/25 text-tertiary border-tertiary/20",    dot: "bg-tertiary" },
  sent:      { label: "Sent",           cls: "bg-primary-fixed/30 text-primary border-primary/20",       dot: "bg-primary" },
  overdue:   { label: "Overdue",        cls: "bg-error-container/40 text-error border-error/20",         dot: "bg-error" },
  draft:     { label: "Draft",          cls: "bg-surface-container-highest text-on-surface-variant border-outline/20", dot: "bg-slate-400" },
  viewed:    { label: "Viewed by Client",cls: "bg-secondary/10 text-secondary border-secondary/20",      dot: "bg-secondary" },
  cancelled: { label: "Cancelled",      cls: "bg-surface-container-highest text-on-surface-variant border-outline/20", dot: "bg-slate-300" },
  partially_paid: { label: "Partial",   cls: "bg-amber-50 text-amber-700 border-amber-200",               dot: "bg-amber-400" },
};

// ── Small helpers ─────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
      <span className="text-sm font-medium text-on-background">{value}</span>
    </div>
  );
}

function TimelineItem({
  dot, title, sub, last,
}: { dot: string; title: string; sub: string; last?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${dot}`} />
        {!last && <div className="flex-1 w-px bg-surface-container mt-1" />}
      </div>
      <div className="pb-4 min-h-[32px]">
        <p className="text-sm font-semibold text-on-background">{title}</p>
        <p className="text-xs text-on-surface-variant mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const { id }   = useParams() as { id: string };
  const router   = useRouter();

  const { data: invoice, isLoading, refetch } = useInvoice(id);
  const { data: payment }                      = usePaymentByInvoice(id);

  const sendMut         = useSendInvoice();
  const markPaidMut     = useMarkInvoicePaid();
  const deleteMut       = useDeleteInvoice();
  const downloadMut     = useDownloadInvoice();
  const createOrderMut  = useCreatePaymentOrder();

  const [deleting,  setDeleting]  = useState(false);
  const [copyTip,   setCopyTip]   = useState(false);
  const [actionErr, setActionErr] = useState("");

  if (isLoading)  return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
  if (!invoice) return (
    <div className="text-center py-24 text-on-surface-variant">
      <FileText className="w-10 h-10 mx-auto mb-4 opacity-20" />
      <p className="text-sm font-medium">Invoice not found</p>
      <Link href="/invoices" className="btn-primary text-sm mt-4">Back to invoices</Link>
    </div>
  );

  // ── Derived state ─────────────────────────────────────────────────────────
  const isOverdue = invoice.isOverdue && !["paid","cancelled"].includes(invoice.status);
  const statusKey = isOverdue ? "overdue" : invoice.status;
  const st        = STATUS[statusKey] || STATUS.draft;

  // ── Action helpers ────────────────────────────────────────────────────────
  const wrap = (fn: () => Promise<void>) => async () => {
    setActionErr("");
    try { await fn(); await refetch(); }
    catch (e: any) {
      setActionErr(
        e?.response?.data?.message || e?.message || "Action failed"
      );
    }
  };

  const handleSend = wrap(async () => {
    // Create Razorpay order first, then send
    await createOrderMut.mutateAsync({
      invoiceId:    invoice._id,
      invoiceNumber:invoice.invoiceNumber,
      amount:       invoice.total,
      currency:     invoice.currency || "INR",
      clientId:     invoice.clientId,
      clientName:   invoice.toDetails?.name,
      clientEmail:  invoice.toDetails?.email,
    });
    await sendMut.mutateAsync(id);
  });

  const handleMarkPaid = wrap(async () => {
    await markPaidMut.mutateAsync({ id });
  });

  const handleDownload = wrap(async () => {
    await downloadMut.mutateAsync(id);
  });

  const handleDelete = async () => {
    const verb = ["draft","cancelled"].includes(invoice.status)
      ? "permanently delete"
      : "cancel";
    if (!confirm(`${verb.charAt(0).toUpperCase() + verb.slice(1)} this invoice?`)) return;
    setDeleting(true);
    try {
      await deleteMut.mutateAsync(id);
      router.push("/invoices");
    } catch (e: any) {
      setActionErr(e?.response?.data?.message || "Failed");
      setDeleting(false);
    }
  };

  const copyLink = () => {
    if (!invoice.razorpayPaymentLinkUrl) return;
    navigator.clipboard.writeText(invoice.razorpayPaymentLinkUrl);
    setCopyTip(true);
    setTimeout(() => setCopyTip(false), 2000);
  };

  const isBusy =
    sendMut.isPending || markPaidMut.isPending ||
    downloadMut.isPending || createOrderMut.isPending;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-16 max-w-6xl">

      {/* Top nav + actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-2 rounded-xl hover:bg-surface-container-low transition-colors text-on-surface-variant"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold tracking-tight text-on-background">
                {invoice.invoiceNumber}
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${st.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                {st.label}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Issued to{" "}
              <span className="font-semibold text-on-background">
                {invoice.toDetails?.company || invoice.toDetails?.name || "—"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Error inline */}
          {actionErr && (
            <span className="text-xs text-error font-medium px-3 py-1.5 bg-error-container/30 rounded-lg">
              {actionErr}
            </span>
          )}

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={isBusy}
            className="btn-secondary py-2 px-4"
          >
            {downloadMut.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            PDF
          </button>

          {/* Send (not paid/cancelled) */}
          {!["paid","cancelled"].includes(invoice.status) && (
            <button
              onClick={handleSend}
              disabled={isBusy}
              className="btn-secondary py-2 px-4"
            >
              {(sendMut.isPending || createOrderMut.isPending)
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
              {invoice.status === "draft" ? "Send" : "Resend"}
            </button>
          )}

          {/* Mark paid */}
          {!["paid","cancelled"].includes(invoice.status) && (
            <button
              onClick={handleMarkPaid}
              disabled={isBusy}
              className="btn-primary py-2 px-4"
            >
              {markPaidMut.isPending
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CheckCircle2 className="w-4 h-4" />}
              Mark Paid
            </button>
          )}

          {/* Delete */}
          {invoice.status !== "paid" && (
            <button
              onClick={handleDelete}
              disabled={deleting || isBusy}
              className="p-2 text-error hover:bg-error/10 rounded-xl transition-colors"
              title={["draft","cancelled"].includes(invoice.status) ? "Delete permanently" : "Cancel invoice"}
            >
              {deleting
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <Trash2 className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Invoice document ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Invoice document card */}
          <div
            className="bg-white rounded-2xl overflow-hidden relative"
            style={{ boxShadow: "0 8px 32px rgba(20,28,36,0.08)" }}
          >
            {/* Paid watermark */}
            {invoice.status === "paid" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <span
                  className="text-[140px] font-black uppercase tracking-widest -rotate-12 opacity-[0.025] text-on-background"
                >
                  PAID
                </span>
              </div>
            )}

            <div className="p-8 relative">
              {/* Invoice header row */}
              <div className="flex justify-between items-start mb-10">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg primary-gradient flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white fill-white" />
                  </div>
                  <span className="font-headline font-extrabold tracking-tight text-on-background">
                    InvoiceHive
                  </span>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black text-on-background tracking-tight">INVOICE</h2>
                  <p className="text-xs mono-num text-slate-400 mt-0.5">#{invoice.invoiceNumber}</p>
                </div>
              </div>

              {/* From / To */}
              <div className="grid grid-cols-2 gap-8 mb-10 pb-8 border-b border-slate-100">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    From
                  </p>
                  <p className="font-bold text-on-background">{invoice.fromDetails?.name || "—"}</p>
                  {invoice.fromDetails?.email && (
                    <p className="text-sm text-slate-500 mt-0.5">{invoice.fromDetails.email}</p>
                  )}
                  {invoice.fromDetails?.address && (
                    <p className="text-sm text-slate-500 mt-0.5 whitespace-pre-line">
                      {invoice.fromDetails.address}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                    Billed To
                  </p>
                  <p className="font-bold text-on-background">
                    {invoice.toDetails?.company || invoice.toDetails?.name}
                  </p>
                  {invoice.toDetails?.company && invoice.toDetails?.name && (
                    <p className="text-sm text-slate-500 mt-0.5">{invoice.toDetails.name}</p>
                  )}
                  {invoice.toDetails?.email && (
                    <p className="text-sm text-slate-500 mt-0.5">{invoice.toDetails.email}</p>
                  )}
                  {invoice.toDetails?.address && (
                    <p className="text-sm text-slate-500 mt-0.5 whitespace-pre-line">
                      {invoice.toDetails.address}
                    </p>
                  )}
                </div>
              </div>

              {/* Line items */}
              <div className="mb-8">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      {["Description","Qty","Rate","Amount"].map((h, i) => (
                        <th
                          key={h}
                          className={`pb-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest ${i > 0 ? "text-right" : ""}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems?.map((item: any) => (
                      <tr
                        key={item._id}
                        className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="py-3.5 pr-4">
                          <p className="text-sm font-medium text-on-background">
                            {item.description}
                          </p>
                          {item.unit && (
                            <p className="text-[11px] text-slate-400 mt-0.5">per {item.unit}</p>
                          )}
                        </td>
                        <td className="py-3.5 text-sm text-slate-500 text-right">
                          {item.quantity}
                        </td>
                        <td className="py-3.5 text-sm text-slate-500 text-right mono-num">
                          {formatCurrency(item.rate, invoice.currency)}
                        </td>
                        <td className="py-3.5 text-sm font-semibold text-on-background text-right mono-num">
                          {formatCurrency(item.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>Subtotal</span>
                    <span className="mono-num">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-error">
                      <span>Discount</span>
                      <span className="mono-num">− {formatCurrency(invoice.discount, invoice.currency)}</span>
                    </div>
                  )}
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between text-sm text-slate-500">
                      <span>Tax ({invoice.taxRate}%)</span>
                      <span className="mono-num">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                    <span className="text-base font-bold text-on-background">Total Due</span>
                    <span className="text-xl font-black text-primary mono-num">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes / Terms */}
              {(invoice.notes || invoice.terms) && (
                <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {invoice.notes && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Notes
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {invoice.notes}
                      </p>
                    </div>
                  )}
                  {invoice.terms && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Terms
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                        {invoice.terms}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: sidebar ─────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Key dates */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-on-background mb-4">Dates</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-surface-container-low text-on-surface-variant">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">
                    Issued
                  </p>
                  <p className="text-sm font-semibold text-on-background">
                    {formatDate(invoice.issuedDate)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isOverdue ? "bg-error/10 text-error" : "bg-surface-container-low text-on-surface-variant"}`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider">
                    Due
                  </p>
                  <p className={`text-sm font-semibold ${isOverdue ? "text-error" : "text-on-background"}`}>
                    {formatDate(invoice.dueDate)}
                  </p>
                  {isOverdue && (
                    <p className="text-[10px] text-error font-bold mt-0.5 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Overdue
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment status */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-on-background mb-4">Payment</h3>

            {invoice.status === "paid" ? (
              <div className="rounded-xl bg-tertiary-fixed/20 border border-tertiary/20 p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-tertiary flex items-center justify-center text-white flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-tertiary">Paid in Full</p>
                  <p className="text-xs text-tertiary/70 mt-0.5">
                    {invoice.paidAt ? formatDate(invoice.paidAt) : "Manually marked"}
                  </p>
                  {invoice.razorpayPaymentId && (
                    <p className="text-[10px] text-tertiary/60 mono-num mt-0.5">
                      ID: {invoice.razorpayPaymentId}
                    </p>
                  )}
                </div>
              </div>
            ) : invoice.razorpayPaymentLinkUrl ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-surface-container-low border border-outline-variant/10 p-3">
                  <p className="text-[10px] text-on-surface-variant font-semibold uppercase tracking-wider mb-1.5">
                    Payment Link
                  </p>
                  <p className="text-xs text-on-surface-variant font-mono break-all leading-relaxed">
                    {invoice.razorpayPaymentLinkUrl.length > 50
                      ? invoice.razorpayPaymentLinkUrl.slice(0, 50) + "…"
                      : invoice.razorpayPaymentLinkUrl}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyLink}
                    className="btn-secondary flex-1 py-2 text-xs justify-center"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copyTip ? "Copied!" : "Copy Link"}
                  </button>
                  <a
                    href={invoice.razorpayPaymentLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary py-2 px-3"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="text-center py-5 text-on-surface-variant">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-25" />
                <p className="text-xs font-medium">No payment link yet</p>
                <p className="text-[11px] opacity-70 mt-1">
                  Sending the invoice will create a Razorpay link
                </p>
                {!["paid","cancelled"].includes(invoice.status) && (
                  <button
                    onClick={handleSend}
                    disabled={isBusy}
                    className="btn-primary text-xs mt-3"
                  >
                    {(sendMut.isPending || createOrderMut.isPending)
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Send className="w-3.5 h-3.5" />}
                    Send & Generate Link
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Activity timeline */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-on-background mb-4">Activity</h3>
            <div className="space-y-0">
              <TimelineItem
                dot="bg-slate-400"
                title="Invoice Created"
                sub={`${formatDate(invoice.createdAt)} · ${formatRelative(invoice.createdAt)}`}
              />
              {invoice.sentAt && (
                <TimelineItem
                  dot="bg-primary"
                  title="Sent to Client"
                  sub={`${formatDate(invoice.sentAt)} · ${formatRelative(invoice.sentAt)}`}
                />
              )}
              {invoice.viewedAt && (
                <TimelineItem
                  dot="bg-secondary"
                  title="Viewed by Client"
                  sub={`${formatDate(invoice.viewedAt)} · ${formatRelative(invoice.viewedAt)}`}
                />
              )}
              {invoice.paidAt && (
                <TimelineItem
                  dot="bg-tertiary"
                  title="Payment Received"
                  sub={`${formatDate(invoice.paidAt)} · ${formatRelative(invoice.paidAt)}`}
                  last
                />
              )}
              {!invoice.sentAt && !invoice.paidAt && (
                <TimelineItem
                  dot="bg-slate-200"
                  title="Awaiting Send"
                  sub="Invoice is still in draft"
                  last
                />
              )}
            </div>
          </div>

          {/* Invoice summary */}
          <div className="card p-5">
            <h3 className="text-sm font-bold text-on-background mb-4">Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Subtotal</span>
                <span className="font-semibold mono-num">
                  {formatCurrency(invoice.subtotal, invoice.currency)}
                </span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Discount</span>
                  <span className="font-semibold text-error mono-num">
                    − {formatCurrency(invoice.discount, invoice.currency)}
                  </span>
                </div>
              )}
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Tax ({invoice.taxRate}%)</span>
                  <span className="font-semibold mono-num">
                    {formatCurrency(invoice.taxAmount, invoice.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t border-surface-container pt-3">
                <span className="text-on-background">Total</span>
                <span className="text-primary mono-num">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}