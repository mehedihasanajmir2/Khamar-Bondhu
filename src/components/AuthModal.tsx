import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, Building, Phone, MapPin, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BirdType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, authPromptReason, setAuthPromptReason } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [authMethod, setAuthMethod] = useState<'phone' | 'email'>('phone');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('1500');
  const [birdType, setBirdType] = useState<BirdType>('ব্রয়লার');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setAuthPromptReason(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmed = identifier.trim();
    if (!trimmed) {
      setError(authMethod === 'phone' ? 'অনুগ্রহ করে মোবাইল নম্বর লিখুন।' : 'অনুগ্রহ করে ইমেইল ঠিকানা লিখুন।');
      return;
    }

    if (authMethod === 'phone') {
      const digitsOnly = trimmed.replace(/[^0-9০-৯]/g, '');
      if (digitsOnly.length < 10) {
        setError('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (যেমন: ০১৭০০-০০০০০০)।');
        return;
      }
    } else {
      if (!trimmed.includes('@') || !trimmed.includes('.')) {
        setError('অনুগ্রহ করে সঠিক ইমেইল ঠিকানা লিখুন (যেমন: farmer@example.com)।');
        return;
      }
    }

    if (!password || password.length < 6) {
      setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim() || !farmName.trim()) {
          setError('অনুগ্রহ করে আপনার নাম এবং খামারের নাম দিন।');
          setLoading(false);
          return;
        }
        await register(
          {
            email: trimmed,
            name: name.trim(),
            farmName: farmName.trim(),
            phone: authMethod === 'phone' ? trimmed : (phone.trim() || '০১৭০০-০০০০০০'),
            location: location.trim() || 'বাংলাদেশ',
            capacity: parseInt(capacity, 10) || 1000,
            birdType
          },
          password
        );
      } else {
        await login(trimmed, password);
      }
      setError('');
      setPassword('');
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'লগইন বা নিবন্ধনে সমস্যা হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 text-lg font-bold"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-200 mx-auto mb-3 bg-emerald-700">
            <img
              src="/assets/aistudio/Gemini_Generated_Image_gm2r1igm2r1igm2r_1d927ad2.jpg"
              alt="FarmHisab Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {isRegister ? 'FarmHisab (ফার্মহিসাব) নতুন একাউন্ট' : 'FarmHisab (ফার্মহিসাব) এ লগইন'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ফায়ারবেস কনসোল অথেনটিকেশন ও ক্লাউড ফায়ারস্টোর সংযুক্ত
          </p>
        </div>

        {/* Informative Prompt Reason Banner when gated */}
        {authPromptReason && (
          <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs flex items-start gap-2.5 shadow-xs">
            <span className="text-base select-none">🔒</span>
            <div>
              <p className="font-bold text-amber-900">একাউন্ট তৈরি প্রয়োজন</p>
              <p className="text-amber-700 mt-0.5 leading-relaxed">{authPromptReason}</p>
              <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                <span>✓</span>
                <span>নতুন একাউন্ট খুললে আপনার খামারের ড্যাশবোর্ড সম্পূর্ণ ব্ল্যাঙ্ক (Blank) থাকবে।</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Toggle between Phone and Email */}
        <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 border border-slate-200">
          <button
            type="button"
            onClick={() => {
              setAuthMethod('phone');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMethod === 'phone'
                ? 'bg-white text-emerald-800 shadow-xs border border-emerald-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>মোবাইল নম্বর</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMethod('email');
              setError('');
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMethod === 'email'
                ? 'bg-white text-emerald-800 shadow-xs border border-emerald-100'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-blue-600" />
            <span>ইমেইল ঠিকানা</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {authMethod === 'phone' ? 'মোবাইল নম্বর *' : 'ইমেইল ঠিকানা *'}
            </label>
            <div className="relative">
              {authMethod === 'phone' ? (
                <Phone className="w-4 h-4 text-emerald-600 absolute left-3 top-2.5" />
              ) : (
                <Mail className="w-4 h-4 text-blue-600 absolute left-3 top-2.5" />
              )}
              <input
                type={authMethod === 'phone' ? 'tel' : 'email'}
                required
                placeholder={authMethod === 'phone' ? 'যেমন: ০১৭১২-৩৪৫৬৭৮' : 'যেমন: farmer@example.com'}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            {authMethod === 'phone' && (
              <p className="text-[10px] text-slate-400 mt-1">
                ১১ ডিজিটের সচল মোবাইল নম্বর দিন (পাসওয়ার্ড দিয়ে লগইন করা যাবে)
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">পাসওয়ার্ড *</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold"
              >
                {showPassword ? 'পাসওয়ার্ড লুকান 🙈' : 'পাসওয়ার্ড দেখুন 👁️'}
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="কমপক্ষে ৬ অক্ষর বা সংখ্যা"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">আপনার নাম *</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="নাম"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">খামারের নাম *</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="খামারের নাম"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {authMethod === 'phone' ? 'বিকল্প মোবাইল নম্বর (ঐচ্ছিক)' : 'মোবাইল নম্বর'}
                  </label>
                  <input
                    type="tel"
                    placeholder="০১৭..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">অবস্থান (জেলা)</label>
                  <input
                    type="text"
                    placeholder="যেমন: ময়মনসিংহ"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">শেড ক্যাপাসিটি</label>
                  <input
                    type="number"
                    min="50"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">পাখির জাত</label>
                  <select
                    value={birdType}
                    onChange={(e) => setBirdType(e.target.value as BirdType)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                  >
                    <option value="ব্রয়লার">ব্রয়লার</option>
                    <option value="সোনালী">সোনালী</option>
                    <option value="লেয়ার">লেয়ার</option>
                    <option value="কক / টাইগার">কক / টাইগার</option>
                    <option value="দেশি মুরগি">দেশি মুরগি</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {loading
                ? 'অনুগ্রহ করে অপেক্ষা করুন...'
                : isRegister
                ? 'একাউন্ট তৈরি করুন'
                : 'লগইন করুন'}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-100 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-xs text-emerald-600 hover:underline font-bold"
          >
            {isRegister
              ? 'পূর্বের একাউন্ট আছে? লগইন করুন'
              : 'নতুন খামারী? এখানে ক্লিক করে নিবন্ধন করুন'}
          </button>
        </div>
      </div>
    </div>
  );
};
