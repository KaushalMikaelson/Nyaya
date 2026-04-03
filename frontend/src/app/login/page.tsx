"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Mail, Lock, ArrowRight, Eye, EyeOff, Shield, BookOpen, Gavel, AlertCircle } from "lucide-react";

const features = [
  { icon: Shield, label: "Trusted Guidance", text: "Accurate Indian legal information" },
  { icon: BookOpen, label: "Full Coverage", text: "IPC, CPC, Constitution & more" },
  { icon: Gavel, label: "AI Reasoning", text: "Powered by advanced AI models" },
];

const stats = [
  { value: "50K+", label: "Questions answered" },
  { value: "99%", label: "Accuracy rate" },
  { value: "24/7", label: "Always available" },
];

export default function Login() {
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
      const { data } = await api.post("/auth/login", { email, password });
      login(data.accessToken, data.user);
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex" style={{ background: "#07070d" }}>

      {/* ─── Left Panel ─── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-14 overflow-hidden">

        {/* Ambient blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-15%] w-[65%] h-[65%] rounded-full animate-pulse-glow"
            style={{ background: "radial-gradient(circle, rgba(124,110,247,0.16) 0%, transparent 65%)" }} />
          <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full animate-pulse-glow"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 65%)", animationDelay: "1.5s" }} />
          <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full animate-pulse-glow"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)", animationDelay: "0.8s" }} />
        </div>

        {/* Dot grid */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "28px 28px"
          }} />

        {/* Vertical gradient fade on sides */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to right, #07070d 0%, transparent 30%, transparent 70%, #07070d 100%)" }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3 z-10">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 28px rgba(124,110,247,0.45)" }}>
            <Scale size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Nyaay</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(124,110,247,0.15)", color: "#9d8fff", border: "1px solid rgba(124,110,247,0.25)" }}>
            BETA
          </span>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <p className="text-xs font-semibold tracking-widest mb-5" style={{ color: "#7c6ef7" }}>
              AI-POWERED LEGAL ASSISTANCE
            </p>
            <h1 className="text-5xl font-extrabold leading-[1.12] text-white tracking-tight">
              Your personal<br />
              <span className="gradient-text">legal advisor,</span><br />
              available 24/7.
            </h1>
            <p className="mt-5 text-base leading-relaxed max-w-sm" style={{ color: "#6a6a82" }}>
              Navigate the complexities of Indian law with confidence. Instant, accurate guidance on any legal matter.
            </p>
          </motion.div>

          {/* Feature cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: "easeOut" }}
            className="grid gap-3"
          >
            {features.map(({ icon: Icon, label, text }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.1 }}
                className="flex items-center gap-4 rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(124,110,247,0.12)", border: "1px solid rgba(124,110,247,0.2)" }}>
                  <Icon size={16} style={{ color: "#9d8fff" }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{label}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#5a5a72" }}>{text}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex gap-6"
          >
            {stats.map((s, i) => (
              <div key={i}>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "#4a4a62" }}>{s.label}</div>
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

        {/* Mobile ambient */}
        <div className="absolute inset-0 pointer-events-none lg:hidden">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full"
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
            <h2 className="text-2xl font-bold text-white mb-1.5">Welcome back</h2>
            <p className="text-sm" style={{ color: "#6a6a80" }}>Sign in to continue your legal inquiries.</p>
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
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                  style={{ color: email ? "#9d8fff" : "#4a4a62" }} />
                <input
                  id="login-email"
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
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                  style={{ color: password ? "#9d8fff" : "#4a4a62" }} />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
                  placeholder="••••••••••"
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
                    Sign In
                    <ArrowRight size={16} />
                  </>
                )}
              </span>
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: "#4a4a62" }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold transition-colors duration-200"
                style={{ color: "#9d8fff" }}
                onMouseOver={e => (e.currentTarget.style.color = "#c084fc")}
                onMouseOut={e => (e.currentTarget.style.color = "#9d8fff")}
              >
                Create one free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
