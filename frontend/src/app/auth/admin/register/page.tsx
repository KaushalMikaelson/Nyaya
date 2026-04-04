"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, Mail, Lock, ArrowRight, Eye, EyeOff,
  Crown, User, Building2, AlertCircle, CheckCircle2, Shield
} from "lucide-react";

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
      (document.getElementById(`admin-otp-${i + 1}`) as HTMLInputElement)?.focus();
    }
  };

  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      (document.getElementById(`admin-otp-${i - 1}`) as HTMLInputElement)?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          id={`admin-otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-11 h-13 text-center text-xl font-bold text-white rounded-xl outline-none transition-all"
          style={{
            background: "#0e0e18",
            border: `1px solid ${d ? "rgba(245,158,11,0.6)" : "rgba(255,255,255,0.08)"}`,
            boxShadow: d ? "0 0 0 3px rgba(245,158,11,0.08)" : "none",
            height: "3.25rem",
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// SHARED INPUT
// ─────────────────────────────────────────

function Input({
  id, label, type = "text", value, onChange, placeholder, icon: Icon, required, hint,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  icon?: React.ElementType; required?: boolean; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [show, setShow] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-semibold tracking-wide uppercase"
        style={{ color: "#5a5a70" }}>{label}</label>
      <div className="relative">
        {Icon && (
          <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors"
            style={{ color: focused || value ? "#f59e0b" : "#4a4a62" }} />
        )}
        <input
          id={id}
          type={isPassword ? (show ? "text" : "password") : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full rounded-xl py-3 text-white placeholder-[#3a3a52] outline-none transition-all text-sm"
          style={{
            background: "#0e0e18",
            border: `1px solid ${focused ? "rgba(245,158,11,0.5)" : "rgba(255,255,255,0.07)"}`,
            boxShadow: focused ? "0 0 0 3px rgba(245,158,11,0.07)" : "none",
            paddingLeft: Icon ? "2.6rem" : "1rem",
            paddingRight: isPassword ? "2.5rem" : "1rem",
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: "#4a4a62" }}
            onMouseOver={e => (e.currentTarget.style.color = "#f59e0b")}
            onMouseOut={e => (e.currentTarget.style.color = "#4a4a62")}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs" style={{ color: "#4a4a60" }}>{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN COMPONENT (inner, uses useSearchParams)
// ─────────────────────────────────────────

function AdminRegisterInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  type Step = "validate" | "register" | "otp" | "done" | "invalid";
  const [step, setStep] = useState<Step>("validate");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Password strength
  const strength = password.length === 0 ? 0
    : password.length < 12 ? 1
    : /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password) ? 3
    : 2;
  const strengthColors = ["transparent", "#ef4444", "#f59e0b", "#22c55e"];
  const strengthLabels = ["", "Too weak for admin", "Getting better", "Strong ✓"];

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Validate token on mount ──
  useEffect(() => {
    if (!token) {
      setStep("invalid");
      return;
    }
    setStep("register");
  }, [token]);

  // ── Resend cooldown ──
  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown(c => {
        if (c <= 1) { clearInterval(t); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  // ── Step: Register → OTP ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 12) {
      setError("Admin passwords must be at least 12 characters.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/admin/register", {
        token, email, password, fullName, department,
      });
      setStep("otp");
      startCooldown();
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed. Your invite link may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step: OTP → Done ──
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError("Please enter all 6 digits."); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/admin/verify-email", { email, code: otp });
      setStep("done");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.post("/auth/resend-otp", { email, type: "EMAIL_VERIFY" });
      startCooldown();
    } catch {
      setError("Failed to resend OTP.");
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: "#07070d" }}>

      {/* Amber ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)" }} />
      </div>

      {/* Dot grid */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }} />

      <motion.div
        key={step}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 28px rgba(245,158,11,0.45)" }}>
            <Scale size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Nyaya</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)" }}>
            ADMIN
          </span>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 overflow-hidden">
              <div className="p-3.5 rounded-xl text-sm flex items-center gap-3"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
                <button onClick={() => setError("")} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── INVALID TOKEN ── */}
        {step === "invalid" && (
          <div className="rounded-2xl p-8 text-center"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}>
              <Shield size={28} style={{ color: "#ef4444" }} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Invalid Invite Link</h2>
            <p className="text-sm mb-6" style={{ color: "#6a6a80" }}>
              This admin invite link is missing, expired, or has already been used.
              Contact your system administrator for a new invite.
            </p>
            <Link href="/login">
              <button className="w-full rounded-xl py-3 font-semibold text-white text-sm"
                style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Back to Login
              </button>
            </Link>
          </div>
        )}

        {/* ── REGISTER FORM ── */}
        {step === "register" && (
          <div className="rounded-2xl p-8"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(245,158,11,0.15)" }}>

            {/* Admin badge */}
            <div className="flex items-center gap-3 mb-6 p-3.5 rounded-xl"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <Crown size={16} style={{ color: "#f59e0b", flexShrink: 0 }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "#fbbf24" }}>Admin Invitation</p>
                <p className="text-xs" style={{ color: "#5a5a68" }}>
                  You have been invited to join Nyaya as an administrator.
                </p>
              </div>
            </div>

            <h2 className="text-xl font-bold text-white mb-1.5">Create Admin Account</h2>
            <p className="text-sm mb-6" style={{ color: "#6a6a80" }}>
              Set up your Nyaya administrator account. Use a strong password — admin accounts have elevated privileges.
            </p>

            <form onSubmit={handleRegister} className="space-y-4">
              <Input id="admin-name" label="Full Name" value={fullName} onChange={setFullName}
                icon={User} placeholder="Your full legal name" required />
              <Input id="admin-email" label="Email Address" type="email" value={email} onChange={setEmail}
                icon={Mail} placeholder="Must match invite email" required />
              <Input id="admin-dept" label="Department" value={department} onChange={setDepartment}
                icon={Building2} placeholder="e.g. Legal Operations, Trust & Safety" />
              <Input id="admin-password" label="Password" type="password" value={password} onChange={setPassword}
                icon={Lock} placeholder="Minimum 12 characters" required
                hint="Use uppercase, numbers & symbols for maximum security." />

              {/* Password strength */}
              {password.length > 0 && (
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

              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.015 }} whileTap={{ scale: loading ? 1 : 0.975 }}
                className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 28px rgba(245,158,11,0.3)" }}>
                {loading
                  ? <span className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                  : <><span>Register & Verify Email</span><ArrowRight size={16} /></>
                }
              </motion.button>
            </form>
          </div>
        )}

        {/* ── OTP VERIFICATION ── */}
        {step === "otp" && (
          <div className="rounded-2xl p-8"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(245,158,11,0.15)" }}>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
                <Mail size={28} style={{ color: "#f59e0b" }} />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Verify your email</h2>
              <p className="text-sm" style={{ color: "#6a6a80" }}>
                A 6-digit code was sent to
              </p>
              <p className="text-sm font-semibold mt-1" style={{ color: "#fbbf24" }}>{email}</p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <OtpInput value={otp} onChange={setOtp} />
              <motion.button type="submit" disabled={loading || otp.length < 6}
                whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 28px rgba(245,158,11,0.3)" }}>
                {loading
                  ? <span className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                  : <><span>Verify & Activate Account</span><ArrowRight size={16} /></>
                }
              </motion.button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm" style={{ color: "#4a4a60" }}>
                Didn&apos;t receive it?{" "}
                <button onClick={handleResend} disabled={resendCooldown > 0}
                  className="font-semibold transition-colors disabled:opacity-40"
                  style={{ color: "#fbbf24" }}>
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 text-center"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.3)" }}>
              <CheckCircle2 size={36} style={{ color: "#4ade80" }} />
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-3">Admin Account Active!</h2>
            <p className="text-sm mb-2" style={{ color: "#6a6a80" }}>
              Welcome to Nyaya. Your admin account has been verified and is ready to use.
            </p>
            <p className="text-xs mb-8" style={{ color: "#4a4a60" }}>
              You now have access to user verification, content management, and platform administration.
            </p>
            <motion.button
              onClick={() => router.push("/login")}
              whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
              className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
              Sign In to Admin Panel
              <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        )}

        {step !== "done" && step !== "invalid" && (
          <div className="mt-5 text-center">
            <p className="text-sm" style={{ color: "#4a4a62" }}>
              Already have an account?{" "}
              <Link href="/login" className="font-semibold"
                style={{ color: "#fbbf24" }}
                onMouseOver={e => (e.currentTarget.style.color = "#f59e0b")}
                onMouseOut={e => (e.currentTarget.style.color = "#fbbf24")}>
                Sign in
              </Link>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────
// PAGE (wrapped in Suspense for useSearchParams)
// ─────────────────────────────────────────

export default function AdminRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#07070d" }}>
        <div className="w-8 h-8 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
      </div>
    }>
      <AdminRegisterInner />
    </Suspense>
  );
}
