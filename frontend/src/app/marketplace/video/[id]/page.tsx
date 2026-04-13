"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Phone, Mic, MicOff, Video, VideoOff, MonitorUp, Settings, LogOut } from "lucide-react";
import api from '@/lib/api';

export default function VideoConsultationRoom() {
  const router = useRouter();
  const params = useParams();
  const lawyerId = params.id as string;
  
  const [lawyer, setLawyer] = useState<any>(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [sessionActive, setSessionActive] = useState(true);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    // Fetch lawyer to display name
    api.get(`/marketplace/lawyers/${lawyerId}`).then(res => setLawyer(res.data.lawyer)).catch(console.error);

    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lawyerId]);

  const endCall = () => {
    setSessionActive(false);
    setTimeout(() => {
      router.push('/marketplace');
    }, 2000);
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!sessionActive) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
           <LogOut className="text-red-500 mx-auto mb-4" size={48} />
           <h2 className="text-2xl font-bold mb-2">Session Ended</h2>
           <p className="text-slate-400">Thank you for using Nyaya. Returning to marketplace...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden font-sans">
      {/* Header */}
      <div className="w-full absolute top-0 left-0 p-6 z-10 flex justify-between items-center bg-gradient-to-b from-slate-950 to-transparent">
        <div>
          <h1 className="text-white font-bold text-lg flex items-center gap-2">
            <Video size={18} className="text-amber-500" /> Secure Consultation
          </h1>
          <p className="text-slate-400 text-sm">End-to-end Encrypted</p>
        </div>
        <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-4 py-2 rounded-full font-mono text-emerald-400 text-sm font-medium shadow-lg">
          {formatTime(timer)}
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-6 pt-24 pb-28 flex flex-col md:flex-row gap-4 items-stretch justify-center max-w-7xl mx-auto w-full">
        {/* Remote Video (Lawyer) */}
        <div className="flex-1 bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 relative shadow-2xl flex items-center justify-center">
           <div className="absolute inset-0 bg-[url('https://i.pravatar.cc/1000')] bg-cover bg-center opacity-60 mix-blend-luminosity"></div>
           <div className="absolute z-10 bottom-6 left-6 bg-slate-950/60 backdrop-blur-md px-4 py-2 rounded-xl text-white font-medium border border-slate-700/50">
             {lawyer ? lawyer.name : "Waiting for lawyer..."}
           </div>
        </div>

        {/* Local Video (Client) */}
        <div className="md:w-[350px] lg:w-[450px] shrink-0 bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 relative shadow-2xl flex items-center justify-center">
           <div className="text-slate-700"><MonitorUp size={64} /></div>
           <div className="absolute z-10 bottom-6 left-6 bg-slate-950/60 backdrop-blur-md px-4 py-2 rounded-xl text-white font-medium border border-slate-700/50">
             You
           </div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex justify-center items-center gap-6">
        <button className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white flex items-center justify-center transition-colors">
          <Settings size={22} />
        </button>
        <button onClick={() => setMicOn(!micOn)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${micOn ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white border' : 'bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30'}`}>
          {micOn ? <Mic size={22} /> : <MicOff size={22} />}
        </button>
        <button onClick={() => setVideoOn(!videoOn)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${videoOn ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white border' : 'bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30'}`}>
          {videoOn ? <Video size={22} /> : <VideoOff size={22} />}
        </button>
        <button onClick={endCall} className="w-20 h-14 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)]">
          <Phone size={24} className="rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}
