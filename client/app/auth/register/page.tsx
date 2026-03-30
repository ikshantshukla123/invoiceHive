"use client";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Zap } from "lucide-react";
import { api, setAccessToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setError(""); setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const { data } = await api.post("/auth/register", {
        name:     fd.get("name"),
        email:    fd.get("email"),
        password: fd.get("password"),
      });
      setAccessToken(data.accessToken);
      router.push("/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.errors?.[0]?.message || err?.response?.data?.message || "Registration failed";
      setError(msg);
    } finally { setLoading(false); }
  };

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
            Sign In
          </Link>
        </nav>

        <main className="flex-grow flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-[440px]">
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-headline font-extrabold tracking-tight text-on-background mb-2">Create your account</h1>
              <p className="text-on-surface-variant">Join 10,000+ businesses automating their financial workflows.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <a href={`${API}/auth/oauth/google`} className="flex items-center justify-center gap-3 px-6 py-3 border border-outline-variant/20 rounded-xl bg-white text-on-surface font-semibold text-sm">
                    <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Continue with Google
                  </a>
                  <a href={`${API}/auth/oauth/github`} className="flex items-center justify-center gap-3 px-6 py-3 border border-outline-variant/20 rounded-xl bg-white text-on-surface font-semibold text-sm">
                    <svg className="w-5 h-5 text-on-background" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                    Continue with GitHub
                  </a>
                </div>

                <div className="relative mb-8">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-outline-variant/10" /></div>
                  <div className="relative flex justify-center text-xs"><span className="px-4 bg-white text-on-surface-variant uppercase tracking-widest">Or continue with email</span></div>
                </div>

                {error && <div className="mb-5 px-4 py-3 rounded-xl bg-error-container/40 text-error text-sm font-medium">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="input-label" htmlFor="name">Full Name</label>
                    <input id="name" name="name" type="text" placeholder="Johnathan Doe" className="input-field py-3" required />
                  </div>
                  <div>
                    <label className="input-label" htmlFor="email">Email Address</label>
                    <input id="email" name="email" type="email" placeholder="name@company.com" className="input-field py-3" required />
                  </div>
                  <div>
                    <label className="input-label" htmlFor="password">Password</label>
                    <div className="relative">
                      <input id="password" name="password" type={showPass ? "text" : "password"} placeholder="••••••••" className="input-field py-3 pr-12" required minLength={8} />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors">
                        {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-outline mt-2 leading-relaxed">At least 8 characters with a mix of letters, numbers & symbols.</p>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4 flex items-center justify-center gap-2 rounded-xl text-base font-bold text-white bg-[#3525cd] disabled:opacity-70">
                  </button>
                </form>

                <div className="mt-8 flex items-center justify-center gap-2 py-4 px-6 bg-tertiary-fixed/10 rounded-xl border border-tertiary-fixed/20">
                  <ShieldCheck className="w-5 h-5 text-tertiary" />
                  <span className="text-xs font-semibold text-tertiary-container">Bank-grade 256-bit encryption active</span>
                </div>
            <p className="mt-8 text-center text-xs text-on-surface-variant leading-relaxed px-12">
              By clicking "Create Account", you agree to our{" "}
              <Link href="/terms" className="text-primary hover:underline underline-offset-2">Terms of Service</Link> and{" "}
              <Link href="/privacy" className="text-primary hover:underline underline-offset-2">Privacy Policy</Link>.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}