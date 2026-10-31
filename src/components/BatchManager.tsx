import React, { useState } from 'react';
import {
  Layers,
  Scale,
  Calendar,
  AlertCircle,
  PlusCircle,
  Trash2,
  TrendingUp,
  Package,
  Activity,
  CheckCircle2,
  Clock,
  Calculator,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Batch, GrowthRecord, SaleRecord } from '../types';
import {
  calculateBatchAgeDays,
  formatBnDate,
  formatMaund,
  formatWeight,
  getTodayDateString,
  toBnNumber
} from '../utils/formatters';

interface BatchManagerProps {
  activeBatch: Batch | null;
  batches: Batch[];
  growthRecords: GrowthRecord[];
  sales?: SaleRecord[];
  onSelectBatch: (batchId: string) => void;
  onOpenNewBatchModal: () => void;
  onAddGrowthRecord: (record: Omit<GrowthRecord, 'id' | 'batchId' | 'userId'>) => void;
  onDeleteGrowthRecord: (recordId: string) => void;
  onToggleBatchStatus: (batchId: string, currentStatus: 'active' | 'completed') => void;
  onDeleteBatch: (batchId: string) => void;
  onRequestArchiveBatch?: (batchId: string) => void;
  onNavigateToHistory?: () => void;
}

export const BatchManager: React.FC<BatchManagerProps> = ({
  activeBatch,
  batches,
  growthRecords,
  sales,
  onSelectBatch,
  onOpenNewBatchModal,
  onAddGrowthRecord,
  onDeleteGrowthRecord,
  onToggleBatchStatus,
  onDeleteBatch,
  onRequestArchiveBatch,
  onNavigateToHistory
}) => {
  const [showAddModal, setShowAddModal] = useState(false);

  // Modal Form States (Exclusively 5 or 10 bird sample weighing)
  const [date, setDate] = useState(getTodayDateString());
  const [customDayAge, setCustomDayAge] = useState<string>('');
  const [sampleBirdsCount, setSampleBirdsCount] = useState<'5' | '10'>('5');
  const [sampleTotalWeight, setSampleTotalWeight] = useState<string>('');
  const [sampleWeightUnit, setSampleWeightUnit] = useState<'kg' | 'gram'>('kg');
  const [dailyMortality, setDailyMortality] = useState<string>('0');
  const [feedIntakeKg, setFeedIntakeKg] = useState<string>('');
  const [notes, setNotes] = useState('');

  // Quick Top Calculator States (Strictly 5 or 10 bird sample weighing)
  const [quickBirdsCount, setQuickBirdsCount] = useState<'5' | '10'>('5');
  const [quickWeightKg, setQuickWeightKg] = useState<string>('');
  const [quickAgeDays, setQuickAgeDays] = useState<string>('');

  if (!activeBatch) {
    return (
      <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-8">
        <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">কোনো ব্যাচ নির্বাচন করা নেই</h3>
        <p className="text-sm text-slate-500 mb-4">অনুগ্রহ করে একটি নতুন ব্যাচ তৈরি করুন।</p>
        <button
          onClick={onOpenNewBatchModal}
          className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700"
        >
          নতুন ব্যাচ শুরু করুন
        </button>
      </div>
    );
  }

  const currentAge = calculateBatchAgeDays(activeBatch.startDate);
  const totalMortality = growthRecords.reduce((sum, g) => sum + (g.dailyMortality || 0), 0);
  const totalBirdsSold = sales ? sales.reduce((sum, s) => sum + (s.birdsSoldCount || 0), 0) : 0;
  const currentLive = Math.max(0, activeBatch.initialChicks - totalMortality - totalBirdsSold);
  const latestRecord = growthRecords.length > 0 ? growthRecords[growthRecords.length - 1] : null;
  const latestAvgWeightGrams = latestRecord ? latestRecord.avgWeightGrams : 0;
  const latestLotWeightKg =
    currentLive > 0 && latestAvgWeightGrams > 0
      ? parseFloat(((currentLive * latestAvgWeightGrams) / 1000).toFixed(1))
      : 0;

  // Initialize dayAge when modal opens or date changes
  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    const calculatedAge = calculateBatchAgeDays(newDate);
    setCustomDayAge(calculatedAge.toString());
  };

  const handleOpenAddModal = (presetSampleKg?: string, presetBirds?: '5' | '10' | string, presetAge?: string) => {
    const today = getTodayDateString();
    setDate(today);
    const todayAge = calculateBatchAgeDays(today);
    setCustomDayAge(presetAge || todayAge.toString());
    setSampleBirdsCount(presetBirds === '10' ? '10' : '5');
    setSampleTotalWeight(presetSampleKg || '');
    setSampleWeightUnit('kg');
    setDailyMortality('0');
    setFeedIntakeKg('');
    setNotes('');
    setShowAddModal(true);
  };

  // Calculations for Modal (strictly 5 or 10 birds)
  const parsedSampleCount = sampleBirdsCount === '10' ? 10 : 5;
  const rawSampleWeight = parseFloat(sampleTotalWeight) || 0;
  const parsedSampleWeightKg = sampleWeightUnit === 'kg' ? rawSampleWeight : rawSampleWeight / 1000;
  
  const modalCalculatedAvgGrams =
    parsedSampleWeightKg > 0
      ? Math.round((parsedSampleWeightKg * 1000) / parsedSampleCount)
      : 0;

  const modalCalculatedAvgKg = modalCalculatedAvgGrams > 0 ? (modalCalculatedAvgGrams / 1000).toFixed(2) : '০.০০';
  const modalLotWeightKg =
    currentLive > 0 && modalCalculatedAvgGrams > 0
      ? parseFloat(((currentLive * modalCalculatedAvgGrams) / 1000).toFixed(1))
      : 0;
  const modalLotWeightMaund = parseFloat((modalLotWeightKg / 40).toFixed(2));

  // Calculations for Quick Bar (strictly 5 or 10 birds)
  const qCount = quickBirdsCount === '10' ? 10 : 5;
  const qWeightKg = parseFloat(quickWeightKg) || 0;
  const qAvgGrams = qWeightKg > 0 ? Math.round((qWeightKg * 1000) / qCount) : 0;
  const qAvgKg = qAvgGrams > 0 ? (qAvgGrams / 1000).toFixed(2) : '০.০০';
  const qLotKg = currentLive > 0 && qAvgGrams > 0 ? parseFloat(((currentLive * qAvgGrams) / 1000).toFixed(1)) : 0;
  const qLotMaund = parseFloat((qLotKg / 40).toFixed(2));

  const handleSubmitGrowth = (e: React.FormEvent) => {
    e.preventDefault();
    const mortNum = parseInt(dailyMortality, 10) || 0;
    const feedNum = parseFloat(feedIntakeKg) || 0;

    // Use the explicit age user wrote or fall back to date calculation
    const recordedAge = parseInt(customDayAge, 10) || calculateBatchAgeDays(date);

    onAddGrowthRecord({
      date,
      dayAge: recordedAge,
      avgWeightGrams: modalCalculatedAvgGrams,
      dailyMortality: mortNum,
      feedIntakeKg: feedNum,
      notes: notes.trim(),
      sampleBirdsCount: parsedSampleCount,
      sampleTotalWeightKg: parsedSampleWeightKg > 0 ? parsedSampleWeightKg : undefined,
      lotTotalWeightKg: modalLotWeightKg > 0 ? modalLotWeightKg : undefined,
      lotTotalWeightMaund: modalLotWeightMaund > 0 ? modalLotWeightMaund : undefined
    });

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Batch Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">ব্যাচ ও ওজন ট্র্যাকার (Growth Log)</h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                activeBatch.status === 'active'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {activeBatch.status === 'active' ? 'চলমান ব্যাচ' : 'সম্পন্ন ব্যাচ'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            ৫ মুরগির স্যাম্পল স্কেল মেপে স্বয়ংক্রিয় গড় ওজন ও লটের সমস্ত মুরগির মোট ওজন বের করুন।
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeBatch.status === 'active' ? (
            <button
              onClick={() =>
                onRequestArchiveBatch
                  ? onRequestArchiveBatch(activeBatch.id)
                  : onToggleBatchStatus(activeBatch.id, activeBatch.status)
              }
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 shadow-2xs active:scale-95"
              title="ব্যাচ সমাপ্ত করুন ও প্রোফাইল আর্কাইভে সংরক্ষণ করুন"
            >
              <span>📦</span>
              <span>ব্যাচ সমাপ্ত ও আর্কাইভ</span>
            </button>
          ) : (
            <button
              onClick={() => onToggleBatchStatus(activeBatch.id, activeBatch.status)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
            >
              পুনরায় সক্রিয় করুন
            </button>
          )}

          {onNavigateToHistory && (
            <button
              onClick={onNavigateToHistory}
              className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100"
            >
              আগের ব্যাচসমূহ →
            </button>
          )}

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            নতুন ওজন ও বৃদ্ধি যোগ করুন
          </button>
        </div>
      </div>

      {/* 5 Key Parameters Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4">
        {/* 1. Age */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-500" /> বর্তমান বয়স (দিন)
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {toBnNumber(currentAge)} <span className="text-xs font-normal text-slate-500">দিন</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
            শুরু: {formatBnDate(activeBatch.startDate)}
          </p>
        </div>

        {/* 2. Latest Average Weight */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-amber-500" /> সর্বশেষ গড় ওজন
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {latestAvgWeightGrams > 0 ? `${toBnNumber(latestAvgWeightGrams)} গ্রাম` : '০ গ্রাম'}
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-0.5">
            লক্ষ্যমাত্রা: {toBnNumber(activeBatch.targetWeightGrams)} গ্রাম
          </p>
        </div>

        {/* 3. Total Lot Weight Biomass (NEW) */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/80 p-4 rounded-2xl border border-emerald-200/90 shadow-2xs">
          <span className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-600" /> লটের মোট ওজন (বায়োমাস)
          </span>
          <div className="text-2xl font-black text-emerald-950 mt-1">
            {latestLotWeightKg > 0 ? `${toBnNumber(latestLotWeightKg)} কেজি` : '০ কেজি'}
          </div>
          <p className="text-[11px] text-emerald-700 font-bold mt-0.5">
            {latestLotWeightKg > 0 ? `~ ${formatMaund(latestLotWeightKg)}` : '০ মণ'}
          </p>
        </div>

        {/* 4. Live Birds */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-blue-500" /> জীবিত মুরগি
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {toBnNumber(currentLive)} <span className="text-xs font-normal text-slate-500">টি</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            মূল বাচ্চা: {toBnNumber(activeBatch.initialChicks)} টি
          </p>
        </div>

        {/* 5. Mortality */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs col-span-2 md:col-span-1">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-500" /> মোট মৃত্যু
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {toBnNumber(totalMortality)} <span className="text-xs font-normal text-slate-500">টি</span>
          </div>
          <p className="text-[11px] text-rose-500 font-medium mt-0.5">
            হার: {toBnNumber(((totalMortality / activeBatch.initialChicks) * 100).toFixed(1))}%
          </p>
        </div>
      </div>

      {/* QUICK 5-BIRD SCALE & LOT BIOMASS CALCULATOR (তাৎক্ষণিক ৫-মুরগি ওজন ও লট ক্যালকুলেটর) */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-5 sm:p-6 text-white shadow-lg shadow-emerald-700/15">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/20">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                <Calculator className="w-4 h-4 text-white" />
              </span>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                তাৎক্ষণিক ৫-মুরগি স্যাম্পল ওজন ও লট ক্যালকুলেটর
              </h3>
            </div>
            <p className="text-xs text-emerald-100 mt-1">
              একবারে ৫টি মুরগি পাল্লায় বা স্কেলে মাপুন। ওজন লিখলেই স্বয়ংক্রিয়ভাবে গড় ওজন ও পুরো লটের মোট ওজন বের হবে।
            </p>
          </div>
          <span className="text-xs bg-white/20 text-white font-bold px-3 py-1 rounded-full self-start lg:self-center">
            লটে বর্তমানে জীবিত: {toBnNumber(currentLive)} টি মুরগি
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Quick Input: Sample Birds (Strictly 5 or 10 only) */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-emerald-100 mb-1">
              স্যাম্পল মুরগির সংখ্যা *
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-black/20 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setQuickBirdsCount('5')}
                className={`py-1.5 rounded-lg text-xs font-black transition-all ${
                  quickBirdsCount === '5'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
              >
                ৫টি মুরগি
              </button>
              <button
                type="button"
                onClick={() => setQuickBirdsCount('10')}
                className={`py-1.5 rounded-lg text-xs font-black transition-all ${
                  quickBirdsCount === '10'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-emerald-100 hover:bg-white/10'
                }`}
              >
                ১০টি মুরগি
              </button>
            </div>
          </div>

          {/* Quick Input: Combined Weight in Kg */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-bold text-emerald-100 mb-1">
              {toBnNumber(quickBirdsCount)}টি মুরগির মোট ওজন (কেজি) *
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={quickWeightKg}
              onChange={(e) => setQuickWeightKg(e.target.value)}
              placeholder={quickBirdsCount === '5' ? 'যেমন: ৮.৭৫' : 'যেমন: ১৭.৫০'}
              className="w-full bg-white text-slate-900 font-black text-sm px-3 py-2 rounded-xl outline-none shadow-inner"
            />
          </div>

          {/* Quick Input: Age in Days */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-emerald-100 mb-1">
              পরিমাপের বয়স (দিন)
            </label>
            <input
              type="number"
              min="1"
              value={quickAgeDays || currentAge.toString()}
              onChange={(e) => setQuickAgeDays(e.target.value)}
              placeholder={currentAge.toString()}
              className="w-full bg-white text-slate-900 font-black text-sm px-3 py-2 rounded-xl outline-none shadow-inner"
            />
          </div>

          {/* Live Auto-Calculated Output Display */}
          <div className="md:col-span-4 bg-white/15 backdrop-blur-md rounded-2xl p-3.5 border border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-left w-full sm:w-auto">
              <span className="text-[10px] uppercase font-bold text-emerald-100 block">
                🎯 প্রতিটি মুরগির গড় ওজন
              </span>
              <div className="text-lg font-black text-white">
                {qAvgGrams > 0 ? `${toBnNumber(qAvgKg)} কেজি (${toBnNumber(qAvgGrams)} গ্রাম)` : '০.০০ কেজি'}
              </div>
              <div className="text-xs font-semibold text-emerald-200 mt-0.5">
                লটের মোট মুরগির ওজন: <strong className="text-white">{toBnNumber(qLotKg)} কেজি</strong> ({toBnNumber(qLotMaund)} মণ)
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleOpenAddModal(quickWeightKg, quickBirdsCount, quickAgeDays || currentAge.toString())}
              disabled={qAvgGrams <= 0}
              className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-black text-xs hover:bg-emerald-50 transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>শিটে সেভ করুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Weight Progression Bar Chart */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <h3 className="font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          ওজন বৃদ্ধির মাইলফলক ও অগ্রগতি (Weight Progress)
        </h3>

        {growthRecords.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Scale className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-600">কোনো ওজনের রেকর্ড পাওয়া যায়নি</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              উপরের ক্যালকুলেটর বা "নতুন ওজন ও বৃদ্ধি যোগ করুন" বাটনে ক্লিক করে ১ম ওজন নথিভুক্ত করুন।
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {growthRecords.map((r) => {
                const maxWeight = Math.max(2500, activeBatch.targetWeightGrams || 2000);
                const percent = Math.min(100, Math.round((r.avgWeightGrams / maxWeight) * 100));

                return (
                  <div
                    key={r.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 hover:border-emerald-300 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="bg-emerald-100/70 text-emerald-900 px-1.5 py-0.5 rounded">
                          {toBnNumber(r.dayAge)} দিন
                        </span>
                        <span className="text-[10px] text-slate-400">{formatBnDate(r.date).split(',')[0]}</span>
                      </div>
                      <div className="text-base font-black text-emerald-700 mt-1.5">
                        {toBnNumber(r.avgWeightGrams)} <span className="text-[10px] font-normal">গ্রাম</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-500 flex flex-col gap-0.5">
                      {r.lotTotalWeightKg ? (
                        <span className="text-emerald-800 font-bold">
                          লট: {toBnNumber(r.lotTotalWeightKg)}কেজি
                        </span>
                      ) : null}
                      <div className="flex justify-between text-slate-400">
                        <span>মৃত্যু: {toBnNumber(r.dailyMortality)}</span>
                        <span>খাবার: {toBnNumber(r.feedIntakeKg)}কেজি</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Growth History Sheet Table (ওজন ও বৃদ্ধির বিস্তারিত খাতা) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base">দৈনিক বৃদ্ধি ও ওজন পরিমাপ লগ শিট</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              প্রতিটি পরিমাপের স্যাম্পল ওজন, গড় ওজন এবং ঐ তারিখে লটের মোট মুরগির ওজন সংরক্ষণ করা থাকে।
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-full self-start sm:self-auto">
            মোট পরিমাপ: {toBnNumber(growthRecords.length)} টি
          </span>
        </div>

        {growthRecords.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-400">কোনো রেকর্ড নেই</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">তারিখ</th>
                  <th className="py-3 px-4">পরিমাপের বয়স (দিন)</th>
                  <th className="py-3 px-4">স্যাম্পল মাপ (মুরগি)</th>
                  <th className="py-3 px-4">মুরগির গড় ওজন</th>
                  <th className="py-3 px-4">লটের মোট মুরগির ওজন</th>
                  <th className="py-3 px-4">ঐ দিনের মৃত্যু</th>
                  <th className="py-3 px-4">খাবার গ্রহণ</th>
                  <th className="py-3 px-4">মন্তব্য</th>
                  <th className="py-3 px-4 text-right">মুছে ফেলুন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {growthRecords.map((r) => {
                  const lotKg = r.lotTotalWeightKg || (currentLive > 0 ? parseFloat(((currentLive * r.avgWeightGrams) / 1000).toFixed(1)) : 0);
                  const lotMaund = r.lotTotalWeightMaund || (lotKg > 0 ? parseFloat((lotKg / 40).toFixed(2)) : 0);

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {formatBnDate(r.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-black inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {toBnNumber(r.dayAge)} দিন বয়সে
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {r.sampleTotalWeightKg ? (
                          <div className="font-bold text-slate-800">
                            <span>{toBnNumber(r.sampleTotalWeightKg)} কেজি</span>
                            <span className="text-[11px] text-slate-500 font-normal block">
                              ({toBnNumber(r.sampleBirdsCount || 5)}টি মুরগির স্যাম্পল)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">সরাসরি মাপ</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-black text-emerald-700 text-sm">
                        {formatWeight(r.avgWeightGrams)}
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900">
                        {lotKg > 0 ? (
                          <div>
                            <span className="text-emerald-900">{toBnNumber(lotKg)} কেজি</span>
                            <span className="text-[11px] text-emerald-700 font-bold block">
                              (~ {toBnNumber(lotMaund)} মণ)
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {r.dailyMortality > 0 ? (
                          <span className="text-rose-600 font-bold">{toBnNumber(r.dailyMortality)} টি</span>
                        ) : (
                          <span className="text-slate-400">০</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {r.feedIntakeKg > 0 ? `${toBnNumber(r.feedIntakeKg)} কেজি` : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 italic max-w-xs truncate">
                        {r.notes || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => onDeleteGrowthRecord(r.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                          title="মুছে ফেলুন"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Growth & Sample Scale Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Scale className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">ওজন ও বৃদ্ধির রেকর্ড লিখুন</h3>
                  <p className="text-xs text-slate-500">স্যাম্পল ওজন দিলে গড় ও মোট ওজন অটো হিসাব হবে</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitGrowth} className="space-y-4">
              {/* Date & Explicit Day Age Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    তারিখ *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-blue-900 mb-1 flex items-center gap-1">
                    <span>কত দিন বয়সে মাপ দিছেন? (দিন) *</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="যেমন: ২১"
                      value={customDayAge}
                      onChange={(e) => setCustomDayAge(e.target.value)}
                      className="w-full text-xs font-black px-3 py-2 bg-blue-50/50 border border-blue-300 text-blue-950 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="absolute right-3 top-2 text-xs font-bold text-blue-600">দিন</span>
                  </div>
                </div>
              </div>

              {/* Sample Weighing Block (Exclusively 5 or 10 birds) */}
              <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200/90 space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-start">
                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1.5">
                      স্যাম্পল মুরগির সংখ্যা *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSampleBirdsCount('5')}
                        className={`py-2 px-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 border ${
                          sampleBirdsCount === '5'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span>৫টি মুরগি</span>
                        {sampleBirdsCount === '5' && (
                          <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded">✓</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSampleBirdsCount('10')}
                        className={`py-2 px-2.5 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 border ${
                          sampleBirdsCount === '10'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span>১০টি মুরগি</span>
                        {sampleBirdsCount === '10' && (
                          <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded">✓</span>
                        )}
                      </button>
                    </div>
                    <span className="text-[10px] text-emerald-800 font-semibold mt-1 block">
                      * স্যাম্পল ৫টি বা ১০টি মুরগিতে অটো সেট করা
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-emerald-950">
                        {toBnNumber(sampleBirdsCount)}টি মুরগির মোট ওজন *
                      </label>
                      <div className="flex items-center gap-1 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setSampleWeightUnit('kg')}
                          className={`px-2 py-0.5 rounded ${
                            sampleWeightUnit === 'kg'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          কেজি
                        </button>
                        <button
                          type="button"
                          onClick={() => setSampleWeightUnit('gram')}
                          className={`px-2 py-0.5 rounded ${
                            sampleWeightUnit === 'gram'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          গ্রাম
                        </button>
                      </div>
                    </div>
                    <input
                      type="number"
                      required
                      step="any"
                      min="0.01"
                      value={sampleTotalWeight}
                      onChange={(e) => setSampleTotalWeight(e.target.value)}
                      placeholder={sampleWeightUnit === 'kg' ? (sampleBirdsCount === '5' ? 'যেমন: ৮.৭৫' : 'যেমন: ১৭.৫০') : (sampleBirdsCount === '5' ? 'যেমন: ৮৭৫০' : 'যেমন: ১৭৫০০')}
                      className="w-full text-xs font-black px-3 py-2 bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <span className="text-[10px] text-emerald-700 mt-0.5 block">
                      স্কেলে প্রদর্শিত {toBnNumber(sampleBirdsCount)}টি মুরগির মোট ওজন লিখুন
                    </span>
                  </div>
                </div>

                {/* Realtime Calculation Card */}
                <div className="bg-white p-3.5 rounded-xl border border-emerald-300 shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>🎯 প্রতিটি মুরগির স্বয়ংক্রিয় গড় ওজন:</span>
                    <span className="text-emerald-700 font-black text-sm">
                      {modalCalculatedAvgGrams > 0
                        ? `${toBnNumber(modalCalculatedAvgKg)} কেজি (${toBnNumber(modalCalculatedAvgGrams)} গ্রাম)`
                        : '০ গ্রাম'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pt-1.5 border-t border-slate-100">
                    <span>⚖️ লটের {toBnNumber(currentLive)} টি জীবিত মুরগির মোট ওজন:</span>
                    <span className="text-slate-900 font-black text-sm">
                      {modalLotWeightKg > 0
                        ? `${toBnNumber(modalLotWeightKg)} কেজি (~${toBnNumber(modalLotWeightMaund)} মণ)`
                        : '০ কেজি'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mortality and Feed */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    আজকের মৃত্যু সংখ্যা (টি)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={dailyMortality}
                    onChange={(e) => setDailyMortality(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    আজকের খাবার গ্রহণ (কেজি)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="যেমন: ৫০"
                    value={feedIntakeKg}
                    onChange={(e) => setFeedIntakeKg(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মন্তব্য (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="যেমন: বাচ্চার স্বাস্থ্য ও খাবারের রুচি ভালো"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={modalCalculatedAvgGrams <= 0}
                  className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  শিটে সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
