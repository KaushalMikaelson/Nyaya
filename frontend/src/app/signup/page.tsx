"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle,
  User, Phone, Shield, Briefcase, Gavel, Crown,
  CheckCircle2, FileText, Building2, ChevronRight
} from "lucide-react";

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

type Role = "CITIZEN" | "LAWYER" | "JUDGE";
type Step = "role" | "details" | "otp" | "profile" | "done";

interface RoleCard {
  role: Role;
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
  glow: string;
  badge: string;
}

const ROLES: RoleCard[] = [
  {
    role: "CITIZEN",
    icon: User,
    label: "Citizen",
    desc: "Access AI legal guidance, file queries, and connect with lawyers",
    color: "#6366f1",
    glow: "rgba(99,102,241,0.25)",
    badge: "Free",
  },
  {
    role: "LAWYER",
    icon: Briefcase,
    label: "Lawyer",
    desc: "Get verified, list your services, and manage client cases",
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.25)",
    badge: "Professional",
  },
  {
    role: "JUDGE",
    icon: Gavel,
    label: "Judge",
    desc: "Access judicial tools with government ID verification",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.25)",
    badge: "Government",
  },
];

// ─────────────────────────────────────────
// SHARED INPUT COMPONENT
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
            style={{ color: focused || value ? "#9d8fff" : "#4a4a62" }} />
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
            border: `1px solid ${focused ? "rgba(124,110,247,0.5)" : "rgba(255,255,255,0.07)"}`,
            boxShadow: focused ? "0 0 0 3px rgba(124,110,247,0.07)" : "none",
            paddingLeft: Icon ? "2.6rem" : "1rem",
            paddingRight: isPassword ? "2.5rem" : "1rem",
          }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
            style={{ color: "#4a4a62" }}
            onMouseOver={e => (e.currentTarget.style.color = "#9d8fff")}
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
// OTP INPUT COMPONENT
// ─────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = value.split("").slice(0, 6);
  while (digits.length < 6) digits.push("");

  const handleChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const arr = [...digits];
    arr[i] = v.slice(-1);
    const newVal = arr.join("");
    onChange(newVal);
    if (v && i < 5) {
      (document.getElementById(`otp-${i + 1}`) as HTMLInputElement)?.focus();
    }
  };

  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      (document.getElementById(`otp-${i - 1}`) as HTMLInputElement)?.focus();
    }
  };

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          id={`otp-${i}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-12 h-14 text-center text-xl font-bold text-white rounded-xl outline-none transition-all"
          style={{
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
// MAIN REGISTER PAGE
// ─────────────────────────────────────────

export default function Register() {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role>("CITIZEN");

  // Base fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  // Lawyer extra fields
  const [barCouncilNumber, setBarCouncilNumber] = useState("");
  const [barCouncilState, setBarCouncilState] = useState("");

  // Judge extra fields
  const [governmentId, setGovernmentId] = useState("");
  const [court, setCourt] = useState("");
  const [courtLevel, setCourtLevel] = useState("");

  // OTP
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");

  // ── Password strength ──
  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 :
    password.length < 12 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3 : 2;
  const strengthColors = ["transparent", "#ef4444", "#f59e0b", "#22c55e"];
  const strengthLabels = ["", "Weak", "Good", "Strong"];

  // ── Resend OTP cooldown ──
  const startCooldown = () => {
    setResendCooldown(60);
    const t = setInterval(() => {
      setResendCooldown(c => {
        if (c <= 1) { clearInterval(t); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  // ── STEP: Role → Details ──
  const handleRoleNext = () => {
    setStep("details");
    setError("");
  };

  // ── STEP: Details → OTP (register call) ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload: Record<string, string> = { email, password, fullName };
      if (phone) payload.phone = phone;
      if (role === "LAWYER") {
        payload.barCouncilNumber = barCouncilNumber;
        payload.barCouncilState = barCouncilState;
      }
      if (role === "JUDGE") {
        payload.governmentId = governmentId;
        payload.court = court;
        payload.courtLevel = courtLevel;
      }

      const endpoint = role === "CITIZEN" ? "/auth/citizen/register"
        : role === "LAWYER" ? "/auth/lawyer/register"
        : "/auth/judge/register";

      const { data } = await api.post(endpoint, payload);
      setUserId(data.userId);
      setStep("otp");
      startCooldown();
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── STEP: OTP → Done / Profile ──
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError("Please enter all 6 digits."); return; }
    setError("");
    setLoading(true);
    try {
      const endpoint = role === "CITIZEN" ? "/auth/citizen/verify-email"
        : role === "LAWYER" ? "/auth/lawyer/verify-email"
        : "/auth/judge/verify-email";

      const { data } = await api.post(endpoint, { email, code: otp });
      login(data.accessToken, data.user);
      setStep("done");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ──
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await api.post("/auth/resend-otp", { email, type: "EMAIL_VERIFY" });
      startCooldown();
      setError("");
    } catch {
      setError("Failed to resend OTP.");
    }
  };

  const selectedRole = ROLES.find(r => r.role === role)!;

  return (
    <div className="min-h-screen w-full flex" style={{ background: "#07070d" }}>

      {/* ─── Left visual panel ─── */}
      <div className="hidden lg:flex lg:w-[48%] relative flex-col justify-between p-14 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-15%] left-[-15%] w-[70%] h-[70%] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)" }} />
          <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full"
            style={{ background: "radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 65%)" }} />
        </div>
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }} />
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to right, #07070d 0%, transparent 30%, transparent 70%, #07070d 100%)"
        }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #7c6ef7, #a855f7)", boxShadow: "0 0 28px rgba(124,110,247,0.45)" }}>
            <Scale size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Nyaya</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "rgba(124,110,247,0.15)", color: "#9d8fff", border: "1px solid rgba(124,110,247,0.25)" }}>
            BETA
          </span>
        </div>

        {/* Step progress */}
        <div className="relative z-10 space-y-10">
          <div>
            <p className="text-xs font-semibold tracking-widest mb-4" style={{ color: "#7c6ef7" }}>
              YOUR REGISTRATION JOURNEY
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-white tracking-tight">
              Join India&apos;s<br />
              <span style={{ background: "linear-gradient(135deg,#818cf8,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                legal revolution.
              </span>
            </h1>
          </div>

          {/* Progress steps */}
          <div className="space-y-3">
            {[
              { key: "role", label: "Choose your role" },
              { key: "details", label: "Enter your details" },
              { key: "otp", label: "Verify your email" },
              { key: "done", label: "You're in!" },
            ].map((s, i) => {
              const steps: Step[] = ["role", "details", "otp", "done"];
              const currentIdx = steps.indexOf(step);
              const stepIdx = steps.indexOf(s.key as Step);
              const isDone = stepIdx < currentIdx;
              const isCurrent = stepIdx === currentIdx;

              return (
                <motion.div key={s.key}
                  animate={{ opacity: isCurrent ? 1 : 0.45 }}
                  className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
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

          {/* Role info card */}
          {step !== "role" && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${selectedRole.color}33`,
                boxShadow: `0 0 30px ${selectedRole.glow}`,
              }}>
              <div className="flex items-center gap-3 mb-2">
                <selectedRole.icon size={18} style={{ color: selectedRole.color }} />
                <span className="font-semibold text-white text-sm">{selectedRole.label}</span>
                <span className="text-xs px-2 py-0.5 rounded-full ml-auto"
                  style={{ background: `${selectedRole.color}22`, color: selectedRole.color, border: `1px solid ${selectedRole.color}44` }}>
                  {selectedRole.badge}
                </span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#5a5a72" }}>{selectedRole.desc}</p>
            </motion.div>
          )}
        </div>

        <p className="relative z-10 text-xs" style={{ color: "#3a3a50" }}>
          © 2025 Nyaya Legal Technologies. AI-assisted legal information only.
        </p>
      </div>

      {/* ─── Right form panel ─── */}
      <div className="w-full lg:w-[52%] flex items-center justify-center p-6 lg:p-12 relative overflow-y-auto"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}>

        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#7c6ef7,#a855f7)", boxShadow: "0 0 24px rgba(124,110,247,0.4)" }}>
              <Scale size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white">Nyaya</span>
          </div>

          {/* ─ Error banner ─ */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -8, height: 0 }}
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

          {/* ════════════════════════════════════
              STEP: ROLE SELECTION
          ════════════════════════════════════ */}
          {step === "role" && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-1.5">Create your account</h2>
                <p className="text-sm" style={{ color: "#6a6a80" }}>
                  Choose your role to get started with Nyaya.
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {ROLES.map(r => (
                  <button
                    key={r.role}
                    id={`role-${r.role.toLowerCase()}`}
                    onClick={() => setRole(r.role)}
                    className="w-full text-left rounded-2xl p-4 transition-all duration-200 group"
                    style={{
                      background: role === r.role ? `${r.color}12` : "rgba(255,255,255,0.025)",
                      border: `1px solid ${role === r.role ? `${r.color}55` : "rgba(255,255,255,0.06)"}`,
                      boxShadow: role === r.role ? `0 0 20px ${r.glow}` : "none",
                    }}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all"
                        style={{
                          background: role === r.role ? `${r.color}22` : "rgba(255,255,255,0.05)",
                          border: `1px solid ${role === r.role ? `${r.color}44` : "rgba(255,255,255,0.08)"}`,
                        }}>
                        <r.icon size={18} style={{ color: role === r.role ? r.color : "#4a4a62" }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-white">{r.label}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              background: role === r.role ? `${r.color}22` : "rgba(255,255,255,0.05)",
                              color: role === r.role ? r.color : "#4a4a60",
                              border: `1px solid ${role === r.role ? `${r.color}33` : "rgba(255,255,255,0.08)"}`,
                            }}>
                            {r.badge}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: "#5a5a72" }}>{r.desc}</p>
                      </div>
                      <ChevronRight size={16} style={{ color: role === r.role ? selectedRole.color : "#3a3a50" }} />
                    </div>
                  </button>
                ))}
              </div>

              {/* Admin note */}
              <div className="rounded-xl p-3.5 mb-6 flex items-start gap-3"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <Crown size={15} style={{ color: "#f59e0b", marginTop: 1, flexShrink: 0 }} />
                <p className="text-xs" style={{ color: "#5a5a68" }}>
                  <strong style={{ color: "#e2e8f0" }}>Admin?</strong> Admins are invited by an existing admin. Check your email for an invite link.
                </p>
              </div>

              <motion.button
                id="role-next"
                onClick={handleRoleNext}
                whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#7c6ef7,#a855f7)", boxShadow: "0 0 28px rgba(124,110,247,0.3)" }}>
                Continue as {selectedRole.label}
                <ArrowRight size={16} />
              </motion.button>
            </div>
          )}

          {/* ════════════════════════════════════
              STEP: DETAILS FORM
          ════════════════════════════════════ */}
          {step === "details" && (
            <div>
              <button onClick={() => setStep("role")}
                className="flex items-center gap-1.5 text-xs mb-6 transition-colors"
                style={{ color: "#5a5a70" }}
                onMouseOver={e => (e.currentTarget.style.color = "#9d8fff")}
                onMouseOut={e => (e.currentTarget.style.color = "#5a5a70")}>
                ← Back to role selection
              </button>

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-1">
                  <selectedRole.icon size={16} style={{ color: selectedRole.color }} />
                  <h2 className="text-xl font-bold text-white">
                    {role === "CITIZEN" ? "Your details"
                      : role === "LAWYER" ? "Lawyer registration"
                      : "Judge registration"}
                  </h2>
                </div>
                <p className="text-sm" style={{ color: "#6a6a80" }}>
                  {role === "CITIZEN" && "Fill in your basic information to get started."}
                  {role === "LAWYER" && "We'll verify your Bar Council credentials before approving your profile."}
                  {role === "JUDGE" && "Your government ID will be reviewed by our admin team."}
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                {/* Common fields */}
                <Input id="reg-name" label="Full Name" value={fullName} onChange={setFullName}
                  icon={User} placeholder="As per your official ID" required />
                <Input id="reg-email" label="Email Address" type="email" value={email} onChange={setEmail}
                  icon={Mail} placeholder="you@example.com" required />
                <Input id="reg-password" label="Password" type="password" value={password} onChange={setPassword}
                  icon={Lock} placeholder="Min. 8 characters" required
                  hint={role === "JUDGE" ? "Choose a strong password for your government account." : undefined} />

                {/* Password strength */}
                {password.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-2">
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

                {/* Citizen: optional phone */}
                {role === "CITIZEN" && (
                  <Input id="reg-phone" label="Phone (optional)" value={phone} onChange={setPhone}
                    icon={Phone} placeholder="+91 98765 43210"
                    hint="Used for OTP login and SMS verification" />
                )}

                {/* Lawyer: Bar Council fields */}
                {role === "LAWYER" && (
                  <>
                    <Input id="reg-bar" label="Bar Council Enrollment Number" value={barCouncilNumber}
                      onChange={setBarCouncilNumber} icon={FileText} placeholder="e.g. DL/1234/2010" required />
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>
                        Bar Council State
                      </label>
                      <select value={barCouncilState} onChange={e => setBarCouncilState(e.target.value)}
                        className="w-full rounded-xl py-3 px-4 text-sm outline-none transition-all"
                        style={{ background: "#0e0e18", border: "1px solid rgba(255,255,255,0.07)", color: barCouncilState ? "#e2e8f0" : "#3a3a52" }}>
                        <option value="">Select state...</option>
                        {["Delhi", "Maharashtra", "Karnataka", "Tamil Nadu", "Gujarat", "Rajasthan",
                          "West Bengal", "Uttar Pradesh", "Madhya Pradesh", "Andhra Pradesh",
                          "Kerala", "Punjab", "Haryana", "Bihar", "Odisha", "Assam",
                          "Jharkhand", "Chattisgarh", "Uttarakhand", "Himachal Pradesh",
                          "Supreme Court of India", "Calcutta", "Bombay", "Madras", "Allahabad"].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                      </select>
                    </div>
                    <div className="rounded-xl p-3.5" style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.15)" }}>
                      <p className="text-xs" style={{ color: "#8b5cf6" }}>
                        📋 After email verification, you'll upload your Bar Certificate and other documents for admin review.
                        Approval takes 2-3 business days.
                      </p>
                    </div>
                  </>
                )}

                {/* Judge: government ID fields */}
                {role === "JUDGE" && (
                  <>
                    <Input id="reg-govid" label="Government / Judicial ID" value={governmentId}
                      onChange={setGovernmentId} icon={Shield} placeholder="Employee ID / Judicial ID" required />
                    <Input id="reg-court" label="Court Name" value={court}
                      onChange={setCourt} icon={Building2} placeholder="e.g. Delhi High Court" />
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>
                        Court Level
                      </label>
                      <select value={courtLevel} onChange={e => setCourtLevel(e.target.value)}
                        className="w-full rounded-xl py-3 px-4 text-sm outline-none transition-all"
                        style={{ background: "#0e0e18", border: "1px solid rgba(255,255,255,0.07)", color: courtLevel ? "#e2e8f0" : "#3a3a52" }}>
                        <option value="">Select level...</option>
                        <option value="Supreme">Supreme Court</option>
                        <option value="High">High Court</option>
                        <option value="District">District Court</option>
                        <option value="Family">Family Court</option>
                        <option value="Magistrate">Magistrate Court</option>
                        <option value="Tribunal">Tribunal</option>
                      </select>
                    </div>
                    <div className="rounded-xl p-3.5" style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.15)" }}>
                      <p className="text-xs" style={{ color: "#a855f7" }}>
                        🔐 Judge accounts require admin approval after email verification. Your government credentials will be verified by our team.
                      </p>
                    </div>
                  </>
                )}

                <motion.button type="submit" disabled={loading}
                  whileHover={{ scale: loading ? 1 : 1.015 }} whileTap={{ scale: loading ? 1 : 0.975 }}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#7c6ef7,#a855f7)", boxShadow: "0 0 28px rgba(124,110,247,0.3)" }}>
                  {loading
                    ? <span className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                    : <><span>Create account & verify email</span><ArrowRight size={16} /></>
                  }
                </motion.button>
              </form>
            </div>
          )}

          {/* ════════════════════════════════════
              STEP: EMAIL OTP VERIFICATION
          ════════════════════════════════════ */}
          {step === "otp" && (
            <div>
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
                  style={{ background: "rgba(124,110,247,0.12)", border: "1px solid rgba(124,110,247,0.25)" }}>
                  <Mail size={28} style={{ color: "#9d8fff" }} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                <p className="text-sm" style={{ color: "#6a6a80" }}>
                  We sent a 6-digit code to
                </p>
                <p className="text-sm font-semibold mt-1" style={{ color: "#9d8fff" }}>{email}</p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <OtpInput value={otp} onChange={setOtp} />

                <motion.button type="submit" disabled={loading || otp.length < 6}
                  whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#7c6ef7,#a855f7)", boxShadow: "0 0 28px rgba(124,110,247,0.3)" }}>
                  {loading
                    ? <span className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white animate-spin" />
                    : <><span>Verify &amp; Continue</span><ArrowRight size={16} /></>
                  }
                </motion.button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm" style={{ color: "#4a4a60" }}>
                  Didn&apos;t receive it?{" "}
                  <button onClick={handleResend} disabled={resendCooldown > 0}
                    className="font-semibold transition-colors disabled:opacity-40"
                    style={{ color: "#9d8fff" }}>
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                </p>
                <p className="text-xs mt-2" style={{ color: "#3a3a50" }}>
                  Check your spam folder if you don't see it.
                </p>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════
              STEP: DONE / NEXT STEPS
          ════════════════════════════════════ */}
          {step === "done" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center">
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.3)" }}>
                <CheckCircle2 size={36} style={{ color: "#4ade80" }} />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-3">You&apos;re verified!</h2>
              <p className="text-sm mb-2" style={{ color: "#6a6a80" }}>
                {role === "CITIZEN" && "Your account is ready. Welcome to Nyaya!"}
                {role === "LAWYER" && "Email verified! Now submit your Bar Council documents for admin approval."}
                {role === "JUDGE" && "Email verified! Your account is pending admin approval — you can upload your government ID to speed up the process."}
              </p>

              {/* Next-step hint */}
              {role !== "CITIZEN" && (
                <div className="rounded-xl p-3.5 mb-6 text-left"
                  style={{
                    background: role === "LAWYER" ? "rgba(139,92,246,0.07)" : "rgba(168,85,247,0.07)",
                    border: `1px solid ${role === "LAWYER" ? "rgba(139,92,246,0.2)" : "rgba(168,85,247,0.2)"}`,
                  }}>
                  <p className="text-xs" style={{ color: role === "LAWYER" ? "#c4b5fd" : "#d8b4fe" }}>
                    {role === "LAWYER" && "📋 Next step: Upload your Bar Certificate, Degree, and Government ID for verification. Approval takes 2-3 business days."}
                    {role === "JUDGE" && "🔐 Next step: Check your verification status and optionally upload your Government ID document to support the review process."}
                  </p>
                </div>
              )}

              <Link href={
                role === "LAWYER" ? "/profile/lawyer"
                : role === "JUDGE" ? "/profile/judge"
                : "/"
              }>
                <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg,#7c6ef7,#a855f7)" }}>
                  {role === "LAWYER" ? "Complete Lawyer Profile →"
                    : role === "JUDGE" ? "View Account Status →"
                    : "Go to Dashboard →"}
                  <ArrowRight size={16} />
                </motion.button>
              </Link>
            </motion.div>
          )}

          {/* Sign in link */}
          {step !== "done" && (
            <div className="mt-6 text-center">
              <p className="text-sm" style={{ color: "#4a4a62" }}>
                Already have an account?{" "}
                <Link href="/login" className="font-semibold transition-colors"
                  style={{ color: "#9d8fff" }}
                  onMouseOver={e => (e.currentTarget.style.color = "#c084fc")}
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
