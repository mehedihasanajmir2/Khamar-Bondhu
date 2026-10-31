import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, TabType } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { BatchManager } from './components/BatchManager';
import { MedicineSchedule } from './components/MedicineSchedule';
import { ExpenseLog } from './components/ExpenseLog';
import { SalesLog } from './components/SalesLog';
import { ReportView } from './components/ReportView';
import { UserProfile } from './components/UserProfile';
import { NewBatchModal } from './components/NewBatchModal';
import { AuthModal } from './components/AuthModal';
import { ArchiveBatchModal } from './components/ArchiveBatchModal';
import { PoultryStorageService } from './services/storage';
import {
  Batch,
  BatchSummary,
  ExpenseRecord,
  GrowthRecord,
  MedicineScheduleItem,
  SaleRecord
} from './types';
import { toBnNumber } from './utils/formatters';
import {
  LayoutDashboard,
  Layers,
  Syringe,
  Receipt,
  TrendingUp,
  FileSpreadsheet,
  UserCheck,
  ShieldAlert
} from 'lucide-react';

const MainApp: React.FC = () => {
  const { currentUser, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Modals
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [batchToArchiveId, setBatchToArchiveId] = useState<string | null>(null);

  // Scoped Data State
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([]);
  const [medicines, setMedicines] = useState<MedicineScheduleItem[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [summary, setSummary] = useState<BatchSummary | null>(null);

  // Toast / notification
  const [notification, setNotification] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Load tenant's batches whenever user changes
  useEffect(() => {
    if (!currentUser) {
      setBatches([]);
      setActiveBatchId(null);
      setGrowthRecords([]);
      setMedicines([]);
      setExpenses([]);
      setSales([]);
      setSummary(null);
      return;
    }

    try {
      const userBatches = PoultryStorageService.getBatches(currentUser.uid);
      setBatches(userBatches);

      if (userBatches.length > 0) {
        // Select first active batch or first batch
        const active = userBatches.find((b) => b.status === 'active') || userBatches[0];
        setActiveBatchId(active.id);
      } else {
        setActiveBatchId(null);
      }
    } catch (err: any) {
      console.error('RLS Isolation check:', err);
    }
  }, [currentUser]);

  // Load records for active batch
  useEffect(() => {
    if (!currentUser || !activeBatchId) {
      setGrowthRecords([]);
      setMedicines([]);
      setExpenses([]);
      setSales([]);
      setSummary(null);
      return;
    }

    try {
      const currentBatch = PoultryStorageService.getBatchById(currentUser.uid, activeBatchId);
      if (!currentBatch) return;

      const g = PoultryStorageService.getGrowthRecords(currentUser.uid, activeBatchId);
      const m = PoultryStorageService.getMedicineSchedule(currentUser.uid, activeBatchId);
      const e = PoultryStorageService.getExpenses(currentUser.uid, activeBatchId);
      const s = PoultryStorageService.getSales(currentUser.uid, activeBatchId);
      const sum = PoultryStorageService.calculateBatchSummary(currentUser.uid, currentBatch);

      setGrowthRecords(g);
      setMedicines(m);
      setExpenses(e);
      setSales(s);
      setSummary(sum);
    } catch (err: any) {
      console.error('Error fetching batch data with RLS check:', err);
      showToast(err.message || 'ডাটা লোড করতে সমস্যা হয়েছে');
    }
  }, [currentUser, activeBatchId]);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || null;

  // --- Handlers ---
  const handleSelectBatch = (batchId: string) => {
    setActiveBatchId(batchId);
  };

  const handleCreateBatch = (batchData: Omit<Batch, 'id' | 'userId' | 'createdAt'>) => {
    if (!currentUser) return;
    const newId = `batch_${Date.now()}`;
    const newBatch: Batch = {
      ...batchData,
      id: newId,
      userId: currentUser.uid,
      createdAt: new Date().toISOString()
    };

    PoultryStorageService.saveBatch(currentUser.uid, newBatch);

    // Auto-create initial chick expense if price specified
    if (newBatch.initialChicks > 0 && newBatch.chickPricePerUnit > 0) {
      const chickExpense: ExpenseRecord = {
        id: `exp_chick_${newId}`,
        batchId: newId,
        userId: currentUser.uid,
        date: newBatch.startDate,
        category: 'বাচ্চা ক্রয়',
        amount: newBatch.initialChicks * newBatch.chickPricePerUnit,
        note: `${newBatch.initialChicks} টি ${newBatch.birdType} বাচ্চা ক্রয় (প্রতিটি ${newBatch.chickPricePerUnit} টাকা)`,
        paymentMethod: 'নগদ'
      };
      PoultryStorageService.saveExpense(currentUser.uid, chickExpense);
    }

    const updatedBatches = PoultryStorageService.getBatches(currentUser.uid);
    setBatches(updatedBatches);
    setActiveBatchId(newId);
    showToast('নতুন ব্যাচ সফলভাবে খোলা হয়েছে!');
  };

  const handleToggleBatchStatus = (batchId: string, currentStatus: 'active' | 'completed') => {
    if (!currentUser) return;
    const batch = batches.find((b) => b.id === batchId);
    if (!batch) return;

    const nextStatus = currentStatus === 'active' ? 'completed' : 'active';
    const updated: Batch = {
      ...batch,
      status: nextStatus,
      completedDate: nextStatus === 'completed' ? new Date().toISOString().split('T')[0] : undefined
    };

    PoultryStorageService.saveBatch(currentUser.uid, updated);
    const updatedBatches = PoultryStorageService.getBatches(currentUser.uid);
    setBatches(updatedBatches);
    showToast(nextStatus === 'completed' ? 'ব্যাচ সম্পন্ন ও সংরক্ষিত হয়েছে' : 'ব্যাচ পুনরায় সক্রিয় করা হয়েছে');
  };

  const handleRequestArchive = (batchId: string) => {
    setBatchToArchiveId(batchId);
    setIsArchiveModalOpen(true);
  };

  const handleConfirmArchive = (batchId: string) => {
    if (!currentUser) return;
    PoultryStorageService.archiveBatch(currentUser.uid, batchId);
    const updated = PoultryStorageService.getBatches(currentUser.uid);
    setBatches(updated);

    // If archived batch was currently active, switch to first active batch or first batch
    const active = updated.find((b) => b.status === 'active');
    setActiveBatchId(active ? active.id : updated.length > 0 ? updated[0].id : null);

    setIsArchiveModalOpen(false);
    setBatchToArchiveId(null);
    showToast('ব্যাচটি সফলভাবে সম্পন্ন ও প্রোফাইল আর্কাইভে সংরক্ষিত হয়েছে!');
  };

  const handleRestoreBatch = (batchId: string) => {
    if (!currentUser) return;
    PoultryStorageService.restoreBatch(currentUser.uid, batchId);
    const updated = PoultryStorageService.getBatches(currentUser.uid);
    setBatches(updated);
    setActiveBatchId(batchId);
    showToast('ব্যাচ পুনরায় সক্রিয় করা হয়েছে');
  };

  const handleDeleteBatch = (batchId: string) => {
    if (!currentUser) return;
    if (confirm('আপনি কি নিশ্চিত এই সম্পূর্ণ ব্যাচ ও এর সমস্ত হিসাব মুছে ফেলতে চান?')) {
      PoultryStorageService.deleteBatch(currentUser.uid, batchId);
      const remaining = PoultryStorageService.getBatches(currentUser.uid);
      setBatches(remaining);
      setActiveBatchId(remaining.length > 0 ? remaining[0].id : null);
      showToast('ব্যাচ সফলভাবে মুছে ফেলা হয়েছে');
    }
  };

  // Growth Records
  const handleAddGrowthRecord = (rec: Omit<GrowthRecord, 'id' | 'batchId' | 'userId'>) => {
    if (!currentUser || !activeBatchId) return;
    const record: GrowthRecord = {
      ...rec,
      id: `growth_${Date.now()}`,
      batchId: activeBatchId,
      userId: currentUser.uid
    };
    PoultryStorageService.saveGrowthRecord(currentUser.uid, record);
    setGrowthRecords(PoultryStorageService.getGrowthRecords(currentUser.uid, activeBatchId));
    if (activeBatch) {
      setSummary(PoultryStorageService.calculateBatchSummary(currentUser.uid, activeBatch));
    }
    showToast('ওজন ও বৃদ্ধির রেকর্ড সংরক্ষিত হয়েছে');
  };

  const handleDeleteGrowthRecord = (recId: string) => {
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.deleteGrowthRecord(currentUser.uid, activeBatchId, recId);
    setGrowthRecords(PoultryStorageService.getGrowthRecords(currentUser.uid, activeBatchId));
    if (activeBatch) {
      setSummary(PoultryStorageService.calculateBatchSummary(currentUser.uid, activeBatch));
    }
    showToast('রেকর্ড মুছে ফেলা হয়েছে');
  };

  // Medicine Schedule
  const handleToggleMedicine = (itemId: string) => {
    if (!currentUser || !activeBatchId) return;
    const updated = PoultryStorageService.toggleMedicineStatus(currentUser.uid, activeBatchId, itemId);
    setMedicines(updated);
    showToast('ওষুধ/টিকা স্ট্যাটাস আপডেট হয়েছে');
  };

  const handleAddMedicine = (
    itemOrItems:
      | Omit<MedicineScheduleItem, 'id' | 'batchId' | 'userId'>
      | Array<Omit<MedicineScheduleItem, 'id' | 'batchId' | 'userId'>>
  ) => {
    if (!currentUser || !activeBatchId) return;
    const itemsList = Array.isArray(itemOrItems) ? itemOrItems : [itemOrItems];
    const newItems: MedicineScheduleItem[] = itemsList.map((item, idx) => ({
      ...item,
      id: `med_cust_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
      batchId: activeBatchId,
      userId: currentUser.uid
    }));
    PoultryStorageService.addMedicineItems(currentUser.uid, newItems);
    setMedicines(PoultryStorageService.getMedicineSchedule(currentUser.uid, activeBatchId));
    showToast(newItems.length > 1 ? `${toBnNumber(newItems.length)} দিনের ওষুধ সফলভাবে যুক্ত হয়েছে` : 'নতুন ওষুধ যুক্ত হয়েছে');
  };

  const handleUpdateMedicine = (item: MedicineScheduleItem) => {
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.updateMedicineItem(currentUser.uid, item);
    setMedicines(PoultryStorageService.getMedicineSchedule(currentUser.uid, activeBatchId));
    showToast('ওষুধ/টিকা তথ্য সফলভাবে আপডেট হয়েছে');
  };

  const handleDeleteMedicine = (itemId: string) => {
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.deleteMedicineItem(currentUser.uid, activeBatchId, itemId);
    setMedicines(PoultryStorageService.getMedicineSchedule(currentUser.uid, activeBatchId));
    showToast('আইটেম মুছে ফেলা হয়েছে');
  };

  const handleClearAllMedicines = () => {
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.clearAllMedicines(currentUser.uid, activeBatchId);
    setMedicines([]);
    showToast('সমস্ত ওষুধ তালিকা খালি করা হয়েছে');
  };

  const handleResetMedicineSchedule = () => {
    if (!currentUser || !activeBatchId) return;
    const restored = PoultryStorageService.resetMedicineSchedule(currentUser.uid, activeBatchId);
    setMedicines(restored);
    showToast('আদর্শ পোল্ট্রি শিডিউল লোড করা হয়েছে');
  };

  // Expenses
  const handleAddExpense = (exp: Omit<ExpenseRecord, 'id' | 'batchId' | 'userId'>) => {
    if (!currentUser || !activeBatchId) return;
    const newExpense: ExpenseRecord = {
      ...exp,
      id: `exp_${Date.now()}`,
      batchId: activeBatchId,
      userId: currentUser.uid
    };
    PoultryStorageService.saveExpense(currentUser.uid, newExpense);
    const updated = PoultryStorageService.getExpenses(currentUser.uid, activeBatchId);
    setExpenses(updated);
    if (activeBatch) {
      setSummary(PoultryStorageService.calculateBatchSummary(currentUser.uid, activeBatch));
    }
    showToast('খরচ সফলভাবে যোগ করা হয়েছে');
  };

  const handleDeleteExpense = (expId: string) => {
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.deleteExpense(currentUser.uid, activeBatchId, expId);
    const updated = PoultryStorageService.getExpenses(currentUser.uid, activeBatchId);
    setExpenses(updated);
    if (activeBatch) {
      setSummary(PoultryStorageService.calculateBatchSummary(currentUser.uid, activeBatch));
    }
    showToast('খরচ মুছে ফেলা হয়েছে');
  };

  const handleRecordDuePayment = (
    expenseId: string,
    amount: number,
    date: string,
    paymentMethod: 'নগদ' | 'বিকাশ/নগদ/রকেট' | 'ব্যাংক',
    note?: string
  ) => {
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.recordDuePayment(
      currentUser.uid,
      activeBatchId,
      expenseId,
      amount,
      date,
      paymentMethod,
      note
    );
    const updated = PoultryStorageService.getExpenses(currentUser.uid, activeBatchId);
    setExpenses(updated);
    if (activeBatch) {
      setSummary(PoultryStorageService.calculateBatchSummary(currentUser.uid, activeBatch));
    }
    showToast('বাকি থেকে কিস্তি জমা সফল হয়েছে');
  };

  // Sales
  const handleAddSale = (saleData: Omit<SaleRecord, 'id' | 'batchId' | 'userId'>) => {
    if (!currentUser || !activeBatchId) return;
    const newSale: SaleRecord = {
      ...saleData,
      id: `sale_${Date.now()}`,
      batchId: activeBatchId,
      userId: currentUser.uid
    };
    PoultryStorageService.saveSale(currentUser.uid, newSale);
    const updated = PoultryStorageService.getSales(currentUser.uid, activeBatchId);
    setSales(updated);
    if (activeBatch) {
      setSummary(PoultryStorageService.calculateBatchSummary(currentUser.uid, activeBatch));
    }
    showToast('বিক্রির চালান সংরক্ষিত হয়েছে');
  };

  const handleDeleteSale = (saleId: string) => {
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.deleteSale(currentUser.uid, activeBatchId, saleId);
    const updated = PoultryStorageService.getSales(currentUser.uid, activeBatchId);
    setSales(updated);
    if (activeBatch) {
      setSummary(PoultryStorageService.calculateBatchSummary(currentUser.uid, activeBatch));
    }
    showToast('বিক্রির রেকর্ড মুছে ফেলা হয়েছে');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">খামার বন্ধু লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Hind_Siliguri',sans-serif]">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 animate-bounce">
          <span>✓</span>
          <span>{notification}</span>
        </div>
      )}

      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewBatchModal={() => setIsNewBatchOpen(true)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        remainingDue={summary?.currentRemainingDue || 0}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-24 sm:pb-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            activeBatch={activeBatch}
            summary={summary}
            batches={batches}
            onSelectBatch={handleSelectBatch}
            onOpenNewBatch={() => setIsNewBatchOpen(true)}
            onNavigateTab={setActiveTab}
            medicines={medicines}
            recentExpenses={expenses}
            recentSales={sales}
            onToggleMedicine={handleToggleMedicine}
            onRequestArchiveBatch={handleRequestArchive}
          />
        )}

        {activeTab === 'batch' && (
          <BatchManager
            activeBatch={activeBatch}
            batches={batches}
            growthRecords={growthRecords}
            onSelectBatch={handleSelectBatch}
            onOpenNewBatchModal={() => setIsNewBatchOpen(true)}
            onAddGrowthRecord={handleAddGrowthRecord}
            onDeleteGrowthRecord={handleDeleteGrowthRecord}
            onToggleBatchStatus={handleToggleBatchStatus}
            onDeleteBatch={handleDeleteBatch}
            onRequestArchiveBatch={handleRequestArchive}
            onNavigateToHistory={() => setActiveTab('profile')}
            sales={sales}
          />
        )}

        {activeTab === 'medicine' && (
          <MedicineSchedule
            activeBatch={activeBatch}
            medicines={medicines}
            onToggleStatus={handleToggleMedicine}
            onAddMedicine={handleAddMedicine}
            onUpdateMedicine={handleUpdateMedicine}
            onDeleteMedicine={handleDeleteMedicine}
            onClearAll={handleClearAllMedicines}
            onResetToDefault={handleResetMedicineSchedule}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseLog
            activeBatch={activeBatch}
            expenses={expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onRecordDuePayment={handleRecordDuePayment}
          />
        )}

        {activeTab === 'sales' && (
          <SalesLog
            activeBatch={activeBatch}
            sales={sales}
            onAddSale={handleAddSale}
            onDeleteSale={handleDeleteSale}
          />
        )}

        {activeTab === 'reports' && (
          <ReportView
            activeBatch={activeBatch}
            summary={summary}
            expenses={expenses}
            sales={sales}
          />
        )}

        {activeTab === 'profile' && (
          <UserProfile
            batches={batches}
            activeBatchId={activeBatchId}
            onSelectBatch={handleSelectBatch}
            onArchiveBatch={handleRequestArchive}
            onRestoreBatch={handleRestoreBatch}
            onOpenNewBatchModal={() => setIsNewBatchOpen(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar - Ultra Ergonomic & Touch-Friendly */}
      <nav aria-label="মোবাইল মেনু" className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1.5 flex justify-around shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'dashboard'
              ? 'text-emerald-700 bg-emerald-50 scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5" />
          <span>হোম</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('batch')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'batch'
              ? 'text-emerald-700 bg-emerald-50 scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span>ব্যাচ ও ওজন</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('medicine')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'medicine'
              ? 'text-emerald-700 bg-emerald-50 scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Syringe className="w-4 h-4 mb-0.5" />
          <span>ওষুধ ও টিকা</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'expenses'
              ? 'text-rose-700 bg-rose-50 scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4 mb-0.5" />
          <span>খরচের খাতা</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'sales'
              ? 'text-teal-700 bg-teal-50 scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 mb-0.5" />
          <span>বিক্রির খাতা</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'profile'
              ? 'text-indigo-700 bg-indigo-50 scale-105'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4 mb-0.5" />
          <span>প্রোফাইল</span>
        </button>
      </nav>

      {/* Modals */}
      <NewBatchModal
        isOpen={isNewBatchOpen}
        onClose={() => setIsNewBatchOpen(false)}
        onSaveBatch={handleCreateBatch}
        existingBatchCount={batches.length}
      />

      <ArchiveBatchModal
        isOpen={isArchiveModalOpen}
        batch={batches.find((b) => b.id === batchToArchiveId) || activeBatch}
        summary={summary}
        onClose={() => {
          setIsArchiveModalOpen(false);
          setBatchToArchiveId(null);
        }}
        onConfirmArchive={handleConfirmArchive}
      />

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
