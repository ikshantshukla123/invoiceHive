"use client";
import Link from "next/link";
import { useState } from "react";
import { Zap, Globe, BarChart3, CreditCard, ShieldCheck, TrendingUp, ArrowRight, ChevronDown } from "lucide-react";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/context/AuthContext";

const FEATURES = [
  { icon: <Zap className="w-6 h-6 fill-current" />, title: "Automation", desc: "Zero-touch invoicing workflows for recurring and one-off billing." },
  { icon: <BarChart3 className="w-6 h-6" />, title: "Analytics", desc: "Deep-dive financial reporting with real-time churn tracking." },
  { icon: <CreditCard className="w-6 h-6" />, title: "Multi-currency", desc: "Native support for 135+ currencies with automated FX handling." },
  { icon: <ShieldCheck className="w-6 h-6" />, title: "Security", desc: "SOC2 Type II compliant infrastructure with granular RBAC." },
];

const FAQS = [
  { q: "How does InvoiceHive handle global tax compliance?", a: "We integrate directly with major tax providers to automatically calculate VAT, GST, and Sales Tax in real-time, ensuring compliant invoicing across 190+ jurisdictions." },
  { q: "Can we migrate from our existing ERP?", a: "Yes, we offer white-glove migration services and a robust API for synchronizing historical data from Oracle, SAP, and NetSuite." },
  { q: "What makes the ledger 'architectural'?", a: "It refers to our hierarchical data model that maps transactions to projects, departments, and entities with 100% auditability." },
  { q: "Does InvoiceHive support multiple currencies?", a: "Absolutely. We support over 135 currencies with automated real-time exchange rates and localized payment portals for your international clients." },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-white/80 backdrop-blur-md h-20 fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6 h-20">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg primary-gradient flex items-center justify-center">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tighter font-headline">InvoiceHive</span>
            </div>
            <div className="hidden md:flex gap-6 items-center">
              {["Features","Solutions","Pricing","About"].map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} className="text-slate-600 hover:text-primary transition-colors font-headline text-sm font-semibold tracking-tight">{item}</a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {loading ? (
              <div className="w-24 h-8 bg-surface-container animate-pulse" />
            ) : isAuthenticated ? (
              <Link href="/dashboard" className="bg-[#3525cd] text-white font-bold text-sm px-6 py-3 hover:bg-[#2b1da8] transition-colors">Dashboard</Link>
            ) : (
              <>
                <Link href="/auth/login" className="text-slate-600 hover:text-primary transition-colors font-headline text-sm font-semibold">Sign In</Link>
                <Link href="/auth/register" className="bg-[#3525cd] text-white font-bold text-sm px-6 py-3 hover:bg-[#2b1da8] transition-colors">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-20 flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden pt-24 pb-32">
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-low text-primary text-xs font-bold tracking-widest uppercase mb-6">
                <Zap className="w-3.5 h-3.5" /> Next-Gen Financial Infrastructure
              </span>
              <h1 className="text-5xl md:text-7xl font-extrabold font-headline text-on-background tracking-tighter leading-[1.05] mb-8">
                Professional billing for <br className="hidden md:block"/>
                <span className="text-transparent bg-clip-text" style={{backgroundImage:"linear-gradient(135deg,#3525cd,#4f46e5)"}}>
                  premium finance teams
                </span>
              </h1>
              <p className="text-lg md:text-xl text-on-surface-variant max-w-2xl mb-12 font-medium leading-relaxed">
                The architectural ledger for high-growth enterprises. Automate global receivables with the precision of a high-end financial institution.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {isAuthenticated ? (
                  <Link href="/dashboard" className="bg-[#3525cd] text-white font-bold text-lg px-10 py-4 hover:bg-[#2b1da8] transition-colors inline-flex justify-center items-center gap-2">
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link href="/auth/register" className="bg-[#3525cd] text-white font-bold text-lg px-10 py-4 hover:bg-[#2b1da8] transition-colors inline-flex justify-center items-center gap-2">
                    Start Free Trial
                  </Link>
                )}
                <button className="bg-white text-slate-900 border border-slate-200 px-10 py-4 font-headline font-bold text-lg hover:bg-slate-50 transition-colors inline-flex justify-center items-center gap-2">
                  Schedule Demo
                </button>
              </div>
            </div>

            {/* Bento hero */}
            <div className="mt-24 grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-8 bg-surface-container-lowest rounded-xl flex flex-col p-8 min-h-[360px]">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <p className="text-on-surface-variant text-sm font-medium mb-1">Global Revenue</p>
                    <p className="font-mono text-4xl font-bold text-on-background tracking-tight">$1,8,392.00</p>
                  </div>
                  <span className="text-tertiary font-bold font-mono text-lg">+12.4%</span>
                </div>
                <div className="flex-1 bg-surface-container-low rounded-lg relative overflow-hidden min-h-[200px]">
                  <div className="absolute inset-0 flex items-end gap-1.5 px-6 pb-6">
                    {[40,55,45,70,60,85,72,95,80,100,88,92].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t"
                        style={{height:`${h}%`, background: i===11 ? "linear-gradient(180deg,#3525cd,#4f46e5)" : `rgba(53,37,205,${0.10+i*0.03})`}} />
                    ))}
                  </div>
                  <div className="absolute bottom-3 left-6 right-6 flex justify-between">
                    {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m=>(
                      <span key={m} className="text-[9px] text-on-surface-variant font-medium">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="hidden md:grid col-span-4 grid-rows-2 gap-6">
                <div className="primary-gradient text-white p-8 rounded-xl flex flex-col justify-between" style={{minHeight:"160px"}}>
                  <TrendingUp className="w-8 h-8 opacity-80" />
                  <div>
                    <p className="text-white/70 text-sm font-semibold mb-1">Total Collected</p>
                    <p className="font-mono text-2xl font-bold">$84k</p>
                  </div>
                </div>
                <div className="bg-surface-container-highest p-8 rounded-xl flex flex-col justify-between" style={{minHeight:"160px"}}>
                  <Globe className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-on-surface-variant text-sm font-semibold mb-1">Active Regions</p>
                    <p className="font-headline text-2xl font-bold text-on-background">4 Nations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Logo cloud */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-on-surface-variant text-xs font-bold tracking-[0.2em] uppercase mb-10">Trusted by Global Leaders</p>
            <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-30">
              {["RAZORPAY","SHOPIFY","VERCEL","LINEAR","NOTION"].map(name => (
                <span key={name} className="font-headline font-bold text-xl tracking-tight text-slate-900">{name}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-32 bg-surface" id="features">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
              <div>
                <h2 className="text-4xl font-extrabold font-headline tracking-tight mb-6 text-on-background">
                  Built for the complexity of <br/>modern enterprise.
                </h2>
                <p className="text-on-surface-variant text-lg font-medium leading-relaxed">
                  We stripped away the clutter of legacy billing systems to create a high-performance engine that handles millions of rows with sub-second latency.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {FEATURES.map(({icon,title,desc}) => (
                  <div key={title} className="p-px rounded-xl" style={{background:"linear-gradient(135deg,rgba(53,37,205,0.12),transparent)"}}>
                    <div className="bg-surface-container-lowest p-6 rounded-[11px] h-full">
                      <div className="text-primary mb-4">{icon}</div>
                      <h3 className="font-headline font-bold text-on-background mb-2">{title}</h3>
                      <p className="text-sm text-on-surface-variant font-medium">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="py-32 overflow-hidden relative text-white" id="about" style={{backgroundColor:"#29313a"}}>
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-primary blur-[120px]" />
            <div className="absolute bottom-0 left-0 w-1/3 h-full bg-secondary blur-[100px]" />
          </div>
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-bold font-headline mb-8 tracking-tight">The Architectural Ledger Philosophy</h2>
                <p className="text-xl leading-relaxed mb-12" style={{color:"#e1e9f4"}}>
                  Trust isn't built with heavy borders; it's built with precision. Our "Architectural Ledger" framework treats every financial transaction as a structural primitive—immutable, transparent, and effortlessly linked to your entire stack.
                </p>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <p className="font-mono text-sm mb-4" style={{color:"#c3c0ff"}}>01 // STRUCTURAL INTEGRITY</p>
                    <p className="text-sm leading-relaxed" style={{color:"#e7effa"}}>Every invoice is a data point in a broader architectural map. We ensure that your finance stack is as solid as the buildings your team works in.</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm mb-4" style={{color:"#c3c0ff"}}>02 // TONAL DEPTH</p>
                    <p className="text-sm leading-relaxed" style={{color:"#e7effa"}}>Our UI uses tonal layering over structural lines. This creates a focused environment where data flows without friction or visual noise.</p>
                  </div>
                </div>
              </div>
              
              <div className="relative w-full aspect-square md:aspect-video lg:aspect-square max-h-[400px]  overflow-hidden">
                <img 
                  src="/forget.jpg" 
                  alt="Architectural Ledger" 
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-primary/20 mix-blend-overlay" />
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-32 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-center text-4xl font-extrabold font-headline tracking-tight mb-16 text-on-background">Frequently Asked Questions</h2>
            
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Image on Left */}
              <div className="relative w-full aspect-square md:aspect-[4/3] lg:aspect-auto lg:h-full min-h-[400px]">
                <img 
                  src="/faq.png" 
                  alt="FAQ Illustration" 
                  className="absolute inset-0 w-full h-full object-contain object-top"
                />
              </div>

              {/* Questions on Right */}
              <div className="space-y-4">
                {FAQS.map(({q,a},i)=>(
                  <div key={i} className="border border-outline-variant/30 cursor-pointer select-none transition-all duration-300" onClick={()=>setOpenFaq(openFaq===i?null:i)}>
                    <div className="p-6">
                      <div className="flex justify-between items-center gap-4">
                        <h3 className="font-headline font-bold text-on-background">{q}</h3>
                        <ChevronDown className={`w-5 h-5 text-primary flex-shrink-0 transition-transform duration-300 ${openFaq===i?"rotate-180":""}`} />
                      </div>
                      <div className={`grid transition-all duration-300 ease-in-out ${openFaq===i ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"}`}>
                        <div className="overflow-hidden">
                          <p className="text-on-surface-variant text-sm font-medium leading-relaxed">{a}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="rounded-3xl p-12 md:p-24 text-center text-white relative overflow-hidden" style={{background:"linear-gradient(135deg,#3525cd,#4f46e5)"}}>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-extrabold font-headline mb-6 tracking-tight">Ready to evolve your finance stack?</h2>
              <p className="text-lg font-medium mb-12 max-w-xl mx-auto" style={{color:"#c3c0ff"}}>Join the new standard of enterprise billing. Start your 14-day premium trial today.</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {isAuthenticated ? (
                  <Link href="/dashboard" className="bg-white text-[#3525cd] px-10 py-4 font-headline font-bold text-lg hover:bg-slate-100 transition-colors inline-flex justify-center items-center gap-2">
                    Go to Dashboard <ArrowRight className="w-5 h-5" />
                  </Link>
                ) : (
                  <Link href="/auth/register" className="bg-white text-[#3525cd] px-10 py-4 font-headline font-bold text-lg hover:bg-slate-100 transition-colors inline-flex justify-center items-center gap-2">
                    Get Started Now <ArrowRight className="w-5 h-5" />
                  </Link>
                )}
                <button className="px-10 py-4 font-headline font-bold text-lg border border-white/30 text-white hover:bg-white/10 transition-colors inline-flex justify-center items-center">
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}