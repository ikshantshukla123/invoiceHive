"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Plus, Search, Download, MoreHorizontal, Clock,
  CheckCircle2, AlertCircle, FileText, Send, Trash2,
  TrendingUp, IndianRupee, Eye, X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  useInvoices, useInvoiceStats,
  useSendInvoice, useDeleteInvoice, useDownloadInvoice,
} from "@/hooks/useApi";

// ── Constants ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: "All",      label: "All" },
  { key: "Draft",    label: "Draft" },
  { key: "Sent",     label: "Sent" },
  { key: "Viewed",   label: "Viewed" },
  { key: "Paid",     label: "Paid" },
  { key: "Overdue",  label: "Overdue" },
  { key: "Cancelled",label: "Cancelled" },
];

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  paid:      { label: "Paid",      cls: "badge-paid",    icon: <CheckCircle2 className="w-3 h-3" /> },
  sent:      { label: "Sent",      cls: "badge-sent",    icon: <Send className="w-3 h-3" /> },
  overdue:   { label: "Overdue",   cls: "badge-overdue", icon: <AlertCircle className="w-3 h-3" /> },
  draft:     { label: "Draft",     cls: "badge-draft",   icon: <FileText className="w-3 h-3" /> },
  viewed:    { label: "Viewed",    cls: "badge-viewed",  icon: <Eye className="w-3 h-3" /> },
  cancelled: { label: "Cancelled", cls: "badge-draft",   icon: <X className="w-3 h-3" /> },
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider truncate">
          {label}
        </p>
        <p className="text-xl font-bold font-headline mono-num text-on-background mt-0.5 truncate">
          {value}
        </p>
        {sub && <p className="text-[10px] text-on-surface-variant mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function InvoicesPage() {
  const [tab,      setTab]      = useState("All");
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [menuId,   setMenuId]   = useState<string | null>(null);

  const params = {
    status:   tab !== "All" ? tab.toLowerCase() : undefined,
    search:   search || undefined,
    page,
    limit:    20,
    sortBy:   "createdAt",
    sortOrder:"desc",
  };

  const { data, isLoading }     = useInvoices(params);
  const { data: statsData }     = useInvoiceStats();
  const sendMutation            = useSendInvoice();
  const deleteMutation          = useDeleteInvoice();
  const downloadMutation        = useDownloadInvoice();

  const invoices   = data?.data        || [];
  const pagination = data?.pagination;
  const stats      = statsData?.summary;

  // ── Action handlers ─────────────────────────────────────────────
  const handleSend = async (id: string) => {
    setMenuId(null);
    try   { await sendMutation.mutateAsync(id); }
    catch (e: any) { alert(e?.response?.data?.message || "Failed to send invoice"); }
  };

  const handleDelete = async (id: string, status: string) => {
    const verb = ["draft","cancelled"].includes(status) ? "permanently delete" : "cancel";
    if (!confirm(`Are you sure you want to ${verb} this invoice?`)) return;
    setMenuId(null);
    try   { await deleteMutation.mutateAsync(id); }
    catch (e: any) { alert(e?.response?.data?.message || "Failed to delete"); }
  };

  const handleDownload = async (id: string) => {
    setMenuId(null);
    try   { await downloadMutation.mutateAsync(id); }
    catch (e: any) { alert("Failed to download PDF"); }
  };

  // ── Render ──────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-on-background">Invoices</h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            {pagination?.total ?? "—"} total invoices
          </p>
        </div>
        <Link href="/invoices/new" className="btn-primary">
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
      </div>

      {/* KPI row */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"  value={formatCurrency(stats.totalRevenue)}
            sub={`${stats.countPaid} paid`}
            icon={<TrendingUp className="w-4 h-4" />} color="bg-indigo-50 text-primary"
          />
          <StatCard
            label="Outstanding"   value={formatCurrency(stats.totalOutstanding)}
            sub={`${stats.countSent} awaiting`}
            icon={<Clock className="w-4 h-4" />} color="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Overdue"       value={formatCurrency(stats.totalOverdue)}
            sub={`${stats.countOverdue} invoices`}
            icon={<AlertCircle className="w-4 h-4" />} color="bg-red-50 text-error"
          />
          <StatCard
            label="Drafts"        value={String(stats.countDraft)}
            sub="ready to send"
            icon={<FileText className="w-4 h-4" />} color="bg-slate-100 text-slate-500"
          />
        </div>
      )}

      {/* Main card */}
      <div className="card overflow-visible">

        {/* Tabs + search bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 pt-5 pb-0 border-b border-surface-container">
          {/* Tabs */}
          <div className="flex gap-0.5 overflow-x-auto scrollbar-thin pb-0">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setTab(key); setPage(1); }}
                className={`px-3.5 py-2.5 text-sm font-semibold font-headline whitespace-nowrap transition-all duration-150 border-b-2 -mb-px ${
                  tab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-xl mb-2 ring-1 ring-black/[0.04]">
            <Search className="w-3.5 h-3.5 text-outline flex-shrink-0" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search invoice or client..."
              className="bg-transparent border-none outline-none text-sm w-44 placeholder:text-outline"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-outline hover:text-on-surface">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-6 space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 rounded-lg bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-20 text-center text-on-surface-variant flex flex-col items-center gap-3">
            <FileText className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">
              {search ? `No results for "${search}"` : "No invoices yet"}
            </p>
            {!search && (
              <Link href="/invoices/new" className="btn-primary text-sm mt-1">
                Create your first invoice
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-surface-container-low/40">
                  {["Invoice", "Client", "Amount", "Issued", "Due", "Status", ""].map(h => (
                    <th
                      key={h}
                      className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left first:pl-6 last:w-10"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {invoices.map((inv: any) => {
                  const sc = STATUS_CONFIG[inv.status] || STATUS_CONFIG.draft;
                  const isOverdue = inv.isOverdue && inv.status !== "paid";
                  return (
                    <tr
                      key={inv._id}
                      className="hover:bg-surface-container-low/40 transition-colors group"
                    >
                      {/* Invoice # */}
                      <td className="px-5 py-3.5 pl-6">
                        <Link
                          href={`/invoices/${inv._id}`}
                          className="mono-num text-sm font-bold text-primary hover:underline underline-offset-2"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>

                      {/* Client */}
                      <td className="px-5 py-3.5 text-sm font-semibold text-on-background max-w-[160px]">
                        <p className="truncate">
                          {inv.toDetails?.company || inv.toDetails?.name || "—"}
                        </p>
                        {inv.toDetails?.company && inv.toDetails?.name && (
                          <p className="text-[11px] text-on-surface-variant truncate">
                            {inv.toDetails.name}
                          </p>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3.5 mono-num text-sm font-bold text-on-background">
                        {formatCurrency(inv.total, inv.currency)}
                      </td>

                      {/* Issued */}
                      <td className="px-5 py-3.5 text-sm text-on-surface-variant">
                        {formatDate(inv.createdAt)}
                      </td>

                      {/* Due */}
                      <td className="px-5 py-3.5 text-sm">
                        <span className={isOverdue ? "text-error font-semibold" : "text-on-surface-variant"}>
                          {formatDate(inv.dueDate)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span className={`${sc.cls} inline-flex items-center gap-1`}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>

                      {/* Actions menu */}
                      <td className="px-3 py-3.5 relative">
                        <button
                          onClick={() => setMenuId(menuId === inv._id ? null : inv._id)}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg hover:bg-surface-container transition-all text-on-surface-variant"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {menuId === inv._id && (
                          <>
                            {/* Click-away backdrop */}
                            <div
                              className="fixed inset-0 z-30"
                              onClick={() => setMenuId(null)}
                            />
                            <div className="absolute right-8 top-9 z-40 w-48 bg-white border border-outline-variant/20 rounded-xl shadow-elevated py-1.5 overflow-hidden">
                              {/* View */}
                              <Link
                                href={`/invoices/${inv._id}`}
                                onClick={() => setMenuId(null)}
                                className="w-full px-4 py-2.5 text-sm text-left hover:bg-surface-container-low flex items-center gap-2.5 font-medium text-on-background transition-colors"
                              >
                                <Eye className="w-4 h-4 text-outline" /> View Details
                              </Link>

                              {/* Send — only draft */}
                              {inv.status === "draft" && (
                                <button
                                  onClick={() => handleSend(inv._id)}
                                  disabled={sendMutation.isPending}
                                  className="w-full px-4 py-2.5 text-sm text-left hover:bg-surface-container-low flex items-center gap-2.5 font-medium text-on-background transition-colors disabled:opacity-50"
                                >
                                  <Send className="w-4 h-4 text-primary" /> Send Invoice
                                </button>
                              )}

                              {/* Download PDF */}
                              <button
                                onClick={() => handleDownload(inv._id)}
                                disabled={downloadMutation.isPending}
                                className="w-full px-4 py-2.5 text-sm text-left hover:bg-surface-container-low flex items-center gap-2.5 font-medium text-on-background transition-colors disabled:opacity-50"
                              >
                                <Download className="w-4 h-4 text-outline" /> Download PDF
                              </button>

                              {/* Delete / Cancel */}
                              {inv.status !== "paid" && (
                                <>
                                  <div className="my-1 border-t border-surface-container" />
                                  <button
                                    onClick={() => handleDelete(inv._id, inv.status)}
                                    className="w-full px-4 py-2.5 text-sm text-left hover:bg-error/5 flex items-center gap-2.5 font-medium text-error transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    {["draft","cancelled"].includes(inv.status)
                                      ? "Delete Permanently"
                                      : "Cancel Invoice"}
                                  </button>
                                </>
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
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-surface-container">
            <p className="text-xs text-on-surface-variant">
              Showing <span className="font-semibold text-on-background">{invoices.length}</span> of{" "}
              <span className="font-semibold text-on-background">{pagination.total}</span> invoices
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!pagination.hasPrev}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(pagination.pages, 5) }).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      p === page
                        ? "primary-gradient text-white"
                        : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!pagination.hasNext}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}