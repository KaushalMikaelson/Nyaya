"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, Mail, Lock, ArrowRight, Eye, EyeOff, Shield, BookOpen,
  Gavel, AlertCircle, Smartphone, CheckCircle2
} from "lucide-react";

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

// ─────────────────────────────────────────
// OTP INPUT COMPONENT
// ─────────────────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = value.split("").slice(0, 6);
  while (digits.length < 6) digits.push("");

  const handleChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const arr = [...digits];
    arr[i] = v.slice(-1);
    onChange(arr.join(""));
    if (v && i < 5) {
      (document.getElementById(`login-otp-${i + 1}`) as HTMLInputElement)?.focus();
    }
  };

  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      (document.getElementById(`login-otp-${i - 1}`) as HTMLInputElement)?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          id={`login-otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-11 text-center text-xl font-bold text-white rounded-xl outline-none transition-all"
          style={{
            height: "3.25rem",
            background: "#0e0e18",
            border: `1px solid ${d ? "rgba(124,110,247,0.6)" : "rgba(255,255,255,0.08)"}`,
            boxShadow: d ? "0 0 0 3px rgba(124,110,247,0.08)" : "none",
          }}
        />
      ))}
    </div>
  );
}

export default function Login() {
  const [mode, setMode] = useState<"password" | "otp">("password");
  const [otpStep, setOtpStep] = useState<"request" | "verify">("request");

  // Password fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP fields
  const [otpEmail, setOtpEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown(c => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      login(data.accessToken, data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await api.post("/auth/login/otp/request", { email: otpEmail });
      setOtpStep("verify");
      startCooldown();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send OTP.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError("Please enter all 6 digits."); return; }
    setError("");
    setIsLoading(true);
    try {
      const { data } = await api.post("/auth/login/otp/verify", { email: otpEmail, code: otp });
      login(data.accessToken, data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.post("/auth/login/otp/request", { email: otpEmail });
      startCooldown();
    } catch { setError("Failed to resend OTP."); }
  };

  const switchMode = (m: "password" | "otp") => {
    setMode(m); setError(""); setOtpStep("request"); setOtp("");
  };

  return (
    <div className="min-h-screen w-full flex" style={{ background: "#07070d" }}>

      {/* ─── Left Panel ─── */}
      <div className="hidden lg:flex lg:w-[52%] relative flex-col justify-between p-14 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-15%] w-[65%] h-[65%] rounded-full animate-pulse-glow"
            style={{ background: "radial-gradient(circle, rgba(124,110,247,0.16) 0%, transparent 65%)" }} />
          <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full animate-pulse-glow"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 65%)", animationDelay: "1.5s" }} />
          <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full animate-pulse-glow"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)", animationDelay: "0.8s" }} />
        </div>
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
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
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <p className="text-xs font-semibold tracking-widest mb-5" style={{ color: "#7c6ef7" }}>AI-POWERED LEGAL ASSISTANCE</p>
            <h1 className="text-5xl font-extrabold leading-[1.12] text-white tracking-tight">
              Your personal<br />
              <span className="gradient-text">legal advisor,</span><br />
              available 24/7.
            </h1>
            <p className="mt-5 text-base leading-relaxed max-w-sm" style={{ color: "#6a6a82" }}>
              Navigate the complexities of Indian law with confidence.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="grid gap-3">
            {features.map(({ icon: Icon, label, text }, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 + i * 0.1 }}
                className="flex items-center gap-4 rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
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

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="flex gap-6">
            {stats.map((s, i) => (
              <div key={i}>
                <div className="text-xl font-bold text-white">{s.value}</div>
                <div className="text-xs mt-0.5" style={{ color: "#4a4a62" }}>{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        <p className="relative z-10 text-xs" style={{ color: "#3a3a50" }}>© 2025 Nyaay. AI-assisted legal information only.</p>
      </div>

      {/* ─── Right Panel ─── */}
      <div className="w-full lg:w-[48%] flex items-center justify-center p-6 lg:p-12 relative"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="absolute inset-0 pointer-events-none lg:hidden">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(124,110,247,0.1) 0%, transparent 70%)" }} />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }} className="relative w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 24px rgba(124,110,247,0.4)" }}>
              <Scale size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">Nyaay</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-white mb-1.5">Welcome back</h2>
            <p className="text-sm" style={{ color: "#6a6a80" }}>Sign in to continue your legal inquiries.</p>
          </div>

          {/* Mode Toggle */}
          <div className="flex rounded-xl p-1 mb-6"
            style={{ background: "#0e0e18", border: "1px solid rgba(255,255,255,0.07)" }}>
            {(["password", "otp"] as const).map(m => (
              <button key={m} id={`login-mode-${m}`} onClick={() => switchMode(m)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                style={mode === m ? {
                  background: "rgba(124,110,247,0.2)", color: "#9d8fff", border: "1px solid rgba(124,110,247,0.3)",
                } : { color: "#4a4a62", border: "1px solid transparent" }}>
                {m === "password" ? <><Lock size={13} />Password</> : <><Smartphone size={13} />OTP Login</>}
              </button>
            ))}
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }} className="mb-5 overflow-hidden">
                <div className="p-3.5 rounded-xl text-sm flex items-center gap-3"
                  style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password Login */}
          <AnimatePresence mode="wait">
            {mode === "password" && (
              <motion.div key="pw" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>Email address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: email ? "#9d8fff" : "#4a4a62" }} />
                      <input id="login-email" type="email" autoComplete="email" value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full rounded-xl py-3 pl-10 pr-4 text-white placeholder-[#3a3a52] outline-none transition-all text-sm"
                        style={{ background: "#0e0e18", border: "1px solid rgba(255,255,255,0.07)" }}
                        onFocus={e => { e.currentTarget.style.borderColor = "rgba(124,110,247,0.45)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,110,247,0.07)"; }}
                        onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
                        placeholder="you@example.com" required />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>Password</label>
                      <Link href="/forgot-password" className="text-xs transition-colors" style={{ color: "#9d8fff" }}
                        onMouseOver={e => (e.currentTarget.style.color = "#c084fc")}
                        onMouseOut={e => (e.currentTarget.style.color = "#9d8fff")}>
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        style={{ color: password ? "#9d8fff" : "#4a4a62" }} />
                      <input id="login-password" type={showPassword ? "text" : "password"}
                        autoComplete="current-password" value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full rounded-xl py-3 pl-10 pr-11 text-white placeholder-[#3a3a52] outline-none transition-all text-sm"
                        style={{ background: "#0e0e18", border: "1px solid rgba(255,255,255,0.07)" }}
                        onFocus={e => { e.currentTarget.style.borderColor = "rgba(124,110,247,0.45)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,110,247,0.07)"; }}
                        onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
                        placeholder="••••••••••" required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-lg transition-all"
                        style={{ color: "#4a4a62" }}
                        onMouseOver={e => (e.currentTarget.style.color = "#9d8fff")}
                        onMouseOut={e => (e.currentTarget.style.color = "#4a4a62")}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <motion.button type="submit" disabled={isLoading} id="login-submit"
                    whileHover={{ scale: isLoading ? 1 : 1.015 }} whileTap={{ scale: isLoading ? 1 : 0.975 }}
                    className="relative w-full overflow-hidden rounded-xl py-3 font-semibold text-white transition-all duration-300 mt-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 32px rgba(124,110,247,0.3)" }}>
                    <span className="relative flex items-center justify-center gap-2">
                      {isLoading
                        ? <span className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                        : <>Sign In<ArrowRight size={16} /></>
                      }
                    </span>
                  </motion.button>
                </form>
              </motion.div>
            )}

            {/* OTP Login */}
            {mode === "otp" && (
              <motion.div key="otp" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                <AnimatePresence mode="wait">
                  {otpStep === "request" && (
                    <motion.form key="req" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onSubmit={handleOtpRequest} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>Email address</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                            style={{ color: otpEmail ? "#9d8fff" : "#4a4a62" }} />
                          <input id="otp-email" type="email" value={otpEmail}
                            onChange={e => setOtpEmail(e.target.value)}
                            className="w-full rounded-xl py-3 pl-10 pr-4 text-white placeholder-[#3a3a52] outline-none transition-all text-sm"
                            style={{ background: "#0e0e18", border: "1px solid rgba(255,255,255,0.07)" }}
                            onFocus={e => { e.currentTarget.style.borderColor = "rgba(124,110,247,0.45)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,110,247,0.07)"; }}
                            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
                            placeholder="you@example.com" required />
                        </div>
                      </div>
                      <div className="rounded-xl p-3 flex items-start gap-2.5"
                        style={{ background: "rgba(124,110,247,0.07)", border: "1px solid rgba(124,110,247,0.15)" }}>
                        <Smartphone size={13} style={{ color: "#9d8fff", flexShrink: 0, marginTop: 1 }} />
                        <p className="text-xs" style={{ color: "#6a6a82" }}>
                          We&apos;ll send a one-time code to your email. No password required.
                        </p>
                      </div>
                      <motion.button type="submit" disabled={isLoading} id="otp-request-submit"
                        whileHover={{ scale: isLoading ? 1 : 1.015 }} whileTap={{ scale: isLoading ? 1 : 0.975 }}
                        className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 28px rgba(124,110,247,0.3)" }}>
                        {isLoading
                          ? <span className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                          : <><span>Send OTP</span><ArrowRight size={16} /></>
                        }
                      </motion.button>
                    </motion.form>
                  )}

                  {otpStep === "verify" && (
                    <motion.form key="verify" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onSubmit={handleOtpVerify} className="space-y-6">
                      <div className="text-center mb-2">
                        <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                          style={{ background: "rgba(124,110,247,0.12)", border: "1px solid rgba(124,110,247,0.2)" }}>
                          <Mail size={20} style={{ color: "#9d8fff" }} />
                        </div>
                        <p className="text-sm" style={{ color: "#6a6a80" }}>6-digit code sent to</p>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: "#9d8fff" }}>{otpEmail}</p>
                      </div>
                      <OtpInput value={otp} onChange={setOtp} />
                      <motion.button type="submit" disabled={isLoading || otp.length < 6} id="otp-verify-submit"
                        whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                        className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 28px rgba(124,110,247,0.3)" }}>
                        {isLoading
                          ? <span className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                          : <><span>Verify & Sign In</span><CheckCircle2 size={16} /></>
                        }
                      </motion.button>
                      <div className="text-center">
                        <p className="text-sm" style={{ color: "#4a4a60" }}>
                          Didn&apos;t receive it?{" "}
                          <button type="button" onClick={handleResendOtp} disabled={resendCooldown > 0}
                            className="font-semibold disabled:opacity-40" style={{ color: "#9d8fff" }}>
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                          </button>
                        </p>
                        <button type="button" onClick={() => setOtpStep("request")}
                          className="text-xs mt-2 transition-colors" style={{ color: "#4a4a60" }}
                          onMouseOver={e => (e.currentTarget.style.color = "#9d8fff")}
                          onMouseOut={e => (e.currentTarget.style.color = "#4a4a60")}>
                          ← Change email
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-6 text-center">
            <p className="text-sm" style={{ color: "#4a4a62" }}>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold transition-colors" style={{ color: "#9d8fff" }}
                onMouseOver={e => (e.currentTarget.style.color = "#c084fc")}
                onMouseOut={e => (e.currentTarget.style.color = "#9d8fff")}>
                Create one free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
