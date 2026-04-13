"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, CheckCircle2, ArrowRight, Loader2, Crown, TrendingUp,
  AlertTriangle, RefreshCw, Shield
} from "lucide-react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TIER_META: Record<string, { label: string; color: string; bg: string; glow: string; badge: string }> = {
  FREE:       { label: "Free",       color: "text-slate-400", bg: "bg-slate-500/10",  glow: "shadow-none",                           badge: "bg-slate-700 text-slate-300" },
  BASIC:      { label: "Basic",      color: "text-indigo-300", bg: "bg-indigo-500/10", glow: "shadow-[0_0_30px_rgba(99,102,241,0.1)]", badge: "bg-indigo-700 text-indigo-200" },
  PRO:        { label: "PRO",        color: "text-amber-300",  bg: "bg-amber-500/10",  glow: "shadow-[0_0_30px_rgba(212,175,55,0.1)]", badge: "bg-amber-700 text-amber-200" },
  ENTERPRISE: { label: "Enterprise", color: "text-rose-300",   bg: "bg-rose-500/10",   glow: "shadow-[0_0_30px_rgba(251,113,133,0.1)]", badge: "bg-rose-800 text-rose-200" },
};

interface Subscription {
  tier: string;
  status: string;
  apiTokensUsed: number;
  apiTokensLimit: number;
  currentPeriodEnd?: string;
}

export default function BillingCard({ onUpgrade }: { onUpgrade?: () => void }) {
  const router = useRouter();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSub = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/api/payment/subscription`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setSub(await res.json());
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchSub(); }, []);

  const handleRefresh = () => { setRefreshing(true); fetchSub(); };

  if (loading) {
    return (
      <div className="bg-[#0d1224] border border-[#1e2642] rounded-2xl p-5 flex items-center justify-center h-32">
        <Loader2 size={20} className="animate-spin text-[#a1a1aa]" />
      </div>
    );
  }

  if (!sub) return null;

  const meta = TIER_META[sub.tier] || TIER_META.FREE;
  const usagePct = sub.apiTokensLimit > 0 ? Math.min((sub.apiTokensUsed / sub.apiTokensLimit) * 100, 100) : 0;
  const isNearLimit = usagePct >= 80;
  const isExhausted = usagePct >= 100;
  const daysLeft = sub.currentPeriodEnd
    ? Math.max(0, Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className={`bg-[#0d1224] border border-[#1e2642] rounded-2xl p-5 ${meta.glow}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.bg}`}>
            {sub.tier === "PRO" || sub.tier === "ENTERPRISE"
              ? <Crown size={16} className={meta.color} />
              : <Shield size={16} className={meta.color} />}
          </div>
          <div>
            <p className="text-xs text-[#a1a1aa] font-medium uppercase tracking-widest">Current Plan</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-sm font-bold ${meta.color}`}>{meta.label}</span>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${meta.badge}`}>
                {sub.status}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="p-1.5 rounded-lg hover:bg-[#1e2642] transition-colors"
          title="Refresh usage"
        >
          <RefreshCw size={14} className={`text-[#71717a] ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Usage Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#a1a1aa] flex items-center gap-1.5">
            <TrendingUp size={11} /> API Usage this month
          </span>
          <span className={`text-xs font-semibold tabular-nums ${isNearLimit ? "text-red-400" : "text-[#ededed]"}`}>
            {sub.apiTokensUsed.toLocaleString()} / {sub.apiTokensLimit.toLocaleString()}
          </span>
        </div>

        <div className="w-full bg-[#131b31] h-2 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usagePct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${
              isExhausted ? "bg-red-500" : isNearLimit ? "bg-orange-400" : "bg-amber-400"
            }`}
          />
        </div>

        {daysLeft !== null && (
          <p className="text-[10px] text-[#71717a] mt-1.5">{daysLeft} days left in billing period</p>
        )}
      </div>

      {/* Warnings */}
      <AnimatePresence>
        {isExhausted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-300"
          >
            <AlertTriangle size={13} className="shrink-0" />
            Quota exhausted. Upgrade to continue AI queries.
          </motion.div>
        )}
        {!isExhausted && isNearLimit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-4 flex items-center gap-2 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-300"
          >
            <AlertTriangle size={13} className="shrink-0" />
            Approaching limit. Consider upgrading soon.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feature List Overview */}
      {sub.tier === "FREE" && (
        <div className="border-t border-[#1e2642] pt-4 mb-4 space-y-1.5">
          {["10 AI consultations / month", "3 document parses", "Basic case search"].map(f => (
            <div key={f} className="flex items-center gap-2 text-xs text-[#71717a]">
              <CheckCircle2 size={11} className="text-[#d4af37]" /> {f}
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      {sub.tier !== "ENTERPRISE" && (
        <button
          id="billing-upgrade-btn"
          onClick={() => (onUpgrade ? onUpgrade() : router.push("/pricing"))}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            sub.tier === "PRO"
              ? "border border-amber-400/20 text-amber-300 hover:bg-amber-400/5"
              : "bg-[#d4af37] text-black hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(212,175,55,0.25)]"
          }`}
        >
          {sub.tier === "FREE" ? (
            <><Zap size={14} /> Upgrade Plan <ArrowRight size={13} /></>
          ) : sub.tier === "BASIC" ? (
            <><Crown size={14} /> Upgrade to PRO <ArrowRight size={13} /></>
          ) : (
            <><Crown size={14} /> View Plan Details <ArrowRight size={13} /></>
          )}
        </button>
      )}
    </div>
  );
}
