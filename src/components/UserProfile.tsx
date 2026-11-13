import React, { useState } from 'react';
import {
  UserCheck,
  ShieldCheck,
  Building,
  Phone,
  MapPin,
  Layers,
  Copy,
  Check,
  Edit3,
  Lock,
  Repeat,
  AlertTriangle,
  Save,
  Archive,
  Search,
  Scale,
  TrendingUp,
  Receipt,
  FileText,
  RotateCcw,
  Calendar,
  Eye,
  PlusCircle,
  ExternalLink,
  Award,
  Cloud,
  Download,
  RefreshCw,
  Database,
  CheckCircle2,
  MessageCircle,
  Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Batch, BirdType, UserProfile as UserProfileType } from '../types';
import { formatBnDate, formatTaka, formatWeight, toBnNumber } from '../utils/formatters';
import { PoultryStorageService } from '../services/storage';
import { ArchivedBatchInspectionModal } from './ArchivedBatchInspectionModal';
import { useConfirm } from '../context/ConfirmContext';

interface UserProfileProps {
  batches?: Batch[];
  activeBatchId?: string | null;
  onSelectBatch?: (batchId: string) => void;
  onArchiveBatch?: (batchId: string) => void;
  onRestoreBatch?: (batchId: string) => void;
  onOpenNewBatchModal?: () => void;
  onOpenAdminPanel?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  batches = [],
  activeBatchId,
  onSelectBatch,
  onArchiveBatch,
  onRestoreBatch,
  onOpenNewBatchModal,
  onOpenAdminPanel
}) => {
  const { currentUser, updateProfile } = useAuth();
  const { confirmAction } = useConfirm();
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState(currentUser?.name || '');
  const [farmName, setFarmName] = useState(currentUser?.farmName || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [whatsapp, setWhatsapp] = useState(currentUser?.whatsapp || currentUser?.phone || '');
  const [personalEmail, setPersonalEmail] = useState(
    currentUser?.email && !currentUser.email.includes('@khamar.app') ? currentUser.email : ''
  );
  const [location, setLocation] = useState(currentUser?.location || '');
  const [capacity, setCapacity] = useState<string>(currentUser?.capacity?.toString() || '1000');
  const [birdType, setBirdType] = useState<BirdType>(currentUser?.birdType || 'ব্রয়লার');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Sync state if currentUser changes
  React.useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setFarmName(currentUser.farmName || '');
      setPhone(currentUser.phone || '');
      setWhatsapp(currentUser.whatsapp || currentUser.phone || '');
      setPersonalEmail(
        currentUser.email && !currentUser.email.includes('@khamar.app') ? currentUser.email : ''
      );
      setLocation(currentUser.location || '');
      setCapacity(currentUser.capacity?.toString() || '1000');
      setBirdType(currentUser.birdType || 'ব্রয়লার');
    }
  }, [currentUser]);

  // Archive Browser State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBirdType, setFilterBirdType] = useState<string>('all');
  const [selectedArchivedBatch, setSelectedArchivedBatch] = useState<Batch | null>(null);

  const handleManualCloudSync = async () => {
    if (!currentUser) return;
    setIsSyncingCloud(true);
    setCloudSyncMsg(null);
    try {
      await PoultryStorageService.pushAllToFirestore(currentUser.uid);
      await PoultryStorageService.syncUserFromFirestore(currentUser.uid);
      setCloudSyncMsg('✓ আপনার খামারের সকল তথ্য সফলভাবে গুগল ক্লাউড ফায়ারস্টোরে সিঙ্ক ও সংরক্ষিত হয়েছে!');
    } catch (e: any) {
      setCloudSyncMsg('সিঙ্ক করতে সমস্যা হয়েছে। ইন্টারনেট সংযোগ চেক করুন।');
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setCloudSyncMsg(null), 5000);
    }
  };

  const handleDownloadBackup = () => {
    if (!currentUser) return;
    try {
      const backupJson = PoultryStorageService.exportFullBackup(currentUser.uid);
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `khamar-backup-${currentUser.uid}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Backup download error:', e);
    }
  };

  if (!currentUser) {
    return <div className="p-8 text-center text-slate-500">অনুগ্রহ করে লগইন করুন।</div>;
  }

  // Load user's batches from props or storage if not provided
  const userBatches = batches.length > 0 ? batches : PoultryStorageService.getBatches(currentUser.uid);
  const completedBatches = userBatches.filter((b) => b.status === 'completed');

  // Filter completed batches
  const filteredCompletedBatches = completedBatches.filter((b) => {
    const matchSearch =
      b.batchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batchName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.startDate.includes(searchTerm);
    const matchType = filterBirdType === 'all' || b.birdType === filterBirdType;
    return matchSearch && matchType;
  });

  const handleCopyId = () => {
    navigator.clipboard.writeText(currentUser.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    const cleanWhatsapp = whatsapp.trim() || cleanPhone;
    const cleanEmail = personalEmail.trim() ? personalEmail.trim() : currentUser.email;

    updateProfile({
      name: name.trim(),
      farmName: farmName.trim(),
      phone: cleanPhone,
      whatsapp: cleanWhatsapp,
      email: cleanEmail,
      location: location.trim(),
      capacity: parseInt(capacity, 10) || 1000,
      birdType
    });
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -z-10"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-50">
              {(currentUser.name || 'খ').charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">{currentUser.name}</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  ভেরিফাইড খামারী
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-600 mt-0.5">{currentUser.farmName}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  হোয়াটসঅ্যাপ: {currentUser.whatsapp || currentUser.phone}
                </span>
                {currentUser.email && !currentUser.email.includes('@khamar.app') ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    ইমেইল: {currentUser.email}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
                    <Phone className="w-3 h-3 text-slate-400" />
                    মোবাইল: {currentUser.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="self-start sm:self-center flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            {isEditing ? 'সম্পাদনা বন্ধ' : 'প্রোফাইল পরিবর্তন'}
          </button>
        </div>

        {/* Admin Access Banner (Only shown if logged in as Admin) */}
        {onOpenAdminPanel && (currentUser?.role === 'admin' || (currentUser?.phone && currentUser.phone.replace(/[^0-9]/g, '').endsWith('1946406095')) || (currentUser?.email && currentUser.email.toLowerCase() === 'mehedihasanajmir2@gmail.com')) && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                👑
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-950">
                  অ্যাডমিন ডিরেক্টরি ও বাল্ক SMS কন্ট্রোল সেন্টার
                </h4>
                <p className="text-xs text-amber-800">
                  কে কে একাউন্ট খুলল দেখতে, তাদের ফোন নম্বরে SMS বা WhatsApp পাঠাতে সরাসরি প্রবেশ করুন।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenAdminPanel}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
            >
              <span>অ্যাডমিন প্যানেলে প্রবেশ করুন</span>
              <span>➔</span>
            </button>
          </div>
        )}

        {/* Unique User ID Card & RLS Badge */}
        <div className="mt-4 bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> অপরিবর্তনীয় খামারী ইউজার আইডি (Unique User ID)
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="font-mono text-base sm:text-lg font-bold tracking-wider text-slate-100">
                {currentUser.uid}
              </span>
              <button
                onClick={handleCopyId}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="কপি করুন"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              ডাটাবেজ সিকিউরিটি রুল: <code className="text-emerald-300">request.auth.uid == resource.data.userId</code> (আইসোলেটেড)
            </p>
          </div>

          <div className="shrink-0 bg-slate-800/80 px-3.5 py-2 rounded-xl border border-slate-700 text-xs">
            <span className="text-slate-400 block text-[10px]">নিবন্ধন তারিখ:</span>
            <span className="font-bold text-slate-200">{currentUser.registrationDate}</span>
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            আপনার প্রোফাইল তথ্য সফলভাবে আপডেট হয়েছে!
          </div>
        )}

        {/* Profile Details or Edit Form */}
        {!isEditing ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <Building className="w-4 h-4 text-emerald-600" /> খামারের নাম
              </span>
              <p className="font-bold text-slate-800 text-sm mt-1">{currentUser.farmName}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-blue-600" /> মোবাইল নম্বর
              </span>
              <p className="font-bold text-slate-800 text-sm mt-1">{currentUser.phone}</p>
            </div>

            <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/70">
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-emerald-600" /> হোয়াটসঅ্যাপ নম্বর (WhatsApp)
              </span>
              <p className="font-bold text-slate-900 text-sm mt-1 flex items-center justify-between">
                <span>{currentUser.whatsapp || currentUser.phone}</span>
                {currentUser.whatsapp && (
                  <a
                    href={`https://wa.me/${currentUser.whatsapp.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold underline"
                  >
                    চ্যাট করুন ↗
                  </a>
                )}
              </p>
            </div>

            <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200/70">
              <span className="text-xs text-blue-700 font-semibold flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-600" /> ব্যক্তিগত ইমেইল (Real Email)
              </span>
              <p className="font-bold text-slate-900 text-sm mt-1 truncate">
                {currentUser.email && !currentUser.email.includes('@khamar.app')
                  ? currentUser.email
                  : 'সংযুক্ত করা হয়নি (ঐচ্ছিক)'}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-600" /> খামারের অবস্থান (জেলা/উপজেলা)
              </span>
              <p className="font-bold text-slate-800 text-sm mt-1">{currentUser.location}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-600" /> শেড ধারণক্ষমতা (Capacity)
              </span>
              <p className="font-bold text-slate-800 text-sm mt-1">
                {toBnNumber(currentUser.capacity)} টি পাখি
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-teal-600" /> পছন্দের পাখির জাত
              </span>
              <p className="font-bold text-slate-800 text-sm mt-1">{currentUser.birdType || 'ব্রয়লার'}</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" /> ডাটা সিকিউরিটি ও ব্যাকআপ
              </span>
              <p className="font-bold text-emerald-700 text-sm mt-1">ক্লাউড ও লোকাল স্বয়ংক্রিয় সিঙ্ক</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">প্রোফাইল তথ্য হালনাগাদ করুন</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">খামারীর নাম</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">খামারের নাম</label>
                <input
                  type="text"
                  required
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> হোয়াটসঅ্যাপ নম্বর (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="যেমন: 01712345678"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">খামারের যোগাযোগ ও সাপোর্টের জন্য</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-blue-600" /> ব্যক্তিগত ইমেইল (Gmail বা নিজস্ব ইমেইল)
                </label>
                <input
                  type="email"
                  placeholder="যেমন: yourname@gmail.com"
                  value={personalEmail}
                  onChange={(e) => setPersonalEmail(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">জরুরি নোটিফিকেশন ও ক্লাউড ডাটা সুরক্ষায়</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">অবস্থান (জেলা/উপজেলা)</label>
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">শেডের ধারণক্ষমতা (পাখি)</label>
                <input
                  type="number"
                  min="10"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">পাখির প্রধান জাত</label>
                <select
                  value={birdType}
                  onChange={(e) => setBirdType(e.target.value as BirdType)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="ব্রয়লার">ব্রয়লার (Broiler)</option>
                  <option value="সোনালী">সোনালী (Sonali)</option>
                  <option value="লেয়ার">লেয়ার (Layer)</option>
                  <option value="কক / টাইগার">কক / টাইগার</option>
                  <option value="দেশি মুরগি">দেশি মুরগি</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                বাতিল
              </button>
              <button
                type="submit"
                className="flex items-center gap-1 px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                সংরক্ষণ করুন
              </button>
            </div>
          </form>
        )}
      </div>

      {/* LIFETIME CLOUD DATA SAFETY & BACKUP CARD */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-500/30 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl"></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-5 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Cloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-white">
                  আজীবন ক্লাউড ব্যাকআপ গ্যারান্টি (Lifetime Data Safe)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ক্লাউডে স্থায়ীভাবে সংরক্ষিত
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                আপনার খামারের সকল ব্যাচ, ওজনের রেকর্ড, ওষুধের রুটিন, খরচ, বকেয়া এবং বিক্রির হিসাব গুগল ক্লাউড ফায়ারস্টোর (Google Cloud Firestore SSD) সার্ভারে আজীবনের জন্য সুরক্ষিত। ফোন হারালে, ব্রাউজার ক্যাশ ক্লিয়ার করলে বা লগআউট করলেও একই একাউন্টে লগইন করলেই ১০০% ডাটা স্বয়ংক্রিয়ভাবে ফিরে আসবে।
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={handleManualCloudSync}
              disabled={isSyncingCloud}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="গুগল ক্লাউডে ডাটা সিঙ্ক করুন"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncingCloud ? 'animate-spin' : ''}`} />
              <span>{isSyncingCloud ? 'সিঙ্ক হচ্ছে...' : 'এখনই সিঙ্ক করুন'}</span>
            </button>
            <button
              onClick={handleDownloadBackup}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              title="আপনার কম্পিউটার বা ফোনে সম্পূর্ণ ব্যাকআপ ফাইল ডাউনলোড করুন"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>ফাইল ব্যাকআপ</span>
            </button>
          </div>
        </div>

        {cloudSyncMsg && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{cloudSyncMsg}</span>
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-2.5">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">ক্লাউড ডাটাবেজ</span>
              <span className="font-mono text-[11px] text-emerald-300 truncate font-semibold block">Google Cloud Firestore</span>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">স্থায়ী ডাটা সুরক্ষা</span>
              <span className="text-[11px] text-teal-300 font-semibold block">SSD Multi-Region Replication</span>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">আপনার ইউজার আইডি</span>
              <span className="font-mono text-[11px] text-cyan-300 font-semibold block truncate">
                {currentUser.uid}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CORE REQUIRED SECTION: Previous Batches History (আগের ব্যাচসমূহ) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900">
                  আগের ব্যাচসমূহ ও ইতিহাস (Previous Batches History)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-200">
                  {toBnNumber(completedBatches.length)} টি
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                সম্পন্ন হওয়া সকল ব্যাচের লাভ-ক্ষতি, ওজন ও ওষুধ হিসাব এখানে স্থায়ীভাবে সংরক্ষিত আছে।
              </p>
            </div>
          </div>

          {onOpenNewBatchModal && (
            <button
              onClick={onOpenNewBatchModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all active:scale-95 self-start sm:self-auto"
            >
              <PlusCircle className="w-4 h-4" />
              নতুন ব্যাচ শুরু করুন
            </button>
          )}
        </div>

        {/* Search and Filters */}
        {completedBatches.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ব্যাচ নং বা নাম খুঁজুন..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs font-semibold pl-9 pr-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
              <span className="text-slate-500 font-semibold">জাত ফিল্টার:</span>
              <select
                value={filterBirdType}
                onChange={(e) => setFilterBirdType(e.target.value)}
                className="font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">সব জাত</option>
                <option value="ব্রয়লার">ব্রয়লার</option>
                <option value="সোনালী">সোনালী</option>
                <option value="লেয়ার">লেয়ার</option>
                <option value="কক / টাইগার">কক / টাইগার</option>
                <option value="দেশি মুরগি">দেশি মুরগি</option>
              </select>
            </div>
          </div>
        )}

        {/* Archived Batches Cards Grid */}
        {completedBatches.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-6">
            <Archive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">এখনও কোনো সম্পন্ন ব্যাচ সংরক্ষিত নেই</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
              আপনার চলমান ব্যাচের মুরগি বিক্রি শেষ হলে ড্যাশবোর্ড বা ব্যাচ ম্যানেজার থেকে <strong>"ব্যাচ সমাপ্ত ও আর্কাইভ করুন"</strong> বাটনে ক্লিক করলেই তা স্বয়ংক্রিয়ভাবে এখানে যুক্ত হবে।
            </p>
          </div>
        ) : filteredCompletedBatches.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            আপনার সার্চের সাথে মিল রয়েছে এমন কোনো ব্যাচ পাওয়া যায়নি।
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCompletedBatches.map((batch) => {
              const summary = PoultryStorageService.calculateBatchSummary(currentUser.uid, batch);
              const startDate = new Date(batch.startDate);
              const endDate = batch.completedDate ? new Date(batch.completedDate) : new Date();
              const daysRan = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

              return (
                <div
                  key={batch.id}
                  className="bg-slate-50/70 hover:bg-white rounded-2xl p-5 border border-slate-200/90 hover:border-amber-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header of Card */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-slate-900 text-base">{batch.batchNumber}</h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                            সম্পন্ন ব্যাচ
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">{batch.batchName}</p>
                      </div>

                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 whitespace-nowrap">
                        {batch.birdType}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap pb-3 border-b border-slate-200/60">
                      <span>শুরু: {formatBnDate(batch.startDate)}</span>
                      <span>•</span>
                      <span>সমাপ্ত: {batch.completedDate ? formatBnDate(batch.completedDate) : 'সমাপ্ত'}</span>
                      <span>•</span>
                      <span className="font-bold text-amber-800">মোট {toBnNumber(daysRan)} দিন</span>
                    </div>

                    {/* 4 Performance Indicators */}
                    <div className="grid grid-cols-2 gap-2.5 my-3 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] text-slate-400 font-semibold block">বিক্রিত পাখি:</span>
                        <span className="font-black text-slate-800 text-sm">
                          {toBnNumber(summary.totalBirdsSold)} / {toBnNumber(batch.initialChicks)} টি
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          মৃত্যু: {toBnNumber(summary.totalMortality)} টি ({toBnNumber(summary.mortalityRatePercent.toFixed(1))}%)
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] text-slate-400 font-semibold block">অর্জিত গড় ওজন:</span>
                        <span className="font-black text-amber-700 text-sm">
                          {formatWeight(summary.latestAvgWeightGrams)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          লক্ষ্য: {formatWeight(batch.targetWeightGrams || 2000)}
                        </span>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] text-slate-400 font-semibold block">সর্বমোট ব্যয়:</span>
                        <span className="font-black text-rose-600 text-sm">
                          {formatTaka(summary.totalExpense)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          আয়: {formatTaka(summary.totalRevenue)}
                        </span>
                      </div>

                      <div className={`p-2.5 rounded-xl border ${
                        summary.isProfitable ? 'bg-emerald-50/90 border-emerald-200' : 'bg-red-50/90 border-red-200'
                      }`}>
                        <span className="text-[10px] text-slate-600 font-semibold block">
                          {summary.isProfitable ? 'চূড়ান্ত নিট লাভ:' : 'চূড়ান্ত ঘাটতি:'}
                        </span>
                        <span className={`font-black text-sm block ${
                          summary.isProfitable ? 'text-emerald-700' : 'text-red-700'
                        }`}>
                          {summary.isProfitable ? '+' : '-'}{formatTaka(Math.abs(summary.netProfit))}
                        </span>
                        <span className="text-[10px] text-slate-600 font-medium">
                          মার্জিন: {toBnNumber(summary.profitMarginPercent.toFixed(1))}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedArchivedBatch(batch)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      সম্পূর্ণ ইতিহাস ও খাতা পরিদর্শন
                    </button>

                    <div className="flex items-center gap-1.5">
                      {onSelectBatch && (
                        <button
                          onClick={() => onSelectBatch(batch.id)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                          title="এই ব্যাচটি সক্রিয় করুন"
                        >
                          সক্রিয় করুন
                        </button>
                      )}

                      {onRestoreBatch && (
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await confirmAction({
                              title: 'ব্যাচ পুনরায় সক্রিয় করবেন?',
                              message: `আপনি কি "${batch.batchNumber}" পুনরায় চলমান ব্যাচ হিসেবে সক্রিয় করতে চান?`,
                              confirmLabel: 'হ্যাঁ, সক্রিয় করুন',
                              tone: 'warning'
                            });
                            if (ok) {
                              onRestoreBatch(batch.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                          title="রিস্টোর বা চালু করুন"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Multi-Tenancy & Account Isolation Info */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-slate-900 text-base">
            অ্যাকাউন্ট সুরক্ষা ও ডাটা আইসোলেশন (Account Security)
          </h2>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          প্রতিটি নিবন্ধিত খামারীর সকল ব্যাচ, খরচ, ওষুধ ও বিক্রির তথ্য সম্পূর্ণ আলাদা ও সুরক্ষিত পার্টিশনে সংরক্ষিত থাকে। পাসওয়ার্ড ছাড়া অন্য কোনো ব্যবহারকারী আপনার আইডিতে প্রবেশ বা সুইচ করতে পারবে না।
        </p>
      </div>

      {/* Inspect Archived Batch Modal */}
      {selectedArchivedBatch && (
        <ArchivedBatchInspectionModal
          isOpen={!!selectedArchivedBatch}
          batch={selectedArchivedBatch}
          userId={currentUser.uid}
          onClose={() => setSelectedArchivedBatch(null)}
          onRestoreBatch={onRestoreBatch}
          onSelectActiveBatch={onSelectBatch}
        />
      )}
    </div>
  );
};
