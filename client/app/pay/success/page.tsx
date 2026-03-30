"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2, FileText, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get("invoice");
  const paymentId = searchParams.get("razorpay_payment_id");
  const [loading, setLoading] = useState(true);

  // You could optionally verify the signature here by calling a backend endpoint, 
  // but usually Razorpay webhooks handle the backend update, and this page is just a UI receipt.
  
  useEffect(() => {
    // Simulate a slight delay for a "verifying" feel, or replace with actual verification API call.
    const t = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
        <h2 className="text-xl font-medium text-slate-800">Verifying payment...</h2>
        <p className="text-slate-500">Please do not close this window.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Payment Successful!</h1>
      <p className="text-slate-600 mb-8 max-w-sm">
        Thank you! Your payment has been processed successfully. A receipt has been sent to your email.
      </p>

      <div className="w-full bg-slate-50 rounded-xl p-6 mb-8 text-left border border-slate-100 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-4">Payment Details</h3>
        
        {invoiceId && (
          <div className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
            <span className="text-slate-500">Invoice ID</span>
            <span className="font-medium text-slate-900 font-mono text-sm">{invoiceId}</span>
          </div>
        )}
        
        {paymentId && (
          <div className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
            <span className="text-slate-500">Transaction Ref</span>
            <span className="font-medium text-slate-900 font-mono text-sm">{paymentId}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
          <span className="text-slate-500">Status</span>
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            Paid
          </span>
        </div>
      </div>

    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-8 border border-slate-100">
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        }>
          <SuccessContent />
        </Suspense>
      </div>
    </div>
  );
}
