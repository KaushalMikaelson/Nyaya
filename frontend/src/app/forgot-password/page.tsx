"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, Mail, ArrowRight, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, KeyRound
} from "lucide-react";

// ─────────────────────────────────────────
// OTP INPUT
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
      (document.getElementById(`fp-otp-${i + 1}`) as HTMLInputElement)?.focus();
    }
  };

  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      (document.getElementById(`fp-otp-${i - 1}`) as HTMLInputElement)?.focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          id={`fp-otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-12 text-center text-xl font-bold text-white rounded-xl outline-none transition-all"
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

// ─────────────────────────────────────────
// FORGOT PASSWORD PAGE
// ─────────────────────────────────────────

type Step = "email" | "otp" | "newPassword" | "done";

function ForgotPasswordInner() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const strength = newPassword.length === 0 ? 0 : newPassword.length < 8 ? 1
    : newPassword.length < 12 ? 2 : /[A-Z]/.test(newPassword) && /[0-9]/.test(newPassword) ? 3 : 2;
  const strengthColors = ["transparent", "#ef4444", "#f59e0b", "#22c55e"];
  const strengthLabels = ["", "Weak", "Good", "Strong"];

  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown(c => {
        if (c <= 1) { clearInterval(t); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  // ── Step 1: Request OTP ──
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setStep("otp");
      startCooldown();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError("Please enter all 6 digits."); return; }
    setError("");
    // We don't verify OTP here — just move to password step
    // OTP is verified in the final reset call
    setStep("newPassword");
  };

  // ── Step 3: Reset Password ──
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { email, code: otp, newPassword });
      setStep("done");
    } catch (err: any) {
      setError(err.response?.data?.error || "Password reset failed. Try requesting a new OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.post("/auth/forgot-password", { email });
      startCooldown();
      setError("");
    } catch {
      setError("Failed to resend OTP.");
    }
  };

  const STEPS = ["email", "otp", "newPassword", "done"];
  const currentIdx = STEPS.indexOf(step);

  return (
    <div className="min-h-screen w-full flex" style={{ background: "#070b16" }}>

      {/* ─── Left Panel ─── */}
      <div className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-14 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-15%] w-[70%] h-[70%] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(124,110,247,0.12) 0%, transparent 65%)" }} />
          <div className="absolute bottom-[-15%] right-[-10%] w-[55%] h-[55%] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 65%)" }} />
        </div>
        <div className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "28px 28px"
          }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", boxShadow: "0 0 28px rgba(124,110,247,0.45)" }}>
            <Scale size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Nyaya</span>
        </div>

        {/* Steps */}
        <div className="relative z-10 space-y-8">
          <div>
            <p className="text-xs font-semibold tracking-widest mb-4" style={{ color: "#7c6ef7" }}>
              PASSWORD RECOVERY
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-white">
              Reset your<br />
              <span style={{ background: "linear-gradient(135deg,#818cf8,#f2d680)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                password safely.
              </span>
            </h1>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: "#5a5a72" }}>
              We use a one-time OTP to verify your identity before allowing a password change.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { label: "Enter your email" },
              { label: "Get OTP code" },
              { label: "Set new password" },
              { label: "All done!" },
            ].map((s, i) => {
              const isDone = i < currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <motion.div key={i} animate={{ opacity: isCurrent ? 1 : 0.4 }}
                  className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: isDone ? "rgba(34,197,94,0.15)" : isCurrent ? "rgba(124,110,247,0.2)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${isDone ? "rgba(34,197,94,0.4)" : isCurrent ? "rgba(124,110,247,0.5)" : "rgba(255,255,255,0.08)"}`,
                    }}>
                    {isDone
                      ? <CheckCircle2 size={16} style={{ color: "#4ade80" }} />
                      : <span className="text-xs font-bold" style={{ color: isCurrent ? "#9d8fff" : "#3a3a50" }}>{i + 1}</span>
                    }
                  </div>
                  <span className="text-sm font-medium" style={{ color: isCurrent ? "#e2e8f0" : "#4a4a60" }}>
                    {s.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        <p className="relative z-10 text-xs" style={{ color: "#3a3a50" }}>
          © 2025 Nyaya Legal Technologies.
        </p>
      </div>

      {/* ─── Right Panel ─── */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 lg:p-12 relative"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", boxShadow: "0 0 24px rgba(124,110,247,0.4)" }}>
              <Scale size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">Nyaya</span>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden">
                <div className="p-3.5 rounded-xl text-sm flex items-center gap-3"
                  style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{error}</span>
                  <button onClick={() => setError("")} className="ml-auto text-xs opacity-60">✕</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── STEP: EMAIL ── */}
          {step === "email" && (
            <div>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl mb-5 flex items-center justify-center"
                  style={{ background: "rgba(124,110,247,0.12)", border: "1px solid rgba(124,110,247,0.2)" }}>
                  <KeyRound size={24} style={{ color: "#9d8fff" }} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1.5">Forgot password?</h2>
                <p className="text-sm" style={{ color: "#6a6a80" }}>
                  Enter your registered email and we&apos;ll send an OTP to reset your password.
                </p>
              </div>

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="fp-email" className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>
                    Email address
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: email ? "#9d8fff" : "#4a4a62" }} />
                    <input
                      id="fp-email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl py-3 pl-10 pr-4 text-white placeholder-[#3a3a52] outline-none transition-all text-sm"
                      style={{ background: "#0e0e18", border: "1px solid rgba(255,255,255,0.07)" }}
                      onFocus={e => {
                        e.currentTarget.style.borderColor = "rgba(124,110,247,0.45)";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,110,247,0.07)";
                      }}
                      onBlur={e => {
                        e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                  </div>
                </div>

                <motion.button type="submit" disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.015 }} whileTap={{ scale: loading ? 1 : 0.975 }}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                  style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", boxShadow: "0 0 28px rgba(124,110,247,0.3)" }}>
                  {loading
                    ? <span className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                    : <><span>Send Reset OTP</span><ArrowRight size={16} /></>
                  }
                </motion.button>
              </form>
            </div>
          )}

          {/* ── STEP: OTP ── */}
          {step === "otp" && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "rgba(124,110,247,0.12)", border: "1px solid rgba(124,110,247,0.2)" }}>
                  <Mail size={26} style={{ color: "#9d8fff" }} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                <p className="text-sm" style={{ color: "#6a6a80" }}>
                  We sent a 6-digit reset code to
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: "#9d8fff" }}>{email}</p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <OtpInput value={otp} onChange={setOtp} />
                <motion.button type="submit" disabled={otp.length < 6}
                  whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", boxShadow: "0 0 28px rgba(124,110,247,0.3)" }}>
                  <span>Continue</span><ArrowRight size={16} />
                </motion.button>
              </form>

              <div className="mt-5 text-center">
                <p className="text-sm" style={{ color: "#4a4a60" }}>
                  Didn&apos;t receive it?{" "}
                  <button onClick={handleResend} disabled={resendCooldown > 0}
                    className="font-semibold disabled:opacity-40"
                    style={{ color: "#9d8fff" }}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* ── STEP: NEW PASSWORD ── */}
          {step === "newPassword" && (
            <div>
              <div className="mb-8">
                <div className="w-14 h-14 rounded-2xl mb-5 flex items-center justify-center"
                  style={{ background: "rgba(124,110,247,0.12)", border: "1px solid rgba(124,110,247,0.2)" }}>
                  <Lock size={24} style={{ color: "#9d8fff" }} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1.5">Set new password</h2>
                <p className="text-sm" style={{ color: "#6a6a80" }}>
                  Choose a strong password for your Nyaya account.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>New Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: newPassword ? "#9d8fff" : "#4a4a62" }} />
                    <input
                      id="fp-newpw"
                      type={showPw ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      className="w-full rounded-xl py-3 pl-10 pr-11 text-white placeholder-[#3a3a52] outline-none transition-all text-sm"
                      style={{ background: "#0e0e18", border: "1px solid rgba(255,255,255,0.07)" }}
                      onFocus={e => { e.currentTarget.style.borderColor = "rgba(124,110,247,0.45)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,110,247,0.07)"; }}
                      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "#4a4a62" }}>
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* strength */}
                {newPassword.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-1 flex-1 rounded-full transition-all"
                          style={{ background: i <= strength ? strengthColors[strength] : "rgba(255,255,255,0.07)" }} />
                      ))}
                    </div>
                    <span className="text-xs font-medium" style={{ color: strengthColors[strength] }}>
                      {strengthLabels[strength]}
                    </span>
                  </motion.div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>Confirm Password</label>
                  <div className="relative">
                    <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: confirmPassword ? "#9d8fff" : "#4a4a62" }} />
                    <input
                      id="fp-confirmpw"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      required
                      className="w-full rounded-xl py-3 pl-10 pr-11 text-white placeholder-[#3a3a52] outline-none transition-all text-sm"
                      style={{
                        background: "#0e0e18",
                        border: `1px solid ${confirmPassword && confirmPassword !== newPassword ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.07)"}`,
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = "rgba(124,110,247,0.45)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(124,110,247,0.07)"; }}
                      onBlur={e => {
                        if (confirmPassword && confirmPassword !== newPassword) {
                          e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)";
                        } else {
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                        }
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    <button type="button" onClick={() => setShowConfirm(s => !s)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: "#4a4a62" }}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs" style={{ color: "#f87171" }}>Passwords do not match</p>
                  )}
                </div>

                <motion.button type="submit" disabled={loading || (confirmPassword.length > 0 && confirmPassword !== newPassword)}
                  whileHover={{ scale: loading ? 1 : 1.015 }} whileTap={{ scale: loading ? 1 : 0.975 }}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", boxShadow: "0 0 28px rgba(124,110,247,0.3)" }}>
                  {loading
                    ? <span className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                    : <><span>Reset Password</span><ArrowRight size={16} /></>
                  }
                </motion.button>
              </form>
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === "done" && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.3)" }}>
                <CheckCircle2 size={36} style={{ color: "#4ade80" }} />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-3">Password reset!</h2>
              <p className="text-sm mb-8" style={{ color: "#6a6a80" }}>
                Your password has been updated. All active sessions have been signed out for your security.
              </p>
              <Link href="/login">
                <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)" }}>
                  Sign In with New Password
                  <ArrowRight size={16} />
                </motion.button>
              </Link>
            </motion.div>
          )}

          {step !== "done" && (
            <div className="mt-6 text-center">
              <p className="text-sm" style={{ color: "#4a4a62" }}>
                Remember your password?{" "}
                <Link href="/login" className="font-semibold" style={{ color: "#9d8fff" }}
                  onMouseOver={e => (e.currentTarget.style.color = "#f2d680")}
                  onMouseOut={e => (e.currentTarget.style.color = "#9d8fff")}>
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#070b16" }}>
        <div className="w-8 h-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
      </div>
    }>
      <ForgotPasswordInner />
    </Suspense>
  );
}
