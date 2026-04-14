"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { 
  Scale, ArrowRight, Shield, Globe, Award, ChevronRight, 
  FileStack, Users, Zap, Briefcase, Lock, CheckCircle2,
  TrendingUp, Building2, Search, Play
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Playfair_Display, Inter } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], style: ['normal', 'italic'] });
const inter = Inter({ subsets: ['latin'] });

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

export default function AdvancedLanding() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Business Law");

  const workflowNodes = [
    { id: 1, title: "Initial Consultation", x: 10, y: 36 },
    { id: 2, title: "Ongoing Legal Support", x: 30, y: 84 },
    { id: 3, title: "Regulatory Compliance", x: 50, y: 100 },
    { id: 4, title: "Contract Review", x: 70, y: 84 },
    { id: 5, title: "Entity Formation", x: 90, y: 36 },
  ];

  return (
    <div className={`min-h-screen bg-[#070b16] text-[#ededed] overflow-x-hidden ${inter.className}`}>
      
      {/* Floating Glass Navbar */}
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[95%] max-w-7xl z-50">
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-[rgba(15,20,35,0.4)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] rounded-full px-6 py-4 flex items-center justify-between shadow-[0_4px_30px_rgba(0,0,0,0.5)]"
        >
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#d4af37] to-[#f2d680] flex items-center justify-center p-1.5 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
               <Scale className="text-[#070b16]" />
             </div>
             <span className="text-sm font-bold tracking-widest uppercase text-[#f2d680]">Nyaay AI</span>
          </div>

          <div className="hidden lg:flex items-center gap-8 text-sm text-gray-300">
            <button className="hover:text-white transition-colors tracking-wide">Platform</button>
            <button className="hover:text-white transition-colors tracking-wide">Solutions</button>
            <button className="hover:text-white transition-colors tracking-wide">Security</button>
            <button onClick={() => router.push('/pricing')} className="hover:text-white transition-colors tracking-wide">Pricing</button>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/login')} className="hidden md:block text-sm font-medium hover:text-white transition-colors">
              Sign In
            </button>
            <button 
              onClick={() => router.push('/signup')}
              className="bg-[#d4af37] text-[#070b16] hover:bg-[#f2d680] transition-colors px-6 py-2 rounded-full text-sm font-bold tracking-wide shadow-[0_0_15px_rgba(212,175,55,0.2)]"
            >
              Access Portal
            </button>
          </div>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <main className="relative min-h-screen flex items-center pt-24 pb-12 w-full max-w-7xl mx-auto px-6 lg:px-12">
        
        {/* Abstract Background Accents */}
        <div className="absolute top-1/4 left-1/4 w-[50vw] h-[50vw] bg-[#1a2b58] rounded-full mix-blend-screen filter blur-[150px] opacity-30 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[40vw] h-[40vw] bg-[#d4af37] rounded-full mix-blend-screen filter blur-[200px] opacity-[0.08] pointer-events-none" />

        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-6 items-center relative z-10">
          
          {/* Hero Content */}
          <div className="flex flex-col items-start pt-20 lg:pt-0">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.1 }}
               className="px-4 py-1.5 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37] text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase mb-8"
             >
               The New Era of Procedural Law
             </motion.div>
             
             <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: 0.3 }} className="w-full">
               <h1 className={`${playfair.className} text-6xl sm:text-7xl lg:text-[7rem] leading-[0.9] text-white font-medium mb-6 drop-shadow-xl tracking-tight`}>
                 <span className="block">NYAAY</span>
                 <span className="block text-[#d4af37] italic mt-2">LEGAL AI</span>
               </h1>
             </motion.div>

             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} className="w-full max-w-xl">
                <p className="text-[#a1a1aa] text-lg leading-relaxed mb-10 pl-5 border-l-2 border-[#d4af37]/50 lg:mr-8">
                  The ultimate operating system for Indian Law. Automate document intelligence, formulate predictive legal strategy, and navigate complex regulations with military-grade precision.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-5 w-full">
                  <button 
                    onClick={() => router.push('/signup')} 
                    className="w-full sm:w-auto bg-gradient-to-r from-[#cfab35] to-[#ece192] text-[#070b16] px-8 py-4 rounded-full text-sm font-bold tracking-wider uppercase hover:shadow-[0_0_40px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-3 group"
                  >
                    Start Consultation <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button className="w-full sm:w-auto px-8 py-4 rounded-full text-sm font-semibold tracking-wider uppercase text-white border border-white/20 hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                    <Play size={16} className="fill-current" /> Watch Demo
                  </button>
                </div>
             </motion.div>
          </div>

          {/* Hero Imagery */}
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
            className="relative lg:h-[85vh] min-h-[400px] flex items-center justify-center z-0"
          >
             <div className="relative w-full h-full min-h-[400px] lg:scale-[1.3] transform translate-x-4 lg:translate-x-10 translate-y-4 lg:translate-y-12 pointer-events-none">
                 <Image 
                   src="/hero_justice_statue.png" 
                   alt="Lady Justice Gold Statue" 
                   fill 
                   className="object-contain object-right-bottom drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]" 
                   priority
                 />
             </div>
             
             <div className="absolute inset-y-0 right-0 w-2/3 bg-gradient-to-l from-[#070b16] via-[#070b16]/40 to-transparent z-10 pointer-events-none" />
             <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-[#070b16] via-[#070b16]/60 to-transparent z-10 pointer-events-none" />
          </motion.div>

        </div>
      </main>

      {/* Feature Strip (Logos / Core Trust) */}
      <section className="border-y border-white/5 bg-[#0a0f1d] py-12 relative z-20">
         <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-4 text-gray-500 font-semibold tracking-widest uppercase text-xs">
              <Shield size={16} className="text-[#d4af37]" /> Trusted by top Indian Law Firms
            </div>
            <div className="flex items-center gap-10 opacity-40 grayscale">
              <span className="font-bold text-xl tracking-tighter">SUPREME COURT REPORTS</span>
              <span className="font-bold text-xl tracking-tighter">BAR COUNCIL OF INDIA</span>
              <span className="font-bold text-xl tracking-tight">KHAITAN & CO</span>
            </div>
         </div>
      </section>

      {/* Architecture Bento Grid Section */}
      <section className="py-32 relative z-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeIn} className="text-center max-w-3xl mx-auto mb-20">
            <h2 className={`${playfair.className} text-4xl md:text-5xl text-white mb-6`}>An ecosystem designed for profound legal intelligence.</h2>
            <p className="text-[#a1a1aa] text-lg">Nyaay integrates document parsing, generative AI, and a verified practitioner network into a single, cohesive operating environment.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bento 1: Document Intelligence */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="md:col-span-2 bg-[#0d1224] border border-[#1e2642] rounded-3xl p-10 relative overflow-hidden group hover:border-[#d4af37]/30 transition-colors">
               <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity"><FileStack size={180} /></div>
               <div className="w-14 h-14 rounded-2xl bg-[#d4af37]/10 flex items-center justify-center mb-6">
                 <FileStack className="text-[#d4af37]" size={28} />
               </div>
               <h3 className={`${playfair.className} text-3xl text-white mb-4`}>Document Intelligence</h3>
               <p className="text-[#a1a1aa] text-lg max-w-md mb-8">Upload massive FIRs, charge sheets, or contracts. Nyaay extracts critical entities, identifies loopholes, and summarizes thousands of pages in seconds.</p>
               <button className="flex items-center gap-2 text-[#d4af37] font-semibold text-sm hover:gap-4 transition-all">Explore Pipeline <ArrowRight size={16} /></button>
            </motion.div>

            {/* Bento 2: Automated Search */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="bg-[#0d1224] border border-[#1e2642] rounded-3xl p-10 relative overflow-hidden group hover:border-[#d4af37]/30 transition-colors">
               <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
                 <Search className="text-indigo-400" size={28} />
               </div>
               <h3 className={`${playfair.className} text-2xl text-white mb-4`}>Global Precedent Search</h3>
               <p className="text-[#a1a1aa] text-base mb-8">Access the entire history of IPC, CrPC, and Supreme Court rulings instantly through natural language queries.</p>
               <div className="mt-auto h-24 w-full bg-[#070b16] border border-[#1e2642] rounded-xl flex items-center px-4 font-mono text-xs text-gray-500">
                 &gt; Search &quot;bail in property fraud&quot;...<span className="w-2 h-4 bg-indigo-500 animate-pulse ml-2" />
               </div>
            </motion.div>

            {/* Bento 3: Verified Network */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="bg-[#0d1224] border border-[#1e2642] rounded-3xl p-10 relative overflow-hidden group hover:border-[#d4af37]/30 transition-colors">
               <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                 <Users className="text-emerald-400" size={28} />
               </div>
               <h3 className={`${playfair.className} text-2xl text-white mb-4`}>Marketplace</h3>
               <p className="text-[#a1a1aa] text-base mb-8">Once AI strategy is formed, instantly hire Bar-Council verified advocates based on precise jurisdiction and expertise mapping.</p>
            </motion.div>

            {/* Bento 4: Absolute Security */}
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeIn} className="md:col-span-2 bg-gradient-to-br from-[#0d1224] to-[#070b16] border border-[#1e2642] rounded-3xl p-10 relative overflow-hidden group hover:border-[#d4af37]/30 transition-colors flex items-center">
               <div className="flex-1 pr-10">
                 <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-6">
                   <Lock className="text-rose-400" size={28} />
                 </div>
                 <h3 className={`${playfair.className} text-3xl text-white mb-4`}>E2E Encrypted Submissions</h3>
                 <p className="text-[#a1a1aa] text-lg max-w-md">Client-attorney privilege matters. All documents and chat interactions are AES-256 encrypted, ensuring complete anonymity and legal compliance.</p>
               </div>
               <div className="hidden md:flex flex-1 justify-center relative">
                 <div className="absolute inset-0 bg-blue-500/20 blur-[100px] rounded-full" />
                 <Shield className="w-48 h-48 text-[#1e2642] opacity-50 relative z-10" />
                 <Shield className="w-48 h-48 text-rose-500/10 absolute z-0 animate-pulse" />
               </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* Interactive Workflow Section */}
      <section className="py-32 bg-[#090b14] border-y border-[#1e2642] relative overflow-hidden">
        {/* Subtle grid background covering the section */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]"></div>

        <div className="max-w-[90rem] mx-auto px-6 lg:px-12 relative z-10">
          
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-between mb-16 relative">
            <div className="hidden lg:flex absolute left-0 top-0 h-full flex-col">
               <div className="h-full w-px bg-gradient-to-b from-[#1e2642] via-[#ffffff10] to-[#1e2642]"></div>
               <div className="absolute top-1/2 -left-[14px] -translate-y-1/2 text-[#474a58] text-[10px] uppercase tracking-widest -rotate-90 origin-center">Process</div>
            </div>

            <div className="text-center w-full">
              <h2 className={`${playfair.className} text-5xl md:text-6xl text-white mb-6 font-medium tracking-wide`}>Our Workflow</h2>
              <p className="text-[#727581] text-sm md:text-base max-w-2xl mx-auto">At Nyaay AI, our workflow is meticulously crafted to ensure seamless and efficient handling of your legal matters.</p>
            </div>
          </div>

          {/* Interactive Navigation Pills */}
          <div className="flex justify-center mb-32 relative z-20">
            <div className="bg-[#101422] p-1.5 flex items-center gap-1 rounded border border-white/5 shadow-2xl">
              {["Business Law", "Litigation", "Real Estate", "Personal Injury"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-3 text-xs md:text-sm font-medium transition-all duration-500 rounded-sm ${activeTab === tab ? "bg-white text-[#090b14] shadow-md" : "text-[#727581] hover:text-white"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Curved Timeline Arc */}
          <div className="relative h-[250px] md:h-[350px] w-full max-w-5xl mx-auto mt-10">
            {/* SVG Arc lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none transform scale-y-110" preserveAspectRatio="none" viewBox="0 0 100 100">
                <path d="M 0 0 Q 50 200 100 0" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.2" vectorEffect="non-scaling-stroke" strokeDasharray="4 2"/>
                <path d="M 0 20 Q 50 200 100 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.1" vectorEffect="non-scaling-stroke"/>
                <path d="M 0 -20 Q 50 200 100 -20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.1" vectorEffect="non-scaling-stroke"/>
            </svg>

            {/* Nodes mapped along the arc */}
            {workflowNodes.map((node) => (
              <motion.div 
                 key={node.id}
                 className="absolute flex flex-col items-center justify-center group"
                 style={{ left: `${node.x}%`, top: `${node.y}%` }}
                 initial={{ opacity: 0, y: 10 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.5, delay: node.id * 0.1 }}
              >
                  <div className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer pt-6">
                    {/* Dark Circular Node with Dotted/Dashed Ring */}
                    <div className="relative w-7 h-7 rounded-full bg-[#090b14] border border-[#a1a1aa]/30 flex items-center justify-center shadow-lg group-hover:border-white transition-all duration-300 z-10 hover:scale-110">
                       <div className="absolute inset-0 rounded-full border border-dashed border-white/40 group-hover:animate-[spin_4s_linear_infinite]"></div>
                       <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)]"></div>
                    </div>
                    {/* Pulse Effect Behind Node */}
                    <div className="absolute top-[28px] left-[50%] -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-white/5 animate-ping opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    {/* Title Text */}
                    <div className="mt-4 text-center w-[120px]">
                      <span className="text-[#a1a1aa] text-xs font-medium tracking-wide group-hover:text-white transition-colors">{node.title}</span>
                    </div>
                  </div>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-32 md:mt-40 flex justify-center relative z-20"
          >
            <button className="flex items-stretch overflow-hidden rounded-[0.5rem] border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] group hover:shadow-[0_0_40px_rgba(167,243,208,0.15)] transition-all">
              <div className="bg-[#242730] px-6 py-4 text-white text-xl md:text-2xl font-bold flex items-center justify-center border-r border-[#1e2642]">
                W.
              </div>
              <div className="bg-[#a7f3d0] px-8 py-4 text-[#064e3b] font-bold text-xs md:text-sm tracking-widest uppercase flex items-center justify-center group-hover:bg-[#86efac] transition-colors">
                Visit Resource
              </div>
            </button>
          </motion.div>

        </div>
      </section>

      {/* Pricing / Tiers */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className={`${playfair.className} text-4xl md:text-5xl text-white mb-6`}>Transparent, scalable access.</h2>
            <p className="text-[#a1a1aa] text-lg">For individuals fighting for rights, to mega-firms managing thousands of dossiers.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-[#0a0f1d] border border-[#1e2642] rounded-3xl p-8 flex flex-col">
              <h4 className="text-xl font-semibold text-white mb-2">Basic Rights</h4>
              <p className="text-sm text-[#a1a1aa] mb-6">For citizens exploring their legal standing.</p>
              <div className="text-4xl font-bold text-white mb-8">₹0 <span className="text-base font-normal text-gray-500">/mo</span></div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> Access to Base AI Chat</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> 1 Document Parse / Month</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> Public Case Search</li>
              </ul>
              <button 
                onClick={() => router.push('/signup')}
                className="w-full py-3 rounded-full border border-[#1e2642] text-white hover:bg-[#1e2642] transition-colors"
               >
                Get Started
              </button>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-b from-[#0d1633] to-[#0a0f1d] border-2 border-[#d4af37]/50 rounded-3xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-[0_20px_50px_rgba(212,175,55,0.1)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#d4af37] text-black text-xs font-bold uppercase tracking-widest px-4 py-1 rounded-full">Most Popular</div>
              <h4 className="text-xl font-semibold text-[#f2d680] mb-2">Nyaay PRO</h4>
              <p className="text-sm text-[#a1a1aa] mb-6">For power users and independent practitioners.</p>
              <div className="text-4xl font-bold text-white mb-8">₹1,999 <span className="text-base font-normal text-gray-500">/mo</span></div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> Unlimited AI Intelligence (GPT-4o)</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> 500 Document Parses / Month</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> Case Management Module</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-[#d4af37]" /> Priority Lawyer Matching</li>
              </ul>
              <button 
                onClick={() => router.push('/signup')}
                className="w-full py-3 rounded-full bg-[#d4af37] text-black font-bold hover:shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all"
               >
                Upgrade to PRO
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-[#0a0f1d] border border-[#1e2642] rounded-3xl p-8 flex flex-col">
              <h4 className="text-xl font-semibold text-white mb-2">Law Firm Enterprise</h4>
              <p className="text-sm text-[#a1a1aa] mb-6">Custom deployment for massive organizations.</p>
              <div className="text-4xl font-bold text-white mb-8">Custom</div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-gray-500" /> Unlimited Everything</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-gray-500" /> Dedicated Secure Server</li>
                <li className="flex items-center gap-3 text-sm text-gray-300"><CheckCircle2 size={16} className="text-gray-500" /> Custom Model Fine-tuning</li>
              </ul>
              <button className="w-full py-3 rounded-full border border-[#1e2642] text-white hover:bg-[#1e2642] transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA & Footer */}
      <footer className="bg-[#04070e] pt-24 pb-12 border-t border-[#1e2642] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#d4af37]/5 blur-[150px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          
          <div className="flex flex-col items-center text-center mb-24">
             <h2 className={`${playfair.className} text-5xl md:text-6xl text-white mb-8`}>Justice delayed<br/><span className="text-[#d4af37] italic">is justice denied.</span></h2>
             <button onClick={() => router.push('/signup')} className="bg-white text-[#070b16] px-10 py-4 rounded-full text-sm font-bold tracking-wider uppercase hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.2)]">
               Enter The Portal
             </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-10 border-t border-[#1e2642] pt-12">
             <div>
                <div className="flex items-center gap-2 mb-6">
                  <Scale className="text-[#d4af37]" size={20} />
                  <span className="text-sm font-bold tracking-widest uppercase text-white">Nyaay AI</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed max-w-xs">The intelligent legal operating system defining the future of jurisdiction and procedural law in India.</p>
             </div>
             <div>
               <h4 className="text-white font-semibold mb-6">Product</h4>
               <ul className="space-y-4 text-sm text-gray-500">
                 <li><button className="hover:text-[#d4af37] transition-colors">Intelligence Platform</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Lawyer Network</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Enterprise API</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Pricing</button></li>
               </ul>
             </div>
             <div>
               <h4 className="text-white font-semibold mb-6">Resources</h4>
               <ul className="space-y-4 text-sm text-gray-500">
                 <li><button className="hover:text-[#d4af37] transition-colors">Documentation</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Legal Blog</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Case Studies</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Help Center</button></li>
               </ul>
             </div>
             <div>
               <h4 className="text-white font-semibold mb-6">Company</h4>
               <ul className="space-y-4 text-sm text-gray-500">
                 <li><button className="hover:text-[#d4af37] transition-colors">About Us</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Careers</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Privacy Policy</button></li>
                 <li><button className="hover:text-[#d4af37] transition-colors">Terms of Service</button></li>
               </ul>
             </div>
          </div>
          
          <div className="mt-16 text-center text-xs text-gray-600">
             © {new Date().getFullYear()} Nyaay Technologies Pvt Ltd. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
