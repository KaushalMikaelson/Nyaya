"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Scale, User, Mail, Phone, MapPin, Briefcase, Shield,
  Building, Loader2, CheckCircle, AlertCircle, Edit2, Save,
  X, Menu, LogOut, LayoutDashboard, Zap, FileStack, Users,
  Bell, ShieldAlert, CreditCard, Award, ShieldCheck,
  ChevronRight, Trash2, Clock, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  email: string;
  phone: string | null;
  role: string;
  isPro: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isBiometricEnabled: boolean;
  createdAt: string;
  citizenProfile?: {
    fullName: string | null;
    aadhaarVerified: boolean;
    verificationStatus: string;
  } | null;
  lawyerProfile?: {
    fullName: string | null;
    barCouncilNumber: string | null;
    barCouncilState: string | null;
    specializations: string[];
    verificationStatus: string;
    verifiedAt: string | null;
  } | null;
  judgeProfile?: {
    fullName: string | null;
    governmentId: string | null;
    court: string | null;
    courtLevel: string | null;
    verificationStatus: string;
    verifiedAt: string | null;
  } | null;
  adminProfile?: {
    fullName: string | null;
    department: string | null;
    permissions: string[];
  } | null;
}

interface Subscription {
  tier: string;
  status: string;
  apiTokensUsed: number;
  apiTokensLimit: number;
  currentPeriodEnd: string | null;
}

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Chandigarh", "Puducherry",
];

const PLAN_COLORS: Record<string, string> = {
  FREE: "bg-slate-100 text-slate-600 border-slate-200",
  BASIC: "bg-blue-50 text-blue-700 border-blue-200",
  PRO: "bg-amber-50 text-amber-700 border-amber-200",
  ENTERPRISE: "bg-purple-50 text-purple-700 border-purple-200",
};

const VERIFICATION_BADGES: Record<string, { label: string; class: string; icon: any }> = {
  VERIFIED: { label: "Verified", class: "bg-green-50 text-green-700 border-green-200", icon: CheckCircle },
  PENDING: { label: "Pending Verification", class: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: Clock },
  REJECTED: { label: "Rejected", class: "bg-red-50 text-red-700 border-red-200", icon: AlertCircle },
  SUSPENDED: { label: "Suspended", class: "bg-slate-100 text-slate-600 border-slate-200", icon: Shield },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Editable fields
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, subRes] = await Promise.allSettled([
        api.get("/auth/me"),
        api.get("/payments/subscription").catch(() => null),
      ]);

      if (meRes.status === "fulfilled") {
        const p = meRes.value.data.user as UserProfile;
        setProfile(p);
        // Prefill form
        const name = p.citizenProfile?.fullName || p.lawyerProfile?.fullName || p.judgeProfile?.fullName || p.adminProfile?.fullName || "";
        setForm({
          fullName: name,
          phone: p.phone || "",
          address: "",
          state: "",
          bio: "",
          firmName: "",
          court: p.judgeProfile?.court || "",
          courtLevel: p.judgeProfile?.courtLevel || "",
          department: p.adminProfile?.department || "",
        });
      }

      if (subRes.status === "fulfilled" && subRes.value?.data) {
        setSubscription(subRes.value.data.subscription || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      await api.patch("/auth/profile", form);
      setSuccessMessage("Profile updated successfully.");
      setIsEditing(false);
      fetchProfile();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE MY ACCOUNT") return;
    setDeleting(true);
    try {
      await api.delete("/auth/me", { data: { confirmDelete: true } });
      await logout();
    } catch (err: any) {
      alert(err.response?.data?.error || "Account deletion failed.");
    } finally {
      setDeleting(false);
    }
  };

  const getDisplayName = () => {
    if (!profile) return "User";
    return profile.citizenProfile?.fullName || profile.lawyerProfile?.fullName ||
      profile.judgeProfile?.fullName || profile.adminProfile?.fullName ||
      profile.email.split("@")[0];
  };

  const getVerificationStatus = () => {
    if (!profile) return null;
    if (profile.role === "CITIZEN") return profile.citizenProfile?.verificationStatus || null;
    if (profile.role === "LAWYER") return profile.lawyerProfile?.verificationStatus || null;
    if (profile.role === "JUDGE") return profile.judgeProfile?.verificationStatus || null;
    return null;
  };

  const verStatus = getVerificationStatus();
  const verBadge = verStatus ? VERIFICATION_BADGES[verStatus] : null;

  if (authLoading || loading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#f8f9fa]">
        <div className="flex flex-col items-center gap-4">
          <Scale size={32} className="text-[#0f172a] animate-pulse" />
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f8f9fa] text-[#1e293b] font-sans">

      {/* Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-300 ease-in-out bg-[#0f172a] border-r border-slate-800 shadow-[20px_0_50px_rgba(0,0,0,0.2)] ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-1.5 px-3 h-[60px] shrink-0 border-b border-slate-800">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white transition-colors">
            <Scale size={16} />
            <span className="text-sm font-semibold text-white">Nyaay AI</span>
          </button>
          <button className="md:hidden ml-auto w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-1 px-3 py-4 border-b border-slate-800">
          {[
            { icon: LayoutDashboard, label: "Dashboard", path: "/" },
            { icon: Zap, label: "Ask Nyaay", path: "/ask-nyaya" },
            { icon: FileStack, label: "Documents", path: "/documents" },
            { icon: Briefcase, label: "Case Management", path: "/cases" },
            { icon: Users, label: "Lawyer Marketplace", path: "/marketplace" },
            { icon: Bell, label: "Notifications", path: "/notifications" },
          ].map(({ icon: Icon, label, path }) => (
            <button key={path} onClick={() => router.push(path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
              <Icon size={18} /> {label}
            </button>
          ))}
          {user.role === "ADMIN" && (
            <button onClick={() => router.push("/admin")}
              className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950 transition-colors">
              <ShieldAlert size={18} /> Admin Console
            </button>
          )}
        </div>
        <div className="flex-1" />
        <div className="px-3 pb-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-slate-800 border border-slate-700">
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs text-[#0f172a] bg-white">
              {getDisplayName()[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm font-medium text-white">{getDisplayName()}</div>
              <div className="text-[11px] text-slate-500">{user.role}</div>
            </div>
            <button onClick={logout} className="p-1 text-slate-500 hover:text-red-400 transition-colors" title="Logout">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        {/* Topbar */}
        <header className="flex items-center justify-between h-14 px-4 md:px-6 shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <button className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-[#0f172a] hover:bg-slate-100 transition-colors" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <User size={18} className="text-[#0f172a]" />
              <h1 className="text-sm font-bold text-[#0f172a]">My Profile</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <X size={13} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-[#0f172a] text-white rounded-lg hover:bg-[#1e2d3d] transition-colors disabled:opacity-60">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save Changes
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[#0f172a] border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                <Edit2 size={13} /> Edit Profile
              </button>
            )}
          </div>
        </header>

        <div className="max-w-3xl mx-auto w-full px-4 md:px-6 py-8 space-y-6">

          {/* Feedback messages */}
          <AnimatePresence>
            {successMessage && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
                <CheckCircle size={16} className="shrink-0" /> {successMessage}
              </motion.div>
            )}
            {errorMessage && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                <div className="flex items-center gap-2"><AlertCircle size={16} /> {errorMessage}</div>
                <button onClick={() => setErrorMessage("")}><X size={14} /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Profile hero card ── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="h-24 bg-gradient-to-br from-[#0f172a] to-[#1e3a5f]" />
            <div className="px-6 pb-6">
              <div className="flex items-end justify-between -mt-10 mb-4">
                <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg flex items-center justify-center text-3xl font-bold text-[#0f172a]">
                  {getDisplayName()[0].toUpperCase()}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  {verBadge && (
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${verBadge.class}`}>
                      <verBadge.icon size={11} /> {verBadge.label}
                    </span>
                  )}
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${PLAN_COLORS[subscription?.tier || "FREE"]}`}>
                    {subscription?.tier || "FREE"} Plan
                  </span>
                </div>
              </div>
              <h2 className="text-xl font-bold text-[#0f172a]">{getDisplayName()}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{profile?.email}</p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Shield size={12} /> {user.role}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={12} /> Joined {profile ? new Date(profile.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "—"}
                </span>
                {profile?.isEmailVerified && (
                  <span className="flex items-center gap-1.5 text-green-600">
                    <CheckCircle size={12} /> Email verified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── Subscription card ── */}
          {subscription && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-[#0f172a]" />
                  <h3 className="text-sm font-bold text-[#0f172a]">Subscription</h3>
                </div>
                {subscription.tier === "FREE" && (
                  <button onClick={() => router.push("/pricing")}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-[#0f172a] to-[#1e3a5f] text-white rounded-lg hover:opacity-90 transition-opacity">
                    Upgrade <ChevronRight size={12} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 text-center">
                  <p className="text-lg font-bold text-[#0f172a]">{subscription.tier}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Current Plan</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 text-center">
                  <p className="text-lg font-bold text-[#0f172a]">{subscription.apiTokensUsed}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">API Calls Used</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 text-center">
                  <p className="text-lg font-bold text-[#0f172a]">{subscription.apiTokensLimit.toLocaleString()}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Monthly Limit</p>
                </div>
              </div>
              {subscription.apiTokensLimit > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Usage this period</span>
                    <span>{Math.round((subscription.apiTokensUsed / subscription.apiTokensLimit) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#0f172a] to-[#1e3a5f] rounded-full transition-all"
                      style={{ width: `${Math.min((subscription.apiTokensUsed / subscription.apiTokensLimit) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Personal Information ── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <User size={16} className="text-[#0f172a]" />
              <h3 className="text-sm font-bold text-[#0f172a]">Personal Information</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full Name</label>
                  {isEditing ? (
                    <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors" />
                  ) : (
                    <p className="text-sm text-slate-700 py-1">{form.fullName || "—"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Email Address</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-700 py-1 flex-1">{profile?.email || "—"}</p>
                    {profile?.isEmailVerified && <CheckCircle size={13} className="text-green-500 shrink-0" />}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Phone Number</label>
                  {isEditing ? (
                    <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors" />
                  ) : (
                    <p className="text-sm text-slate-700 py-1">{profile?.phone || "—"}</p>
                  )}
                </div>

                {user.role === "CITIZEN" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">State</label>
                    {isEditing ? (
                      <select value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors bg-white">
                        <option value="">Select state</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    ) : (
                      <p className="text-sm text-slate-700 py-1">{form.state || "—"}</p>
                    )}
                  </div>
                )}
              </div>

              {user.role === "CITIZEN" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Address</label>
                  {isEditing ? (
                    <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                      placeholder="Street, Area, City"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors" />
                  ) : (
                    <p className="text-sm text-slate-700 py-1">{form.address || "—"}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Role-specific information ── */}
          {user.role === "LAWYER" && profile?.lawyerProfile && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Briefcase size={16} className="text-[#0f172a]" />
                  <h3 className="text-sm font-bold text-[#0f172a]">Lawyer Profile</h3>
                </div>
                {verBadge && (
                  <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${verBadge.class}`}>
                    <verBadge.icon size={11} /> {verBadge.label}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bar Council Number</label>
                  <p className="text-sm text-slate-700 py-1 font-mono">{profile.lawyerProfile.barCouncilNumber || "—"}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bar Council State</label>
                  <p className="text-sm text-slate-700 py-1">{profile.lawyerProfile.barCouncilState || "—"}</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Bio / Professional Summary</label>
                  {isEditing ? (
                    <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                      rows={4} maxLength={500} placeholder="Your professional background, expertise, notable cases..."
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors resize-none" />
                  ) : (
                    <p className="text-sm text-slate-700 leading-relaxed py-1">{form.bio || "—"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Firm Name</label>
                  {isEditing ? (
                    <input type="text" value={form.firmName} onChange={e => setForm(f => ({ ...f, firmName: e.target.value }))}
                      placeholder="Law firm or chambers name"
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors" />
                  ) : (
                    <p className="text-sm text-slate-700 py-1">{form.firmName || "—"}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Specializations</label>
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {profile.lawyerProfile.specializations?.length > 0
                      ? profile.lawyerProfile.specializations.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">{s}</span>
                      ))
                      : <span className="text-sm text-slate-500">—</span>
                    }
                  </div>
                </div>
              </div>

              {profile.lawyerProfile.verificationStatus === "PENDING" && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-sm text-yellow-700">
                  <div className="flex items-start gap-2">
                    <Clock size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Verification Pending</p>
                      <p className="text-xs mt-1">Your Bar Council documents are under review by Nyaya AI admin. You'll receive an email notification within 48 hours.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {user.role === "JUDGE" && profile?.judgeProfile && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Award size={16} className="text-[#0f172a]" />
                <h3 className="text-sm font-bold text-[#0f172a]">Judicial Profile</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Court</label>
                  {isEditing ? (
                    <input type="text" value={form.court} onChange={e => setForm(f => ({ ...f, court: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors" />
                  ) : (
                    <p className="text-sm text-slate-700 py-1">{profile.judgeProfile.court || "—"}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Court Level</label>
                  {isEditing ? (
                    <select value={form.courtLevel} onChange={e => setForm(f => ({ ...f, courtLevel: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors bg-white">
                      <option value="">Select level</option>
                      <option value="DISTRICT">District Court</option>
                      <option value="HIGH_COURT">High Court</option>
                      <option value="SUPREME_COURT">Supreme Court</option>
                      <option value="TRIBUNAL">Tribunal</option>
                    </select>
                  ) : (
                    <p className="text-sm text-slate-700 py-1">{profile.judgeProfile.courtLevel?.replace("_", " ") || "—"}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {user.role === "ADMIN" && profile?.adminProfile && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck size={16} className="text-[#0f172a]" />
                <h3 className="text-sm font-bold text-[#0f172a]">Admin Profile</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Department</label>
                  {isEditing ? (
                    <input type="text" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors" />
                  ) : (
                    <p className="text-sm text-slate-700 py-1">{profile.adminProfile.department || "—"}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Permissions</label>
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {profile.adminProfile.permissions?.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded text-xs font-medium">{p}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Security ── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Shield size={16} className="text-[#0f172a]" />
              <h3 className="text-sm font-bold text-[#0f172a]">Security</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">Email Verification</p>
                  <p className="text-xs text-slate-400">Account email is verified</p>
                </div>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${profile?.isEmailVerified ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}`}>
                  {profile?.isEmailVerified ? <><CheckCircle size={11} /> Verified</> : <><Clock size={11} /> Pending</>}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">Biometric Authentication</p>
                  <p className="text-xs text-slate-400">FaceID / fingerprint login (mobile)</p>
                </div>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${profile?.isBiometricEnabled ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                  {profile?.isBiometricEnabled ? <><CheckCircle size={11} /> Enabled</> : "Not Set Up"}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-slate-700">Change Password</p>
                  <p className="text-xs text-slate-400">Send a password reset link to your email</p>
                </div>
                <button onClick={() => router.push("/forgot-password")}
                  className="flex items-center gap-1 text-xs font-semibold text-[#0f172a] border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                  Reset <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* ── DPDP Danger Zone ── */}
          <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="text-red-500" />
              <h3 className="text-sm font-bold text-red-600">Danger Zone</h3>
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Delete Account</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Permanently delete your account and all associated data. Per <strong>DPDP Act 2023</strong>, data is purged within 30 days.
                </p>
              </div>
              <button onClick={() => setShowDeleteAccount(true)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 size={13} /> Delete Account
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* ── Delete Account Modal ── */}
      <AnimatePresence>
        {showDeleteAccount && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteAccount(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="text-base font-bold text-[#0f172a] mb-2">Delete Your Account?</h3>
              <p className="text-sm text-slate-500 mb-4">
                This will immediately deactivate your account and begin permanent data deletion within <strong>30 days</strong> per DPDP Act 2023. All cases, documents, and conversations will be permanently lost.
              </p>
              <div className="p-3 bg-red-50 rounded-xl border border-red-100 mb-4 text-xs text-red-700">
                Type <span className="font-mono font-bold">DELETE MY ACCOUNT</span> to confirm
              </div>
              <input
                type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE MY ACCOUNT"
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-red-400 transition-colors mb-4 font-mono"
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteAccount(false); setDeleteConfirmText(""); }}
                  className="flex-1 py-2.5 px-4 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-slate-700">
                  Cancel
                </button>
                <button onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE MY ACCOUNT" || deleting}
                  className="flex-1 py-2.5 px-4 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete Account
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
