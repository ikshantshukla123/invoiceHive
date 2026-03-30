"use client";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, Zap, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import api from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirm = fd.get("confirmPassword") as string;

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message || "Failed to reset password. The link might exist or has expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center">
        <div className="mb-5 px-4 py-3 rounded-xl bg-error-container/40 text-error text-sm font-medium">Reset link is invalid or has expired.</div>
        <Link href="/auth/forgot-password" className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-base font-bold text-white bg-[#3525cd]">Request new link</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface">Password updated</h1>
        <p className="text-on-surface-variant text-sm pb-4">Your password has been successfully reset.</p>
        <Link href="/auth/login" className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-base font-bold text-white bg-[#3525cd] mt-4">
          Continue to login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface mb-2">Set new password</h1>
        <p className="text-on-surface-variant text-sm">Please create a strong password for your account.</p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-error-container/40 text-error text-sm font-medium">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="input-label" htmlFor="password">New Password</label>
          <div className="relative">
            <input 
              id="password" 
              name="password" 
              type={showPass ? "text" : "password"} 
              placeholder="••••••••" 
              className="input-field h-12 pr-12" 
              required 
              minLength={8}
            />
            <button 
              type="button" 
              onClick={() => setShowPass(!showPass)} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant p-1"
            >
              {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-2">Must be at least 8 characters, with 1 uppercase and 1 number.</p>
        </div>

        <div>
          <label className="input-label" htmlFor="confirmPassword">Confirm Password</label>
          <input 
            id="confirmPassword" 
            name="confirmPassword" 
            type={showPass ? "text" : "password"} 
            placeholder="••••••••" 
            className="input-field h-12" 
            required 
          />
        </div>

        <button type="submit" disabled={loading} className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-base font-bold text-white bg-[#3525cd] disabled:opacity-70">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Resetting...
            </span>
          ) : (
            <>Reset Password <ArrowRight className="w-4 h-4" /></>
          )}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Left side: Image */}
      <div className="hidden lg:block lg:w-1/2 relative bg-slate-100">
        <img 
          src="/auth.avif" 
          alt="Authentication background" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/10 mix-blend-multiply" />
      </div>

      {/* Right side: Form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <nav className="h-20 flex items-center justify-between px-8 md:px-12 w-full">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg primary-gradient flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="text-xl font-headline font-bold text-on-surface tracking-tighter">InvoiceHive</span>
          </div>
          <Link href="/auth/login" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
            Back to login
          </Link>
        </nav>

        <main className="flex-grow flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[400px]">
            <Suspense fallback={
              <div className="flex items-center justify-center py-10">
                <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            }>
              <ResetPasswordForm />
            </Suspense>
            
            <div className="mt-8 flex items-center justify-center gap-8 opacity-40">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">AES-256 Encrypted</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest">ISO 27001</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
