"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, CheckCircle2, X, ArrowRight, Zap, Shield,
  Building2, Users, Sparkles, Lock, ChevronDown, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Inter, Playfair_Display } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"] });

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// ─── Plan Definitions ──────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "FREE",
    name: "Basic Rights",
    tagline: "For citizens exploring their legal standing.",
    price: 0,
    priceLabel: "₹0",
    period: "/month",
    icon: Shield,
    color: "from-slate-600/20 to-slate-800/20",
    borderColor: "border-white/10",
    accentColor: "#94a3b8",
    labelColor: "text-slate-300",
    cta: "Get Started Free",
    ctaStyle: "border border-white/15 text-white hover:bg-white/10",
    popular: false,
    apiLimit: "100 API calls/month",
    features: [
      "10 AI Legal Consultations",
      "3 Document Parses",
      "Public Case Law Search",
      "Basic Legal Templates",
      "Community Support",
    ],
    notIncluded: [
      "Advanced RAG Pipeline",
      "Case Management",
      "Priority Matching",
    ],
  },
  {
    id: "BASIC",
    name: "Practitioner",
    tagline: "For individual advocates and active litigants.",
    price: 999,
    priceLabel: "₹999",
    period: "/month",
    icon: Zap,
    color: "from-indigo-900/30 to-slate-900/30",
    borderColor: "border-indigo-500/30",
    accentColor: "#818cf8",
    labelColor: "text-indigo-300",
    cta: "Start Practitioner",
    ctaStyle: "bg-indigo-600 hover:bg-indigo-500 text-white",
    popular: false,
    apiLimit: "1,000 API calls/month",
    features: [
      "1,000 AI Consultations",
      "50 Document Parses / Month",
      "Full Case Law Search",
      "All Legal Templates",
      "Case Management Module",
      "Email Support",
    ],
    notIncluded: ["Priority Lawyer Matching", "Custom Fine-tuning"],
  },
  {
    id: "PRO",
    name: "Nyaay PRO",
    tagline: "For power users and independent practitioners.",
    price: 2499,
    priceLabel: "₹2,499",
    period: "/month",
    icon: Sparkles,
    color: "from-amber-900/30 to-slate-900/30",
    borderColor: "border-[#d4af37]/50",
    accentColor: "#d4af37",
    labelColor: "text-[#f2d680]",
    cta: "Upgrade to PRO",
    ctaStyle: "bg-[#d4af37] hover:bg-[#e8c84a] text-black font-bold",
    popular: true,
    apiLimit: "10,000 API calls/month",
    features: [
      "10,000 AI Consultations",
      "Unlimited Document Parses",
      "Full RAG + Reranking Pipeline",
      "Priority Lawyer Matching",
      "Advanced Case Analytics",
      "All Legal Templates (incl. premium)",
      "Case Management Module",
      "Priority Email Support",
    ],
    notIncluded: ["Dedicated Server", "Custom Fine-tuning"],
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    tagline: "Custom deployment for large law firms.",
    price: 9999,
    priceLabel: "₹9,999",
    period: "/month",
    icon: Building2,
    color: "from-rose-900/20 to-slate-900/30",
    borderColor: "border-rose-500/20",
    accentColor: "#fb7185",
    labelColor: "text-rose-300",
    cta: "Contact Sales",
    ctaStyle: "border border-rose-500/30 text-rose-300 hover:bg-rose-500/10",
    popular: false,
    apiLimit: "100,000 API calls/month",
    features: [
      "100,000 API Calls/Month",
      "Unlimited Everything",
      "Dedicated Secure Server",
      "Custom LLM Fine-tuning",
      "Multi-tenancy & Teams",
      "SLA-backed Uptime",
      "Dedicated Account Manager",
      "White-label Option",
    ],
    notIncluded: [],
  },
];

// ─── Razorpay Checkout ─────────────────────────────────────────────────────────
async function openRazorpayCheckout(planId: string, onSuccess: () => void) {
  const token = localStorage.getItem("accessToken");
  if (!token) {
    alert("Please log in to purchase a plan.");
    return;
  }

  const orderRes = await fetch(`${API}/api/payment/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tier: planId }),
  });

  const orderData = await orderRes.json();
  if (!orderRes.ok) {
    alert(orderData.error || "Failed to create order. Please try again.");
    return;
  }

  const options = {
    key: orderData.keyId,
    amount: orderData.amount,
    currency: orderData.currency,
    name: "Nyaay Legal AI",
    description: `${planId} Plan – Monthly Subscription`,
    order_id: orderData.orderId,
    handler: async (response: any) => {
      const verifyRes = await fetch(`${API}/api/payment/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...response, tier: planId }),
      });
      const verified = await verifyRes.json();
      if (verified.success) onSuccess();
      else alert("Payment verification failed. Contact support.");
    },
    prefill: { name: "", email: "" },
    theme: { color: "#d4af37" },
  };

  // @ts-ignore — Razorpay loaded via CDN script
  const rzp = new window.Razorpay(options);
  rzp.open();
}

// ─── Comparison Table ──────────────────────────────────────────────────────────
const COMPARISON_ROWS = [
  { label: "AI Consultations / Month", values: ["10", "1,000", "10,000", "100,000"] },
  { label: "Document Parses / Month", values: ["3", "50", "Unlimited", "Unlimited"] },
  { label: "Case Management", values: [false, true, true, true] },
  { label: "RAG + Hybrid Search", values: [false, false, true, true] },
  { label: "Priority Lawyer Matching", values: [false, false, true, true] },
  { label: "Multi-tenancy & Teams", values: [false, false, false, true] },
  { label: "Dedicated Server", values: [false, false, false, true] },
  { label: "Custom Fine-tuning", values: [false, false, false, true] },
  { label: "SLA-backed Uptime", values: [false, false, false, true] },
];

export default function PricingPage() {
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [currentSub, setCurrentSub] = useState<any>(null);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(script);

    // Fetch current subscription if logged in
    const token = localStorage.getItem("accessToken");
    if (token) {
      fetch(`${API}/api/payment/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => setCurrentSub(d))
        .catch(() => {});
    }
    return () => { document.body.removeChild(script); };
  }, []);

  const handlePlanClick = async (plan: (typeof PLANS)[0]) => {
    if (plan.id === "FREE") { router.push("/signup"); return; }
    if (plan.id === "ENTERPRISE") { window.open("mailto:sales@nyaay.in", "_blank"); return; }

    setLoading(plan.id);
    try {
      await openRazorpayCheckout(plan.id, () => {
        setSuccess(true);
        setCurrentSub((prev: any) => ({ ...prev, tier: plan.id }));
        setTimeout(() => { setSuccess(false); router.push("/"); }, 3000);
      });
    } finally {
      setLoading(null);
    }
  };

  const getAnnualPrice = (price: number) => Math.round(price * 12 * 0.8);

  return (
    <div className={`min-h-screen bg-[#060a16] text-[#ededed] overflow-x-hidden ${inter.className}`}>

      {/* Success Toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ y: -80, opacity: 0 }} animate={{ y: 24, opacity: 1 }} exit={{ y: -80, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-semibold"
          >
            <CheckCircle2 size={20} /> Plan upgraded successfully! Redirecting…
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navbar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50">
        <div className="bg-[rgba(15,20,35,0.6)] backdrop-blur-xl border border-white/8 rounded-full px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.push("/landing")} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#f2d680] flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)]">
              <Scale size={16} className="text-[#070b16]" />
            </div>
            <span className="text-sm font-bold tracking-widest uppercase text-[#f2d680]">Nyaay AI</span>
          </button>
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/login")} className="text-sm text-gray-400 hover:text-white transition-colors">Sign In</button>
            <button onClick={() => router.push("/signup")} className="bg-[#d4af37] text-[#070b16] px-5 py-2 rounded-full text-sm font-bold hover:bg-[#f2d680] transition-colors">
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-44 pb-20 text-center relative">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[60vw] h-[30vw] bg-[#d4af37] rounded-full blur-[180px] opacity-[0.04] pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-4xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/25 text-[#d4af37] text-xs font-semibold tracking-widest uppercase mb-8">
            <Sparkles size={12} /> Transparent Pricing
          </div>
          <h1 className={`${playfair.className} text-5xl md:text-7xl text-white mb-6 leading-tight`}>
            One platform,<br /><span className="text-[#d4af37] italic">every tier of law.</span>
          </h1>
          <p className="text-[#a1a1aa] text-lg max-w-2xl mx-auto mb-10">
            From a citizen fighting for rights to mega-firms managing thousands of dossiers —
            Nyaay scales with your legal operation.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center bg-[#0d1224] border border-white/10 rounded-full p-1 gap-1">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${billing === "monthly" ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}
            >Monthly</button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${billing === "annual" ? "bg-white text-black" : "text-gray-400 hover:text-white"}`}
            >
              Annual
              <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">SAVE 20%</span>
            </button>
          </div>
        </motion.div>
      </section>

      {/* Plan Cards */}
      <section className="pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isCurrent = currentSub?.tier === plan.id;
            const displayPrice = billing === "annual" && plan.price > 0
              ? getAnnualPrice(plan.price)
              : plan.price * (billing === "annual" ? 12 : 1);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative rounded-3xl border ${plan.borderColor} bg-gradient-to-b ${plan.color} backdrop-blur-sm p-8 flex flex-col ${plan.popular ? "ring-2 ring-[#d4af37]/40 shadow-[0_0_60px_rgba(212,175,55,0.08)] xl:-translate-y-4" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#d4af37] text-black text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-4 right-4 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                    Current Plan
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: `${plan.accentColor}15` }}>
                    <Icon size={22} style={{ color: plan.accentColor }} />
                  </div>
                  <h2 className={`text-xl font-bold mb-1 ${plan.labelColor}`}>{plan.name}</h2>
                  <p className="text-xs text-gray-500">{plan.tagline}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">
                      {plan.price === 0 ? "₹0" : `₹${displayPrice.toLocaleString("en-IN")}`}
                    </span>
                    {plan.price > 0 && (
                      <span className="text-gray-500 text-sm pb-1">{billing === "annual" ? "/year" : "/month"}</span>
                    )}
                  </div>
                  {billing === "annual" && plan.price > 0 && (
                    <p className="text-xs text-emerald-400 mt-1 font-medium">
                      Save ₹{(plan.price * 12 * 0.2).toLocaleString("en-IN")}/year
                    </p>
                  )}
                  <div className="text-xs text-gray-600 mt-2 font-mono">{plan.apiLimit}</div>
                </div>

                {/* CTA Button */}
                <button
                  id={`plan-cta-${plan.id.toLowerCase()}`}
                  onClick={() => handlePlanClick(plan)}
                  disabled={loading === plan.id || isCurrent}
                  className={`w-full py-3 rounded-full text-sm font-semibold transition-all mb-8 flex items-center justify-center gap-2 ${plan.ctaStyle} ${isCurrent ? "opacity-50 cursor-default" : "hover:scale-[1.02] active:scale-[0.98]"}`}
                >
                  {loading === plan.id ? (
                    <><Loader2 size={16} className="animate-spin" /> Processing…</>
                  ) : isCurrent ? (
                    <><CheckCircle2 size={16} /> Current Plan</>
                  ) : (
                    <>{plan.cta} <ArrowRight size={14} /></>
                  )}
                </button>

                {/* Features */}
                <div className="flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-sm text-gray-300">
                      <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" style={{ color: plan.accentColor }} />
                      <span>{f}</span>
                    </div>
                  ))}
                  {plan.notIncluded.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <X size={15} className="mt-0.5 flex-shrink-0" />
                      <span className="line-through">{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Security Trust Bar */}
      <section className="py-10 border-y border-white/5 bg-[#0a0f1d]">
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
          {[
            { icon: Lock, text: "AES-256 Encrypted" },
            { icon: Shield, text: "No Data Sold" },
            { icon: CheckCircle2, text: "Cancel Anytime" },
            { icon: Users, text: "Bar Council Verified Network" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2">
              <Icon size={15} className="text-[#d4af37]" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table Toggle */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="w-full flex items-center justify-between p-6 rounded-2xl bg-[#0d1224] border border-white/10 text-white font-semibold hover:border-white/20 transition-colors group"
          >
            <span className={playfair.className + " text-xl"}>Full Plan Comparison</span>
            <ChevronDown size={20} className={`transition-transform duration-300 ${showComparison ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showComparison && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4 }}
                className="overflow-hidden"
              >
                <div className="mt-4 rounded-2xl border border-white/10 overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-5 bg-[#0d1224] border-b border-white/10 text-xs font-bold uppercase tracking-widest text-gray-500">
                    <div className="p-4">Feature</div>
                    {PLANS.map((p) => (
                      <div key={p.id} className={`p-4 text-center ${p.popular ? "text-[#d4af37]" : ""}`}>{p.name}</div>
                    ))}
                  </div>
                  {COMPARISON_ROWS.map((row, i) => (
                    <div key={row.label} className={`grid grid-cols-5 ${i % 2 === 0 ? "bg-[#060a16]" : "bg-[#0a0f1d]"} border-b border-white/5 last:border-0`}>
                      <div className="p-4 text-sm text-gray-400">{row.label}</div>
                      {row.values.map((val, j) => (
                        <div key={j} className="p-4 text-center flex items-center justify-center">
                          {val === true ? (
                            <CheckCircle2 size={16} className="text-emerald-400" />
                          ) : val === false ? (
                            <X size={16} className="text-gray-700" />
                          ) : (
                            <span className="text-sm text-white font-medium">{val}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6 bg-[#0a0f1d] border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className={`${playfair.className} text-3xl text-white text-center mb-12`}>Common Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Can I cancel anytime?", a: "Yes. All plans are monthly (or annual) and can be cancelled from your dashboard at any time. No hidden fees or penalties." },
              { q: "Is my data secure?", a: "All documents and chat sessions are AES-256 encrypted. We never sell or share your data with any third party, including AI model providers." },
              { q: "What payment methods are accepted?", a: "We use Razorpay which supports UPI, Net Banking, Credit/Debit cards, and Wallets (PhonePe, Paytm, etc.)." },
              { q: "Can our whole law firm use one account?", a: "The Enterprise plan includes multi-tenancy, allowing you to onboard your entire firm under one billing entity with individual role-based access." },
            ].map(({ q, a }) => (
              <details key={q} className="group bg-[#0d1224] border border-white/10 rounded-2xl">
                <summary className="p-5 cursor-pointer font-semibold text-white list-none flex items-center justify-between">
                  {q}
                  <ChevronDown size={18} className="text-gray-500 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="px-5 pb-5 text-sm text-gray-400 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-24 text-center bg-[#060a16] border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[20vw] bg-[#d4af37] blur-[180px] opacity-[0.03] pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto px-6">
          <h2 className={`${playfair.className} text-5xl text-white mb-6`}>
            Justice is not a<br /><span className="text-[#d4af37] italic">luxury.</span>
          </h2>
          <p className="text-gray-500 mb-10">Start with our free tier today. No credit card required.</p>
          <button
            onClick={() => router.push("/signup")}
            className="bg-[#d4af37] text-black px-10 py-4 rounded-full text-sm font-bold tracking-wider uppercase hover:scale-105 hover:shadow-[0_0_40px_rgba(212,175,55,0.3)] transition-all"
          >
            Start Free — No Card Needed
          </button>
          <p className="mt-10 text-xs text-gray-700">© {new Date().getFullYear()} Nyaay Technologies Pvt Ltd. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
