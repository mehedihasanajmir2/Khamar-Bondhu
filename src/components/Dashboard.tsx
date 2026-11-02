import React from 'react';
import {
  Calendar,
  Scale,
  Receipt,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  Syringe,
  CheckCircle2,
  DollarSign,
  HeartPulse,
  Package,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Batch, BatchSummary, ExpenseRecord, MedicineScheduleItem, SaleRecord } from '../types';
import { formatBnDate, formatTaka, formatWeight, toBnNumber } from '../utils/formatters';

interface DashboardProps {
  activeBatch: Batch | null;
  summary: BatchSummary | null;
  batches: Batch[];
  onSelectBatch: (batchId: string) => void;
  onOpenNewBatch: () => void;
  onNavigateTab: (tab: any) => void;
  medicines: MedicineScheduleItem[];
  recentExpenses: ExpenseRecord[];
  recentSales: SaleRecord[];
  onToggleMedicine: (medId: string) => void;
  onRequestArchiveBatch?: (batchId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  activeBatch,
  summary,
  batches,
  onSelectBatch,
  onOpenNewBatch,
  onNavigateTab,
  medicines,
  recentExpenses,
  recentSales,
  onToggleMedicine,
  onRequestArchiveBatch
}) => {
  if (!activeBatch || !summary) {
    return (
      <div className="py-12 max-w-4xl mx-auto px-4">
        {/* Welcome Card for Fresh / Blank Account */}
        <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 rounded-3xl p-8 sm:p-10 text-white shadow-xl shadow-emerald-900/10 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-xs mb-4">
              ✨ নতুন খামার যাত্রা শুরু
            </span>
            <h2 className="text-2xl sm:text-3xl font-black mb-3 leading-tight">
              স্বাগতম! আপনার ডিজিটাল খামার ড্যাশবোর্ড সম্পূর্ণ প্রস্তুত
            </h2>
            <p className="text-emerald-100 text-sm sm:text-base leading-relaxed mb-6">
              আপনার খামারে বর্তমানে কোনো সক্রিয় ব্যাচ নেই (সম্পূর্ণ পরিষ্কার / Blank)। আপনার প্রথম ব্যাচ তৈরি করে বাচ্চার ওজন, খাদ্য, টিকা এবং লাভ-ক্ষতির নিখুঁত হিসাব সংরক্ষণ শুরু করুন।
            </p>
            <button
              onClick={onOpenNewBatch}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold shadow-lg shadow-black/10 transition-all hover:scale-105 active:scale-95 text-sm sm:text-base"
            >
              <PlusCircle className="w-5 h-5 text-emerald-700" />
              <span>আপনার প্রথম ব্যাচ শুরু করুন</span>
            </button>
          </div>
        </div>

        {/* 3 Simple Steps Guide */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold mb-4">
              🐣
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">১. ব্যাচ তৈরি করুন</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              বাচ্চার জাত (ব্রয়লার, সোনালী বা লেয়ার), মোট বাচ্চার সংখ্যা এবং প্রতিটি বাচ্চার রেট প্রদান করে ব্যাচ শুরু করুন।
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-xl font-bold mb-4">
              ⚖️
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">২. দৈনিক ওজন ও বৃদ্ধি</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              প্রতি সপ্তাহে ৫ বা ১০টি পাখির নমুনা ওজন ও প্রতিদিনের খাবার লিখে এফসিআর (FCR) এবং শারীরিক বৃদ্ধি পর্যবেক্ষণ করুন।
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold mb-4">
              📊
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">৩. লাভ ও টিকার হিসাব</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              টিকার শিডিউল নোটিফিকেশন পান এবং মুরগি বিক্রির পর স্বয়ংক্রিয়ভাবে মোট আয়, মোট খরচ ও নিট লাভ হিসাব করুন।
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Weight vs Target Weight progress
  const targetGrams = activeBatch.targetWeightGrams || 2200;
  const currentWeightGrams = summary.latestAvgWeightGrams || 0;
  const currentWeightKg = (currentWeightGrams / 1000).toFixed(2);
  const targetWeightKg = (targetGrams / 1000).toFixed(2);
  const weightProgressPercent = Math.min(100, Math.round((currentWeightGrams / targetGrams) * 100));

  // Find due vaccines for the current age window
  const currentAge = summary.batchAgeDays;
  const dueVaccines = medicines.filter((m) => {
    if (m.endDayAge && m.endDayAge > m.dayAge) {
      return currentAge >= m.dayAge - 1 && currentAge <= m.endDayAge + 1;
    }
    return m.dayAge >= currentAge - 2 && m.dayAge <= currentAge + 2;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Current Active Batch Status Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                activeBatch.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}>
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                {activeBatch.status === 'active' ? 'চলমান সক্রিয় ব্যাচ' : 'আর্কাইভকৃত ব্যাচ'}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                {activeBatch.batchNumber}
              </h1>
              <span className="text-sm font-semibold text-slate-500">({activeBatch.batchName})</span>
            </div>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 flex-wrap font-medium">
              <span>জাত: <strong className="text-slate-800">{activeBatch.birdType}</strong></span>
              <span>•</span>
              <span>শুরুর তারিখ: <strong className="text-slate-800">{formatBnDate(activeBatch.startDate)}</strong></span>
              <span>•</span>
              <span>হ্যাচারি: <strong className="text-slate-800">{activeBatch.supplierName || 'সিপি হ্যাচারি'}</strong></span>
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-start lg:self-center">
            {batches.length > 1 && (
              <select
                value={activeBatch.id}
                onChange={(e) => onSelectBatch(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchNumber} ({b.status === 'active' ? 'চলমান' : 'আর্কাইভ'})
                  </option>
                ))}
              </select>
            )}

            {onRequestArchiveBatch && activeBatch.status === 'active' && (
              <button
                type="button"
                onClick={() => onRequestArchiveBatch(activeBatch.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs transition-all active:scale-95"
                title="ব্যাচ সম্পন্ন ও প্রোফাইলে সংরক্ষণ করুন"
              >
                <span>📦</span>
                <span>ব্যাচ সমাপ্ত ও আর্কাইভ করুন</span>
              </button>
            )}

            <button
              onClick={onOpenNewBatch}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              নতুন ব্যাচ
            </button>
          </div>
        </div>

        {/* 3 Core Header Status Indicators */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Status 1: Total Birds Remaining */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                জীবিত মুরগির সংখ্যা (Remaining Birds)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">
                {toBnNumber(summary.currentLiveBirds)} <span className="text-xs font-bold text-emerald-700">টি</span>
              </div>
              <p className="text-[11px] text-emerald-800/80 mt-1 font-semibold">
                প্রারম্ভিক {toBnNumber(activeBatch.initialChicks)} টির মধ্যে ({toBnNumber(summary.totalMortality)} মৃত, {toBnNumber(summary.totalBirdsSold)} বিক্রি)
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-200/60 text-emerald-800 flex items-center justify-center shrink-0">
              <HeartPulse className="w-5 h-5" />
            </div>
          </div>

          {/* Status 2: Current Age (Days) */}
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
                বর্তমান বয়স (Current Age)
              </span>
              <div className="text-2xl sm:text-3xl font-black text-blue-950 mt-1">
                {toBnNumber(summary.batchAgeDays)} <span className="text-xs font-bold text-blue-700">দিন</span>
              </div>
              <p className="text-[11px] text-blue-800/80 mt-1 font-semibold">
                শুরুর তারিখ: {formatBnDate(activeBatch.startDate)}
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-200/60 text-blue-800 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
          </div>

          {/* Status 3: Current Avg Weight vs Target Weight */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                  গড় ওজন বনাম লক্ষ্য ওজন
                </span>
                <span className="text-xs font-black text-amber-900">
                  {toBnNumber(weightProgressPercent)}%
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                {summary.latestAvgWeightGrams > 0 ? `${toBnNumber(currentWeightKg)} কেজি` : '০ কেজি'}
                <span className="text-xs font-semibold text-slate-500 mx-1.5">/ লক্ষ্য:</span>
                <span className="text-base font-bold text-amber-800">{toBnNumber(targetWeightKg)} কেজি</span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-amber-200/70 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${weightProgressPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-amber-800/90 mt-1 font-medium flex items-center justify-between flex-wrap gap-1">
                <span>সর্বশেষ রেকর্ড: {toBnNumber(currentWeightGrams)} গ্রাম (লক্ষ্য {toBnNumber(targetGrams)} গ্রাম)</span>
                {summary.totalLotWeightKg && summary.totalLotWeightKg > 0 ? (
                  <span className="font-bold text-amber-950 bg-amber-200/60 px-1.5 py-0.5 rounded">
                    লটের মোট: {toBnNumber(summary.totalLotWeightKg)} কেজি ({toBnNumber(summary.totalLotWeightMaund)} মণ)
                  </span>
                ) : null}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Farmer 1-Tap Quick Action Bar */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 sm:p-5 rounded-3xl text-white shadow-lg shadow-emerald-700/20">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h2 className="text-sm sm:text-base font-black">খামারীর দৈনিক কাজ (১-ক্লিকে দ্রুত এন্ট্রি)</h2>
              <p className="text-[11px] text-emerald-100 font-medium">নিচের যেকোনো বাটনে চাপ দিয়ে সরাসরি আপনার খামারের তথ্য লিখুন</p>
            </div>
          </div>
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-xl bg-white/15 text-[11px] font-bold">
            সহজ খামার পরিচালনা
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          {/* Quick Action 1: Weight & Mortality */}
          <button
            type="button"
            onClick={() => onNavigateTab('batch')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-white hover:bg-emerald-50 text-slate-800 transition-all shadow-sm active:scale-95 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Scale className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-xs sm:text-sm font-black text-slate-900 truncate">ওজন ও মৃত্যু মাপুন</div>
              <div className="text-[10px] text-slate-500 truncate">৫টি মুরগি ওজন ও গড়</div>
            </div>
          </button>

          {/* Quick Action 2: Medicine & Vaccines */}
          <button
            type="button"
            onClick={() => onNavigateTab('medicine')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-white hover:bg-emerald-50 text-slate-800 transition-all shadow-sm active:scale-95 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Syringe className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-xs sm:text-sm font-black text-slate-900 truncate">ওষুধ ও টিকা শীট</div>
              <div className="text-[10px] text-slate-500 truncate">সকাল/দুপুর/রাত রুটিন</div>
            </div>
          </button>

          {/* Quick Action 3: Expense & Due */}
          <button
            type="button"
            onClick={() => onNavigateTab('expenses')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-white hover:bg-rose-50 text-slate-800 transition-all shadow-sm active:scale-95 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-xs sm:text-sm font-black text-slate-900 truncate">খরচ বা বাকি লিখুন</div>
              <div className="text-[10px] text-slate-500 truncate">ফিড, বাচ্চা ও বাকি খাতা</div>
            </div>
          </button>

          {/* Quick Action 4: Sales */}
          <button
            type="button"
            onClick={() => onNavigateTab('sales')}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-white hover:bg-teal-50 text-slate-800 transition-all shadow-sm active:scale-95 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="truncate">
              <div className="text-xs sm:text-sm font-black text-slate-900 truncate">মুরগি বিক্রি লিখুন</div>
              <div className="text-[10px] text-slate-500 truncate">পাখি সংখ্যা, ওজন ও দর</div>
            </div>
          </button>
        </div>
      </div>

      {/* 6 Core Required Summary Cards including Current Remaining Due */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* 1. Current Batch Age */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md shadow-blue-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-100 uppercase tracking-wider">বর্তমান বয়স</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black tracking-tight">
              {toBnNumber(summary.batchAgeDays)} <span className="text-lg font-medium">দিন</span>
            </div>
            <p className="text-xs text-blue-100/90 mt-1">
              শুরু: {formatBnDate(activeBatch.startDate)}
            </p>
          </div>
        </div>

        {/* 2. Average Weight & Total Lot Weight */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-md shadow-amber-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-100 uppercase tracking-wider">গড় ও মোট ওজন</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight">
              {summary.latestAvgWeightGrams > 0
                ? `${toBnNumber((summary.latestAvgWeightGrams / 1000).toFixed(2))} কেজি`
                : 'পরিমাপ নেই'}
            </div>
            <p className="text-xs text-amber-100/90 mt-1 font-medium">
              {summary.totalLotWeightKg && summary.totalLotWeightKg > 0
                ? `লটের মোট: ${toBnNumber(summary.totalLotWeightKg)} কেজি (${toBnNumber(summary.totalLotWeightMaund)} মণ)`
                : summary.latestAvgWeightGrams > 0
                ? `${toBnNumber(summary.latestAvgWeightGrams)} গ্রাম প্রতি পাখি`
                : 'ওজন ট্র্যাকিংয়ে রেকর্ড দিন'}
            </p>
          </div>
        </div>

        {/* 3. Total Expenses */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-md shadow-slate-900/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">মোট খরচ (Gross)</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <Receipt className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight">
              {formatTaka(summary.totalExpense)}
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-medium">
              নগদ পরিশোধ: {formatTaka(summary.totalCashPaid)}
            </p>
          </div>
        </div>

        {/* 4. CURRENT REMAINING DUE (এখন কত টাকা বাকি আছে) - Unmissable & Prominent */}
        <div
          onClick={() => onNavigateTab('expenses')}
          className={`cursor-pointer rounded-2xl p-5 text-white shadow-md relative overflow-hidden transition-all hover:scale-[1.02] ${
            summary.currentRemainingDue > 0
              ? 'bg-gradient-to-br from-rose-600 to-red-700 shadow-rose-600/30 ring-2 ring-rose-300 animate-pulse-subtle'
              : 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-600/20 ring-2 ring-emerald-300'
          }`}
          title="বাকি খাতা দেখতে ক্লিক করুন"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-white">এখন বাকি আছে</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {formatTaka(summary.currentRemainingDue)}
            </div>
            <p className="text-[11px] text-white/95 mt-1 font-semibold flex items-center justify-between">
              <span>বাকি দেনা: {formatTaka(summary.totalDueTaken)}</span>
              <span>জমা: {formatTaka(summary.totalDueRepaid)}</span>
            </p>
          </div>
        </div>

        {/* 5. Total Revenue */}
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-5 text-white shadow-md shadow-teal-500/20 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-100 uppercase tracking-wider">মোট বিক্রি (Revenue)</span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight">
              {formatTaka(summary.totalRevenue)}
            </div>
            <p className="text-xs text-teal-100/90 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              {toBnNumber(summary.totalBirdsSold)} টি পাখি বিক্রি হয়েছে
            </p>
          </div>
        </div>

        {/* 6. Net Profit / Loss (Auto calculated) */}
        <div
          className={`rounded-2xl p-5 text-white shadow-md relative overflow-hidden ${
            summary.isProfitable
              ? 'bg-gradient-to-br from-emerald-600 to-green-700 shadow-emerald-600/25 ring-2 ring-emerald-400/40'
              : 'bg-gradient-to-br from-red-600 to-rose-700 shadow-red-600/25 ring-2 ring-red-400/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">
              {summary.isProfitable ? 'নিট লাভ (Profit)' : 'চলমান ঘাটতি'}
            </span>
            <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black tracking-tight">
              {formatTaka(Math.abs(summary.netProfit))}
            </div>
            <p className="text-xs text-white/90 mt-1 font-semibold flex items-center gap-1">
              {summary.isProfitable ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  লাভজনক ({toBnNumber(summary.profitMarginPercent.toFixed(1))}%)
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  পূর্ণ বিক্রির পর লাভ আসবে
                </>
              )}
            </p>
          </div>
        </div>

      </div>

      {/* Prominent Due Alert Card on Dashboard if due exists */}
      {summary.currentRemainingDue > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-rose-50 border-2 border-rose-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <AlertCircle className="w-6 h-6 text-rose-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-rose-700">বকেয়া দেনা অ্যালার্ট</span>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-rose-200 text-rose-900 rounded-md">অবশিষ্ট পরিশোধযোগ্য</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                এখন মোট বাকি আছে: <span className="text-rose-600 underline decoration-rose-300">{formatTaka(summary.currentRemainingDue)}</span>
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                দোকান বা ডিলার থেকে মূল বাকি নেওয়া হয়েছিল <strong>{formatTaka(summary.totalDueTaken)}</strong> • এ পর্যন্ত জমা দিয়েছেন <strong>{formatTaka(summary.totalDueRepaid)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('expenses')}
            className="self-start sm:self-center px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all whitespace-nowrap active:scale-95"
          >
            বাকি ও জমার খাতা দেখুন →
          </button>
        </div>
      )}

      {/* Secondary Quick Metrics: Live Birds, Mortality, Feed, Sold */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <HeartPulse className="w-4 h-4 text-emerald-500" />
            বর্তমান জীবিত মুরগি
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800">
            {toBnNumber(summary.currentLiveBirds)} <span className="text-xs font-normal text-slate-500">টি</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            প্রারম্ভিক {toBnNumber(activeBatch.initialChicks)} টির মধ্যে
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            মৃত্যুর হার (Mortality)
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800">
            {toBnNumber(summary.mortalityRatePercent.toFixed(1))}%
          </div>
          <p className="text-[11px] text-rose-500 font-medium mt-0.5">
            মোট মৃত: {toBnNumber(summary.totalMortality)} টি
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <Package className="w-4 h-4 text-amber-500" />
            মোট খাবার গ্রহণ
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800">
            {toBnNumber(summary.totalFeedConsumedKg)} <span className="text-xs font-normal text-slate-500">কেজি</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {toBnNumber((summary.totalFeedConsumedKg / 50).toFixed(1))} বস্তা (৫০ কেজি)
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold mb-1">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            মোট বিক্রিত মুরগি
          </div>
          <div className="text-xl sm:text-2xl font-bold text-slate-800">
            {toBnNumber(summary.totalBirdsSold)} <span className="text-xs font-normal text-slate-500">টি</span>
          </div>
          <p className="text-[11px] text-teal-600 font-medium mt-0.5">
            মোট {toBnNumber(summary.totalWeightSoldKg)} কেজি ওজন
          </p>
        </div>

      </div>

      {/* Main Grid: Medicine Alerts + Quick Action Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Medicine & Vaccine Alert Column */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Syringe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">ওষুধ ও ভ্যাকসিন সতর্কবার্তা</h3>
                <p className="text-xs text-slate-500">
                  বর্তমান বয়স ({toBnNumber(summary.batchAgeDays)} দিন) অনুযায়ী প্রয়োজনীয় টিকা
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('medicine')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              পুরো সূচি দেখুন →
            </button>
          </div>

          {dueVaccines.length === 0 ? (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-100">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                এই মুহূর্তে কোনো জরুরি টিকা বা ওষুধের অ্যালার্ট নেই
              </p>
              <p className="text-xs text-slate-400 mt-1">
                পরবর্তী টিকার তারিখ দেখতে সম্পূর্ণ ওষুধ ও টিকাদান তালিকায় যান।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dueVaccines.map((med) => {
                const isDueToday = med.dayAge === currentAge;
                const isOverdue = med.dayAge < currentAge && med.status === 'pending';
                const isCompleted = med.status === 'completed';

                return (
                  <div
                    key={med.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isCompleted
                        ? 'bg-slate-50/60 border-slate-200 opacity-80'
                        : isDueToday
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/30'
                        : isOverdue
                        ? 'bg-amber-50/70 border-amber-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : isDueToday
                              ? 'bg-emerald-600 text-white animate-pulse'
                              : isOverdue
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {med.endDayAge && med.endDayAge > med.dayAge
                            ? `${toBnNumber(med.dayAge)}-${toBnNumber(med.endDayAge)}তম দিন`
                            : `${toBnNumber(med.dayAge)}তম দিন`}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{med.medicineName}</h4>
                      </div>
                      <p className="text-xs text-rose-700 font-semibold">
                        <strong>রোগের লক্ষণ:</strong> {med.symptoms || med.purpose}
                      </p>
                      <p className="text-xs text-slate-600">
                        <strong>কখন ও কীভাবে:</strong> {med.timingAndDosage || med.dosage}
                      </p>
                    </div>

                    <button
                      onClick={() => onToggleMedicine(med.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                      }`}
                    >
                      {isCompleted ? '✓ সম্পন্ন হয়েছে' : 'সম্পন্ন মার্ক করুন'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions Shortcuts */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
            <h3 className="font-bold text-slate-900 text-base mb-3 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              দ্রুত এন্ট্রি ও নেভিগেশন
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => onNavigateTab('expenses')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-rose-50 hover:border-rose-200 border border-slate-200 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">নতুন খরচ যোগ করুন</p>
                    <p className="text-[11px] text-slate-500">ফিড, বাচ্চা, ওষুধ বা অন্যান্য খরচ</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-rose-600">লিখুন +</span>
              </button>

              <button
                onClick={() => onNavigateTab('sales')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">বিক্রির হিসাব যোগ করুন</p>
                    <p className="text-[11px] text-slate-500">পাখির সংখ্যা, ওজন ও কেজি দর</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600">বিক্রি +</span>
              </button>

              <button
                onClick={() => onNavigateTab('batch')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">দৈনিক ওজন ও বৃদ্ধি রেকর্ড</p>
                    <p className="text-[11px] text-slate-500">প্রতিদিনের গড় ওজন ও মৃত্যুর সংখ্যা</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-600">ওজন +</span>
              </button>

              <button
                onClick={() => onNavigateTab('reports')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">হিসাব বিবরণী ও প্রিন্ট</p>
                    <p className="text-[11px] text-slate-500">পূর্ণ লাভ-ক্ষতি রিপোর্ট প্রিন্ট/রপ্তানি</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-indigo-600">রিপোর্ট →</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Activity: Expenses & Sales Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Recent Expenses */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-rose-600" />
              সাম্প্রতিক খরচসমূহ
            </h3>
            <button
              onClick={() => onNavigateTab('expenses')}
              className="text-xs font-bold text-slate-500 hover:text-rose-600"
            >
              সব দেখুন →
            </button>
          </div>

          {recentExpenses.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">এখনও কোনো খরচ নথিভুক্ত হয়নি</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentExpenses.slice(0, 4).map((exp) => (
                <div key={exp.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{exp.category}</span>
                      <span className="text-[10px] text-slate-400">{formatBnDate(exp.date)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate max-w-[200px] sm:max-w-xs">{exp.note}</p>
                  </div>
                  <span className="font-black text-rose-600 text-sm">{formatTaka(exp.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Sales */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              সাম্প্রতিক বিক্রয়সমূহ
            </h3>
            <button
              onClick={() => onNavigateTab('sales')}
              className="text-xs font-bold text-slate-500 hover:text-emerald-600"
            >
              সব দেখুন →
            </button>
          </div>

          {recentSales.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">এখনও কোনো বিক্রির হিসাব নেই</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentSales.slice(0, 4).map((sale) => (
                <div key={sale.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{sale.buyerName}</span>
                      <span className="text-[10px] text-slate-400">{formatBnDate(sale.saleDate)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {toBnNumber(sale.birdsSoldCount)} টি পাখি • {toBnNumber(sale.totalWeightKg)} কেজি • দর {formatTaka(sale.pricePerKg)}
                    </p>
                  </div>
                  <span className="font-black text-emerald-600 text-sm">{formatTaka(sale.totalAmount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
