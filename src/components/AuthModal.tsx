import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, Building, Phone, MapPin, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BirdType } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, loginWithGoogle } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [farmName, setFarmName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('1500');
  const [birdType, setBirdType] = useState<BirdType>('ব্রয়লার');

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'গুগল লগইন সম্পন্ন করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!name || !farmName) {
          setError('অনুগ্রহ করে নাম এবং খামারের নাম দিন।');
          setLoading(false);
          return;
        }
        await register(
          {
            email,
            name,
            farmName,
            phone: phone || '০১৭০০-০০০০০০',
            location: location || 'বাংলাদেশ',
            capacity: parseInt(capacity, 10) || 1000,
            birdType
          },
          password
        );
      } else {
        await login(email, password);
      }
      onClose();
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
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 text-lg font-bold"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🐓</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">
            {isRegister ? 'নতুন খামারী একাউন্ট নিবন্ধন' : 'খামার বন্ধু একাউন্টে লগইন'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ফায়ারবেস কনসোল অথেনটিকেশন ও ক্লাউড ফায়ারস্টোর সংযুক্ত
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Google 1-Tap Firebase Sign-In Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mb-4 flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold shadow-xs transition-all active:scale-95 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>গুগল দিয়ে লগইন করুন (Firebase Auth)</span>
        </button>

        <div className="relative flex items-center justify-center mb-4">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-2.5 text-[11px] font-bold text-slate-400 absolute">অথবা ইমেইল দিয়ে</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ইমেইল ঠিকানা *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="farmer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">পাসওয়ার্ড *</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
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
                    placeholder="যেমন: মোঃ রফিকুল ইসলাম"
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
                    placeholder="যেমন: রফিক ব্রয়লার ফার্ম"
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
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
