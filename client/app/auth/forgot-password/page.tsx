"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Zap } from "lucide-react";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await api.post("/auth/forgot-password", { email: fd.get("email") });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <nav className="h-20 flex items-center justify-between px-8 md:px-12 fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg primary-gradient flex items-center justify-center">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="text-xl font-headline font-bold text-on-surface tracking-tighter">InvoiceHive</span>
        </div>
        <Link href="/auth/login" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">Back to login</Link>
      </nav>

      <main className="flex-grow flex items-center justify-center px-6 pt-20 pb-12">
        <div className="w-full max-w-[440px]">
          <div className="card p-8 md:p-10 border border-outline-variant/10">
            {success ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface">Check your email</h1>
                <p className="text-on-surface-variant text-sm pb-4">
                  We've sent password reset instructions to your email address.
                </p>
                <Link href="/auth/login" className="btn-primary w-full h-12 justify-center text-base flex mt-4">
                  Return to login
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-10 text-center">
                  <h1 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface mb-2">Forgot password?</h1>
                  <p className="text-on-surface-variant text-sm">No worries, we'll send you reset instructions.</p>
                </div>

                {error && (
                  <div className="mb-5 px-4 py-3 rounded-xl bg-error-container/40 text-error text-sm font-medium">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="input-label" htmlFor="email">Email Address</label>
                    <input id="email" name="email" type="email" placeholder="name@company.com" className="input-field h-12" required />
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full h-12 justify-center text-base">
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : (
                      <>Send reset link <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </form>

                <div className="mt-8 flex items-center justify-center text-sm">
                  <Link href="/auth/login" className="font-semibold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                    <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
