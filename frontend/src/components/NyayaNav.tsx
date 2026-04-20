"use client";

/**
 * NyayaNav — shared dark sidebar + topbar used across all authenticated pages.
 * Usage:
 *   <NyayaNav user={user} router={router} logout={logout} active="documents" />
 *
 * active values: "dashboard" | "ask" | "documents" | "cases" | "marketplace" | "notifications" | "billing"
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Scale, X, LayoutDashboard, Zap, FileStack, Briefcase,
  Users, Bell, CreditCard, ShieldAlert, LogOut, Menu, ShieldCheck, Sparkles
} from "lucide-react";

const NAV = [
  { key: "dashboard",     label: "Dashboard",         icon: LayoutDashboard, href: "/" },
  { key: "ask",           label: "Ask Nyaya",          icon: Zap,             href: "/ask-nyaya" },
  { key: "documents",     label: "Documents",          icon: FileStack,       href: "/documents" },
  { key: "cases",         label: "Case Management",   icon: Briefcase,       href: "/cases" },
  { key: "marketplace",   label: "Marketplace",        icon: Users,           href: "/marketplace" },
  { key: "notifications", label: "Notifications",      icon: Bell,            href: "/notifications", badge: "3" },
  { key: "billing",       label: "Billing",            icon: CreditCard,      href: "#",             billing: true },
];

interface Props {
  user: any;
  logout: () => void;
  active?: string;
  onBilling?: () => void;
  onUpgrade?: () => void;
}

export default function NyayaNav({ user, logout, active = "dashboard", onBilling, onUpgrade }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: "#0a0f1d", borderRight: "1px solid rgba(30,38,66,0.8)" }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-[64px] shrink-0" style={{ borderBottom: "1px solid rgba(30,38,66,0.8)" }}>
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", boxShadow: "0 0 15px rgba(124,110,247,0.4)" }}
        >
          <Scale size={15} className="text-white" />
        </motion.div>
        <span className="text-sm font-bold tracking-widest uppercase flex-1" style={{ color: "#f2d680" }}>
          Nyaya AI
        </span>
        <button
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
          style={{ color: "#4a4a62" }}
          onClick={() => setOpen(false)}
          onMouseEnter={e => (e.currentTarget.style.color = "#a1a1aa")}
          onMouseLeave={e => (e.currentTarget.style.color = "#4a4a62")}
        >
          <X size={15} />
        </button>
      </div>

      {/* Nav Items */}
      <div className="flex flex-col gap-0.5 px-3 py-5 flex-1 overflow-y-auto">
        {NAV.map((item, i) => {
          const isActive = item.key === active;
          const Icon = item.icon;
          return (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                if (item.billing) { onBilling?.(); setOpen(false); }
                else { router.push(item.href); setOpen(false); }
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={isActive
                ? { background: "rgba(212,175,55,0.1)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.15)" }
                : { color: "#4a4a62", border: "1px solid transparent" }}
              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLButtonElement).style.color = "#a1a1aa"; } }}
              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#4a4a62"; } }}
            >
              <div className="flex items-center gap-3">
                <Icon size={16} />
                {item.label}
              </div>
              {item.badge && (
                <span className="w-5 h-5 rounded-lg text-[10px] font-bold flex items-center justify-center" style={{ background: "rgba(212,175,55,0.15)", color: "#d4af37" }}>
                  {item.badge}
                </span>
              )}
            </motion.button>
          );
        })}

        {user?.role === "ADMIN" && (
          <button
            onClick={() => { router.push("/admin"); setOpen(false); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl text-sm font-medium transition-colors"
            style={{ color: "#f43f5e" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(244,63,94,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <ShieldAlert size={16} /> Admin Console
          </button>
        )}
      </div>

      {/* Upgrade CTA */}
      <div className="px-3 pb-3 pt-2" style={{ borderTop: "1px solid rgba(30,38,66,0.8)" }}>
        <motion.button
          whileHover={{ boxShadow: "0 0 25px rgba(212,175,55,0.3)" }}
          onClick={() => { onUpgrade?.(); setOpen(false); }}
          className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-sm font-bold"
          style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.04))", color: "#d4af37", border: "1px solid rgba(212,175,55,0.25)" }}
        >
          <Sparkles size={14} /> Upgrade to PRO
        </motion.button>
      </div>

      {/* User */}
      <div className="shrink-0 px-3 pb-4">
        <div
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer group transition-all"
          style={{ border: "1px solid rgba(30,38,66,0.8)" }}
          onClick={logout}
          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs" style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)", color: "#070b16" }}>
            {user?.email?.[0]?.toUpperCase() ?? "N"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium text-white">{user?.email?.split("@")[0]}</div>
            <div className="text-[10px]" style={{ color: "#4a4a62" }}>Sign out</div>
          </div>
          <LogOut size={13} style={{ color: "#4a4a62" }} className="opacity-0 group-hover:opacity-100 transition-all" />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Drawer overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-300 ease-in-out shadow-[20px_0_60px_rgba(0,0,0,0.5)] ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebarContent}
      </aside>

      {/* Top navbar — exported so pages can embed it */}
      <header
        className="flex items-center justify-between h-14 px-4 md:px-6 shrink-0 sticky top-0 z-30"
        style={{ background: "rgba(7,11,22,0.88)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(30,38,66,0.8)" }}
      >
        <div className="flex items-center gap-3">
          <button
            className="p-2 -ml-2 rounded-lg transition-colors"
            style={{ color: "#4a4a62" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#a1a1aa")}
            onMouseLeave={e => (e.currentTarget.style.color = "#4a4a62")}
            onClick={() => setOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c6ef7, #d4af37)" }}
            >
              <Scale size={12} className="text-white" />
            </motion.div>
            <span className="font-bold text-sm tracking-widest uppercase" style={{ color: "#f2d680" }}>Nyaya AI</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase"
            style={{ background: "rgba(212,175,55,0.1)", color: "#d4af37", border: "1px solid rgba(212,175,55,0.2)" }}
          >
            <ShieldCheck size={11} /> {user?.role}
          </div>
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "linear-gradient(135deg,#7c6ef7,#d4af37)", color: "#070b16" }}
          >
            {user?.email?.[0]?.toUpperCase() ?? "N"}
          </div>
        </div>
      </header>
    </>
  );
}
