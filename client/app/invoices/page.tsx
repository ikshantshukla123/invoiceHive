"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Search, Filter, Download, MoreHorizontal, Clock, CheckCircle2, AlertCircle, FileText, Send, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useInvoices, useInvoiceStats, useSendInvoice, useDeleteInvoice, useDownloadInvoice } from "@/hooks/useApi";

const TABS = ["All", "Draft", "Sent", "Paid", "Overdue"];

const STATUS_CONFIG: Record<string, { label: string; badge: string; icon: React.ReactNode }> = {
  paid:    { label: "Paid",    badge: "badge-paid",    icon: <CheckCircle2 className="w-3 h-3" /> },
  sent:    { label: "Sent",    badge: "badge-sent",    icon: <Send className="w-3 h-3" /> },
  overdue: { label: "Overdue", badge: "badge-overdue", icon: <AlertCircle className="w-3 h-3" /> },
  draft:   { label: "Draft",   badge: "badge-draft",   icon: <FileText className="w-3 h-3" /> },
  viewed:  { label: "Viewed",  badge: "badge-viewed",  icon: <Clock className="w-3 h-3" /> },
};

export default function InvoicesPage() {
  const [activeTab,  setActiveTab]  = useState("All");
  const [search,     setSearch]     = useState("");
  const [page,       setPage]       = useState(1);
  const [openMenu,   setOpenMenu]   = useState<string | null>(null);

  const params = {
    status:  activeTab !== "All" ? activeTab.toLowerCase() : undefined,
    search:  search || undefined,
    page, limit: 20,
  };

  const { data, isLoading }             = useInvoices(params);
  const { data: statsData }             = useInvoiceStats();
  const sendMutation                    = useSendInvoice();
  const deleteMutation                  = useDeleteInvoice();
  const downloadMutation                = useDownloadInvoice();

  const invoices   = data?.data || [];
  const pagination = data?.pagination;
  const stats      = statsData?.summary;

  const handleSend = async (id: string) => {
    setOpenMenu(null);
    try { await sendMutation.mutateAsync(id); }
    catch (e: any) { alert(e?.response?.data?.message || "Failed to send"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this invoice?")) return;
    setOpenMenu(null);
    try { await deleteMutation.mutateAsync(id); }
    catch (e: any) { alert(e?.response?.data?.message || "Failed to delete"); }
  };

  const handleDownload = async (id: string) => {
    setOpenMenu(null);
    await downloadMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-on-background">Invoices</h1>
          <p className="text-on-surface-variant mt-1 text-sm">{pagination?.total || 0} total invoices</p>
        </div>
        <div className="flex gap-3">
          <Link href="/invoices/new" className="btn-primary"><Plus className="w-4 h-4" /> New Invoice</Link>
        </div>
      </div>

      {/* Summary pills */}
      {stats && (
        <div className="flex gap-3 flex-wrap">
          {[
            { label: "Total billed",  value: formatCurrency(stats.totalRevenue + stats.totalOutstanding + stats.totalOverdue) },
            { label: "Paid",          value: formatCurrency(stats.totalRevenue) },
            { label: "Outstanding",   value: formatCurrency(stats.totalOutstanding) },
            { label: "Overdue",       value: formatCurrency(stats.totalOverdue) },
          ].map(({ label, value }) => (
            <div key={label} className="card px-5 py-3 flex items-center gap-3">
              <span className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider">{label}</span>
              <span className="mono-num text-sm font-bold text-on-background">{value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-visible">
        {/* Tabs + search */}
        <div className="flex justify-between items-center px-6 pt-5 pb-0 border-b border-surface-container">
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`px-4 py-2.5 text-sm font-semibold font-headline transition-all duration-200 border-b-2 -mb-px ${activeTab===tab ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:text-on-surface"}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-lg">
              <Search className="w-3.5 h-3.5 text-outline" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="bg-transparent border-none outline-none text-sm w-40 placeholder:text-outline" />
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_,i) => <div key={i} className="h-12 rounded-lg bg-surface-container animate-pulse" />)}</div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium mb-3">No invoices found</p>
            <Link href="/invoices/new" className="btn-primary text-sm">Create your first invoice</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low/30">
                {["Invoice #","Client","Amount","Issued","Due","Status",""].map(h => (
                  <th key={h} className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {invoices.map((inv: any) => {
                const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                return (
                  <tr key={inv._id} className="hover:bg-surface-container-low/40 transition-colors group relative">
                    <td className="px-6 py-4 mono-num text-sm font-bold text-primary"><Link href={`/invoices/${inv._id}`} className="hover:underline">{inv.invoiceNumber}</Link></td>
                    <td className="px-6 py-4 text-sm font-semibold text-on-background">{inv.toDetails?.name || inv.toDetails?.company || "—"}</td>
                    <td className="px-6 py-4 mono-num text-sm font-bold text-on-background">{formatCurrency(inv.total, inv.currency)}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{formatDate(inv.createdAt)}</td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant">{formatDate(inv.dueDate)}</td>
                    <td className="px-6 py-4"><span className={sc.badge}>{sc.icon} {sc.label}</span></td>
                    <td className="px-6 py-4 relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === inv._id ? null : inv._id)}
                        className="opacity-100 md:opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-surface-container transition-all text-on-surface-variant focus:opacity-100"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {openMenu === inv._id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                          <div className="absolute right-10 top-10 z-50 w-48 bg-white border border-outline-variant/30 rounded-lg shadow-xl py-1.5 flex flex-col overflow-hidden">
                            <Link href={`/invoices/${inv._id}`} className="w-full px-4 py-2.5 text-sm text-left hover:bg-surface-container-low flex items-center gap-2 font-medium text-on-background transition-colors">
                              <FileText className="w-4 h-4 text-on-surface-variant" /> View Details
                            </Link>
                            {inv.status === "draft" && (
                              <button onClick={() => handleSend(inv._id)} className="w-full px-4 py-2.5 text-sm text-left hover:bg-surface-container-low flex items-center gap-2 font-medium text-on-background transition-colors">
                                <Send className="w-4 h-4 text-primary" /> Send Invoice
                              </button>
                            )}
                            <button onClick={() => handleDownload(inv._id)} className="w-full px-4 py-2.5 text-sm text-left hover:bg-surface-container-low flex items-center gap-2 font-medium text-on-background transition-colors">
                              <Download className="w-4 h-4 text-on-surface-variant" /> Download PDF
                            </button>
                            {inv.status !== "paid" && (
                              <button onClick={() => handleDelete(inv._id)} className="w-full px-4 py-2.5 text-sm text-left hover:bg-error/10 flex items-center gap-2 font-medium text-error transition-colors">
                                <Trash2 className="w-4 h-4" /> {["draft", "cancelled"].includes(inv.status) ? "Delete Permanently" : "Cancel Invoice"}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-surface-container">
            <p className="text-xs text-on-surface-variant">Showing {invoices.length} of {pagination.total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={!pagination.hasPrev} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors">Previous</button>
              <span className="px-3 py-1.5 text-xs font-semibold rounded-lg primary-gradient text-white">{page}</span>
              <button onClick={() => setPage(p => p+1)} disabled={!pagination.hasNext} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
