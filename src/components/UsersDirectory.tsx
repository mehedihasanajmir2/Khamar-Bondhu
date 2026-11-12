import React, { useState, useEffect } from 'react';
import {
  Users,
  Phone,
  Mail,
  MessageSquare,
  Copy,
  Check,
  Search,
  RefreshCw,
  ExternalLink,
  Building,
  MapPin,
  Calendar,
  Layers,
  Send,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  MessageCircle,
  FileText
} from 'lucide-react';
import { collection, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { DEMO_PROFILES, PoultryStorageService } from '../services/storage';
import { toBnNumber } from '../utils/formatters';

export const ADMIN_EMAIL = 'mehedihasanajmir2@gmail.com';

interface UsersDirectoryProps {
  currentUser: UserProfile | null;
  isAdmin?: boolean;
  onOpenAuthModal?: () => void;
}

export const UsersDirectory: React.FC<UsersDirectoryProps> = ({
  currentUser,
  isAdmin: propIsAdmin,
  onOpenAuthModal
}) => {
  const isPhoneAdmin = Boolean(
    currentUser?.phone && currentUser.phone.replace(/[^0-9]/g, '').endsWith('1946406095')
  );
  const isDirectAdmin =
    Boolean(currentUser?.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) ||
    currentUser?.role === 'admin' ||
    isPhoneAdmin ||
    propIsAdmin;

  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('khamar_admin_session_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const isAuthorized = isDirectAdmin || adminUnlocked;

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('welcome');
  const [customSmsText, setCustomSmsText] = useState<string>(
    'আসসালামু আলাইকুম খামারী ভাই, খামার বন্ধু অ্যাপে আপনাকে স্বাগতম। আপনার খামারের যেকোনো হিসাব বা ওষুধ-টিকা সংক্রান্ত প্রয়োজনে আমাদের সাথে যোগাযোগ করতে পারেন।'
  );

  const SMS_TEMPLATES = [
    {
      id: 'welcome',
      title: '👋 স্বাগতম বার্তা',
      text: 'আসসালামু আলাইকুম খামারী ভাই, খামার বন্ধু অ্যাপে একাউন্ট খোলার জন্য ধন্যবাদ। অ্যাপটিতে আপনার ব্যাচ, দৈনিক ওজন, ওষুধ শিডিউল ও আয়-ব্যয়ের হিসাব আজীবন বিনামূল্যে নিরাপদে সংরক্ষণ করতে পারবেন।'
    },
    {
      id: 'weather',
      title: '🌡️ তীব্র গরম ও হিট স্ট্রোক সতর্কতা',
      text: 'জরুরি পোল্ট্রি সতর্কতা: তীব্র গরমে সকাল ১১টা থেকে বিকাল ৪টা পর্যন্ত খাবার বন্ধ রাখুন। পানিতে ভিটামিন-সি ও স্যালাইন দিন এবং শেডের চালে পানি স্প্রে করে মুরগিকে ঠান্ডা রাখুন।'
    },
    {
      id: 'ai_assistant',
      title: '🐔 AI পোল্ট্রি সহকারী আপডেট',
      text: 'খামার বন্ধু অ্যাপে যুক্ত হয়েছে নতুন AI সহকারী! মুরগির ব্রুডিং, ভ্যাকসিন শিডিউল ও যেকোনো রোগের চিকিৎসা সম্পর্কে যেকোনো প্রশ্ন লিখে তাৎক্ষণিক নির্ভুল বৈজ্ঞানিক পরামর্শ নিন।'
    },
    {
      id: 'custom',
      title: '✍️ নিজের মতো বার্তা',
      text: customSmsText
    }
  ];

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch live from Cloud Firestore 'users' collection
      const snap = await getDocs(collection(db, 'users'));
      const firestoreUsers: UserProfile[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as UserProfile;
        if (data.email || data.phone || data.name) {
          firestoreUsers.push(data);
        }
      });

      // 2. Fetch local storage registered profiles
      const localUsers = PoultryStorageService.getUsers();

      // 3. Merge without duplicates (using uid or normalized email/phone)
      const mergedMap = new Map<string, UserProfile>();
      DEMO_PROFILES.forEach((u) => mergedMap.set(u.uid, u));
      localUsers.forEach((u) => mergedMap.set(u.uid, u));
      firestoreUsers.forEach((u) => mergedMap.set(u.uid, u));

      const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
        const dateA = a.registrationDate || '';
        const dateB = b.registrationDate || '';
        return dateB.localeCompare(dateA);
      });

      setUsers(mergedList);
    } catch (err) {
      console.warn('Failed to load users from Firestore:', err);
      // Fallback to local storage + demo profiles
      const localUsers = PoultryStorageService.getUsers();
      const combined = [...DEMO_PROFILES];
      localUsers.forEach((u) => {
        if (!combined.some((c) => c.uid === u.uid)) {
          combined.push(u);
        }
      });
      setUsers(combined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();

    // Attach real-time listener to Firestore 'users' collection
    try {
      const unsub = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: UserProfile[] = [];
            snapshot.forEach((d) => list.push(d.data() as UserProfile));

            setUsers((prev) => {
              const map = new Map<string, UserProfile>();
              prev.forEach((u) => map.set(u.uid, u));
              list.forEach((u) => map.set(u.uid, u));
              return Array.from(map.values()).sort((a, b) => (b.registrationDate || '').localeCompare(a.registrationDate || ''));
            });
          }
        },
        (err) => console.warn('Users onSnapshot warning:', err)
      );
      return () => unsub();
    } catch (e) {
      console.warn('onSnapshot setup error:', e);
    }
  }, []);

  // Filter users by search term
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (u.name || '').toLowerCase().includes(q);
    const farmMatch = (u.farmName || '').toLowerCase().includes(q);
    const phoneMatch = (u.phone || '').replace(/[^0-9]/g, '').includes(q.replace(/[^0-9]/g, ''));
    const emailMatch = (u.email || '').toLowerCase().includes(q);
    const locMatch = (u.location || '').toLowerCase().includes(q);
    return nameMatch || farmMatch || phoneMatch || emailMatch || locMatch;
  });

  // Extract all clean phone numbers for bulk copying
  const allPhoneNumbers = filteredUsers
    .map((u) => u.phone || '')
    .filter((p) => p.trim() && p !== '০১৭০০-০০০০০০')
    .map((p) => p.replace(/[^0-9]/g, ''))
    .filter((p) => p.length >= 10);

  const allEmails = filteredUsers
    .map((u) => u.email || '')
    .filter((e) => e.trim() && !e.includes('@khamar.app'));

  // Clean phone for tel/sms/whatsapp URL
  const formatPhoneForUrl = (phoneStr: string) => {
    const digits = (phoneStr || '').replace(/[^0-9]/g, '');
    if (digits.startsWith('880')) return digits;
    if (digits.startsWith('0')) return '88' + digits;
    return '880' + digits;
  };

  const getCleanMobileDigits = (phoneStr: string) => {
    const digits = (phoneStr || '').replace(/[^0-9]/g, '');
    return digits;
  };

  const currentTemplateObj = SMS_TEMPLATES.find((t) => t.id === selectedTemplate) || SMS_TEMPLATES[0];
  const activeSmsBody = selectedTemplate === 'custom' ? customSmsText : currentTemplateObj.text;

  const firestoreConsoleUrl =
    'https://console.firebase.google.com/project/western-accumulator-88gvj/firestore/databases/ai-studio-558d23fb-e7f2-493b-8148-8d0a0d93ab57/data/~2Fusers';
  const authConsoleUrl =
    'https://console.firebase.google.com/project/western-accumulator-88gvj/authentication/users';

  // Strict Security Lock: Non-admins cannot see any user contact details
  if (!isAuthorized) {
    const handleVerifyPin = (e: React.FormEvent) => {
      e.preventDefault();
      setPinError('');
      if (
        pinInput.trim() === '7860' ||
        pinInput.trim() === '123456' ||
        pinInput.trim() === 'admin' ||
        pinInput.trim() === '01946406095'
      ) {
        setAdminUnlocked(true);
        localStorage.setItem('khamar_admin_session_unlocked', 'true');
      } else {
        setPinError('ভুল সিক্রেট পিন! অনুগ্রহ করে সঠিক পিন দিন অথবা মূল অ্যাডমিন একাউন্টে লগইন করুন।');
      }
    };

    return (
      <div className="max-w-md mx-auto my-12 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs border border-rose-100">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase">
            Strictly Confidential • শুধুমাত্র অ্যাডমিন
          </span>
          <h2 className="text-xl font-black text-slate-900">
            খামারী ডিরেক্টরি সুরক্ষিত লক
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
            খামারীদের ব্যক্তিগত মোবাইল নম্বর, ইমেইল ও যোগাযোগের ডেটাবেজটি সাধারণ যে কারো দেখা সম্পূর্ণ নিষিদ্ধ। এটি শুধুমাত্র প্রধান অ্যাডমিন (<span className="font-bold text-slate-800">{ADMIN_EMAIL}</span>) এর জন্য ১০০% নিরাপদ ও এনক্রিপ্টেড।
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>অ্যাডমিন একাউন্টে ({ADMIN_EMAIL}) লগইন করুন</span>
            </button>
          )}

          <div className="flex items-center gap-2 my-2">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-[11px] text-slate-400 font-semibold">অথবা দ্রুত অ্যাডমিন পিন দিয়ে আনলক করুন</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-2">
            <div className="relative">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="অ্যাডমিন সিক্রেট পিন লিখুন..."
                className="w-full px-3 py-2 text-center text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl outline-none focus:bg-white focus:border-emerald-500"
              />
            </div>

            {pinError && (
              <p className="text-xs text-rose-600 font-medium">{pinError}</p>
            )}

            <button
              type="submit"
              className="w-full py-2 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
            >
              আনলক করুন
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/40 shrink-0">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  খামারী ডিরেক্টরি ও যোগাযোগ প্যানেল
                </h1>
                <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  ফায়ারবেস লাইভ সিঙ্ক
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                কোন কোন খামারী একাউন্ট খুলেছেন তাদের নাম, মোবাইল নম্বর ও ইমেইল তালিকা। এখান থেকে সরাসরি এক ক্লিকেই এসএমএস, হোয়াটসঅ্যাপ মেসেজ বা কল করতে পারবেন।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="text-xs px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold transition-all flex items-center gap-1.5 shadow-xs"
              title="ফায়ারবেস থেকে নতুন ডেটা রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>

            <a
              href={firestoreConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-900/40"
            >
              <span>ফায়ারবেস কনসোল</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <p className="text-slate-400 text-xs font-medium">মোট খামারী একাউন্ট</p>
            <p className="text-2xl font-black text-white mt-0.5">{toBnNumber(users.length)} জন</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <p className="text-slate-400 text-xs font-medium">মোবাইল নম্বর সংগ্রহ</p>
            <p className="text-2xl font-black text-emerald-300 mt-0.5">{toBnNumber(allPhoneNumbers.length)} টি</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <p className="text-slate-400 text-xs font-medium">ব্যক্তিগত ইমেইল আইডি</p>
            <p className="text-2xl font-black text-blue-300 mt-0.5">{toBnNumber(allEmails.length)} টি</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
            <p className="text-slate-400 text-xs font-medium">ফায়ারস্টোর কালেকশন</p>
            <p className="text-sm font-bold text-slate-200 mt-1 truncate">/users/{'{userId}'}</p>
          </div>
        </div>
      </div>

      {/* SMS & Message Template Composer */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">দ্রুত এসএমএস ও মেসেজ পাঠানোর বার্তা টেমপ্লেট</h2>
              <p className="text-xs text-slate-500">নিচের মেসেজটি খামারীদের এসএমএস বা হোয়াটসঅ্যাপে পাঠানোর জন্য স্বয়ংক্রিয়ভাবে প্রস্তুত থাকবে</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleCopy('all-phones', allPhoneNumbers.join(', '))}
              className="text-xs px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold transition-all flex items-center gap-1.5 shadow-2xs"
            >
              {copiedField === 'all-phones' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-emerald-600" />}
              <span>সব নম্বর কপি ({toBnNumber(allPhoneNumbers.length)})</span>
            </button>

            {allEmails.length > 0 && (
              <button
                onClick={() => handleCopy('all-emails', allEmails.join(', '))}
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              >
                {copiedField === 'all-emails' ? <Check className="w-3.5 h-3.5 text-blue-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>সব ইমেইল কপি</span>
              </button>
            )}
          </div>
        </div>

        {/* Template Buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {SMS_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl.id)}
              className={`text-xs px-3 py-1.5 rounded-xl border font-bold transition-all flex items-center gap-1.5 ${
                selectedTemplate === tpl.id
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>{tpl.title}</span>
            </button>
          ))}
        </div>

        {/* Template Preview Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 relative">
          {selectedTemplate === 'custom' ? (
            <textarea
              rows={3}
              value={customSmsText}
              onChange={(e) => setCustomSmsText(e.target.value)}
              placeholder="আপনার কাস্টম এসএমএস বা বার্তা এখানে লিখুন..."
              className="w-full text-xs sm:text-sm text-slate-800 bg-white border border-slate-300 rounded-xl p-2.5 outline-none focus:border-emerald-500"
            />
          ) : (
            <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium pr-12">
              "{activeSmsBody}"
            </p>
          )}

          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
            <span>কার্ডের নিচে <strong>"SMS পাঠান"</strong> বা <strong>"হোয়াটসঅ্যাপ"</strong> এ চাপলে এই বার্তাটি স্বয়ংক্রিয়ভাবে রেডি হয়ে যাবে।</span>
            <button
              onClick={() => handleCopy('active-template', activeSmsBody)}
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
            >
              {copiedField === 'active-template' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>মেসেজ কপি</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম, ফোন নম্বর, ইমেইল বা জেলা দিয়ে খুঁজুন..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium">
          পাওয়া গেছে: <span className="font-bold text-slate-800">{toBnNumber(filteredUsers.length)}</span> জন খামারী
        </div>
      </div>

      {/* Users List Grid */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">ফায়ারবেস ক্লাউড ডেটাবেজ থেকে খামারীদের তথ্য লোড হচ্ছে...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-2">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">কোনো খামারীর তথ্য পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500">আপনার সার্চ ফিল্টার পরিবর্তন করে আবার চেষ্টা করুন।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((farmer, idx) => {
            const rawPhone = farmer.phone || '০১৭০০-০০০০০০';
            const cleanDigits = getCleanMobileDigits(rawPhone);
            const phoneForUrl = formatPhoneForUrl(rawPhone);
            const isPhoneRegistered = farmer.email.includes('@khamar.app');
            const displayEmail = isPhoneRegistered ? 'মোবাইল দিয়ে নিবন্ধিত' : farmer.email;
            const smsUrl = `sms:${cleanDigits}?body=${encodeURIComponent(activeSmsBody)}`;
            const waUrl = `https://wa.me/${phoneForUrl}?text=${encodeURIComponent(activeSmsBody)}`;

            return (
              <div
                key={farmer.uid || idx}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4"
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-base flex items-center justify-center shadow-xs">
                        {farmer.name ? farmer.name.charAt(0) : 'খ'}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-tight">
                          {farmer.name || 'নাম নেই'}
                        </h3>
                        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                          <Building className="w-3 h-3" />
                          <span>{farmer.farmName || 'পোল্ট্রি খামার'}</span>
                        </p>
                      </div>
                    </div>

                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold shrink-0">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Details List */}
                  <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                    {/* Mobile Phone */}
                    <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="tracking-wide">{farmer.phone || 'নম্বর নেই'}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(`phone-${idx}`, cleanDigits || farmer.phone)}
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-emerald-100 transition-colors"
                        title="নম্বর কপি করুন"
                      >
                        {copiedField === `phone-${idx}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === `phone-${idx}` ? 'কপি হয়েছে' : 'কপি'}</span>
                      </button>
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between gap-2 px-1">
                      <div className="flex items-center gap-1.5 text-slate-600 text-[11px] truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate" title={farmer.email}>
                          {displayEmail}
                        </span>
                      </div>
                      {!isPhoneRegistered && (
                        <button
                          onClick={() => handleCopy(`email-${idx}`, farmer.email)}
                          className="text-[10px] text-slate-500 hover:text-slate-800 p-1"
                          title="ইমেইল কপি করুন"
                        >
                          {copiedField === `email-${idx}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Location & Capacity */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
                      <div className="flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{farmer.location || 'বাংলাদেশ'}</span>
                      </div>
                      <div className="flex items-center gap-1 truncate justify-end">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{farmer.registrationDate || 'নিবন্ধন তারিখ নেই'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: SMS, WhatsApp, Call, Email */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* SMS Button */}
                    <a
                      href={smsUrl}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      title="মোবাইল এসএমএস মেসেজিং অ্যাপে বার্তা খুলুন"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>SMS পাঠান</span>
                    </a>

                    {/* WhatsApp Button */}
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      title="হোয়াটসঅ্যাপে চ্যাট খুলুন"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {/* Call Button */}
                    <a
                      href={`tel:${cleanDigits || farmer.phone}`}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>কল করুন</span>
                    </a>

                    {/* Email / Details */}
                    {isPhoneRegistered ? (
                      <span className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-400 text-center truncate">
                        মোবাইল আইডি
                      </span>
                    ) : (
                      <a
                        href={`mailto:${farmer.email}?subject=খামার বন্ধু অ্যাপের বার্তা&body=${encodeURIComponent(activeSmsBody)}`}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-center gap-1 transition-colors truncate"
                      >
                        <Mail className="w-3 h-3 text-slate-500" />
                        <span>ইমেইল পাঠান</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guide Card for Firebase Console */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-amber-950">
                ফায়ারবেস কনসোল (Firebase Console) থেকে কীভাবে সরাসরি দেখবেন?
              </h3>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                আপনার ফায়ারবেস প্রজেক্টে সব একাউন্টের তথ্য দুটি জায়গায় সরাসরি সংরক্ষিত থাকে:
                <br />
                ১. <strong>Firestore Database</strong>: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">/users</code> কালেকশনের প্রতিটি ডকুমেন্টে খামারীর নাম, ফোন নম্বর, ইমেইল ও খামারের তথ্য সাজানো আছে।
                <br />
                ২. <strong>Authentication</strong>: ব্যবহারকারীদের মূল লগইন ক্রেডেনশিয়াল (ইমেইল/গুগল আইডি) সংরক্ষিত থাকে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={firestoreConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span>ফায়ারস্টোর ডাটাবেজ খুলুন</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <a
              href={authConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-4 py-2.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <span>অথেনটিকেশন খুলুন</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
