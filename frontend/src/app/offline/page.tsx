"use client";

import { AlertTriangle, WifiOff, FolderOpen } from 'lucide-react';
import Link from 'next/link';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 border border-amber-500/20">
        <WifiOff size={40} className="text-amber-500" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">You are currently offline</h1>
      <p className="text-slate-400 max-w-md mx-auto mb-8">
        It looks like you've lost connection. Nyaay requires internet to access AI and live cases, but your downloaded documents remain secure on your device.
      </p>

      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-4 mb-4 flex items-center gap-4 text-left">
         <div className="p-3 bg-slate-800 rounded-lg"><FolderOpen className="text-slate-300"/></div>
         <div>
            <h3 className="text-white font-semibold">Local Storage</h3>
            <p className="text-sm text-slate-500">Access saved cases securely</p>
         </div>
      </div>
      
      <button onClick={() => window.location.reload()} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-colors">
        Try Again
      </button>

      <div className="mt-8">
        <p className="text-xs text-slate-600 flex items-center justify-center gap-2">
           <AlertTriangle size={14}/> Secure Offline Mode Active
        </p>
      </div>
    </div>
  );
}
