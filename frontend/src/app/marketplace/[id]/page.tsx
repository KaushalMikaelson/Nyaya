"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Star, MapPin, Briefcase, Calendar, Clock, CreditCard, Video, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import api from '@/lib/api';

export default function LawyerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const lawyerId = params.id as string;

  const [lawyer, setLawyer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bookingStep, setBookingStep] = useState(1); // 1 = profile/calendar, 2 = payment, 3 = success
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    fetchLawyer();
  }, [lawyerId]);

  const fetchLawyer = async () => {
    try {
      const { data } = await api.get(`/marketplace/lawyers/${lawyerId}`);
      setLawyer(data.lawyer);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = () => {
    if (!selectedDate || !selectedTime) return alert("Select a date and time!");
    setBookingStep(2);
  };

  const handlePayment = async () => {
    setPaymentProcessing(true);
    try {
      // 1. Create Order
      const orderRes = await api.post('/payment/orders');
      const order = orderRes.data;

      // 2. Verify Payment (Mocking the verification flow immediately for UI prototyping without full Razorpay popups)
      await api.post('/payment/verify', {
        razorpay_order_id: order.id,
        razorpay_payment_id: "pay_mock_" + Date.now(),
        razorpay_signature: "mock_signature_to_pass" // Backend payment.ts allows mock to pass if secrets are missing
      });

      // 3. Success
      setBookingStep(3);
    } catch (err) {
      console.error("Payment failed", err);
      alert("Payment failed.");
    } finally {
      setPaymentProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex justify-center items-center"><div className="animate-spin w-8 h-8 rounded-full border-t-2 border-amber-500"></div></div>;
  if (!lawyer) return <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center">Lawyer not found.<button onClick={() => router.push('/marketplace')} className="text-amber-400 mt-4">Go Back</button></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 md:p-12 font-sans selection:bg-amber-500/30">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => router.push('/marketplace')} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm font-medium">
          <ArrowLeft size={16} /> Marketplace
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="md:col-span-2 space-y-8">
            <div className="bg-[#0d0d16] border border-slate-800 rounded-3xl p-8 sticky top-6">
               <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center text-3xl font-bold text-amber-500 border border-slate-700 shrink-0">
                    {lawyer.name.substring(5,7).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-3xl font-extrabold text-white mb-2">{lawyer.name}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-slate-400 mb-4">
                      <span className="flex items-center gap-1.5"><Star className="text-amber-500" fill="currentColor" size={16} /> {lawyer.rating} / 5</span>
                      <span className="flex items-center gap-1.5"><MapPin size={16} className="text-rose-400" /> {lawyer.location}</span>
                      <span className="flex items-center gap-1.5"><Briefcase size={16} className="text-blue-400" /> {lawyer.experienceYears} Yrs Exp.</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {lawyer.specialties.map((s: string) => <span key={s} className="bg-slate-800 px-3 py-1 rounded-full text-xs font-semibold text-slate-300">{s}</span>)}
                    </div>
                    <p className="text-slate-400 leading-relaxed">{lawyer.about}</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="bg-[#0d0d16] border border-slate-800 rounded-2xl p-6">
                <div className="text-center pb-6 mb-6 border-b border-slate-800">
                   <h2 className="text-3xl font-bold text-emerald-400">₹{lawyer.hourlyRate.toLocaleString()}</h2>
                   <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Per 45-min Session</p>
                </div>

                {bookingStep === 1 && (
                  <motion.div initial={{opacity:0}} animate={{opacity:1}}>
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><Calendar size={18} className="text-amber-500" /> Availability</h3>
                    <input type="date" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 mb-4 focus:border-amber-500 outline-none" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                    <div className="grid grid-cols-2 gap-2 mb-6">
                      {['10:00 AM', '02:00 PM', '04:30 PM', '06:00 PM'].map(time => (
                         <button key={time} onClick={() => setSelectedTime(time)} className={`py-2 text-sm rounded-lg border transition-colors ${selectedTime === time ? 'bg-amber-500/20 text-amber-400 border-amber-500' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600'}`}>{time}</button>
                      ))}
                    </div>
                    <button onClick={handleBookSlot} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg">Proceed to Book</button>
                  </motion.div>
                )}

                {bookingStep === 2 && (
                  <motion.div initial={{opacity:0, x:20}} animate={{opacity:1, x:0}}>
                    <div className="bg-slate-900 rounded-xl p-4 mb-6 border border-slate-800">
                      <p className="text-sm text-slate-400 mb-1">Booking Appointment on</p>
                      <p className="font-semibold text-white flex items-center gap-2"><Calendar size={14} className="text-amber-500" /> {selectedDate}</p>
                      <p className="font-semibold text-white flex items-center gap-2 mt-1"><Clock size={14} className="text-amber-500" /> {selectedTime}</p>
                    </div>
                    <button onClick={handlePayment} disabled={paymentProcessing} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50">
                      {paymentProcessing ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></div> : <><CreditCard size={18} /> Pay ₹{lawyer.hourlyRate.toLocaleString()}</>}
                    </button>
                    <button onClick={() => setBookingStep(1)} className="w-full mt-3 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
                  </motion.div>
                )}

                {bookingStep === 3 && (
                  <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                      <CheckCircle size={32} className="text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Confirmed!</h3>
                    <p className="text-sm text-slate-400 mb-6">Your session is booked.</p>
                    <button onClick={() => router.push(`/marketplace/video/${lawyerId}`)} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2">
                       <Video size={18} /> Join Waiting Room
                    </button>
                  </motion.div>
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
