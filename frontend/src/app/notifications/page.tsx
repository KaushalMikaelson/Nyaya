"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, CheckCircle, Info, AlertTriangle } from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }
      const res = await fetch("http://localhost:3001/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:3001/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:3001/api/notifications/read/all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1d] text-[#ededed] p-8 pt-24 font-sans relative overflow-x-hidden">
      <div className="max-w-4xl mx-auto relative z-10">
        
        <header className="flex items-center justify-between mb-10">
          <div>
            <button onClick={() => router.push('/')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 text-sm font-medium">
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
            <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Bell className="text-yellow-500" size={32} />
              Inbox
            </h1>
            <p className="text-slate-400 text-lg mt-1">Review alerts, system updates, and case notifications.</p>
          </div>
          <button onClick={markAllAsRead} className="px-4 py-2 bg-[#111827] border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors text-sm font-medium text-slate-300">
            Mark all read
          </button>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.length === 0 ? (
               <div className="text-center py-20 bg-[#111827] border border-slate-800 rounded-2xl">
                 <Bell size={40} className="mx-auto text-slate-600 mb-4" />
                 <h3 className="text-xl font-semibold text-white mb-2">You're all caught up!</h3>
                 <p className="text-slate-400 max-w-sm mx-auto">No new notifications to show right now.</p>
               </div>
            ) : (
              notifications.map((n) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={n.id} 
                  className={`flex gap-4 p-5 rounded-2xl border transition-all ${n.read ? 'bg-[#111827] border-slate-800/50' : 'bg-[#161f36] border-slate-700 shadow-[0_0_15px_rgba(37,99,235,0.1)]'}`}
                >
                  <div className="mt-1 shrink-0">
                    {n.type === 'alert' || n.type === 'warning' ? <AlertTriangle className="text-red-400" size={24} /> : <Info className="text-blue-400" size={24} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`font-semibold ${n.read ? 'text-slate-300' : 'text-white'}`}>{n.title}</h3>
                      <span className="text-xs text-slate-500 shrink-0">{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className={`text-sm ${n.read ? 'text-slate-500' : 'text-slate-300'}`}>{n.message}</p>
                  </div>
                  {!n.read && (
                    <button onClick={() => markAsRead(n.id)} className="h-8 w-8 rounded-full bg-slate-800/50 hover:bg-slate-700 flex items-center justify-center shrink-0 self-center transition-colors tooltip" aria-label="Mark as read">
                      <CheckCircle size={16} className="text-emerald-400" />
                    </button>
                  )}
                </motion.div>
              ))
            )}
           </div>
        )}
      </div>
    </div>
  );
}
