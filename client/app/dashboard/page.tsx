"use client";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Clock, AlertCircle, ArrowRight, CheckCircle2, Users, FileText } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useInvoiceStats, useInvoices } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="card px-4 py-3">
        <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider mb-1">{label}</p>
        <p className="mono-num text-lg font-bold text-on-background">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

const STATUS_BADGE: Record<string, React.ReactNode> = {
  paid:    <span className="badge-paid"><CheckCircle2 className="w-3 h-3" />Paid</span>,
  sent:    <span className="badge-sent"><Clock className="w-3 h-3" />Sent</span>,
  overdue: <span className="badge-overdue"><AlertCircle className="w-3 h-3" />Overdue</span>,
  draft:   <span className="badge-draft">Draft</span>,
  viewed:  <span className="badge-viewed"><Clock className="w-3 h-3" />Viewed</span>,
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: statsData, isLoading: statsLoading } = useInvoiceStats();
  const { data: invoicesData, isLoading: invLoading }  = useInvoices({ limit: 5, sortBy: "createdAt", sortOrder: "desc" });

  const stats   = statsData?.summary;
  const monthly = statsData?.monthlyRevenue || [];
  const invoices = invoicesData?.data || [];

  const chartData = monthly.map((m: any) => ({
    month: m._id?.split("-")[1] ? ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][parseInt(m._id.split("-")[1])] : m._id,
    revenue: m.total,
  }));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-on-background">
            Hii{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-on-surface-variant mt-1 text-sm">Here's your financial overview.</p>
        </div>
        <button className="btn-secondary text-sm">Last 30 Days</button>
      </div>

      {/* KPI grid */}
      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_,i) => <div key={i} className="card p-6 h-32 animate-pulse bg-surface-container" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard label="Total Revenue"  value={formatCurrency(stats?.totalRevenue || 0)}     change="+12%" positive icon={<div className="p-2 rounded-lg bg-indigo-50 text-primary"><TrendingUp className="w-5 h-5" /></div>} />
          <KPICard label="Outstanding"    value={formatCurrency(stats?.totalOutstanding || 0)} badge="Pending"          icon={<div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Clock className="w-5 h-5" /></div>} />
          <KPICard label="Overdue"        value={formatCurrency(stats?.totalOverdue || 0)}      badge={`${stats?.countOverdue || 0} invoices`} icon={<div className="p-2 rounded-lg bg-red-50 text-error"><AlertCircle className="w-5 h-5" /></div>} />
          <KPICard label="Paid Invoices"  value={String(stats?.countPaid || 0)}                change="this month" positive icon={<div className="p-2 rounded-lg bg-emerald-50 text-tertiary"><CheckCircle2 className="w-5 h-5" /></div>} />
        </div>
      )}

      {/* Chart + quick stats */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 card p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-base font-bold font-headline text-on-background">Revenue Trend</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">12-month performance</p>
            </div>
            {chartData.length > 0 && (
              <span className="text-[11px] font-bold text-tertiary px-2.5 py-1 rounded-full bg-tertiary-fixed/20 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Growing
              </span>
            )}
          </div>
          {chartData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-on-surface-variant text-sm">
              <div className="text-center">
                <BarChart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No revenue data yet — send your first invoice!</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3525cd" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#3525cd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7effa" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#777587" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#777587" }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#3525cd", strokeWidth: 1, strokeDasharray: "4 4" }} />
                <Area type="monotone" dataKey="revenue" stroke="#3525cd" strokeWidth={2} fill="url(#grad)" dot={false} activeDot={{ r: 4, fill: "#3525cd" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
          {[
            { label: "Invoices sent",   value: String(stats?.countSent || 0),   sub: "awaiting payment" },
            { label: "Drafts",          value: String(stats?.countDraft || 0),   sub: "ready to send" },
            { label: "Total invoices",  value: String(stats?.totalCount || 0),   sub: "all time" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="card p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-on-surface-variant font-semibold uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-bold font-headline text-on-background mono-num mt-1">{value}</p>
              </div>
              <p className="text-xs text-on-surface-variant">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent invoices */}
      <div className="card overflow-hidden">
        <div className="flex justify-between items-center px-6 py-5 border-b border-surface-container">
          <h2 className="text-base font-bold font-headline text-on-background">Recent Invoices</h2>
          <Link href="/invoices" className="btn-ghost text-xs">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
        </div>
        {invLoading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="h-10 rounded-lg bg-surface-container animate-pulse" />)}</div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant">
            <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium mb-3">No invoices yet</p>
            <Link href="/invoices/new" className="btn-primary text-sm">Create your first invoice</Link>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low/50">
                {["Invoice","Client","Amount","Date","Status"].map(h => (
                  <th key={h} className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {invoices.map((inv: any) => (
                <tr key={inv._id} className="hover:bg-surface-container-low/40 transition-colors cursor-pointer" onClick={() => {}}>
                  <td className="px-6 py-4 mono-num text-sm font-semibold text-primary">{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 text-sm font-medium text-on-background">{inv.toDetails?.name || "—"}</td>
                  <td className="px-6 py-4 mono-num text-sm font-bold text-on-background">{formatCurrency(inv.total, inv.currency)}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant">{formatDate(inv.createdAt)}</td>
                  <td className="px-6 py-4">{STATUS_BADGE[inv.status] || <span className="badge-draft">{inv.status}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "New Invoice",  href: "/invoices/new", icon: <FileText className="w-5 h-5" />,  desc: "Create and send an invoice" },
          { label: "Add Client",   href: "/clients",      icon: <Users className="w-5 h-5" />,     desc: "Add a new client to your book" },
          { label: "View Payments",href: "/payments",     icon: <TrendingUp className="w-5 h-5" />, desc: "See your payment history" },
        ].map(({ label, href, icon, desc }) => (
          <Link key={href} href={href} className="card p-5 flex items-center gap-4 hover:shadow-elevated transition-all duration-200 group">
            <div className="p-3 rounded-xl bg-primary-fixed/30 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-200">{icon}</div>
            <div>
              <p className="text-sm font-bold font-headline text-on-background">{label}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-on-surface-variant ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BarChart(props: any) { return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="12" width="4" height="8"/><rect x="10" y="8" width="4" height="12"/><rect x="17" y="4" width="4" height="16"/></svg>; }

function KPICard({ label, value, change, positive, badge, icon }: { label: string; value: string; change?: string; positive?: boolean; badge?: string; icon: React.ReactNode; }) {
  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex justify-between items-start">
        {icon}
        {badge && <span className="text-[11px] font-bold text-slate-500 px-2.5 py-0.5 rounded-full bg-surface-container-highest">{badge}</span>}
        {change && (
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${positive ? "text-tertiary bg-tertiary-fixed/25" : "text-error bg-error-container/40"}`}>
            {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {change}
          </span>
        )}
      </div>
      <div>
        <p className="text-on-surface-variant text-[11px] font-semibold uppercase tracking-wider">{label}</p>
        <h2 className="text-[28px] font-bold font-headline mono-num mt-1">{value}</h2>
      </div>
    </div>
  );
}