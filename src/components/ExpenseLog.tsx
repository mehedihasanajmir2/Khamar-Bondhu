import React, { useState } from 'react';
import {
  Receipt,
  PlusCircle,
  Trash2,
  Filter,
  DollarSign,
  TrendingDown,
  PieChart,
  Search,
  Tag,
  CreditCard,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Clock,
  History,
  ArrowRight,
  Store,
  ChevronDown,
  ChevronUp,
  MinusCircle,
  Sparkles
} from 'lucide-react';
import { Batch, ExpenseCategory, ExpenseRecord, DuePaymentEntry } from '../types';
import { formatBnDate, formatTaka, getTodayDateString, toBnNumber } from '../utils/formatters';
import { useConfirm } from '../context/ConfirmContext';

const CATEGORIES: ExpenseCategory[] = [
  'বাচ্চা ক্রয়',
  'ফিড/খাবার',
  'ওষুধ ও টিকা',
  'বিদ্যুৎ/জ্বালানি',
  'পরিবহন',
  'তুষ ও লিটার',
  'শ্রমিক ও মজুরি',
  'বাকি জমা / পরিশোধ',
  'অন্যান্য'
];

const PURCHASE_CATEGORIES: ExpenseCategory[] = [
  'বাচ্চা ক্রয়',
  'ফিড/খাবার',
  'ওষুধ ও টিকা',
  'বিদ্যুৎ/জ্বালানি',
  'পরিবহন',
  'তুষ ও লিটার',
  'শ্রমিক ও মজুরি',
  'অন্যান্য'
];

const CATEGORY_STYLE_MAP: Record<string, { bar: string; dot: string; badge: string }> = {
  'বাচ্চা ক্রয়': {
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  'ফিড/খাবার': {
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  },
  'ওষুধ ও টিকা': {
    bar: 'bg-sky-500',
    dot: 'bg-sky-500',
    badge: 'bg-sky-50 text-sky-800 border-sky-200'
  },
  'বিদ্যুৎ/জ্বালানি': {
    bar: 'bg-orange-500',
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-800 border-orange-200'
  },
  'পরিবহন': {
    bar: 'bg-indigo-500',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200'
  },
  'তুষ ও লিটার': {
    bar: 'bg-teal-500',
    dot: 'bg-teal-500',
    badge: 'bg-teal-50 text-teal-800 border-teal-200'
  },
  'শ্রমিক ও মজুরি': {
    bar: 'bg-purple-500',
    dot: 'bg-purple-500',
    badge: 'bg-purple-50 text-purple-800 border-purple-200'
  },
  'অন্যান্য': {
    bar: 'bg-slate-500',
    dot: 'bg-slate-500',
    badge: 'bg-slate-100 text-slate-700 border-slate-200'
  }
};

interface ExpenseLogProps {
  activeBatch: Batch | null;
  expenses: ExpenseRecord[];
  onAddExpense: (expense: Omit<ExpenseRecord, 'id' | 'batchId' | 'userId'>) => void;
  onDeleteExpense: (expenseId: string) => void;
  onRecordDuePayment: (
    expenseId: string,
    amount: number,
    date: string,
    paymentMethod: 'নগদ' | 'বিকাশ/নগদ/রকেট' | 'ব্যাংক',
    note?: string
  ) => void;
}

export const ExpenseLog: React.FC<ExpenseLogProps> = ({
  activeBatch,
  expenses,
  onAddExpense,
  onDeleteExpense,
  onRecordDuePayment
}) => {
  const { confirmAction } = useConfirm();
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedPaymentHistoryId, setExpandedPaymentHistoryId] = useState<string | null>(null);

  // Filters
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'due_only' | 'cash_only' | 'cleared' | 'repaid_entries'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCategoryPanelOpen, setIsCategoryPanelOpen] = useState(true);

  // Add Expense / Repay Form State
  const [date, setDate] = useState(getTodayDateString());
  const [category, setCategory] = useState<ExpenseCategory>('ফিড/খাবার');
  const [amount, setAmount] = useState<string>('');
  const [paymentTypeOption, setPaymentTypeOption] = useState<'নগদ' | 'বাকি' | 'আংশিক'>('নগদ');
  const [paidPortion, setPaidPortion] = useState<string>('');
  const [supplierName, setSupplierName] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'নগদ' | 'বিকাশ/নগদ/রকেট' | 'ব্যাংক'>('নগদ');
  const [targetDueExpenseId, setTargetDueExpenseId] = useState<string>('general');

  if (!activeBatch) {
    return (
      <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-8">
        <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">কোনো ব্যাচ নির্বাচন করা নেই</h3>
        <p className="text-sm text-slate-500">খরচের হিসাব দেখতে অনুগ্রহ করে একটি ব্যাচ নির্বাচন করুন।</p>
      </div>
    );
  }

  // --- Financial Calculations for Cash, Due Taken, Due Repaid, and Remaining Due ---
  const purchaseExpenses = expenses.filter((e) => e.category !== 'বাকি জমা / পরিশোধ');
  const standaloneRepayments = expenses.filter((e) => e.category === 'বাকি জমা / পরিশোধ');

  let totalGrossExpense = 0;
  let totalDueTaken = 0;
  let totalInitialCash = 0;

  purchaseExpenses.forEach((e) => {
    totalGrossExpense += e.amount || 0;

    let initialDue = 0;
    let initialCash = 0;

    if (e.paymentMethod === 'বাকি') {
      initialDue = e.dueAmount !== undefined ? e.dueAmount : e.amount;
      initialCash = e.paidAmount || 0;
    } else if (e.paymentMethod === 'আংশিক নগদ ও বাকি') {
      initialCash = e.paidAmount || 0;
      initialDue = e.dueAmount !== undefined ? e.dueAmount : Math.max(0, e.amount - initialCash);
    } else {
      initialCash = e.paidAmount !== undefined ? e.paidAmount : e.amount;
      initialDue = e.dueAmount || 0;
    }

    totalDueTaken += initialDue;
    totalInitialCash += initialCash;
  });

  // Direct due repayment vouchers in the ledger
  const totalDirectRepayments = standaloneRepayments.reduce((sum, r) => sum + (r.amount || 0), 0);

  // Check if any purchase expenses have repayments not covered by standaloneRepayments
  let unrecordedRepaid = 0;
  purchaseExpenses.forEach((e) => {
    const recordedForThisItem = standaloneRepayments
      .filter((r) => r.linkedExpenseId === e.id)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const itemRepaid = e.repaidAmount || 0;
    if (itemRepaid > recordedForThisItem) {
      unrecordedRepaid += itemRepaid - recordedForThisItem;
    }
  });

  const totalDueRepaid = totalDirectRepayments + unrecordedRepaid;
  const currentRemainingDue = Math.max(0, totalDueTaken - totalDueRepaid);
  const totalActualCashPaid = totalInitialCash + totalDueRepaid;

  // Category-wise breakdown (separated totals for each expense category)
  const categoryBreakdown = PURCHASE_CATEGORIES.map((cat) => {
    const items = purchaseExpenses.filter((e) => e.category === cat);
    const total = items.reduce((sum, e) => sum + (e.amount || 0), 0);
    const remainingDue = items.reduce((sum, e) => {
      const initDue = e.paymentMethod === 'বাকি'
        ? (e.dueAmount !== undefined ? e.dueAmount : e.amount)
        : e.paymentMethod === 'আংশিক নগদ ও বাকি'
        ? (e.dueAmount !== undefined ? e.dueAmount : Math.max(0, e.amount - (e.paidAmount || 0)))
        : (e.dueAmount || 0);
      return sum + Math.max(0, initDue - (e.repaidAmount || 0));
    }, 0);
    const percent = totalGrossExpense > 0 ? Math.round((total / totalGrossExpense) * 100) : 0;
    return {
      category: cat,
      total,
      count: items.length,
      remainingDue,
      percent
    };
  }).sort((a, b) => b.total - a.total);

  // Find all active pending due vouchers for target dropdown
  const pendingDueExpenses = purchaseExpenses.filter((e) => {
    const initialDue = e.paymentMethod === 'বাকি'
      ? (e.dueAmount !== undefined ? e.dueAmount : e.amount)
      : e.paymentMethod === 'আংশিক নগদ ও বাকি'
      ? (e.dueAmount !== undefined ? e.dueAmount : Math.max(0, e.amount - (e.paidAmount || 0)))
      : (e.dueAmount || 0);
    const repaid = e.repaidAmount || 0;
    return initialDue - repaid > 0;
  });

  // Filter expenses
  const filteredExpenses = expenses.filter((e) => {
    // Payment filter
    const isRepaymentEntry = e.category === 'বাকি জমা / পরিশোধ';
    if (paymentFilter === 'repaid_entries' && !isRepaymentEntry) return false;

    const initialDue = e.paymentMethod === 'বাকি'
      ? (e.dueAmount !== undefined ? e.dueAmount : e.amount)
      : e.paymentMethod === 'আংশিক নগদ ও বাকি'
      ? (e.dueAmount !== undefined ? e.dueAmount : Math.max(0, e.amount - (e.paidAmount || 0)))
      : (e.dueAmount || 0);

    const repaid = e.repaidAmount || 0;
    const remaining = Math.max(0, initialDue - repaid);

    if (paymentFilter === 'due_only' && remaining <= 0) return false;
    if (paymentFilter === 'cleared' && (initialDue === 0 || remaining > 0)) return false;
    if (paymentFilter === 'cash_only' && (initialDue > 0 || isRepaymentEntry)) return false;

    // Category filter
    if (selectedCategory !== 'all' && e.category !== selectedCategory) return false;

    // Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchNote = e.note.toLowerCase().includes(q);
      const matchCat = e.category.toLowerCase().includes(q);
      const matchSupplier = (e.supplierName || '').toLowerCase().includes(q);
      if (!matchNote && !matchCat && !matchSupplier) return false;
    }

    return true;
  });

  // Calculate live numbers in Add Expense modal
  const totalNum = parseFloat(amount) || 0;
  const paidPortionNum = parseFloat(paidPortion) || 0;
  let calculatedCash = 0;
  let calculatedDue = 0;

  if (category === 'বাকি জমা / পরিশোধ') {
    calculatedCash = totalNum;
    calculatedDue = 0;
  } else if (paymentTypeOption === 'নগদ') {
    calculatedCash = totalNum;
    calculatedDue = 0;
  } else if (paymentTypeOption === 'বাকি') {
    calculatedCash = 0;
    calculatedDue = totalNum;
  } else {
    // Partial
    calculatedCash = Math.min(totalNum, paidPortionNum);
    calculatedDue = Math.max(0, totalNum - calculatedCash);
  }

  // Live dynamic remaining due calculation when category is 'বাকি জমা / পরিশোধ'
  const isDepositCategory = category === 'বাকি জমা / পরিশোধ';
  const remainingAfterDeposit = Math.max(0, currentRemainingDue - totalNum);

  // Selected specific target due voucher remaining
  const selectedTargetExpense = pendingDueExpenses.find((e) => e.id === targetDueExpenseId);
  const selectedTargetInitialDue = selectedTargetExpense
    ? (selectedTargetExpense.paymentMethod === 'বাকি'
        ? (selectedTargetExpense.dueAmount ?? selectedTargetExpense.amount)
        : (selectedTargetExpense.dueAmount ?? Math.max(0, selectedTargetExpense.amount - (selectedTargetExpense.paidAmount || 0))))
    : 0;
  const selectedTargetRepaid = selectedTargetExpense ? (selectedTargetExpense.repaidAmount || 0) : 0;
  const selectedTargetRemaining = Math.max(0, selectedTargetInitialDue - selectedTargetRepaid);
  const selectedTargetAfterDeposit = Math.max(0, selectedTargetRemaining - totalNum);

  const handleOpenAddModalWithCategory = (cat: ExpenseCategory = 'ফিড/খাবার') => {
    setCategory(cat);
    setDate(getTodayDateString());
    setAmount('');
    setPaidPortion('');
    setSupplierName('');
    setNote('');
    setPaymentTypeOption(cat === 'বাকি জমা / পরিশোধ' ? 'নগদ' : 'নগদ');
    setTargetDueExpenseId(pendingDueExpenses.length > 0 ? pendingDueExpenses[0].id : 'general');
    setShowAddModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalNum <= 0) return;

    if (isDepositCategory) {
      // If user selected a specific voucher, update it directly with onRecordDuePayment!
      if (targetDueExpenseId !== 'general' && selectedTargetExpense) {
        onRecordDuePayment(
          selectedTargetExpense.id,
          totalNum,
          date,
          paymentMethod,
          note.trim() || `বাকি জমা (${selectedTargetExpense.supplierName || selectedTargetExpense.category})`
        );
      } else {
        // General due repayment record
        onAddExpense({
          date,
          category: 'বাকি জমা / পরিশোধ',
          amount: totalNum,
          paidAmount: totalNum,
          dueAmount: 0,
          repaidAmount: totalNum,
          supplierName: supplierName.trim() || 'বকেয়া মহাজন/ডিলার',
          note: note.trim() || 'বাকি পরিশোধ বাবদ কিস্তি জমা',
          paymentMethod: paymentMethod,
          paymentsHistory: []
        });
      }
    } else {
      // Regular purchase expense
      let finalPaymentMethod: ExpenseRecord['paymentMethod'] = 'নগদ';
      if (paymentTypeOption === 'বাকি') {
        finalPaymentMethod = 'বাকি';
      } else if (paymentTypeOption === 'আংশিক') {
        finalPaymentMethod = 'আংশিক নগদ ও বাকি';
      } else {
        finalPaymentMethod = paymentMethod;
      }

      onAddExpense({
        date,
        category,
        amount: totalNum,
        paidAmount: calculatedCash,
        dueAmount: calculatedDue,
        repaidAmount: 0,
        supplierName: supplierName.trim(),
        note: note.trim() || `${category} খরচ`,
        paymentMethod: finalPaymentMethod,
        paymentsHistory: []
      });
    }

    setAmount('');
    setPaidPortion('');
    setSupplierName('');
    setNote('');
    setShowAddModal(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Add Buttons */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                খরচ ও দেনা-পাওনা খাতা (Expense & Due Ledger)
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                নগদ খরচ, বাকি নেওয়া, বাকি থেকে জমা দেওয়া এবং অবশিষ্ট বকেয়ার নিখুঁত হিসাব।
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAddModalWithCategory('ফিড/খাবার')}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-600/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            নতুন খরচ যোগ করুন
          </button>
        </div>
      </div>

      {/* 5 Prominent Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* 1. সর্বমোট খরচ (Total Gross Expenses) */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-5 text-white shadow-md">
          <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
            সর্বমোট খরচ (Gross Total)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {formatTaka(totalGrossExpense)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <Receipt className="w-3.5 h-3.5 text-slate-400" />
            নগদ + বাকি মিলিয়ে মোট ব্যয়
          </p>
        </div>

        {/* 2. মোট নগদ পরিশোধ (Total Cash Paid) */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 text-white shadow-md shadow-emerald-600/20">
          <span className="text-[11px] font-semibold text-emerald-100 uppercase tracking-wider block">
            মোট নগদ পরিশোধ (Cash Paid)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {formatTaka(totalActualCashPaid)}
          </div>
          <p className="text-[11px] text-emerald-100 mt-1 flex items-center gap-1">
            <Wallet className="w-3.5 h-3.5" />
            নগদ দেওয়া + কিস্তিতে জমা
          </p>
        </div>

        {/* 3. মোট বাকি নেওয়া (Total Due Taken) */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-md shadow-blue-600/20">
          <span className="text-[11px] font-semibold text-blue-100 uppercase tracking-wider block">
            মোট বাকি নেওয়া হয়েছিল (Credit Taken)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {formatTaka(totalDueTaken)}
          </div>
          <p className="text-[11px] text-blue-100 mt-1 flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" />
            দোকান বা ডিলার থেকে মূল বাকি
          </p>
        </div>

        {/* 4. বাকি থেকে মোট জমা/পরিশোধ (Total Due Repaid) */}
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-5 text-white shadow-md shadow-teal-500/20">
          <span className="text-[11px] font-semibold text-teal-100 uppercase tracking-wider block">
            বাকি থেকে জমা দিয়েছি (Due Repaid)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {formatTaka(totalDueRepaid)}
          </div>
          <p className="text-[11px] text-teal-100 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            পরবর্তীতে কিস্তিতে পরিশোধ
          </p>
        </div>

        {/* 5. এখন কত টাকা বাকি আছে (Net Remaining Due) - Highlighted */}
        <div
          className={`rounded-2xl p-5 text-white shadow-md ring-4 ${
            currentRemainingDue > 0
              ? 'bg-gradient-to-br from-rose-600 to-red-700 shadow-rose-600/30 ring-rose-300'
              : 'bg-gradient-to-br from-emerald-600 to-green-700 shadow-emerald-600/20 ring-emerald-300'
          }`}
        >
          <span className="text-xs font-black text-white uppercase tracking-wider block">
            এখন কত টাকা বাকি আছে (Net Due)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            {formatTaka(currentRemainingDue)}
          </div>
          <p className="text-[11px] text-white mt-1 flex items-center gap-1 font-bold">
            {currentRemainingDue > 0 ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-white" />
                বাকি থেকে জমা মাইনাস করে এখন বকেয়া
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                কোনো বকেয়া বাকি নেই!
              </>
            )}
          </p>
        </div>

      </div>

      {/* Due Ledger Notice Bar - Prominently Displaying Current Remaining Due */}
      <div className="bg-gradient-to-r from-amber-50 to-rose-50 border-2 border-rose-300/80 rounded-2xl p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xs font-black text-rose-700 uppercase tracking-wider">বাকি ও জমার সমন্বিত খাতা</span>
              <span className="px-2 py-0.5 rounded-md bg-rose-200 text-rose-900 font-bold text-[11px]">
                এখন মোট বাকি: {formatTaka(currentRemainingDue)}
              </span>
            </div>
            <strong className="text-slate-900 text-sm font-bold block">
              মোট বাকি নেওয়া হয়েছিল: <span className="text-blue-700 font-black">{formatTaka(totalDueTaken)}</span> | জমা দিয়েছেন: <span className="text-teal-700 font-black">{formatTaka(totalDueRepaid)}</span>
            </strong>
            <p className="text-slate-600 mt-0.5">
              ক্যাটাগরিতে <strong>'বাকি জমা / পরিশোধ'</strong> নির্বাচন করে টাকা জমা দিলে তা স্বয়ংক্রিয়ভাবে মূল বাকি থেকে বিয়োগ হয়ে <strong>এখন কত টাকা বাকি আছে ({formatTaka(currentRemainingDue)})</strong> সাথে সাথে সমন্বয় হয়।
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs w-full min-w-0">
        {/* Payment status filter tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full sm:w-auto min-w-0">
          <button
            onClick={() => setPaymentFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              paymentFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            সব খরচ ({toBnNumber(expenses.length)})
          </button>
          <button
            onClick={() => setPaymentFilter('due_only')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              paymentFilter === 'due_only'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            বাকি আছে
          </button>
          <button
            onClick={() => setPaymentFilter('cleared')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              paymentFilter === 'cleared'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            পরিশোধিত বাকি
          </button>
          <button
            onClick={() => setPaymentFilter('repaid_entries')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              paymentFilter === 'repaid_entries'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            জমা রসিদসমূহ
          </button>
          <button
            onClick={() => setPaymentFilter('cash_only')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              paymentFilter === 'cash_only'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            শুধুমাত্র নগদ
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto min-w-0">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-rose-500 outline-none flex-1 sm:flex-initial min-w-[120px]"
          >
            <option value="all">সব ক্যাটাগরি</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-56 min-w-[140px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="দোকান বা নোট দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Main Split Layout: Expense Ledger + Side Category Breakdown Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Expense Entries Table with Due Tracking & Payment Action */}
        <div className="lg:col-span-8 min-w-0 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base">খরচের বিস্তারিত ভাউচার ও বাকি খাতা</h3>
                {selectedCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200 transition-colors"
                  >
                    <span>খাত: {selectedCategory}</span>
                    <span className="font-black">✕</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-400">প্রতিটি ভাউচারের নগদ, মূল বাকি, জমা ও অবশিষ্ট দেনা বিবরণ</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                মোট খরচ: {formatTaka(purchaseExpenses.reduce((s, e) => s + e.amount, 0))}
              </span>
              <span className={`text-xs sm:text-sm font-black px-3.5 py-1.5 rounded-xl border flex items-center gap-1.5 ${
                currentRemainingDue > 0
                  ? 'bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-rose-400/30'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                <AlertCircle className="w-4 h-4 text-rose-600" />
                এখন মোট বাকি আছে: {formatTaka(currentRemainingDue)}
              </span>
            </div>
          </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            কোনো খরচের রেকর্ড পাওয়া যায়নি
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredExpenses.map((exp) => {
              const isRepaymentRecord = exp.category === 'বাকি জমা / পরিশোধ';

              // Calculate item due & repaid
              const initialDue = exp.paymentMethod === 'বাকি'
                ? (exp.dueAmount !== undefined ? exp.dueAmount : exp.amount)
                : exp.paymentMethod === 'আংশিক নগদ ও বাকি'
                ? (exp.dueAmount !== undefined ? exp.dueAmount : Math.max(0, exp.amount - (exp.paidAmount || 0)))
                : (exp.dueAmount || 0);

              const initialCash = exp.paidAmount !== undefined
                ? exp.paidAmount
                : (exp.paymentMethod === 'নগদ' ? exp.amount : 0);

              const repaid = exp.repaidAmount || 0;
              const remainingDue = Math.max(0, initialDue - repaid);
              const hasDue = !isRepaymentRecord && initialDue > 0;
              const isExpanded = expandedPaymentHistoryId === exp.id;

              return (
                <div
                  key={exp.id}
                  className={`p-4 transition-colors ${
                    isRepaymentRecord ? 'bg-teal-50/40 hover:bg-teal-50/80' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    
                    {/* Left Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{formatBnDate(exp.date)}</span>
                        
                        {isRepaymentRecord ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800 border border-teal-300">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-teal-600" />
                            বাকি জমা / পরিশোধ
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {exp.category}
                          </span>
                        )}

                        {/* Payment badge */}
                        {isRepaymentRecord ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            বাকি মাইনাস হয়েছে: - {formatTaka(exp.amount)}
                          </span>
                        ) : hasDue ? (
                          remainingDue > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              বাকি আছে: {formatTaka(remainingDue)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              বাকি পরিশোধিত (পরিপূর্ণ)
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <Wallet className="w-3 h-3" />
                            নগদ পরিশোধ
                          </span>
                        )}

                        {exp.supplierName && (
                          <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 text-slate-400" />
                            {exp.supplierName}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 font-medium">{exp.note}</p>

                      {/* Detailed Breakdown Pill for this specific item */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-1">
                        {isRepaymentRecord ? (
                          <>
                            <span>জমার তারিখ: <strong className="text-slate-800 font-bold">{formatBnDate(exp.date)}</strong></span>
                            <span>•</span>
                            <span>জমা দেওয়া টাকা: <strong className="text-teal-700 font-bold">{formatTaka(exp.amount)}</strong></span>
                            <span>•</span>
                            <span>পেমেন্ট মাধ্যম: <strong className="text-slate-800 font-semibold">{exp.paymentMethod || 'নগদ'}</strong></span>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">বাকি থেকে কর্তন হয়েছে</span>
                          </>
                        ) : (
                          <>
                            <span>মোট বিল: <strong className="text-slate-800">{formatTaka(exp.amount)}</strong></span>
                            <span>•</span>
                            <span>নগদ দেওয়া: <strong className="text-emerald-700">{formatTaka(initialCash)}</strong></span>
                            
                            {hasDue && (
                              <>
                                <span>•</span>
                                <span>মূল বাকি ছিল: <strong className="text-blue-700">{formatTaka(initialDue)}</strong></span>
                                <span>•</span>
                                <span>জমা দেওয়া হয়েছে: <strong className="text-teal-700">{formatTaka(repaid)}</strong></span>
                                <span>•</span>
                                <span>বর্তমান বাকি: <strong className={remainingDue > 0 ? 'text-rose-600' : 'text-emerald-600'}>{formatTaka(remainingDue)}</strong></span>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Right Amounts & Actions */}
                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      <div className="text-right">
                        <span className="text-xs text-slate-400 block font-medium">
                          {isRepaymentRecord ? 'জমার পরিমাণ' : 'ভাউচার পরিমাণ'}
                        </span>
                        <span className={`font-black text-base ${isRepaymentRecord ? 'text-teal-700' : 'text-rose-600'}`}>
                          {isRepaymentRecord ? `+ ${formatTaka(exp.amount)}` : formatTaka(exp.amount)}
                        </span>
                      </div>

                      {/* Payment history expander button */}
                      {exp.paymentsHistory && exp.paymentsHistory.length > 0 && (
                        <button
                          onClick={() =>
                            setExpandedPaymentHistoryId(isExpanded ? null : exp.id)
                          }
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 text-xs font-bold transition-colors flex items-center gap-1"
                          title="জমা দেওয়া কিস্তির ইতিহাস"
                        >
                          <History className="w-3.5 h-3.5 text-teal-600" />
                          <span className="hidden sm:inline">ইতিহাস</span>
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await confirmAction({
                            title: 'খরচের রেকর্ড মুছে ফেলবেন?',
                            message: `আপনি কি এই খরচের রেকর্ডটি (${formatTaka(exp.amount)}) মুছে ফেলতে চান?`,
                            confirmLabel: 'হ্যাঁ, মুছে ফেলুন',
                            tone: 'danger'
                          });
                          if (ok) {
                            onDeleteExpense(exp.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors"
                        title="মুছে ফেলুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>

                  {/* Payment History Accordion */}
                  {isExpanded && exp.paymentsHistory && exp.paymentsHistory.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
                      <div className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                        <History className="w-4 h-4 text-teal-600" />
                        বাকি পরিশোধ ও কিস্তি জমার হিস্টোরি:
                      </div>
                      <div className="space-y-1.5">
                        {exp.paymentsHistory.map((pay, pIdx) => (
                          <div
                            key={pay.id || pIdx}
                            className="bg-white p-2.5 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-800">{formatBnDate(pay.date)}</span>
                              <span className="text-slate-500 ml-2">({pay.paymentMethod})</span>
                              {pay.note && (
                                <p className="text-[11px] text-slate-400 mt-0.5">{pay.note}</p>
                              )}
                            </div>
                            <span className="font-black text-emerald-600">
                              + {formatTaka(pay.amount)} জমা
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-800 text-[11px]">
                        <span>মোট জমা হয়েছে: {formatTaka(repaid)}</span>
                        <span>অবশিষ্ট বাকি: {formatTaka(remainingDue)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Right Side Panel: খাত/ক্যাটাগরি অনুযায়ী আলাদা খরচের হিসাব */}
        <aside className="order-first lg:order-last lg:col-span-4 min-w-0 lg:sticky lg:top-20 bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-gradient-to-r from-slate-50 to-rose-50/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <PieChart className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-slate-900 text-sm truncate">
                  কিসে কত খরচ (খাত অনুযায়ী)
                </h3>
                <p className="text-[11px] text-slate-500 truncate">
                  ক্যাটাগরিতে ক্লিক করলে পাশের তালিকা ফিল্টার হবে
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold hover:bg-slate-700 transition-colors"
                >
                  সব খাত
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsCategoryPanelOpen(!isCategoryPanelOpen)}
                className="lg:hidden p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="খাত অনুযায়ী হিসাব দেখুন বা লুকান"
              >
                {isCategoryPanelOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className={`${isCategoryPanelOpen ? 'block' : 'hidden lg:block'} p-3.5 space-y-2.5`}>
            {/* Grand Total Row */}
            <div className="p-3 rounded-2xl bg-slate-900 text-white flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-slate-300 font-semibold block">সব খাত মিলিয়ে মোট খরচ</span>
                <span className="text-base font-black">{formatTaka(totalGrossExpense)}</span>
              </div>
              <span className="text-[11px] font-bold bg-white/15 px-2.5 py-1 rounded-lg">
                {toBnNumber(purchaseExpenses.length)} টি ভাউচার
              </span>
            </div>

            {/* Category Cards */}
            <div className="space-y-2">
              {categoryBreakdown.map((item) => {
                const styles = CATEGORY_STYLE_MAP[item.category] || CATEGORY_STYLE_MAP['অন্যান্য'];
                const isSelected = selectedCategory === item.category;

                return (
                  <button
                    key={item.category}
                    type="button"
                    onClick={() =>
                      setSelectedCategory(isSelected ? 'all' : item.category)
                    }
                    className={`w-full text-left p-2.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-rose-400 bg-rose-50/70 ring-2 ring-rose-200'
                        : item.total > 0
                        ? 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                        : 'border-slate-100 bg-white opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${styles.dot}`} />
                        <span className="text-xs font-bold text-slate-800 truncate">
                          {item.category}
                        </span>
                        {item.count > 0 && (
                          <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                            ({toBnNumber(item.count)})
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900">
                          {formatTaka(item.total)}
                        </span>
                      </div>
                    </div>

                    {/* Visual Share Bar & Info */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${styles.bar}`}
                          style={{ width: `${item.total > 0 ? Math.max(4, item.percent) : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 w-9 text-right shrink-0">
                        {toBnNumber(item.percent)}%
                      </span>
                    </div>

                    {item.remainingDue > 0 && (
                      <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold text-rose-700">
                        <span>এই খাতে বাকি:</span>
                        <span>{formatTaka(item.remainingDue)}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Separate Repayment Summary Line (if any standalone/repaid entries exist) */}
            {totalDueRepaid > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === 'বাকি জমা / পরিশোধ' ? 'all' : 'বাকি জমা / পরিশোধ'
                  )
                }
                className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                  selectedCategory === 'বাকি জমা / পরিশোধ'
                    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                    : 'border-teal-200 bg-teal-50/50 hover:bg-teal-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="text-xs font-bold text-teal-900 truncate">
                    বাকি জমা / পরিশোধ
                  </span>
                </div>
                <span className="text-xs font-black text-teal-700 shrink-0">
                  {formatTaka(totalDueRepaid)}
                </span>
              </button>
            )}
          </div>
        </aside>
      </div>

      {/* Modal 1: Add New Expense OR Add Due Repayment (জমা) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">
                  {isDepositCategory ? 'বাকি জমা বা পরিশোধের হিসাব লিখুন' : 'নতুন খরচ বা ক্রয়ের হিসাব লিখুন'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isDepositCategory ? 'জমা দেওয়া টাকা সাথে সাথে বাকি থেকে বিয়োগ হবে' : 'নগদ বা বাকি ক্রয়ের হিসাব লিপিবদ্ধ করুন'}
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Remaining Due Status Banner inside Modal */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border border-rose-200 flex items-center justify-between text-xs mb-4 shadow-2xs">
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">খামারের বর্তমান বকেয়া হিসাব:</span>
                <strong className="text-rose-700 text-sm font-black flex items-center gap-1 mt-0.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  এখন মোট বাকি আছে: {formatTaka(currentRemainingDue)}
                </strong>
              </div>
              <div className="text-right text-[11px] text-slate-600">
                <span>মূল বাকি: {formatTaka(totalDueTaken)}</span>
                <span className="block text-emerald-700 font-bold">জমা হয়েছে: {formatTaka(totalDueRepaid)}</span>
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">তারিখ *</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  খরচের ক্যাটাগরি (খাত) *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat} {cat === 'বাকি জমা / পরিশোধ' ? '⭐ (বাকি থেকে মাইনাস)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* IF CATEGORY IS "বাকি জমা / পরিশোধ" */}
              {isDepositCategory ? (
                <div className="space-y-4">
                  {/* Amount to deposit */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      কত টাকা জমা দিচ্ছেন? (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="যেমন: ১০,০০০"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  {/* Target Due Selection */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      কোন বাকির বিপরীতে জমা দিচ্ছেন?
                    </label>
                    <select
                      value={targetDueExpenseId}
                      onChange={(e) => setTargetDueExpenseId(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                    >
                      <option value="general">
                        ফার্মের সাধারণ মোট বাকি থেকে জমা (অবশিষ্ট দেনা: {formatTaka(currentRemainingDue)})
                      </option>
                      {pendingDueExpenses.map((exp) => {
                        const initDue = exp.paymentMethod === 'বাকি'
                          ? (exp.dueAmount ?? exp.amount)
                          : (exp.dueAmount ?? Math.max(0, exp.amount - (exp.paidAmount || 0)));
                        const rem = Math.max(0, initDue - (exp.repaidAmount || 0));

                        return (
                          <option key={exp.id} value={exp.id}>
                            {exp.supplierName ? `${exp.supplierName} - ` : ''}{exp.note} (বাকি: {formatTaka(rem)})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* LIVE REAL-TIME CALCULATION BOX (As requested: বাকি থেকে বিয়োগ হয়ে এখন কত টাকা বাকি আছে তা লেখা উঠবে) */}
                  <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 space-y-2">
                    <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                      স্বয়ংক্রিয় বকেয়া সমন্বয় হিসাব (Live Calculation)
                    </span>

                    {targetDueExpenseId === 'general' ? (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-700">
                          <span>বর্তমানে মোট বাকি আছে:</span>
                          <strong className="text-slate-900">{formatTaka(currentRemainingDue)}</strong>
                        </div>
                        <div className="flex justify-between text-teal-700 font-semibold">
                          <span>আজকে জমা দিচ্ছেন:</span>
                          <strong>- {formatTaka(totalNum)}</strong>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-teal-300 font-black text-sm">
                          <span className="text-slate-900">জমার পর অবশিষ্ট বাকি থাকবে:</span>
                          <span className={remainingAfterDeposit > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                            {formatTaka(remainingAfterDeposit)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between text-slate-700">
                          <span>এই ভাউচারের বর্তমান বাকি:</span>
                          <strong className="text-slate-900">{formatTaka(selectedTargetRemaining)}</strong>
                        </div>
                        <div className="flex justify-between text-teal-700 font-semibold">
                          <span>আজকে জমা দিচ্ছেন:</span>
                          <strong>- {formatTaka(totalNum)}</strong>
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-teal-300 font-black text-sm">
                          <span className="text-slate-900">জমার পর এই ভাউচারে বাকি থাকবে:</span>
                          <span className={selectedTargetAfterDeposit > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                            {formatTaka(selectedTargetAfterDeposit)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                          <span>ফার্মের মোট অবশিষ্ট বাকি থাকবে:</span>
                          <strong className="text-slate-800">{formatTaka(remainingAfterDeposit)}</strong>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      পেমেন্ট মাধ্যম (কীভাবে টাকা জমা দিয়েছেন?)
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                    >
                      <option value="নগদ">নগদ (Cash)</option>
                      <option value="বিকাশ/নগদ/রকেট">বিকাশ / নগদ / রকেট</option>
                      <option value="ব্যাংক">ব্যাংক ট্রান্সফার / চেক</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      রসিদ নম্বর বা নোট (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: দোকানদার মেমো নং ৪২"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
              ) : (
                /* REGULAR EXPENSE FORM */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      মোট খরচের টাকা (৳) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="যেমন: ৫০,০০০"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  {/* Payment Type Selection: Cash, Due, or Partial */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      টাকা কীভাবে পরিশোধ করেছেন? (Payment Status)
                    </label>
                    
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setPaymentTypeOption('নগদ')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                          paymentTypeOption === 'নগদ'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        সম্পূর্ণ নগদ
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentTypeOption('বাকি')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                          paymentTypeOption === 'বাকি'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        সম্পূর্ণ বাকি
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentTypeOption('আংশিক')}
                        className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                          paymentTypeOption === 'আংশিক'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        আংশিক নগদ ও বাকি
                      </button>
                    </div>

                    {/* If Partial, ask how much was paid in cash */}
                    {paymentTypeOption === 'আংশিক' && (
                      <div className="mb-3">
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          নগদে পরিশোধকৃত অংশ (৳)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="যেমন: ২০,০০০"
                          value={paidPortion}
                          onChange={(e) => setPaidPortion(e.target.value)}
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                        />
                      </div>
                    )}

                    {/* Live Split Indicator Box */}
                    <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex flex-col gap-1.5 font-bold">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-700">
                          নগদ পরিশোধ: {formatTaka(calculatedCash)}
                        </span>
                        <span className="text-rose-600">
                          নতুন বাকি যোগ: {formatTaka(calculatedDue)}
                        </span>
                      </div>
                      {calculatedDue > 0 && (
                        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-700">
                          <span>আগের বাকি: {formatTaka(currentRemainingDue)}</span>
                          <span className="text-rose-700 font-black">
                            এখন মোট বাকি হবে: {formatTaka(currentRemainingDue + calculatedDue)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      দোকান / ডিলার / মহাজনের নাম (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: মেসার্স ভাই ভাই ফিড স্টোর"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      বিবরণ বা নোট
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: ফিড ১০ বস্তা বা বাচ্চা পরিবহন"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                  </div>
                </div>
              )}

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
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs ${
                    isDepositCategory ? 'bg-teal-600 hover:bg-teal-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isDepositCategory ? 'জমা নিশ্চিত করুন' : 'খরচ সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
