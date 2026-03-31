"use client";
import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Trash2, Send, Save, Download, Copy, User, List, FileText, Zap, Building2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useClients, useCreateInvoice, useCreateClient, useSendInvoice, useCreatePaymentOrder } from "@/hooks/useApi";
import { useAuth } from "@/context/AuthContext";

interface LineItem { id: string; description: string; quantity: number; rate: number; unit: string; }

export default function CreateInvoicePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: clientsData } = useClients({ limit: 100 });
  const createInvoice  = useCreateInvoice();
  const sendInvoice    = useSendInvoice();
  const createPayLink  = useCreatePaymentOrder();

  const clients = clientsData?.data || [];
  const [clientId,   setClientId]   = useState("");
  const [issueDate,  setIssueDate]  = useState(new Date().toISOString().split("T")[0]);
  const [dueDate,    setDueDate]    = useState(() => { const d = new Date(); d.setDate(d.getDate()+30); return d.toISOString().split("T")[0]; });
  const [currency,   setCurrency]   = useState("USD");
  const [taxRate,    setTaxRate]    = useState(0);
  const [notes,      setNotes]      = useState("");
  const [items, setItems] = useState<LineItem[]>([{ id: "1", description: "", quantity: 1, rate: 0, unit: "" }]);
  const [saving,   setSaving]   = useState(false);
  const [sending,  setSending]  = useState(false);
  const [error,    setError]    = useState("");

  const selectedClient = clients.find((c: any) => c._id === clientId);

  const updateItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }, []);

  const addItem    = () => setItems(prev => [...prev, { id: Date.now().toString(), description: "", quantity: 1, rate: 0, unit: "" }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const subtotal  = items.reduce((s, i) => s + (i.quantity * i.rate), 0);
  const taxAmount = (subtotal * taxRate) / 100;
  const total     = subtotal + taxAmount;

  const buildPayload = () => ({
    clientId,
    dueDate,
    issuedDate: issueDate,
    currency,
    taxRate,
    notes,
    lineItems: items.filter(i => i.description.trim()).map(({ description, quantity, rate, unit }) => ({ description, quantity, rate, unit })),
    fromDetails: {
      name:  user?.name || "",
      email: user?.email || "",
    },
  });

  const handleSaveDraft = async () => {
    if (!clientId) { setError("Please select a client"); return; }
    if (items.filter(i => i.description.trim()).length === 0) { setError("Add at least one line item"); return; }
    setError(""); setSaving(true);
    try {
      const inv = await createInvoice.mutateAsync(buildPayload());
      router.push("/invoices");
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "Failed to save");
    } finally { setSaving(false); }
  };

  const handleSendNow = async () => {
    if (!clientId) { setError("Please select a client"); return; }
    if (items.filter(i => i.description.trim()).length === 0) { setError("Add at least one line item"); return; }
    setError(""); setSending(true);
    try {
      // 1. Create invoice
      const inv = await createInvoice.mutateAsync(buildPayload());
      // 2. Create Stripe payment link
      try {
        await createPayLink.mutateAsync({
          invoiceId:     inv._id,
          invoiceNumber: inv.invoiceNumber,
          amount:        inv.total,
          currency:      inv.currency,
          clientId:      inv.clientId,
          clientEmail:   inv.toDetails?.email,
          clientName:    inv.toDetails?.name,
        });
      } catch { /* payment link failure is non-fatal */ }
      // 3. Send (generates PDF + emails client)
      await sendInvoice.mutateAsync(inv._id);
      router.push("/invoices");
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.response?.data?.errors?.[0]?.message || "Failed to send");
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <nav className="flex items-center gap-2 text-sm font-medium text-on-surface-variant mb-3">
            <Link href="/invoices" className="hover:text-primary transition-colors">Invoices</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-on-background">Create New Invoice</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight text-on-background">Create Invoice</h1>
          <p className="text-on-surface-variant mt-1 text-sm">Fill in the details below to generate a professional invoice.</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={handleSaveDraft} disabled={saving || sending} className="w-full md:w-auto inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 border border-outline-variant/30 bg-transparent hover:bg-surface-container-low h-10 px-4 py-2 text-on-surface-variant shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Save Draft
          </button>
          <button onClick={handleSendNow} disabled={saving || sending} className="w-full md:w-auto inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 bg-primary text-white hover:bg-primary/90 h-10 px-4 py-2 shadow-sm">
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Send Invoice
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-error/50 bg-error-container/20 p-4 text-error text-sm font-medium flex items-center gap-3">
           <Zap className="w-5 h-5"/> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Form */}
        <div className="col-span-1 lg:col-span-8 space-y-6">
          
          {/* Client Details Card */}
          <div className="rounded-xl border border-outline-variant/30 bg-white shadow-sm overflow-hidden">
            <div className="p-6 pb-4 border-b border-outline-variant/10 bg-surface-container-lowest/50">
              <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2 text-on-background">
                <User className="w-5 h-5 text-primary" /> Client Details
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium leading-none text-on-background">Client Selection</label>
                <div className="relative">
                  <select 
                    value={clientId} 
                    onChange={e => setClientId(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-outline-variant/50 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select a client...</option>
                    {clients.map((c: any) => <option key={c._id} value={c._id}>{c.name}{c.company ? ` — ${c.company}` : ""}</option>)}
                    <option value="__new__">+ Add new client...</option>
                  </select>
                  <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-outline-variant pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-on-background">Issue Date</label>
                <input 
                  type="date" 
                  value={issueDate} 
                  onChange={e => setIssueDate(e.target.value)} 
                  className="flex h-10 w-full rounded-md border border-outline-variant/50 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-on-background">Due Date</label>
                <input 
                  type="date" 
                  value={dueDate} 
                  onChange={e => setDueDate(e.target.value)} 
                  className="flex h-10 w-full rounded-md border border-outline-variant/50 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-on-background">Currency</label>
                <div className="relative">
                  <select 
                    value={currency} 
                    onChange={e => setCurrency(e.target.value)} 
                    className="flex h-10 w-full rounded-md border border-outline-variant/50 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    {["USD","EUR","GBP","INR","CAD","AUD"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-outline-variant pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium leading-none text-on-background">Tax Rate (%)</label>
                <input 
                  type="number" 
                  value={taxRate} 
                  onChange={e => setTaxRate(Number(e.target.value))} 
                  min={0} max={100} step={0.5}
                  className="flex h-10 w-full rounded-md border border-outline-variant/50 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50" 
                />
              </div>
            </div>
          </div>

          {/* Line Items Card */}
          <div className="rounded-xl border border-outline-variant/30 bg-white shadow-sm overflow-hidden">
             <div className="p-6 pb-4 border-b border-outline-variant/10 bg-surface-container-lowest/50 flex justify-between items-center">
              <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2 text-on-background">
                <List className="w-5 h-5 text-primary" /> Line Items
              </h3>
            </div>
            
            <div className="p-0 sm:p-2">
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm text-left">
                  <thead className="text-xs text-on-surface-variant bg-surface-container-low/30 border-b border-outline-variant/20">
                    <tr>
                      <th className="h-10 px-4 font-medium align-middle">Description</th>
                      <th className="h-10 px-4 font-medium align-middle w-24">Qty</th>
                      <th className="h-10 px-4 font-medium align-middle w-32">Rate</th>
                      <th className="h-10 px-4 font-medium align-middle w-32 text-right">Amount</th>
                      <th className="h-10 px-4 font-medium align-middle w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {items.map((item) => (
                      <tr key={item.id} className="group hover:bg-surface-container-low/20 transition-colors">
                        <td className="p-2">
                          <input 
                            type="text" 
                            value={item.description} 
                            onChange={e => updateItem(item.id, "description", e.target.value)}
                            placeholder="e.g. Website design..." 
                            className="flex h-9 w-full rounded-md border border-transparent hover:border-outline-variant/30 focus:border-outline-variant/50 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-outline-variant focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50" 
                          /> 
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" 
                            value={item.quantity} 
                            onChange={e => updateItem(item.id, "quantity", Number(e.target.value))}
                            className="flex h-9 w-full rounded-md border border-transparent hover:border-outline-variant/30 focus:border-outline-variant/50 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-mono" 
                            min={0} 
                          />
                        </td>
                        <td className="p-2">
                          <input 
                            type="number" 
                            value={item.rate} 
                            onChange={e => updateItem(item.id, "rate", Number(e.target.value))}
                            className="flex h-9 w-full rounded-md border border-transparent hover:border-outline-variant/30 focus:border-outline-variant/50 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-mono" 
                            min={0} 
                          />
                        </td>
                        <td className="p-2 text-right align-middle pr-4">
                          <span className="font-medium mono-num text-on-background">
                            {formatCurrency(item.quantity * item.rate, currency)}
                          </span>
                        </td>
                        <td className="p-2 align-middle text-center">
                          <button 
                            onClick={() => removeItem(item.id)} 
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-error disabled:pointer-events-none disabled:opacity-50 hover:bg-error/10 hover:text-error h-8 w-8 text-outline"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-outline-variant/10">
                <button 
                  onClick={addItem} 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 border border-outline-variant/30 bg-white hover:bg-surface-container-low hover:text-primary h-9 px-4 py-2 shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" /> Add Line Item
                </button>
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="rounded-xl border border-outline-variant/30 bg-white shadow-sm overflow-hidden">
             <div className="p-6 pb-4 border-b border-outline-variant/10 bg-surface-container-lowest/50">
              <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2 text-on-background">
                <FileText className="w-5 h-5 text-primary" /> Notes & Terms
              </h3>
            </div>
            <div className="p-6">
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                rows={4}
                placeholder="Enter any payment instructions, bank details, or terms of service..." 
                className="flex min-h-[80px] w-full rounded-md border border-outline-variant/50 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y" 
              />
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="col-span-1 lg:col-span-4 lg:sticky lg:top-8 space-y-6">
          <div className="rounded-xl border border-outline-variant/30 bg-white shadow-ambient overflow-hidden relative">
            <div className="absolute right-0 top-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10" />
            
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center mb-2 shadow-card">
                    <Zap className="w-4 h-4 fill-current" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-on-background">INVOICE</h2>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-outline-variant uppercase tracking-wider">Amount Due</p>
                  <p className="text-2xl font-black text-primary mono-num mt-0.5">{formatCurrency(total, currency)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm border-y border-outline-variant/10 py-4">
                <div>
                  <p className="text-[10px] font-bold text-outline-variant uppercase tracking-wider mb-1">To:</p>
                  {selectedClient ? (
                    <div className="text-on-background">
                      <p className="font-semibold">{selectedClient.name}</p>
                      <p className="text-xs text-on-surface-variant truncate" title={selectedClient.email}>{selectedClient.email}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-outline italic">Pending client...</p>
                  )}
                </div>
                <div className="text-right text-xs space-y-1">
                  <div className="flex justify-end gap-2"><span className="text-outline">Issued:</span> <span className="font-medium text-on-background">{issueDate}</span></div>
                  <div className="flex justify-end gap-2"><span className="text-outline">Due:</span> <span className="font-medium text-on-background">{dueDate}</span></div>
                </div>
              </div>

              <div className="space-y-3 min-h-[100px]">
                {items.filter(i => i.description).slice(0, 3).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-on-surface-variant truncate max-w-[140px] font-medium">{item.quantity}x {item.description}</span>
                    <span className="mono-num font-medium text-on-background">{formatCurrency(item.quantity * item.rate, currency)}</span>
                  </div>
                ))}
                {items.filter(i => i.description).length > 3 && (
                  <p className="text-[10px] text-outline text-center pt-2">+{items.filter(i=>i.description).length - 3} more items...</p>
                )}  
              </div>

              <div className="space-y-2 pt-4 border-t border-outline-variant/10 text-sm">
                <div className="flex justify-between text-on-surface-variant"><span>Subtotal</span><span className="mono-num">{formatCurrency(subtotal, currency)}</span></div>
                {taxRate > 0 && <div className="flex justify-between text-on-surface-variant"><span>Tax ({taxRate}%)</span><span className="mono-num">{formatCurrency(taxAmount, currency)}</span></div>}
              </div>

              <div className="bg-surface-container-low/50 rounded-lg p-3 flex items-start gap-3 border border-outline-variant/10">
                <div className="mt-0.5 w-6 h-6 rounded bg-white flex items-center justify-center text-primary shadow-sm border border-outline-variant/10">
                  <Building2 className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-outline-variant uppercase tracking-wider">Payment System</p>
                  <p className="text-xs font-medium text-on-surface-variant mt-0.5">Powered securely by Razorpay.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}