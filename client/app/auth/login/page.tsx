"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Lock, ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await login(fd.get("email") as string, fd.get("password") as string);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Invalid email or password");
    } finally { setLoading(false); }
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
        <Link href="/" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">Back to site</Link>
      </nav>

      <main className="flex-grow flex items-center justify-center px-6 pt-20 pb-12">
        <div className="w-full max-w-[440px]">
          <div className="card p-8 md:p-10 border border-outline-variant/10">
            <div className="mb-10 text-center">
              <h1 className="text-2xl font-headline font-extrabold tracking-tight text-on-surface mb-2">Welcome back</h1>
              <p className="text-on-surface-variant text-sm">Enter your credentials to access your ledger.</p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-xl bg-error-container/40 text-error text-sm font-medium">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="input-label" htmlFor="email">Email Address</label>
                <input id="email" name="email" type="email" placeholder="name@company.com" className="input-field h-12" required />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="input-label mb-0" htmlFor="password">Password</label>
                  <Link href="/auth/forgot-password" className="text-[11px] font-bold text-primary hover:opacity-80">Forgot password?</Link>
                </div>
                <div className="relative">
                  <input id="password" name="password" type={showPass ? "text" : "password"} placeholder="••••••••" className="input-field h-12 pr-12" required />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant p-1">
                    {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full h-12 justify-center text-base">
                {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in...</span> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant/20" /></div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-surface-container-lowest px-4 text-outline font-medium uppercase tracking-widest">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <a href={`${API}/auth/oauth/google`} className="flex items-center justify-center gap-3 h-12 border border-outline-variant/20 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-semibold text-on-surface">Google</span>
              </a>
              <a href={`${API}/auth/oauth/github`} className="flex items-center justify-center gap-3 h-12 border border-outline-variant/20 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors">
                <svg className="w-5 h-5 text-on-background" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                <span className="text-sm font-semibold text-on-surface">GitHub</span>
              </a>
            </div>

            <div className="mt-10 text-center">
              <p className="text-sm text-on-surface-variant">
                Don't have an account?{" "}
                <Link href="/auth/register" className="font-bold text-primary hover:underline ml-1">Create an account</Link>
              </p>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-center gap-8 opacity-40">
            <div className="flex items-center gap-2"><Lock className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase tracking-widest">AES-256 Encrypted</span></div>
            <div className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5" /><span className="text-[10px] font-bold uppercase tracking-widest">ISO 27001</span></div>
          </div>
        </div>
      </main>
    </div>
  );
}