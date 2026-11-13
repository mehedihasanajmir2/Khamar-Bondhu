import React, { useState, useEffect } from 'react';
import {
  Archive,
  Layers,
  Calendar,
  Scale,
  Receipt,
  TrendingUp,
  Syringe,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Clock,
  DollarSign,
  HeartPulse,
  Activity,
  FileSpreadsheet
} from 'lucide-react';
import { Batch, BatchSummary, ExpenseRecord, GrowthRecord, MedicineScheduleItem, SaleRecord } from '../types';
import { PoultryStorageService } from '../services/storage';
import { formatBnDate, formatTaka, formatWeight, toBnNumber } from '../utils/formatters';
import { useConfirm } from '../context/ConfirmContext';

interface ArchivedBatchInspectionModalProps {
  isOpen: boolean;
  batch: Batch | null;
  userId: string;
  onClose: () => void;
  onRestoreBatch?: (batchId: string) => void;
  onSelectActiveBatch?: (batchId: string) => void;
}

type ModalTab = 'financials' | 'expenses' | 'sales' | 'growth' | 'medicines';

export const ArchivedBatchInspectionModal: React.FC<ArchivedBatchInspectionModalProps> = ({
  isOpen,
  batch,
  userId,
  onClose,
  onRestoreBatch,
  onSelectActiveBatch
}) => {
  const { confirmAction } = useConfirm();
  const [activeTab, setActiveTab] = useState<ModalTab>('financials');
  const [historyData, setHistoryData] = useState<{
    summary: BatchSummary | null;
    growth: GrowthRecord[];
    medicines: MedicineScheduleItem[];
    expenses: ExpenseRecord[];
    sales: SaleRecord[];
  } | null>(null);

  useEffect(() => {
    if (isOpen && batch && userId) {
      const data = PoultryStorageService.getBatchFullHistory(userId, batch.id);
      if (data) {
        setHistoryData({
          summary: data.summary,
          growth: data.growth,
          medicines: data.medicines,
          expenses: data.expenses,
          sales: data.sales
        });
      }
    } else {
      setHistoryData(null);
    }
  }, [isOpen, batch, userId]);

  if (!isOpen || !batch) return null;

  const summary = historyData?.summary;
  const growth = historyData?.growth || [];
  const medicines = historyData?.medicines || [];
  const expenses = historyData?.expenses || [];
  const sales = historyData?.sales || [];

  // Duration in days
  const startDate = new Date(batch.startDate);
  const endDate = batch.completedDate ? new Date(batch.completedDate) : new Date();
  const diffDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-4 sm:p-7 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto flex flex-col print:max-h-none print:shadow-none print:border-none print:p-0">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-xs">
              <Archive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{batch.batchNumber}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  আর্কাইভকৃত ব্যাচ
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                  {batch.birdType}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                <span>বিবরণ: <strong>{batch.batchName}</strong></span>
                <span>•</span>
                <span>শুরু: <strong>{formatBnDate(batch.startDate)}</strong></span>
                <span>•</span>
                <span>সমাপ্তি: <strong>{batch.completedDate ? formatBnDate(batch.completedDate) : 'সম্পন্ন'}</strong></span>
                <span>•</span>
                <span>মোট সময়কাল: <strong>{toBnNumber(diffDays)} দিন</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto print:hidden">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
              title="রিপোর্ট প্রিন্ট করুন"
            >
              <Printer className="w-3.5 h-3.5" />
              প্রিন্ট
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-600" /> প্রারম্ভিক ও বিক্রিত
            </span>
            <div className="text-lg font-black text-slate-900 mt-1">
              {toBnNumber(summary?.totalBirdsSold || 0)} / {toBnNumber(batch.initialChicks)}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              বিক্রয় হার: {toBnNumber((((summary?.totalBirdsSold || 0) / (batch.initialChicks || 1)) * 100).toFixed(1))}%
            </p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-amber-600" /> অর্জিত গড় ওজন
            </span>
            <div className="text-lg font-black text-amber-700 mt-1">
              {formatWeight(summary?.latestAvgWeightGrams || 0)}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              লক্ষ্য: {formatWeight(batch.targetWeightGrams || 2000)}
            </p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> মোট মৃত্যু
            </span>
            <div className="text-lg font-black text-rose-600 mt-1">
              {toBnNumber(summary?.totalMortality || 0)} টি
            </div>
            <p className="text-[10px] text-rose-500 mt-0.5 font-medium">
              মৃত্যুহার: {toBnNumber((summary?.mortalityRatePercent || 0).toFixed(1))}%
            </p>
          </div>

          <div className={`p-3.5 rounded-2xl border ${
            (summary?.netProfit || 0) >= 0 ? 'bg-emerald-50/90 border-emerald-200' : 'bg-red-50/90 border-red-200'
          }`}>
            <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> চূড়ান্ত ফলাফল
            </span>
            <div className={`text-lg font-black mt-1 ${
              (summary?.netProfit || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'
            }`}>
              {(summary?.netProfit || 0) >= 0 ? '+' : '-'}{formatTaka(Math.abs(summary?.netProfit || 0))}
            </div>
            <p className="text-[10px] text-slate-600 mt-0.5">
              {(summary?.netProfit || 0) >= 0 ? 'সফল লাভজনক লট' : 'ঘাটতি হয়েছিল'}
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex space-x-1 border-b border-slate-200 overflow-x-auto pb-1 text-xs print:hidden">
          <button
            onClick={() => setActiveTab('financials')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'financials'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            আর্থিক খতিয়ান
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'expenses'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            খরচের ভাউচার ({toBnNumber(expenses.length)})
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'sales'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            বিক্রির চালান ({toBnNumber(sales.length)})
          </button>

          <button
            onClick={() => setActiveTab('growth')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'growth'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            ওজন ও বৃদ্ধি লগ ({toBnNumber(growth.length)})
          </button>

          <button
            onClick={() => setActiveTab('medicines')}
            className={`px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'medicines'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Syringe className="w-3.5 h-3.5" />
            ওষুধ ও টিকা ইতিহাস ({toBnNumber(medicines.length)})
          </button>
        </div>

        {/* Tab Contents */}
        <div className="py-4 space-y-4 flex-1">
          {/* TAB 1: Financials */}
          {activeTab === 'financials' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    চূড়ান্ত ব্যালেন্স শিট (Final Balance Sheet)
                  </span>
                  <h3 className="text-2xl font-black mt-1">
                    নিট লাভ: {formatTaka(summary?.netProfit || 0)}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    মোট বিক্রি {formatTaka(summary?.totalRevenue || 0)} থেকে সর্বমোট খরচ {formatTaka(summary?.totalExpense || 0)} বাদ দিয়ে
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-right">
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">মোট ব্যয়:</span>
                    <span className="font-bold text-rose-400">{formatTaka(summary?.totalExpense || 0)}</span>
                  </div>
                  <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                    <span className="text-[10px] text-slate-400 block">মোট আয়:</span>
                    <span className="font-bold text-emerald-400">{formatTaka(summary?.totalRevenue || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Debt / Due status */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">বাকি ও ঋণ খতিয়ান:</span>
                  <span className="text-slate-500">
                    মোট বাকি নেওয়া হয়েছিল: {formatTaka(summary?.totalDueTaken || 0)} • জমা/পরিশোধ: {formatTaka(summary?.totalDueRepaid || 0)}
                  </span>
                </div>
                <div>
                  {summary && summary.currentRemainingDue > 0 ? (
                    <span className="px-3 py-1 rounded-xl bg-rose-100 text-rose-800 font-bold">
                      অবশিষ্ট বকেয়া: {formatTaka(summary.currentRemainingDue)}
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> সম্পূর্ণ পরিশোধিত (০ টাকা বাকি)
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Category Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h4 className="font-bold text-slate-800 text-sm mb-3">খাতওয়ারি খরচের বিভাজন</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  {['বাচ্চা ক্রয়', 'ফিড/খাবার', 'ওষুধ ও টিকা', 'বিদ্যুৎ/জ্বালানি', 'পরিবহন', 'তুষ ও লিটার', 'অন্যান্য'].map((cat) => {
                    const catTotal = expenses
                      .filter((e) => e.category === cat)
                      .reduce((sum, e) => sum + (e.amount || 0), 0);
                    if (catTotal === 0) return null;
                    return (
                      <div key={cat} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                        <span className="text-slate-500 text-[11px] block">{cat}</span>
                        <span className="font-black text-slate-800 text-sm">{formatTaka(catTotal)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Expenses */}
          {activeTab === 'expenses' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">তারিখ</th>
                      <th className="py-2.5 px-3">ক্যাটাগরি</th>
                      <th className="py-2.5 px-3">সরবরাহকারী/দোকান</th>
                      <th className="py-2.5 px-3">বিবরণ / নোট</th>
                      <th className="py-2.5 px-3">পদ্ধতি</th>
                      <th className="py-2.5 px-3 text-right">টাকা (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold">{formatBnDate(exp.date)}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800">
                            {exp.category}
                          </span>
                        </td>
                        <td className="py-2 px-3">{exp.supplierName || '-'}</td>
                        <td className="py-2 px-3 max-w-xs truncate">{exp.note || '-'}</td>
                        <td className="py-2 px-3 text-[11px] text-slate-500">{exp.paymentMethod || 'নগদ'}</td>
                        <td className="py-2 px-3 text-right font-black text-rose-600">
                          {formatTaka(exp.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Sales */}
          {activeTab === 'sales' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">তারিখ</th>
                      <th className="py-2.5 px-3">ক্রেতা / পাইকার</th>
                      <th className="py-2.5 px-3 text-right">পাখির সংখ্যা</th>
                      <th className="py-2.5 px-3 text-right">মোট ওজন (কেজি)</th>
                      <th className="py-2.5 px-3 text-right">দর (প্রতি কেজি)</th>
                      <th className="py-2.5 px-3 text-right">মোট বিক্রি (৳)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {sales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold">{formatBnDate(sale.saleDate)}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{sale.buyerName}</td>
                        <td className="py-2 px-3 text-right">{toBnNumber(sale.birdsSoldCount)} টি</td>
                        <td className="py-2 px-3 text-right">{toBnNumber(sale.totalWeightKg)} কেজি</td>
                        <td className="py-2 px-3 text-right font-semibold">{formatTaka(sale.pricePerKg)}</td>
                        <td className="py-2 px-3 text-right font-black text-emerald-600">
                          {formatTaka(sale.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Growth */}
          {activeTab === 'growth' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">তারিখ</th>
                      <th className="py-2.5 px-3">বয়স (দিন)</th>
                      <th className="py-2.5 px-3">স্যাম্পল মাপ</th>
                      <th className="py-2.5 px-3">গড় ওজন</th>
                      <th className="py-2.5 px-3">লটের মোট ওজন</th>
                      <th className="py-2.5 px-3">ঐ দিনের মৃত্যু</th>
                      <th className="py-2.5 px-3">খাবার গ্রহণ</th>
                      <th className="py-2.5 px-3">নোট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {growth.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold">{formatBnDate(g.date)}</td>
                        <td className="py-2 px-3 font-bold text-blue-700">{toBnNumber(g.dayAge)} দিন</td>
                        <td className="py-2 px-3">
                          {g.sampleTotalWeightKg ? (
                            <span className="font-semibold text-slate-800">
                              {toBnNumber(g.sampleTotalWeightKg)} কেজি ({toBnNumber(g.sampleBirdsCount || 5)}টি)
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-bold text-emerald-700">{formatWeight(g.avgWeightGrams)}</td>
                        <td className="py-2 px-3 font-black text-slate-900">
                          {g.lotTotalWeightKg ? (
                            <span>{toBnNumber(g.lotTotalWeightKg)} কেজি {g.lotTotalWeightMaund ? `(${toBnNumber(g.lotTotalWeightMaund)} মণ)` : ''}</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-semibold text-rose-600">
                          {g.dailyMortality > 0 ? `${toBnNumber(g.dailyMortality)} টি` : '০'}
                        </td>
                        <td className="py-2 px-3">{g.feedIntakeKg > 0 ? `${toBnNumber(g.feedIntakeKg)} কেজি` : '-'}</td>
                        <td className="py-2 px-3 text-slate-500 italic">{g.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: Medicines */}
          {activeTab === 'medicines' && (
            <div className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">বয়স (দিন)</th>
                      <th className="py-2.5 px-3">রোগের লক্ষণ (Symptoms)</th>
                      <th className="py-2.5 px-3">ওষুধের নাম</th>
                      <th className="py-2.5 px-3">কখন ও কীভাবে খাওয়াতে হবে</th>
                      <th className="py-2.5 px-3 text-center">স্ট্যাটাস</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {medicines.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-bold text-blue-700">
                          {m.endDayAge && m.endDayAge > m.dayAge
                            ? `${toBnNumber(m.dayAge)}-${toBnNumber(m.endDayAge)} দিন`
                            : `${toBnNumber(m.dayAge)} দিন`}
                        </td>
                        <td className="py-2 px-3 text-slate-800 font-semibold">{m.symptoms || m.purpose || '-'}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{m.medicineName}</td>
                        <td className="py-2 px-3 text-slate-600">{m.timingAndDosage || m.dosage || '-'}</td>
                        <td className="py-2 px-3 text-center">
                          {m.status === 'completed' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              ✓ সম্পন্ন
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                              বাকি ছিল
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="text-xs text-slate-500">
            আইসোলেশন কি: <code className="text-emerald-700 font-bold">{batch.userId}</code> এর সুরক্ষিত খাতা
          </div>

          <div className="flex items-center gap-2">
            {onRestoreBatch && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirmAction({
                    title: 'ব্যাচ পুনরায় সক্রিয় করবেন?',
                    message: 'আপনি কি এই ব্যাচটি পুনরায় সক্রিয় করতে চান?',
                    confirmLabel: 'হ্যাঁ, সক্রিয় করুন',
                    tone: 'warning'
                  });
                  if (ok) {
                    onRestoreBatch(batch.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                পুনরায় সক্রিয় করুন
              </button>
            )}

            {onSelectActiveBatch && (
              <button
                type="button"
                onClick={() => {
                  onSelectActiveBatch(batch.id);
                  onClose();
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                সরাসরি খাতা দেখুন
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
