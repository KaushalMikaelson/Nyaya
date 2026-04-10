"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scale, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck,
  Fingerprint, Loader2, Info, Phone,
} from "lucide-react";
import Link from "next/link";

// ─────────────────────────────────────────
// OTP INPUT COMPONENT
// ─────────────────────────────────────────

function OtpInput({ value, onChange, accentColor = "#6366f1" }: {
  value: string; onChange: (v: string) => void; accentColor?: string;
}) {
  const digits = value.split("").slice(0, 6);
  while (digits.length < 6) digits.push("");

  const handleChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const arr = [...digits];
    arr[i] = v.slice(-1);
    onChange(arr.join(""));
    if (v && i < 5) (document.getElementById(`aadhaar-otp-${i + 1}`) as HTMLInputElement)?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !digits[i] && i > 0)
      (document.getElementById(`aadhaar-otp-${i - 1}`) as HTMLInputElement)?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {digits.map((d, i) => (
        <input
          key={i} id={`aadhaar-otp-${i}`} type="text" inputMode="numeric"
          maxLength={1} value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className="w-12 h-14 text-center text-xl font-bold text-white rounded-xl outline-none transition-all"
          style={{
            background: "#0e0e18",
            border: `1px solid ${d ? `${accentColor}99` : "rgba(255,255,255,0.08)"}`,
            boxShadow: d ? `0 0 0 3px ${accentColor}14` : "none",
          }}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────

type Step = "intro" | "enter-aadhaar" | "enter-otp" | "done";

export default function AadhaarKycPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("intro");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [txnId, setTxnId] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [aadhaarVerified, setAadhaarVerified] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "CITIZEN")) {
      router.push("/login");
    }
    // Check if already verified
    if (user) {
      api.get("/auth/me").then(({ data }) => {
        if (data.user?.citizenProfile?.aadhaarVerified) {
          setAadhaarVerified(true);
          setStep("done");
        }
      }).catch(() => {});
    }
  }, [user, authLoading, router]);

  const formatAadhaar = (v: string) => {
    const nums = v.replace(/\D/g, "").slice(0, 12);
    return nums.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = aadhaarNumber.replace(/\s/g, "");
    if (clean.length !== 12) { setError("Please enter a valid 12-digit Aadhaar number."); return; }
    setError(""); setLoading(true);
    try {
      const { data } = await api.post("/auth/citizen/aadhaar/initiate", { aadhaarNumber: clean });
      setTxnId(data.txnId);
      setMaskedPhone(data.maskedPhone || "your registered mobile");
      setStep("enter-otp");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || "Failed to initiate Aadhaar verification.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { setError("Please enter all 6 digits."); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/auth/citizen/aadhaar/verify", { txnId, otp });
      await refreshUser();
      setStep("done");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setError(e.response?.data?.error || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#070b16" }}>
        <Loader2 className="animate-spin" size={32} style={{ color: "#6366f1" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#070b16" }}>
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 px-6 h-14 flex items-center justify-between"
        style={{ background: "rgba(7,7,13,0.9)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(16px)" }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 0 20px rgba(99,102,241,0.4)" }}>
            <Scale size={15} className="text-white" />
          </div>
          <span className="text-base font-bold text-white">Nyaya</span>
        </div>
        <Link href="/" className="text-xs flex items-center gap-1.5 transition-colors"
          style={{ color: "#6a6a80" }}
          onMouseOver={e => (e.currentTarget.style.color = "#9d8fff")}
          onMouseOut={e => (e.currentTarget.style.color = "#6a6a80")}>
          ← Back to Dashboard
        </Link>
      </header>

      <div className="max-w-md mx-auto px-4 py-12">
        <AnimatePresence mode="wait">
          {/* ── INTRO ── */}
          {step === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <div className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center"
                  style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <ShieldCheck size={36} style={{ color: "#818cf8" }} />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Aadhaar eKYC</h1>
                <p className="text-sm" style={{ color: "#6a6a80" }}>
                  Verify your identity with Aadhaar to unlock all legal services on Nyaya.
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {[
                  { icon: ShieldCheck, title: "Secure & Encrypted", desc: "Your data is encrypted per UIDAI standards" },
                  { icon: Phone, title: "OTP on registered mobile", desc: "You'll receive an OTP on your Aadhaar-linked phone" },
                  { icon: CheckCircle2, title: "Instant verification", desc: "Verification completes immediately after OTP" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
                      <item.icon size={14} style={{ color: "#818cf8" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs" style={{ color: "#5a5a70" }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl mb-6 flex items-start gap-2.5"
                style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                <Info size={14} style={{ color: "#818cf8", flexShrink: 0, marginTop: 2 }} />
                <p className="text-xs" style={{ color: "#6a6a80" }}>
                  <strong style={{ color: "#a5b4fc" }}>Dev mode:</strong> Use Aadhaar number{" "}
                  <code className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(99,102,241,0.15)", color: "#c7d2fe" }}>
                    999988887777
                  </code>{" "}
                  for testing. The OTP will be printed in the backend console.
                </p>
              </div>

              <motion.button onClick={() => setStep("enter-aadhaar")}
                whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 0 28px rgba(99,102,241,0.3)" }}>
                Start eKYC Verification <ArrowRight size={16} />
              </motion.button>
            </motion.div>
          )}

          {/* ── ENTER AADHAAR ── */}
          {step === "enter-aadhaar" && (
            <motion.div key="aadhaar" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button onClick={() => { setStep("intro"); setError(""); }}
                className="flex items-center gap-1.5 text-xs mb-6 transition-colors" style={{ color: "#5a5a70" }}
                onMouseOver={e => (e.currentTarget.style.color = "#9d8fff")}
                onMouseOut={e => (e.currentTarget.style.color = "#5a5a70")}>
                ← Back
              </button>

              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <Fingerprint size={28} style={{ color: "#818cf8" }} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Enter Aadhaar Number</h2>
                <p className="text-sm" style={{ color: "#6a6a80" }}>
                  We&apos;ll send a one-time password to your Aadhaar-registered mobile number.
                </p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mb-4 p-3.5 rounded-xl text-sm flex items-center gap-3"
                    style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleInitiate} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#5a5a70" }}>
                    Aadhaar Number
                  </label>
                  <input
                    id="aadhaar-number"
                    type="text"
                    inputMode="numeric"
                    value={aadhaarNumber}
                    onChange={e => setAadhaarNumber(formatAadhaar(e.target.value))}
                    placeholder="XXXX XXXX XXXX"
                    maxLength={14}
                    className="w-full rounded-xl py-3.5 px-4 text-white text-lg tracking-widest font-mono placeholder-[#3a3a52] outline-none transition-all text-center"
                    style={{
                      background: "#0e0e18",
                      border: "1px solid rgba(255,255,255,0.07)",
                      letterSpacing: "0.1em",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.07)"; }}
                    onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  <p className="text-xs text-center" style={{ color: "#4a4a60" }}>
                    Your 12-digit unique identification number
                  </p>
                </div>

                <motion.button type="submit" disabled={loading || aadhaarNumber.replace(/\s/g, "").length < 12}
                  whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 0 28px rgba(99,102,241,0.3)" }}>
                  {loading
                    ? <Loader2 size={16} className="animate-spin" />
                    : <><span>Send OTP to Mobile</span><ArrowRight size={16} /></>}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ── ENTER OTP ── */}
          {step === "enter-otp" && (
            <motion.div key="otp" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)" }}>
                  <Phone size={28} style={{ color: "#818cf8" }} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Enter Aadhaar OTP</h2>
                <p className="text-sm" style={{ color: "#6a6a80" }}>
                  OTP sent to mobile ending in{" "}
                  <span className="font-semibold" style={{ color: "#a5b4fc" }}>{maskedPhone}</span>
                </p>
                <p className="text-xs mt-1" style={{ color: "#3a3a50" }}>Valid for 10 minutes</p>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="mb-4 p-3.5 rounded-xl text-sm flex items-center gap-3"
                    style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => setError("")} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleVerify} className="space-y-6">
                <OtpInput value={otp} onChange={setOtp} accentColor="#6366f1" />
                <motion.button type="submit" disabled={loading || otp.length < 6}
                  whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                  className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 0 28px rgba(99,102,241,0.3)" }}>
                  {loading
                    ? <Loader2 size={16} className="animate-spin" />
                    : <><span>Verify Aadhaar</span><ShieldCheck size={16} /></>}
                </motion.button>
              </form>

              <div className="mt-5 text-center space-y-2">
                <p className="text-xs" style={{ color: "#4a4a60" }}>
                  Didn&apos;t receive OTP?{" "}
                  <button onClick={() => { setStep("enter-aadhaar"); setOtp(""); setError(""); }}
                    className="font-semibold" style={{ color: "#818cf8" }}>
                    Re-enter Aadhaar
                  </button>
                </p>
              </div>
            </motion.div>
          )}

          {/* ── DONE ── */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="text-center">
                <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 0.6, delay: 0.1 }}
                  className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.12)", border: "2px solid rgba(34,197,94,0.3)" }}>
                  <CheckCircle2 size={40} style={{ color: "#4ade80" }} />
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-3">eKYC Complete!</h2>
                <p className="text-sm mb-2" style={{ color: "#6a6a80" }}>
                  Your Aadhaar identity has been successfully verified.
                </p>
                {aadhaarVerified && (
                  <p className="text-xs mb-8" style={{ color: "#3a3a50" }}>
                    This verification was already completed.
                  </p>
                )}
                {!aadhaarVerified && (
                  <p className="text-sm mb-8" style={{ color: "#6a6a80" }}>
                    Your profile is now verified and you have full access to all Nyaya legal services.
                  </p>
                )}
                <Link href="/">
                  <motion.button whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.975 }}
                    className="w-full rounded-xl py-3 font-semibold text-white text-sm flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                    Go to Dashboard <ArrowRight size={16} />
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
