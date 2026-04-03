'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [triggerForm, setTriggerForm] = useState({
    type: 'email',
    to: '',
    subject: '',
    message: ''
  });

  const [scheduleForm, setScheduleForm] = useState({
    toEmail: '',
    toPhone: '',
    caseSnippet: '',
    delay: 5000
  });

  const handleTriggerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setTriggerForm({ ...triggerForm, [e.target.name]: e.target.value });
  };

  const handleScheduleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.name === 'delay' ? Number(e.target.value) : e.target.value;
    setScheduleForm({ ...scheduleForm, [e.target.name]: value });
  };

  const onTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      // Assuming a token could be required, we fetch it if it exists.
      // We will just let fetch handle cookies in production (credentials: 'include').
      const res = await fetch('http://localhost:3001/api/notifications/trigger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // Fallback if cookie not used
        },
        body: JSON.stringify(triggerForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger notification');
      setSuccess(data.message);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const onSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);
    try {
      const res = await fetch('http://localhost:3001/api/notifications/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(scheduleForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule notification');
      setSuccess(data.message);
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
      else setError("An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 pt-24 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Alerts & Notifications
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Event-based alerts, scheduled jobs, and cross-channel delivery (WhatsApp & Email) powered by BullMQ.
          </p>
        </motion.div>

        {success && (
          <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl max-w-2xl mx-auto text-center font-medium">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl max-w-2xl mx-auto text-center font-medium">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Immediate Trigger Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mr-3 text-sm">⚡</span>
              Event-based Trigger
            </h2>
            <form onSubmit={onTrigger} className="space-y-5 relative z-10">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Notification Type</label>
                <select
                  name="type"
                  value={triggerForm.type}
                  onChange={handleTriggerChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                >
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Destination {triggerForm.type === 'email' ? '(Email Address)' : '(Phone Number)'}
                </label>
                <input
                  type="text"
                  name="to"
                  value={triggerForm.to}
                  onChange={handleTriggerChange}
                  placeholder={triggerForm.type === 'email' ? "user@example.com" : "+919999999999"}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                  required
                />
              </div>

              {triggerForm.type === 'email' && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={triggerForm.subject}
                    onChange={handleTriggerChange}
                    placeholder="Alert Subject"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Message</label>
                <textarea
                  name="message"
                  value={triggerForm.message}
                  onChange={handleTriggerChange}
                  placeholder="Enter alert message..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-colors resize-none"
                  required
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex justify-center items-center"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  "Send Immediate Alert"
                )}
              </button>
            </form>
          </motion.div>

          {/* Schedule Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <span className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center mr-3 text-sm">🕰️</span>
              Schedule Follow-Up
            </h2>
            <form onSubmit={onSchedule} className="space-y-5 relative z-10">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">WhatsApp Number</label>
                <input
                  type="text"
                  name="toPhone"
                  value={scheduleForm.toPhone}
                  onChange={handleScheduleChange}
                  placeholder="+919999999999"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
                <input
                  type="email"
                  name="toEmail"
                  value={scheduleForm.toEmail}
                  onChange={handleScheduleChange}
                  placeholder="user@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Case Context (Snippet)</label>
                <input
                  type="text"
                  name="caseSnippet"
                  value={scheduleForm.caseSnippet}
                  onChange={handleScheduleChange}
                  placeholder="e.g. Property Dispute"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Delay (ms)</label>
                <input
                  type="number"
                  name="delay"
                  value={scheduleForm.delay}
                  onChange={handleScheduleChange}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-colors"
                  min="0"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500/50 flex justify-center items-center"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  "Schedule Job"
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
