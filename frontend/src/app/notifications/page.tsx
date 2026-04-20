"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle, Info, AlertTriangle, ArrowLeft, Check } from "lucide-react";
import { Playfair_Display } from "next/font/google";
import { useAuth } from "@/contexts/AuthContext";
import NyayaNav from "@/components/NyayaNav";

const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"] });

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp  = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22,1,0.36,1] as any } } };

export default function NotificationsPage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchNotifications(); }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/login"); return; }
      const res = await fetch("http://localhost:3001/api/notifications", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setNotifications(await res.json());
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:3001/api/notifications/${id}/read`, { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
      setNotifications(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    } catch (err) { console.error(err); }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:3001/api/notifications/read/all", { method: "PUT", headers: { Authorization: `Bearer ${token}` } });
      setNotifications(n => n.map(x => ({ ...x, read: true })));
    } catch (err) { console.error(err); }
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background:"#070b16" }}>
        <div className="w-12 h-12 rounded-2xl animate-spin" style={{ background:"linear-gradient(135deg,#7c6ef7,#d4af37)", boxShadow:"0 0 30px rgba(124,110,247,0.4)" }} />
      </div>
    );
  }

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen font-sans" style={{ background:"#070b16", color:"#ededed" }}>
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div animate={{ scale:[1,1.2,1], opacity:[0.1,0.2,0.1] }} transition={{ duration:12, repeat:Infinity }}
          style={{ position:"absolute", top:"0%", left:"0%", width:"45vw", height:"45vw", background:"#1a2b58", borderRadius:"50%", filter:"blur(150px)" }} />
        <motion.div animate={{ scale:[1,1.3,1], opacity:[0.04,0.1,0.04] }} transition={{ duration:9, repeat:Infinity, delay:4 }}
          style={{ position:"absolute", bottom:"5%", right:"0%", width:"35vw", height:"35vw", background:"#d4af37", borderRadius:"50%", filter:"blur(160px)" }} />
      </div>

      <NyayaNav user={user} logout={logout} active="notifications" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div initial={{ opacity:0, y:-14 }} animate={{ opacity:1, y:0 }} className="mb-10">
          <button onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-sm font-medium mb-5 transition-colors"
            style={{ color:"#4a4a62" }}
            onMouseEnter={e => (e.currentTarget.style.color="#a1a1aa")} onMouseLeave={e => (e.currentTarget.style.color="#4a4a62")}>
            <ArrowLeft size={15} /> Back to Dashboard
          </button>

          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color:"#7c6ef7" }}>INBOX</p>
              <h1 className={`${playfair.className} text-4xl md:text-5xl font-medium text-white`}>
                Notifi<span style={{ color:"#d4af37", fontStyle:"italic" }}>cations</span>
              </h1>
              <p className="mt-2 text-sm" style={{ color:"#6a6a82" }}>
                {unread > 0 ? `${unread} unread alert${unread > 1 ? "s" : ""}` : "All caught up!"}
              </p>
            </div>
            {unread > 0 && (
              <motion.button whileHover={{ boxShadow:"0 0 20px rgba(212,175,55,0.2)" }}
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shrink-0"
                style={{ background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.2)", color:"#d4af37" }}>
                <Check size={14} /> Mark all read
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Notification list */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="w-10 h-10 rounded-full animate-spin" style={{ border:"2px solid rgba(212,175,55,0.2)", borderTop:"2px solid #d4af37" }} />
          </div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-3">
            {notifications.length === 0 ? (
              <motion.div variants={fadeUp}
                className="flex flex-col items-center justify-center py-24 rounded-3xl"
                style={{ background:"rgba(13,18,36,0.8)", border:"1px solid rgba(30,38,66,1)" }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                  style={{ background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.15)" }}>
                  <Bell size={28} style={{ color:"#d4af37" }} />
                </div>
                <h3 className={`${playfair.className} text-2xl text-white mb-2`}>All caught up!</h3>
                <p className="text-sm" style={{ color:"#4a4a62" }}>No new notifications right now.</p>
              </motion.div>
            ) : notifications.map((n) => (
              <motion.div key={n.id} variants={fadeUp}
                whileHover={{ y:-2 }}
                className="flex gap-4 p-5 rounded-2xl transition-all"
                style={{
                  background: n.read ? "rgba(13,18,36,0.6)" : "rgba(13,18,36,0.9)",
                  border: n.read ? "1px solid rgba(30,38,66,0.6)" : "1px solid rgba(30,38,66,1)",
                  boxShadow: n.read ? "none" : "0 0 20px rgba(124,110,247,0.07)",
                }}>
                {/* Icon */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: n.type === "alert" || n.type === "warning" ? "rgba(248,113,113,0.1)" : "rgba(59,130,246,0.1)", border: n.type === "alert" || n.type === "warning" ? "1px solid rgba(248,113,113,0.2)" : "1px solid rgba(59,130,246,0.2)" }}>
                  {n.type === "alert" || n.type === "warning"
                    ? <AlertTriangle size={17} style={{ color:"#f87171" }} />
                    : <Info size={17} style={{ color:"#60a5fa" }} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-semibold text-sm ${n.read ? "" : "text-white"}`} style={{ color: n.read ? "#6a6a82" : "#ededed" }}>
                      {n.title}
                      {!n.read && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background:"#d4af37" }} />}
                    </h3>
                    <span className="text-xs shrink-0 ml-3" style={{ color:"#4a4a62" }}>
                      {new Date(n.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short" })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: n.read ? "#4a4a62" : "#a1a1aa" }}>{n.message}</p>
                </div>

                {/* Mark read */}
                {!n.read && (
                  <motion.button whileHover={{ scale:1.1 }} whileTap={{ scale:0.95 }}
                    onClick={() => markAsRead(n.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 self-center transition-colors"
                    style={{ background:"rgba(52,211,153,0.08)", border:"1px solid rgba(52,211,153,0.2)" }}
                    aria-label="Mark as read">
                    <CheckCircle size={15} style={{ color:"#34d399" }} />
                  </motion.button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
