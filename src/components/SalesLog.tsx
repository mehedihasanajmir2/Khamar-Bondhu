import React, { useState } from 'react';
import {
  TrendingUp,
  PlusCircle,
  Trash2,
  DollarSign,
  Scale,
  User,
  Phone,
  Calculator,
  Search,
  CheckCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Batch, SaleRecord } from '../types';
import { formatBnDate, formatTaka, getTodayDateString, toBnNumber } from '../utils/formatters';

interface SalesLogProps {
  activeBatch: Batch | null;
  sales: SaleRecord[];
  onAddSale: (sale: Omit<SaleRecord, 'id' | 'batchId' | 'userId'>) => void;
  onDeleteSale: (saleId: string) => void;
}

export const SalesLog: React.FC<SalesLogProps> = ({
  activeBatch,
  sales,
  onAddSale,
  onDeleteSale
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [saleDate, setSaleDate] = useState(getTodayDateString());
  const [birdsSoldCount, setBirdsSoldCount] = useState<string>('');
  const [totalWeightKg, setTotalWeightKg] = useState<string>('');
  const [pricePerKg, setPricePerKg] = useState<string>('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [notes, setNotes] = useState('');

  if (!activeBatch) {
    return (
      <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-8">
        <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">কোনো ব্যাচ সক্রিয় নেই</h3>
        <p className="text-sm text-slate-500">বিক্রির তথ্য যোগ করতে একটি ব্যাচ নির্বাচন করুন।</p>
      </div>
    );
  }

  // Auto-calculated total amount in modal
  const weightNum = parseFloat(totalWeightKg) || 0;
  const priceNum = parseFloat(pricePerKg) || 0;
  const calculatedTotalAmount = Math.round(weightNum * priceNum);
  const birdsNum = parseInt(birdsSoldCount, 10) || 0;
  const avgBirdWeightKg = birdsNum > 0 && weightNum > 0 ? (weightNum / birdsNum).toFixed(2) : '০';

  // Overall statistics
  const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalBirdsSold = sales.reduce((sum, s) => sum + (s.birdsSoldCount || 0), 0);
  const totalWeightSold = sales.reduce((sum, s) => sum + (s.totalWeightKg || 0), 0);
  const overallAvgPrice = totalWeightSold > 0 ? Math.round(totalRevenue / totalWeightSold) : 0;

  const filteredSales = sales.filter((s) => {
    return (
      searchQuery === '' ||
      s.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.buyerPhone && s.buyerPhone.includes(searchQuery))
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (weightNum <= 0 || priceNum <= 0) return;

    onAddSale({
      saleDate,
      birdsSoldCount: birdsNum,
      totalWeightKg: weightNum,
      pricePerKg: priceNum,
      totalAmount: calculatedTotalAmount,
      buyerName: buyerName.trim() || 'সাধারণ পাইকার',
      buyerPhone: buyerPhone.trim(),
      notes: notes.trim()
    });

    // Fire celebratory confetti!
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    } catch {
      // ignore
    }

    setBirdsSoldCount('');
    setTotalWeightKg('');
    setPricePerKg('');
    setBuyerName('');
    setBuyerPhone('');
    setNotes('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">বিক্রি ও আয় হিসাব (Sales & Revenue)</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
              {activeBatch.batchNumber}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            পাখির বিক্রয় সংখ্যা, মোট ওজন ও কেজি দর লিখে স্বয়ংক্রিয়ভাবে মোট আয় হিসাব করুন।
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          নতুন বিক্রি যোগ করুন
        </button>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-2xl p-5 text-white shadow-md shadow-emerald-600/20">
          <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" /> মোট বিক্রির টাকা (Total Revenue)
          </span>
          <div className="text-2xl sm:text-3xl font-black tracking-tight mt-2">
            {formatTaka(totalRevenue)}
          </div>
          <p className="text-xs text-emerald-100/90 mt-1">
            মোট চালান: {toBnNumber(sales.length)} টি
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> মোট বিক্রিত মুরগি
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {toBnNumber(totalBirdsSold)} <span className="text-xs font-normal text-slate-500">টি</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            প্রারম্ভিক {toBnNumber(activeBatch.initialChicks)} টির মধ্যে
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-blue-500" /> মোট বিক্রিত ওজন
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {toBnNumber(totalWeightSold)} <span className="text-xs font-normal text-slate-500">কেজি</span>
          </div>
          <p className="text-[11px] text-blue-600 font-medium mt-0.5">
            গড় মুরগির ওজন: {totalBirdsSold > 0 ? `${toBnNumber((totalWeightSold / totalBirdsSold).toFixed(2))} কেজি` : '০'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-amber-500" /> গড় কেজি দর
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatTaka(overallAvgPrice)} <span className="text-xs font-normal text-slate-500">/কেজি</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            বাজারদরের সাথে মিলিয়ে লাভ নিশ্চিত করুন
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="ক্রেতা বা ফোন নম্বর দিয়ে খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <span className="text-xs text-slate-400">
          চালান সংখ্যা: {toBnNumber(filteredSales.length)} টি
        </span>
      </div>

      {/* Sales Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">বিক্রির রশিদ ও হিসাব খাতা</h3>
          <span className="text-xs font-bold text-emerald-600">
            মোট আয়: {formatTaka(filteredSales.reduce((s, r) => s + r.totalAmount, 0))}
          </span>
        </div>

        {filteredSales.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-xs">
            এখনও কোনো বিক্রির রেকর্ড নেই। উপরের "নতুন বিক্রি যোগ করুন" বাটনে ক্লিক করুন।
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">তারিখ</th>
                  <th className="py-3 px-4">ক্রেতার নাম ও ফোন</th>
                  <th className="py-3 px-4 text-center">পাখির সংখ্যা</th>
                  <th className="py-3 px-4 text-center">মোট ওজন</th>
                  <th className="py-3 px-4 text-right">দর /কেজি</th>
                  <th className="py-3 px-4 text-right font-black">মোট টাকা (৳)</th>
                  <th className="py-3 px-4 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold">{formatBnDate(sale.saleDate)}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{sale.buyerName}</div>
                      {sale.buyerPhone && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {sale.buyerPhone}
                        </div>
                      )}
                      {sale.notes && (
                        <div className="text-[10px] text-slate-500 italic">{sale.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {toBnNumber(sale.birdsSoldCount)} টি
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-blue-700">
                      {toBnNumber(sale.totalWeightKg)} কেজি
                      {sale.birdsSoldCount > 0 && (
                        <span className="block text-[10px] font-normal text-slate-400">
                          (গড় {(sale.totalWeightKg / sale.birdsSoldCount).toFixed(2)} কেজি)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {formatTaka(sale.pricePerKg)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600 text-sm">
                      {formatTaka(sale.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onDeleteSale(sale.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Sale Modal with Live Auto-calculation */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-lg">নতুন বিক্রি চালান যোগ করুন</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">বিক্রির তারিখ *</label>
                <input
                  type="date"
                  required
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    বিক্রিত পাখির সংখ্যা (টি) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="যেমন: ৫০০"
                    value={birdsSoldCount}
                    onChange={(e) => setBirdsSoldCount(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মোট ওজন (কেজি) *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    placeholder="যেমন: ৮৫০"
                    value={totalWeightKg}
                    onChange={(e) => setTotalWeightKg(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  প্রতি কেজি দর (৳) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  required
                  placeholder="যেমন: ২০০"
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Live Auto-Calculated Amount Box */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                  স্বয়ংক্রিয় মোট বিক্রির টাকা (ওজন × কেজি দর)
                </span>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {formatTaka(calculatedTotalAmount)}
                </div>
                {birdsNum > 0 && weightNum > 0 && (
                  <p className="text-[11px] text-emerald-600 mt-0.5">
                    প্রতি মুরগির গড় ওজন: {toBnNumber(avgBirdWeightKg)} কেজি
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ক্রেতা বা পাইকারের নাম
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: মেসার্স ভাই ভাই পোল্ট্রি"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মোবাইল নম্বর
                  </label>
                  <input
                    type="tel"
                    placeholder="যেমন: ০১৭..."
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মন্তব্য (ঐচ্ছিক)</label>
                <input
                  type="text"
                  placeholder="যেমন: নগদ পরিশোধকৃত চালান"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  বিক্রি সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
