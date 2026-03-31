"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Loader2, Send, Download, CheckCircle2, 
  Trash2, Mail, MapPin, Phone, Building, Calendar, 
  Clock, AlertCircle, FileText
} from "lucide-react";
import { 
  useInvoice, 
  useSendInvoice, 
  useMarkInvoicePaid, 
  useDeleteInvoice,
  useDownloadInvoice,
  usePaymentByInvoice,
  useCreatePaymentOrder
} from "@/hooks/useApi";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  paid:    { label: "Paid",    badge: "bg-tertiary/10 text-tertiary border-tertiary/20", icon: <CheckCircle2 className="w-4 h-4" /> },
  sent:    { label: "Sent",    badge: "bg-primary/10 text-primary border-primary/20", icon: <Send className="w-4 h-4" /> },
  overdue: { label: "Overdue", badge: "bg-error/10 text-error border-error/20", icon: <AlertCircle className="w-4 h-4" /> },
  draft:   { label: "Draft",   badge: "bg-surface-container-highest text-on-surface-variant border-outline/20", icon: <FileText className="w-4 h-4" /> },
  viewed:  { label: "Viewed",  badge: "bg-secondary/10 text-secondary border-secondary/20", icon: <Clock className="w-4 h-4" /> },
};

export default function InvoiceDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const { data: invoice, isLoading } = useInvoice(id);
  const { data: payment } = usePaymentByInvoice(id);

  const sendMutation = useSendInvoice();
  const markPaidMutation = useMarkInvoicePaid();
  const deleteMutation = useDeleteInvoice();
  const downloadMutation = useDownloadInvoice();
  const createPaymentOrderMutation = useCreatePaymentOrder();

  const [isDeleting, setIsDeleting] = useState(false);

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!invoice) return <div className="text-center py-20 text-on-surface-variant">Invoice not found.</div>;

  const st = invoice.isOverdue && invoice.status !== 'paid' ? 'overdue' : invoice.status;
  const config = STATUS_CONFIG[st] || STATUS_CONFIG.draft;

  const handleSend = async () => {
    try { 
      // Ensure payment link is generated first
      await createPaymentOrderMutation.mutateAsync({
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.total,
        currency: invoice.currency || "INR",
        clientId: invoice.clientId,
        clientName: invoice.toDetails?.name,
        clientEmail: invoice.toDetails?.email,
      });

      // Then send the invoice which references the newly stored payment link
      await sendMutation.mutateAsync(id); 
      alert("Invoice sent successfully!"); 
    }
    catch (e) { 
      console.error(e);
      alert("Failed to send invoice."); 
    }
  };

  const handleMarkPaid = async () => {
    try { await markPaidMutation.mutateAsync({ id }); }
    catch (e) { alert("Failed to mark as paid."); }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this invoice? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(id);
      router.push("/invoices");
    } catch (e) {
      alert("Failed to delete invoice.");
      setIsDeleting(false);
    }
  };

  const handleDownload = async () => {
    try { await downloadMutation.mutateAsync(id); } 
    catch (e) { alert("Failed to download or generate PDF."); }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors">
            <ArrowLeft className="w-5 h-5 text-on-surface-variant" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold tracking-tighter text-on-background">{invoice.invoiceNumber}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${config.badge}`}>
                {config.icon} {config.label}
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-1">
              Issued to {invoice.toDetails?.name || invoice.toDetails?.company || "Client"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {invoice.status === "draft" && (
             <Link href={`/invoices/new?edit=${invoice._id}`} className="btn-secondary py-2 px-4 shadow-sm">
               Edit
             </Link>
          )}
          {invoice.status !== "paid" && (
            <button 
              onClick={handleSend} 
              disabled={sendMutation.isPending || createPaymentOrderMutation.isPending} 
              className="btn-secondary py-2 px-4 shadow-sm min-w-[100px] justify-center"
            >
              {(sendMutation.isPending || createPaymentOrderMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-2" /> Send</>}
            </button>
          )}
          <button onClick={handleDownload} disabled={downloadMutation.isPending} className="btn-secondary py-2 px-4 shadow-sm justify-center">
             {downloadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4 mr-2" /> PDF</>}
          </button>
          
          {invoice.status !== "paid" && (
            <button onClick={handleMarkPaid} disabled={markPaidMutation.isPending} className="btn-primary py-2 px-4 shadow-md justify-center">
              {markPaidMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Mark Paid</>}
            </button>
          )}

          <button onClick={handleDelete} disabled={isDeleting} className="p-2 ml-2 text-error hover:bg-error/10 rounded-xl transition-colors">
             {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Invoice Document - Left 2 Cols */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-8 border border-outline-variant/20 shadow-sm relative overflow-hidden bg-surface">
            {/* Watermark for paid */}
            {invoice.status === 'paid' && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 opacity-[0.03] pointer-events-none select-none">
                 <h1 className="text-[150px] font-black uppercase tracking-widest text-on-background">PAID</h1>
               </div>
            )}

            {/* Bill Details */}
            <div className="grid grid-cols-2 gap-8 mb-10 pb-8 border-b border-surface-container">
              <div>
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">From</h3>
                <p className="font-bold text-on-background text-lg">{invoice.fromDetails?.name || "Your Business"}</p>
                {invoice.userId?.email && <p className="text-sm text-on-surface-variant mt-1">{invoice.userId.email}</p>}
                {invoice.fromDetails?.address && <p className="text-sm text-on-surface-variant whitespace-pre-wrap mt-1">{invoice.fromDetails.address}</p>}
              </div>
              <div className="text-left sm:text-right">
                <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-3">Bill To</h3>
                <p className="font-bold text-on-background text-lg">{invoice.toDetails?.company || invoice.toDetails?.name}</p>
                {invoice.toDetails?.name && invoice.toDetails?.company && <p className="text-sm text-on-surface-variant mt-1">{invoice.toDetails.name}</p>}
                {invoice.toDetails?.email && <p className="text-sm text-on-surface-variant mt-1">{invoice.toDetails.email}</p>}
                {invoice.toDetails?.address && <p className="text-sm text-on-surface-variant whitespace-pre-wrap mt-1">{invoice.toDetails.address}</p>}
              </div>
            </div>

            {/* Line Items */}
            <div className="mb-10 min-h-[200px]">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b-2 border-surface-container text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      <th className="py-3 px-2">Description</th>
                      <th className="py-3 px-2 text-right">Qty</th>
                      <th className="py-3 px-2 text-right">Rate</th>
                      <th className="py-3 px-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems?.map((item: any) => (
                      <tr key={item._id} className="border-b border-surface-container/50 last:border-0 hover:bg-surface-container-lowest/50">
                        <td className="py-4 px-2 text-sm text-on-background">
                          <p className="font-medium">{item.description}</p>
                        </td>
                        <td className="py-4 px-2 text-sm text-on-surface-variant text-right">{item.quantity}</td>
                        <td className="py-4 px-2 text-sm text-on-surface-variant text-right">{formatCurrency(item.rate, invoice.currency)}</td>
                        <td className="py-4 px-2 text-sm font-semibold text-on-background text-right">{formatCurrency(item.amount, invoice.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Section */}
            <div className="flex flex-col items-end mb-10">
               <div className="w-full sm:w-1/2 space-y-3">
                 <div className="flex justify-between text-sm text-on-surface-variant px-2">
                   <span>Subtotal</span>
                   <span className="font-medium text-on-background">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                 </div>
                 {invoice.discount > 0 && (
                    <div className="flex justify-between text-sm text-error px-2">
                      <span>Discount</span>
                      <span>-{formatCurrency(invoice.discount, invoice.currency)}</span>
                    </div>
                 )}
                 {invoice.taxAmount > 0 && (
                    <div className="flex justify-between text-sm text-on-surface-variant px-2">
                      <span>Tax ({invoice.taxRate}%)</span>
                      <span className="font-medium text-on-background">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                    </div>
                 )}
                 <div className="flex justify-between items-center text-lg font-bold text-on-background pt-3 border-t border-surface-container px-2">
                   <span>Total Due</span>
                   <span className="font-mono text-xl text-primary">{formatCurrency(invoice.total, invoice.currency)}</span>
                 </div>
               </div>
            </div>

            {/* Notes & Terms */}
            {(invoice.notes || invoice.terms) && (
              <div className="pt-8 border-t border-surface-container grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                {invoice.notes && (
                  <div>
                    <span className="font-bold text-on-surface-variant uppercase tracking-wider text-xs block mb-2">Notes</span>
                    <p className="text-on-surface-variant whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <span className="font-bold text-on-surface-variant uppercase tracking-wider text-xs block mb-2">Terms</span>
                    <p className="text-on-surface-variant whitespace-pre-wrap leading-relaxed">{invoice.terms}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Info & Timeline */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card p-6 border border-outline-variant/10 shadow-sm">
             <h3 className="font-bold text-lg text-on-background font-headline mb-4">Dates</h3>
             <div className="space-y-4">
               <div className="flex items-start gap-4">
                 <div className="p-2 bg-surface-container-low rounded-lg text-on-surface-variant border border-outline-variant/10"><Calendar className="w-4 h-4" /></div>
                 <div>
                   <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Issue Date</p>
                   <p className="text-sm font-medium text-on-background">{formatDate(invoice.issuedDate)}</p>
                 </div>
               </div>
               <div className="flex items-start gap-4">
                 <div className="p-2 bg-error/10 text-error rounded-lg border border-error/20"><Clock className="w-4 h-4" /></div>
                 <div>
                   <p className="text-xs text-on-surface-variant font-semibold uppercase tracking-wider">Due Date</p>
                   <p className={`text-sm font-medium ${invoice.isOverdue && invoice.status !== 'paid' ? 'text-error' : 'text-on-background'}`}>
                     {formatDate(invoice.dueDate)}
                   </p>
                   {invoice.isOverdue && invoice.status !== 'paid' && <p className="text-xs text-error font-bold mt-0.5">Overdue</p>}
                 </div>
               </div>
             </div>
          </div>

          <div className="card p-6 border border-outline-variant/10 shadow-sm">
             <h3 className="font-bold text-lg text-on-background font-headline mb-4">Payment</h3>
             {invoice.status === 'paid' ? (
                <div className="p-4 bg-tertiary/10 border border-tertiary/20 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-tertiary rounded-full text-white"><CheckCircle2 className="w-5 h-5"/></div>
                  <div>
                    <p className="text-sm font-bold text-tertiary">Paid in Full</p>
                    <p className="text-xs text-tertiary/80">{invoice.paidAt ? formatDate(invoice.paidAt) : 'Manual entry'}</p>
                  </div>
                </div>
             ) : invoice.razorpayPaymentLinkUrl ? (
                <div className="space-y-4">
                   <div className="p-3 bg-surface-container-low border border-outline-variant/20 rounded-xl text-center">
                     <p className="text-xs text-on-surface-variant mb-2">Payment Link Active</p>
                     <p className="text-sm font-bold text-on-background break-all">{invoice.razorpayPaymentLinkUrl}</p>
                   </div>
                   <button onClick={() => { navigator.clipboard.writeText(invoice.razorpayPaymentLinkUrl); alert("Copied!"); }} className="w-full btn-secondary py-2 text-sm justify-center">Copy Link</button>
                </div>
             ) : (
                <div className="text-center py-6 text-sm text-on-surface-variant">
                   No payment link generated. <br/>
                   <span className="text-xs block mt-2 opacity-70">Requires Razorpay integration to enable dynamic link sharing.</span>
                </div>
             )}
          </div>
          
          {/* History */}
          <div className="card p-6 border border-outline-variant/10 shadow-sm">
             <h3 className="font-bold text-lg text-on-background font-headline mb-4 flex items-center gap-2">Activity</h3>
             <div className="space-y-4 pl-2 border-l-2 border-surface-container ml-2">
                <div className="relative pl-4">
                  <div className="absolute w-2 h-2 bg-primary rounded-full -left-[5px] top-1.5" />
                  <p className="text-sm font-medium text-on-background">Created</p>
                  <p className="text-xs text-on-surface-variant">{formatDate(invoice.createdAt)}</p>
                </div>
                {invoice.sentAt && (
                   <div className="relative pl-4">
                    <div className="absolute w-2 h-2 bg-secondary rounded-full -left-[5px] top-1.5" />
                    <p className="text-sm font-medium text-on-background">Sent via Email</p>
                    <p className="text-xs text-on-surface-variant">{formatDate(invoice.sentAt)}</p>
                  </div>
                )}
                {invoice.viewedAt && (
                   <div className="relative pl-4">
                    <div className="absolute w-2 h-2 bg-tertiary rounded-full -left-[5px] top-1.5" />
                    <p className="text-sm font-medium text-on-background">Viewed by Client</p>
                    <p className="text-xs text-on-surface-variant">{formatDate(invoice.viewedAt)}</p>
                  </div>
                )}
                {invoice.paidAt && (
                   <div className="relative pl-4">
                    <div className="absolute w-2 h-2 bg-tertiary rounded-full -left-[5px] top-1.5" />
                    <p className="text-sm font-medium text-on-background">Marked as Paid</p>
                    <p className="text-xs text-on-surface-variant">{formatDate(invoice.paidAt)}</p>
                  </div>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
