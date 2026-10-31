import React from 'react';
import { Archive, AlertTriangle, CheckCircle2, TrendingUp, Receipt, DollarSign, Calendar, Scale, Layers } from 'lucide-react';
import { Batch, BatchSummary } from '../types';
import { formatBnDate, formatTaka, formatWeight, toBnNumber } from '../utils/formatters';

interface ArchiveBatchModalProps {
  isOpen: boolean;
  batch: Batch | null;
  summary: BatchSummary | null;
  onClose: () => void;
  onConfirmArchive: (batchId: string) => void;
}

export const ArchiveBatchModal: React.FC<ArchiveBatchModalProps> = ({
  isOpen,
  batch,
  summary,
  onClose,
  onConfirmArchive
}) => {
  if (!isOpen || !batch) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">ব্যাচ সমাপ্ত ও আর্কাইভ করুন</h3>
              <p className="text-[11px] text-slate-500">
                ব্যাচের চূড়ান্ত ফলাফল সংরক্ষণ ও প্রোফাইল আর্কাইভে স্থানান্তর
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Target Batch Info */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-base">{batch.batchNumber}</h4>
                <p className="text-xs text-slate-500">{batch.batchName} • {batch.birdType}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                চলমান ব্যাচ
              </span>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">শুরুর তারিখ:</span>
                <span className="font-bold text-slate-700">{formatBnDate(batch.startDate)}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">মোট বয়স:</span>
                <span className="font-bold text-slate-700">{toBnNumber(summary?.batchAgeDays || 0)} দিন</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">প্রারম্ভিক বাচ্চা:</span>
                <span className="font-bold text-slate-700">{toBnNumber(batch.initialChicks)} টি</span>
              </div>
            </div>
          </div>

          {/* Performance Snapshot */}
          {summary && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-rose-500" /> সর্বমোট খরচ
                </span>
                <p className="text-base font-black text-rose-600 mt-1">{formatTaka(summary.totalExpense)}</p>
                <p className="text-[10px] text-slate-400">নগদ: {formatTaka(summary.totalCashPaid)}</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> সর্বমোট বিক্রি
                </span>
                <p className="text-base font-black text-emerald-600 mt-1">{formatTaka(summary.totalRevenue)}</p>
                <p className="text-[10px] text-slate-400">বিক্রিত পাখি: {toBnNumber(summary.totalBirdsSold)} টি</p>
              </div>

              <div className={`col-span-2 p-3.5 rounded-2xl border ${
                summary.isProfitable ? 'bg-emerald-50/80 border-emerald-200' : 'bg-red-50/80 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {summary.isProfitable ? 'নিট চূড়ান্ত লাভ (Net Profit):' : 'চূড়ান্ত আর্থিক ঘাটতি:'}
                  </span>
                  <span className={`text-lg font-black ${
                    summary.isProfitable ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {summary.isProfitable ? '+' : '-'}{formatTaka(Math.abs(summary.netProfit))}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  মার্জিন: {toBnNumber(summary.profitMarginPercent.toFixed(1))}% • মৃত্যুহার: {toBnNumber(summary.mortalityRatePercent.toFixed(1))}%
                </p>
              </div>
            </div>
          )}

          {/* Remaining Due warning if any */}
          {summary && summary.currentRemainingDue > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">সতর্কতা: এই ব্যাচে {formatTaka(summary.currentRemainingDue)} টাকা বাকি অপরিশোধিত রয়েছে!</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  আর্কাইভ করার পরেও প্রোফাইলের "আগের ব্যাচসমূহ" সেকশনে এই বকেয়া হিসাব সংরক্ষিত থাকবে।
                </p>
              </div>
            </div>
          )}

          {/* Archive Notice */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">আর্কাইভ সংরক্ষণ সুবিধা:</p>
              <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                ব্যাচ সমাপ্ত করলে এটি মুছে যাবে না। আপনার <strong>প্রোফাইলের "আগের ব্যাচসমূহ (Previous Batches History)"</strong> সেকশনে চিরতরে সংরক্ষিত থাকবে এবং যেকোনো সময় সম্পূর্ণ আর্থিক, ওজন ও ওষুধের ইতিহাস দেখতে পারবেন।
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              বাতিল (চালিয়ে যান)
            </button>
            <button
              type="button"
              onClick={() => onConfirmArchive(batch.id)}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 active:scale-95 transition-all"
            >
              <Archive className="w-4 h-4" />
              হ্যাঁ, ব্যাচ সমাপ্ত ও আর্কাইভ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
