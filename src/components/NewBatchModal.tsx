import React, { useState } from 'react';
import { Layers, Calendar, PlusCircle, Scale, Building, DollarSign, Info } from 'lucide-react';
import { Batch, BirdType } from '../types';
import { getTodayDateString, toBnNumber } from '../utils/formatters';

interface NewBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (batchData: Omit<Batch, 'id' | 'userId' | 'createdAt'>, routineSource?: string) => void;
  existingBatchCount: number;
  previousBatches?: Batch[];
  hasSavedTemplate?: boolean;
}

export const NewBatchModal: React.FC<NewBatchModalProps> = ({
  isOpen,
  onClose,
  onSaveBatch,
  existingBatchCount,
  previousBatches = [],
  hasSavedTemplate = false
}) => {
  const [batchNumber, setBatchNumber] = useState(`Batch ${existingBatchCount + 1 > 9 ? existingBatchCount + 1 : '0' + (existingBatchCount + 1)} - Broiler`);
  const [batchName, setBatchName] = useState('কপ ৫০০ ব্রয়লার লট');
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [birdType, setBirdType] = useState<BirdType>('ব্রয়লার');
  const [initialChicks, setInitialChicks] = useState('1500');
  const [chickPricePerUnit, setChickPricePerUnit] = useState('48');
  const [supplierName, setSupplierName] = useState('সিপি বাংলাদেশ হ্যাচারি');
  
  // Target Weight input support: user can enter e.g. 2.5 (Kg)
  const [targetWeightInput, setTargetWeightInput] = useState('2.5');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'grams'>('kg');
  const [notes, setNotes] = useState('');
  const [routineSource, setRoutineSource] = useState<string>('__auto__');

  if (!isOpen) return null;

  // Calculate target grams
  const parsedWeight = parseFloat(targetWeightInput) || 0;
  const targetGrams = weightUnit === 'kg' ? Math.round(parsedWeight * 1000) : Math.round(parsedWeight);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chicksCount = parseInt(initialChicks, 10) || 100;
    const chickPrice = parseFloat(chickPricePerUnit) || 0;

    onSaveBatch(
      {
        batchNumber: batchNumber.trim(),
        batchName: batchName.trim(),
        startDate,
        birdType,
        initialChicks: chicksCount,
        chickPricePerUnit: chickPrice,
        supplierName: supplierName.trim(),
        targetWeightGrams: targetGrams || 2200,
        status: 'active',
        notes: notes.trim()
      },
      routineSource
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">নতুন পোল্ট্রি ব্যাচ শুরু করুন</h3>
              <p className="text-[11px] text-slate-500">আপনার ইচ্ছেমতো যেকোনো সংখ্যায় মুরগি ও লক্ষ্যমাত্রা নির্ধারণ করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Batch ID / Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ব্যাচ আইডি বা কোড (Batch Name/ID) *
              </label>
              <input
                type="text"
                required
                placeholder="যেমন: Batch 05 - Broiler"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ব্যাচের নাম বা বিবরণ
              </label>
              <input
                type="text"
                placeholder="যেমন: ব্রয়লার লট-৫ / শেড নং ২"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* 2. Number of Chicks inserted & Bird Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  বাচ্চার সংখ্যা (যত খুশি মুরগি বসানোর সুযোগ) *
                </label>
              </div>
              <input
                type="number"
                min="1"
                required
                placeholder="যেমন: ১৫০০ বা ৫০০০"
                value={initialChicks}
                onChange={(e) => setInitialChicks(e.target.value)}
                className="w-full text-xs font-black px-3 py-2 border border-emerald-300 bg-emerald-50/30 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-950"
              />
              <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                <Info className="w-3 h-3 text-emerald-600" />
                ১০০ থেকে ৫০,০০০+ যেকোনো সংখ্যক মুরগি বসাতে পারেন।
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পাখির জাত *</label>
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

          {/* 3. Target Weight per bird (e.g. 2.5 kg) */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-600" />
                প্রতি মুরগির লক্ষ্যমাত্রা গড় ওজন (Target Weight) *
              </label>
              <div className="flex rounded-lg border border-slate-300 overflow-hidden text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    if (weightUnit === 'grams') {
                      setTargetWeightInput((parsedWeight / 1000).toFixed(2));
                    }
                    setWeightUnit('kg');
                  }}
                  className={`px-2 py-0.5 ${weightUnit === 'kg' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600'}`}
                >
                  কেজি (kg)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (weightUnit === 'kg') {
                      setTargetWeightInput((parsedWeight * 1000).toString());
                    }
                    setWeightUnit('grams');
                  }}
                  className={`px-2 py-0.5 ${weightUnit === 'grams' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600'}`}
                >
                  গ্রাম (g)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                step="any"
                min="0.1"
                required
                placeholder={weightUnit === 'kg' ? 'যেমন: ২.৫' : 'যেমন: ২৫০০'}
                value={targetWeightInput}
                onChange={(e) => setTargetWeightInput(e.target.value)}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white"
              />
              <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
                {weightUnit === 'kg' ? 'কেজি' : 'গ্রাম'}
              </span>
            </div>

            <p className="text-[11px] text-amber-700 font-semibold mt-1.5">
              হিসাবকৃত লক্ষ্য ওজন: {weightUnit === 'kg' ? `${toBnNumber(targetWeightInput)} কেজি (${toBnNumber(targetGrams)} গ্রাম)` : `${toBnNumber((targetGrams / 1000).toFixed(2))} কেজি (${toBnNumber(targetGrams)} গ্রাম)`}
            </p>
          </div>

          {/* 4. Batch Start Date & Chick Price */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                বাচ্চা পৌঁছার শুরুর তারিখ (Start Date) *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                প্রতি বাচ্চার দর (৳)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="যেমন: ৪৮"
                value={chickPricePerUnit}
                onChange={(e) => setChickPricePerUnit(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* 5. Hatchery & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                হ্যাচারি বা সরবরাহকারী
              </label>
              <input
                type="text"
                placeholder="যেমন: সিপি / নারিশ / কাজী"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">নোট বা বিশেষ তথ্য</label>
              <input
                type="text"
                placeholder="যেমন: ব্রুডার প্রস্তুত ও শুকনা তুষ বিছানো"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* 6. Routine Medication Inheritance for New Batch */}
          {(previousBatches.length > 0 || hasSavedTemplate) && (
            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200/80 space-y-2">
              <label className="block text-xs font-bold text-emerald-950">
                নিয়মিত ওষুধের রুটিন (আগের ব্যাচের ওষুধ অটোমেটিক যুক্ত হবে)
              </label>
              <select
                value={routineSource}
                onChange={(e) => setRoutineSource(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 border border-emerald-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="__auto__">
                  স্বয়ংক্রিয় রুটিন কপি (আগের ব্যাচ ও সেভ করা নিয়মিত ওষুধসমূহ)
                </option>
                {previousBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    এই ব্যাচের ওষুধ আনুন: {b.batchName} ({b.batchNumber})
                  </option>
                ))}
                <option value="__default__">আদর্শ ব্রয়লার ভ্যাকসিন ও ভিটামিন সূচি (নতুন ডিফল্ট)</option>
              </select>
              <p className="text-[11px] text-emerald-800">
                মুরগি বিক্রি না হওয়া পর্যন্ত নিয়মিত যে ওষুধগুলো ব্যবহার করেন, সেগুলো নতুন ব্যাচে সাথে সাথে পেয়ে যাবেন — পুনরায় লিখতে হবে না।
              </p>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 transition-all"
            >
              ব্যাচ শুরু করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
