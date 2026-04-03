"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Mail, Lock, ArrowRight, Eye, EyeOff, CheckCircle2, Sparkles, AlertCircle, Star } from "lucide-react";

const perks = [
  "Unlimited AI legal questions, always free",
  "Covers IPC, CPC, Constitution & 50+ acts",
  "Save and revisit every conversation",
  "Responses in plain, easy-to-understand language",
];

const testimonials = [
  { text: "Finally understood my tenant rights in minutes!", name: "Rahul M." },
  { text: "Helped me navigate a property dispute step by step.", name: "Priya S." },
];

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/signup", { email, password });
      login(data.accessToken, data.user);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || "Signup failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ["transparent", "#ef4444", "#f59e0b", "#22c55e"];
  const strengthLabels = ["", "Weak", "Fair", "Strong"];

  return (
    <div className="min-h-screen w-full flex" style={{ background: "#07070d" }}>

      {/* ─── Left Panel ─── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-14 overflow-hidden">

        {/* Ambient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-15%] w-[65%] h-[65%] rounded-full animate-pulse-glow"
            style={{ background: "radial-gradient(circle, rgba(124,110,247,0.15) 0%, transparent 65%)" }} />
          <div className="absolute bottom-[-10%] left-[-15%] w-[55%] h-[55%] rounded-full animate-pulse-glow"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,0.11) 0%, transparent 65%)", animationDelay: "2s" }} />
        </div>

        {/* Dot grid */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "28px 28px"
          }} />
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to right, #07070d 0%, transparent 30%, transparent 70%, #07070d 100%)" }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 28px rgba(124,110,247,0.45)" }}>
            <Scale size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Nyaay</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(124,110,247,0.15)", color: "#9d8fff", border: "1px solid rgba(124,110,247,0.25)" }}>
            FREE
          </span>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={15} style={{ color: "#9d8fff" }} />
              <p className="text-xs font-semibold tracking-widest" style={{ color: "#7c6ef7" }}>
                FREE TO GET STARTED
              </p>
            </div>
            <h1 className="text-5xl font-extrabold leading-[1.12] text-white tracking-tight">
              Justice starts<br />
              with the right<br />
              <span className="gradient-text">questions.</span>
            </h1>
            <p className="mt-5 text-base leading-relaxed max-w-sm" style={{ color: "#6a6a82" }}>
              Join thousands who trust Nyaay to understand their legal rights and navigate complex situations.
            </p>
          </motion.div>

          {/* Perks */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="space-y-2.5"
          >
            {perks.map((perk, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.09 }}
                className="flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <CheckCircle2 size={12} style={{ color: "#4ade80" }} />
                </div>
                <span className="text-sm" style={{ color: "#6a6a80" }}>{perk}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* Testimonials */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75 }}
            className="space-y-3"
          >
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex gap-0.5 mb-2">
                  {[0, 1, 2, 3, 4].map(j => (
                    <Star key={j} size={11} style={{ color: "#f59e0b" }} fill="#f59e0b" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "#6a6a80" }}>&quot;{t.text}&quot;</p>
                <p className="text-xs mt-2 font-medium" style={{ color: "#4a4a60" }}>— {t.name}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <p className="relative z-10 text-xs" style={{ color: "#3a3a50" }}>
          © 2025 Nyaay. AI-assisted legal information only.
        </p>
      </div>

      {/* ─── Right Panel ─── */}
      <div className="w-full lg:w-[48%] flex items-center justify-center p-6 lg:p-12 relative"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}>

        <div className="absolute inset-0 pointer-events-none lg:hidden">
          <div className="absolute top-0 left-0 w-72 h-72 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(124,110,247,0.1) 0%, transparent 70%)" }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="relative w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 24px rgba(124,110,247,0.4)" }}>
              <Scale size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">Nyaay</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1.5">Create your account</h2>
            <p className="text-sm" style={{ color: "#6a6a80" }}>Free forever. No credit card required.</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className="mb-5 overflow-hidden"
              >
                <div className="p-3.5 rounded-xl text-sm flex items-center gap-3"
                  style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>
                Email address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: email ? "#9d8fff" : "#4a4a62" }} />
                <input
                  id="signup-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl py-3 pl-10 pr-4 text-white placeholder-[#3a3a52] outline-none transition-all duration-250 text-sm"
                  style={{ background: "#0e0e18", border: "1px solid rgba(255,255,255,0.07)" }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = "rgba(124,110,247,0.45)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,110,247,0.07)";
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: password ? "#9d8fff" : "#4a4a62" }} />
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl py-3 pl-10 pr-11 text-white placeholder-[#3a3a52] outline-none transition-all duration-250 text-sm"
                  style={{ background: "#0e0e18", border: "1px solid rgba(255,255,255,0.07)" }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = "rgba(124,110,247,0.45)";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,110,247,0.07)";
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  placeholder="Min. 8 characters"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-lg transition-all duration-200"
                  style={{ color: "#4a4a62" }}
                  onMouseOver={e => (e.currentTarget.style.color = "#9d8fff")}
                  onMouseOut={e => (e.currentTarget.style.color = "#4a4a62")}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength */}
              {password.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 pt-0.5">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-1 flex-1 rounded-full transition-all duration-400"
                        style={{ background: i <= strength ? strengthColors[strength] : "rgba(255,255,255,0.07)" }} />
                    ))}
                  </div>
                  <span className="text-xs font-medium" style={{ color: strengthColors[strength] }}>
                    {strengthLabels[strength]}
                  </span>
                </motion.div>
              )}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.015 }}
              whileTap={{ scale: isLoading ? 1 : 0.975 }}
              className="relative w-full overflow-hidden rounded-xl py-3 font-semibold text-white transition-all duration-300 mt-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 32px rgba(124,110,247,0.3)" }}
            >
              <span className="relative flex items-center justify-center gap-2">
                {isLoading ? (
                  <span className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                ) : (
                  <>
                    Create Account
                    <ArrowRight size={16} />
                  </>
                )}
              </span>
            </motion.button>
          </form>

          <p className="mt-4 text-xs text-center" style={{ color: "#3a3a50" }}>
            By creating an account you agree to our{" "}
            <span className="underline cursor-pointer" style={{ color: "#5a5a70" }}>Terms</span> &{" "}
            <span className="underline cursor-pointer" style={{ color: "#5a5a70" }}>Privacy Policy</span>.
          </p>

          <div className="mt-5 text-center">
            <p className="text-sm" style={{ color: "#4a4a62" }}>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold transition-colors duration-200"
                style={{ color: "#9d8fff" }}
                onMouseOver={e => (e.currentTarget.style.color = "#c084fc")}
                onMouseOut={e => (e.currentTarget.style.color = "#9d8fff")}
              >
                Sign in here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
