import React from 'react';
import {
  Printer,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Receipt,
  DollarSign,
  Scale,
  Calendar,
  Building,
  UserCheck
} from 'lucide-react';
import { Batch, BatchSummary, ExpenseRecord, SaleRecord } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatBnDate, formatTaka, toBnNumber } from '../utils/formatters';

interface ReportViewProps {
  activeBatch: Batch | null;
  summary: BatchSummary | null;
  expenses: ExpenseRecord[];
  sales: SaleRecord[];
}

export const ReportView: React.FC<ReportViewProps> = ({
  activeBatch,
  summary,
  expenses,
  sales
}) => {
  const { currentUser } = useAuth();

  if (!activeBatch || !summary) {
    return (
      <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-8">
        <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">কোনো ব্যাচ নির্বাচিত নেই</h3>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const csvRows = [
      ['ব্যাচ বিবরণী', activeBatch.batchNumber, activeBatch.batchName],
      ['খামারীর নাম', currentUser?.name || '', 'আইডি', currentUser?.uid || ''],
      ['শুরুর তারিখ', activeBatch.startDate, 'পাখির জাত', activeBatch.birdType],
      ['প্রারম্ভিক বাচ্চা', activeBatch.initialChicks, 'বর্তমান বয়স', `${summary.batchAgeDays} দিন`],
      [],
      ['--- খরচ হিসাব ---'],
      ['তারিখ', 'ক্যাটাগরি', 'বিবরণ', 'টাকা (৳)'],
      ...expenses.map((e) => [e.date, e.category, e.note, e.amount]),
      ['মোট খরচ (সর্বমোট)', '', '', summary.totalExpense],
      ['নগদ পরিশোধ', '', '', summary.totalCashPaid],
      ['মূল বাকি নেওয়া হয়েছিল', '', '', summary.totalDueTaken],
      ['বাকি থেকে জমা/পরিশোধ', '', '', summary.totalDueRepaid],
      ['বর্তমান অবশিষ্ট বকেয়া বাকি', '', '', summary.currentRemainingDue],
      [],
      ['--- বিক্রি হিসাব ---'],
      ['তারিখ', 'ক্রেতা', 'সংখ্যা', 'ওজন (কেজি)', 'কেজি দর', 'মোট টাকা (৳)'],
      ...sales.map((s) => [s.saleDate, s.buyerName, s.birdsSoldCount, s.totalWeightKg, s.pricePerKg, s.totalAmount]),
      ['মোট বিক্রি', '', '', '', '', summary.totalRevenue],
      [],
      ['নিট লাভ/ক্ষতি', '', '', '', '', summary.netProfit]
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      csvRows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Poultry_Batch_Report_${activeBatch.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Group expenses by category (excluding due repayments which are balance settlements)
  const purchaseExpenses = expenses.filter((e) => e.category !== 'বাকি জমা / পরিশোধ');
  const expensesByCategory = purchaseExpenses.reduce<Record<string, number>>((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {});

  const profitPerBird =
    summary.totalBirdsSold > 0 ? summary.netProfit / summary.totalBirdsSold : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            ব্যাচ হিসাব বিবরণী ও রিপোর্ট (Balance Sheet)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            মোট আয়, মোট ব্যয় ও চূড়ান্ত লাভ-ক্ষতির পূর্ণাঙ্গ হিসাব খাতা। প্রিন্ট বা এক্সপোর্ট করুন।
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            CSV এক্সপোর্ট
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" />
            প্রিন্ট / PDF সেভ
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm print:border-none print:shadow-none print:p-0">
        
        {/* Farm & Report Header */}
        <div className="border-b-2 border-slate-900 pb-5 mb-6 text-center">
          <div className="inline-flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">🐓</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {currentUser?.farmName || 'পোল্ট্রি খামার'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            স্বত্বাধিকারী: {currentUser?.name} • মোবাইল: {currentUser?.phone} • অবস্থান: {currentUser?.location}
          </p>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-500 font-mono">
            <span>ইউজার আইডি: {currentUser?.uid}</span>
            <span>•</span>
            <span>রিপোর্ট তৈরির তারিখ: {formatBnDate(new Date().toISOString().split('T')[0])}</span>
          </div>
        </div>

        {/* Batch Meta Bar */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block">ব্যাচ নম্বর:</span>
            <strong className="text-slate-800 text-sm font-bold">{activeBatch.batchNumber}</strong>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">শুরুর তারিখ ও বয়স:</span>
            <strong className="text-slate-800 text-sm font-bold">
              {formatBnDate(activeBatch.startDate)} ({toBnNumber(summary.batchAgeDays)} দিন)
            </strong>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">জাত ও প্রারম্ভিক বাচ্চা:</span>
            <strong className="text-slate-800 text-sm font-bold">
              {activeBatch.birdType} ({toBnNumber(activeBatch.initialChicks)} টি)
            </strong>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block">বর্তমান স্ট্যাটাস:</span>
            <strong className="text-emerald-700 text-sm font-bold">
              {activeBatch.status === 'active' ? 'চলমান' : 'সম্পন্ন ব্যাচ'}
            </strong>
          </div>
        </div>

        {/* Financial Balance Summary (Big Highlight Card) */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-slate-700">
            <div className="pt-2 sm:pt-0">
              <span className="text-xs uppercase font-semibold text-rose-300">মোট ব্যয় (Total Expenses)</span>
              <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-1">
                {formatTaka(summary.totalExpense)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">ফিড, বাচ্চা, ওষুধ ও জ্বালানি</p>
            </div>

            <div className="pt-4 sm:pt-0">
              <span className="text-xs uppercase font-semibold text-emerald-300">মোট আয় (Total Revenue)</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
                {formatTaka(summary.totalRevenue)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{toBnNumber(summary.totalBirdsSold)} টি মুরগি বিক্রি</p>
            </div>

            <div className="pt-4 sm:pt-0">
              <span className="text-xs uppercase font-semibold text-amber-300">
                {summary.isProfitable ? 'নিট লাভ (Net Profit)' : 'নিট ঘাটতি / লোকসান'}
              </span>
              <div
                className={`text-2xl sm:text-3xl font-black mt-1 ${
                  summary.isProfitable ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatTaka(Math.abs(summary.netProfit))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {summary.isProfitable
                  ? `লাভের মার্জিন: ${toBnNumber(summary.profitMarginPercent.toFixed(1))}%`
                  : 'পূর্ণ বিক্রির পর চূড়ান্ত হিসাব প্রযোজ্য'}
              </p>
            </div>
          </div>

          {/* Cash & Due Ledger Sub-row */}
          <div className="mt-5 pt-4 border-t border-slate-700/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <span className="text-slate-400 block text-[10px]">নগদ পরিশোধ:</span>
              <strong className="text-emerald-300 font-bold">{formatTaka(summary.totalCashPaid)}</strong>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <span className="text-slate-400 block text-[10px]">মোট বাকি নেওয়া:</span>
              <strong className="text-blue-300 font-bold">{formatTaka(summary.totalDueTaken)}</strong>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <span className="text-slate-400 block text-[10px]">বাকি থেকে জমা/পরিশোধ:</span>
              <strong className="text-teal-300 font-bold">{formatTaka(summary.totalDueRepaid)}</strong>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <span className="text-slate-400 block text-[10px]">বর্তমান অবশিষ্ট বকেয়া:</span>
              <strong className={summary.currentRemainingDue > 0 ? "text-rose-400 font-bold" : "text-emerald-300 font-bold"}>
                {formatTaka(summary.currentRemainingDue)}
              </strong>
            </div>
          </div>
        </div>

        {/* Two Columns: Expenses Breakdown & Sales Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          
          {/* Expenses Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-rose-50/80 px-4 py-3 border-b border-rose-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-rose-600" />
                ব্যয়ের বিবরণী (খরচের খাত)
              </h3>
              <span className="text-xs font-bold text-rose-700">{formatTaka(summary.totalExpense)}</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {Object.entries(expensesByCategory).map(([cat, amount]) => (
                <div key={cat} className="px-4 py-2.5 flex items-center justify-between font-medium">
                  <span className="text-slate-700">{cat}</span>
                  <span className="font-bold text-slate-900">{formatTaka(amount)}</span>
                </div>
              ))}
              <div className="px-4 py-3 bg-slate-50 font-bold flex items-center justify-between text-slate-900">
                <span>সর্বমোট খরচ:</span>
                <span className="text-rose-600 text-sm">{formatTaka(summary.totalExpense)}</span>
              </div>
            </div>
          </div>

          {/* Sales Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <div className="bg-emerald-50/80 px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                বিক্রির বিবরণী (চালানসমূহ)
              </h3>
              <span className="text-xs font-bold text-emerald-700">{formatTaka(summary.totalRevenue)}</span>
            </div>

            {sales.length === 0 ? (
              <p className="p-4 text-xs text-slate-400 text-center">কোনো বিক্রি হয়নি</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {sales.map((sale) => (
                  <div key={sale.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800">{sale.buyerName}</div>
                      <div className="text-[10px] text-slate-400">
                        {toBnNumber(sale.birdsSoldCount)} টি • {toBnNumber(sale.totalWeightKg)} কেজি • দর {formatTaka(sale.pricePerKg)}
                      </div>
                    </div>
                    <span className="font-bold text-emerald-700 text-sm">{formatTaka(sale.totalAmount)}</span>
                  </div>
                ))}
                <div className="px-4 py-3 bg-slate-50 font-bold flex items-center justify-between text-slate-900">
                  <span>সর্বমোট বিক্রি আয়:</span>
                  <span className="text-emerald-600 text-sm">{formatTaka(summary.totalRevenue)}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Biological / Production Performance Metrics */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 mb-6">
          <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-3">
            উৎপাদন দক্ষতা ও পরিসংখ্যান
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500">মৃত্যুর হার:</span>
              <p className="font-bold text-slate-800 text-sm">
                {toBnNumber(summary.mortalityRatePercent.toFixed(1))}% ({toBnNumber(summary.totalMortality)} টি)
              </p>
            </div>
            <div>
              <span className="text-slate-500">মোট খাবার গ্রহণ:</span>
              <p className="font-bold text-slate-800 text-sm">
                {toBnNumber(summary.totalFeedConsumedKg)} কেজি ({toBnNumber((summary.totalFeedConsumedKg / 50).toFixed(1))} বস্তা)
              </p>
            </div>
            <div>
              <span className="text-slate-500">গড় বিক্রি দর:</span>
              <p className="font-bold text-slate-800 text-sm">
                {summary.totalWeightSoldKg > 0
                  ? `${formatTaka(Math.round(summary.totalRevenue / summary.totalWeightSoldKg))} /কেজি`
                  : '০'}
              </p>
            </div>
            <div>
              <span className="text-slate-500">প্রতি মুরগিতে লাভ/ক্ষতি:</span>
              <p className={`font-bold text-sm ${profitPerBird >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatTaka(Math.round(profitPerBird))}
              </p>
            </div>
          </div>
        </div>

        {/* Signature & Verification Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            <p className="font-bold text-slate-800">খামার বন্ধু সফটওয়্যার সিস্টেম</p>
            <p className="text-[10px]">Row-Level Security Scoped • Tenant: {currentUser?.uid}</p>
          </div>
          <div className="text-right">
            <div className="w-40 border-b border-slate-400 mb-1"></div>
            <p className="font-medium text-slate-700">খামারীর স্বাক্ষর</p>
          </div>
        </div>

      </div>
    </div>
  );
};
