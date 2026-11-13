import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConfirmProvider, useConfirm } from './context/ConfirmContext';
import { Navbar, TabType } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { BatchManager } from './components/BatchManager';
import { MedicineSchedule } from './components/MedicineSchedule';
import { ExpenseLog } from './components/ExpenseLog';
import { SalesLog } from './components/SalesLog';
import { ReportView } from './components/ReportView';
import { UserProfile } from './components/UserProfile';
import { AIAssistant } from './components/AIAssistant';
import { UsersDirectory } from './components/UsersDirectory';
import { NewBatchModal } from './components/NewBatchModal';
import { AuthModal } from './components/AuthModal';
import { ArchiveBatchModal } from './components/ArchiveBatchModal';
import { PoultryStorageService } from './services/storage';
import {
  Batch,
  BatchSummary,
  DiseaseOutbreakRecord,
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
  ShieldAlert,
  Bot,
  Sparkles
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

const MainApp: React.FC = () => {
  const {
    currentUser,
    isLoading,
    isGuest,
    syncVersion,
    notifyDataChanged,
    isAuthModalOpen,
    setIsAuthModalOpen,
    openAuthModalWithReason
  } = useAuth();
  const { confirmAction } = useConfirm();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Modals
  const [isNewBatchOpen, setIsNewBatchOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [batchToArchiveId, setBatchToArchiveId] = useState<string | null>(null);

  // Auth Gate Guard: if in demo/guest mode, intercept action and trigger AuthModal
  const requireAuth = (
    reason: string = 'আপনার নিজস্ব খামারের তথ্য সংরক্ষণ করতে অনুগ্রহ করে একাউন্ট তৈরি করুন বা লগইন করুন।'
  ): boolean => {
    if (isGuest) {
      openAuthModalWithReason(reason);
      return false;
    }
    return true;
  };

  const handleOpenNewBatchModal = () => {
    if (
      !requireAuth(
        'নতুন ব্যাচ তৈরি ও নিজস্ব খামারের হিসাব রাখতে দয়া করে একাউন্ট তৈরি করুন বা লগইন করুন। নতুন একাউন্ট খুললে আপনার খামারের ড্যাশবোর্ড সম্পূর্ণ ব্ল্যাঙ্ক (Blank) থাকবে।'
      )
    ) {
      return;
    }
    setIsNewBatchOpen(true);
  };

  // Scoped Data State
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [growthRecords, setGrowthRecords] = useState<GrowthRecord[]>([]);
  const [medicines, setMedicines] = useState<MedicineScheduleItem[]>([]);
  const [diseaseLogs, setDiseaseLogs] = useState<DiseaseOutbreakRecord[]>([]);
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
      setDiseaseLogs([]);
      setExpenses([]);
      setSales([]);
      setSummary(null);
      return;
    }

    try {
      const userBatches = PoultryStorageService.getBatches(currentUser.uid);
      setBatches(userBatches);

      if (userBatches.length > 0) {
        setActiveBatchId((prev) => {
          if (prev && userBatches.some((b) => b.id === prev)) return prev;
          const active = userBatches.find((b) => b.status === 'active') || userBatches[0];
          return active.id;
        });
      } else {
        setActiveBatchId(null);
        setGrowthRecords([]);
        setMedicines([]);
        setDiseaseLogs([]);
        setExpenses([]);
        setSales([]);
        setSummary(null);
      }
    } catch (err: any) {
      console.error('RLS Isolation check:', err);
    }
  }, [currentUser, syncVersion]);

  // Real-time Firestore sync listener for authenticated user
  useEffect(() => {
    if (!currentUser || isGuest) return;

    if (auth.currentUser && auth.currentUser.uid === currentUser.uid) {
      const batchesCollRef = collection(db, 'users', currentUser.uid, 'batches');
      const unsubscribe = onSnapshot(
        batchesCollRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteBatches: Batch[] = [];
            snapshot.forEach((docSnap) => {
              remoteBatches.push(docSnap.data() as Batch);
            });
            const key = PoultryStorageService.getKey('poultry_batches', currentUser.uid);
            localStorage.setItem(key, JSON.stringify(remoteBatches));
            setBatches(remoteBatches);
            setActiveBatchId((prev) => {
              if (prev && remoteBatches.some((b) => b.id === prev)) return prev;
              const active = remoteBatches.find((b) => b.status === 'active') || remoteBatches[0];
              return active.id;
            });
          }
        },
        (error) => {
          console.warn('Real-time batches snapshot listener error:', error);
        }
      );
      return () => unsubscribe();
    }
  }, [currentUser, isGuest]);

  // Load records for active batch
  useEffect(() => {
    if (!currentUser || !activeBatchId) {
      setGrowthRecords([]);
      setMedicines([]);
      setDiseaseLogs([]);
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
      const dl = PoultryStorageService.getDiseaseLogs(currentUser.uid, activeBatchId);
      const e = PoultryStorageService.getExpenses(currentUser.uid, activeBatchId);
      const s = PoultryStorageService.getSales(currentUser.uid, activeBatchId);
      const sum = PoultryStorageService.calculateBatchSummary(currentUser.uid, currentBatch);

      setGrowthRecords(g);
      setMedicines(m);
      setDiseaseLogs(dl);
      setExpenses(e);
      setSales(s);
      setSummary(sum);
    } catch (err: any) {
      console.error('Error fetching batch data with RLS check:', err);
      showToast(err.message || 'ডাটা লোড করতে সমস্যা হয়েছে');
    }
  }, [currentUser, activeBatchId, syncVersion]);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || null;

  // --- Handlers ---
  const handleSelectBatch = (batchId: string) => {
    setActiveBatchId(batchId);
  };

  const handleCreateBatch = (batchData: Omit<Batch, 'id' | 'userId' | 'createdAt'>, routineSource?: string) => {
    if (!requireAuth('নতুন ব্যাচ তৈরি ও নিজস্ব খামারের হিসাব রাখতে দয়া করে একাউন্ট তৈরি করুন বা লগইন করুন।')) return;
    if (!currentUser) return;
    const newId = `batch_${Date.now()}`;
    const newBatch: Batch = {
      ...batchData,
      id: newId,
      userId: currentUser.uid,
      createdAt: new Date().toISOString()
    };

    PoultryStorageService.saveBatch(currentUser.uid, newBatch, { routineSource });

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
    showToast('নতুন ব্যাচ ও নিয়মিত ওষুধের রুটিন সফলভাবে যুক্ত হয়েছে!');
  };

  const handleToggleBatchStatus = (batchId: string, currentStatus: 'active' | 'completed') => {
    if (!requireAuth('ব্যাচের স্ট্যাটাস পরিবর্তন করতে একাউন্ট তৈরি বা লগইন করুন।')) return;
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
    if (!requireAuth('ব্যাচ আর্কাইভ করতে একাউন্ট তৈরি বা লগইন করুন।')) return;
    setBatchToArchiveId(batchId);
    setIsArchiveModalOpen(true);
  };

  const handleConfirmArchive = (batchId: string) => {
    if (!requireAuth()) return;
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
    if (!requireAuth()) return;
    if (!currentUser) return;
    PoultryStorageService.restoreBatch(currentUser.uid, batchId);
    const updated = PoultryStorageService.getBatches(currentUser.uid);
    setBatches(updated);
    setActiveBatchId(batchId);
    showToast('ব্যাচ পুনরায় সক্রিয় করা হয়েছে');
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!requireAuth('ব্যাচ মুছে ফেলতে একাউন্ট তৈরি বা লগইন করুন।')) return;
    if (!currentUser) return;
    const confirmed = await confirmAction({
      title: 'সম্পূর্ণ ব্যাচ মুছে ফেলবেন?',
      message: 'আপনি কি নিশ্চিত এই সম্পূর্ণ ব্যাচ ও এর সমস্ত হিসাব মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।',
      confirmLabel: 'হ্যাঁ, মুছে ফেলুন',
      tone: 'danger'
    });
    if (confirmed) {
      PoultryStorageService.deleteBatch(currentUser.uid, batchId);
      const remaining = PoultryStorageService.getBatches(currentUser.uid);
      setBatches(remaining);
      setActiveBatchId(remaining.length > 0 ? remaining[0].id : null);
      showToast('ব্যাচ সফলভাবে মুছে ফেলা হয়েছে');
    }
  };

  // Growth Records
  const handleAddGrowthRecord = (rec: Omit<GrowthRecord, 'id' | 'batchId' | 'userId'>) => {
    if (!requireAuth('দৈনিক ওজন ও বৃদ্ধির হিসাব যোগ করতে একাউন্ট তৈরি বা লগইন করুন।')) return;
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
    if (!requireAuth()) return;
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
    if (!requireAuth('ওষুধ ও টিকার স্ট্যাটাস পরিবর্তন করতে একাউন্ট তৈরি বা লগইন করুন।')) return;
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
    if (!requireAuth('নতুন ভ্যাকসিন বা ওষুধ যোগ করতে একাউন্ট তৈরি বা লগইন করুন।')) return;
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
    if (!requireAuth()) return;
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.updateMedicineItem(currentUser.uid, item);
    setMedicines(PoultryStorageService.getMedicineSchedule(currentUser.uid, activeBatchId));
    showToast('ওষুধ/টিকা তথ্য সফলভাবে আপডেট হয়েছে');
  };

  const handleDeleteMedicine = (itemId: string) => {
    if (!requireAuth()) return;
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.deleteMedicineItem(currentUser.uid, activeBatchId, itemId);
    setMedicines(PoultryStorageService.getMedicineSchedule(currentUser.uid, activeBatchId));
    showToast('আইটেম মুছে ফেলা হয়েছে');
  };

  const handleClearAllMedicines = () => {
    if (!requireAuth()) return;
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.clearAllMedicines(currentUser.uid, activeBatchId);
    setMedicines([]);
    showToast('সমস্ত ওষুধ তালিকা খালি করা হয়েছে');
  };

  const handleResetMedicineSchedule = () => {
    if (!requireAuth()) return;
    if (!currentUser || !activeBatchId) return;
    const restored = PoultryStorageService.resetMedicineSchedule(currentUser.uid, activeBatchId);
    setMedicines(restored);
    showToast('আদর্শ পোল্ট্রি শিডিউল লোড করা হয়েছে');
  };

  const handleSetSlotStatus = (itemIds: string[], targetStatus: 'completed' | 'pending') => {
    if (!requireAuth('ওষুধের স্ট্যাটাস পরিবর্তন করতে একাউন্ট তৈরি বা লগইন করুন।')) return;
    if (!currentUser || !activeBatchId) return;
    const updated = PoultryStorageService.setSlotMedicinesStatus(currentUser.uid, activeBatchId, itemIds, targetStatus);
    setMedicines(updated);
    showToast(targetStatus === 'completed' ? 'নির্বাচিত ওষুধগুলো সম্পন্ন হিসেবে মার্ক হয়েছে' : 'স্ট্যাটাস আপডেট হয়েছে');
  };

  const handleCopyMedicinesToDays = (sourceItems: MedicineScheduleItem[], targetDays: number[]) => {
    if (!requireAuth('অন্য দিনে ওষুধ কপি করতে একাউন্ট তৈরি বা লগইন করুন।')) return;
    if (!currentUser || !activeBatchId) return;
    const updated = PoultryStorageService.copyMedicinesToDays(currentUser.uid, activeBatchId, sourceItems, targetDays);
    setMedicines(updated);
    showToast(`${toBnNumber(sourceItems.length)}টি ওষুধ ${toBnNumber(targetDays.length)}টি দিনে পেস্ট করা হয়েছে!`);
  };

  const handleImportRoutineFromBatch = (sourceBatchId: string, mode: 'replace' | 'merge') => {
    if (!requireAuth('অন্য ব্যাচ থেকে ওষুধের রুটিন আনতে একাউন্ট তৈরি বা লগইন করুন।')) return;
    if (!currentUser || !activeBatchId) return;
    const updated = PoultryStorageService.importRoutineFromBatch(currentUser.uid, activeBatchId, sourceBatchId, mode);
    setMedicines(updated);
    showToast('আগের ব্যাচের নিয়মিত ওষুধের রুটিন সফলভাবে লোড হয়েছে!');
  };

  const handleSaveCurrentAsTemplate = () => {
    if (!requireAuth('রুটিন টেমপ্লেট সংরক্ষণ করতে একাউন্ট তৈরি বা লগইন করুন।')) return;
    if (!currentUser) return;
    const saved = PoultryStorageService.syncBatchMedicinesToTemplate(currentUser.uid, medicines);
    showToast(`${toBnNumber(saved.length)}টি নিয়মিত ওষুধ নতুন ব্যাচের ডিফল্ট রুটিন হিসেবে সেভ হয়েছে!`);
  };

  // Disease Outbreak & Emergency Logs
  const handleAddDiseaseLog = (logData: Omit<DiseaseOutbreakRecord, 'id' | 'batchId' | 'userId' | 'createdAt'>) => {
    if (!requireAuth('জরুরি রোগ ও চিকিৎসার তথ্য যোগ করতে একাউন্ট তৈরি বা লগইন করুন।')) return;
    if (!currentUser || !activeBatchId) return;
    const newLog: DiseaseOutbreakRecord = {
      ...logData,
      id: `disease_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      batchId: activeBatchId,
      userId: currentUser.uid,
      createdAt: new Date().toISOString()
    };
    PoultryStorageService.saveDiseaseLog(currentUser.uid, newLog);
    setDiseaseLogs(PoultryStorageService.getDiseaseLogs(currentUser.uid, activeBatchId));
    showToast('জরুরি রোগ ও চিকিৎসার রেকর্ড সংরক্ষিত হয়েছে');
  };

  const handleUpdateDiseaseLog = (log: DiseaseOutbreakRecord) => {
    if (!requireAuth()) return;
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.saveDiseaseLog(currentUser.uid, log);
    setDiseaseLogs(PoultryStorageService.getDiseaseLogs(currentUser.uid, activeBatchId));
    showToast('রোগ ও চিকিৎসার তথ্য আপডেট হয়েছে');
  };

  const handleToggleDiseaseStatus = (logId: string) => {
    if (!requireAuth()) return;
    if (!currentUser || !activeBatchId) return;
    const updated = PoultryStorageService.toggleDiseaseStatus(currentUser.uid, activeBatchId, logId);
    setDiseaseLogs(updated);
    showToast('চিকিৎসার অবস্থা আপডেট হয়েছে');
  };

  const handleDeleteDiseaseLog = (logId: string) => {
    if (!requireAuth()) return;
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.deleteDiseaseLog(currentUser.uid, activeBatchId, logId);
    setDiseaseLogs(PoultryStorageService.getDiseaseLogs(currentUser.uid, activeBatchId));
    showToast('রোগের রেকর্ড মুছে ফেলা হয়েছে');
  };

  // Expenses
  const handleAddExpense = (exp: Omit<ExpenseRecord, 'id' | 'batchId' | 'userId'>) => {
    if (!requireAuth('নতুন খরচের ভাউচার যুক্ত করতে একাউন্ট তৈরি বা লগইন করুন।')) return;
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
    if (!requireAuth()) return;
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
    if (!requireAuth('বকেয়া পরিশোধের তথ্য এন্ট্রি করতে একাউন্ট তৈরি বা লগইন করুন।')) return;
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
    if (!requireAuth('নতুন মুরগি বিক্রয়ের হিসাব যোগ করতে একাউন্ট তৈরি বা লগইন করুন।')) return;
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
    if (!requireAuth()) return;
    if (!currentUser || !activeBatchId) return;
    PoultryStorageService.deleteSale(currentUser.uid, activeBatchId, saleId);
    const updated = PoultryStorageService.getSales(currentUser.uid, activeBatchId);
    setSales(updated);
    if (activeBatch) {
      setSummary(PoultryStorageService.calculateBatchSummary(currentUser.uid, activeBatch));
    }
    showToast('বিক্রির রেকর্ড মুছে ফেলা হয়েছে');
  };

  const handleImportDemoData = async () => {
    if (!currentUser) return;
    await PoultryStorageService.importDemoDataToUser(currentUser.uid);
    await PoultryStorageService.syncUserFromFirestore(currentUser.uid);
    const updatedBatches = PoultryStorageService.getBatches(currentUser.uid);
    setBatches(updatedBatches);
    if (updatedBatches.length > 0) {
      const first = updatedBatches[0];
      setActiveBatchId(first.id);
      setGrowthRecords(PoultryStorageService.getGrowthRecords(currentUser.uid, first.id));
      setMedicines(PoultryStorageService.getMedicineSchedule(currentUser.uid, first.id));
      setDiseaseLogs(PoultryStorageService.getDiseaseLogs(currentUser.uid, first.id));
      setExpenses(PoultryStorageService.getExpenses(currentUser.uid, first.id));
      setSales(PoultryStorageService.getSales(currentUser.uid, first.id));
      setSummary(PoultryStorageService.calculateBatchSummary(currentUser.uid, first));
    }
    notifyDataChanged();
    showToast('পূর্বের সম্পূর্ণ ব্যাচ ও হিসাব সফলভাবে লোড হয়েছে!');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">FarmHisab (ফার্মহিসাব) লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-slate-50 flex flex-col font-['Noto_Sans_Bengali','Inter',sans-serif]">
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
        onOpenNewBatchModal={handleOpenNewBatchModal}
        onOpenAuthModal={() =>
          openAuthModalWithReason('আপনার নিজস্ব খামারের তথ্য সংরক্ষণ করতে একাউন্ট তৈরি করুন বা লগইন করুন।')
        }
        remainingDue={summary?.currentRemainingDue || 0}
      />

      {/* Demo Mode Notice Banner for Visitors */}
      {isGuest && (
        <aside
          aria-label="ডেমো প্রিভিউ নোটিশ"
          className="bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 text-white shadow-sm border-b border-amber-400/40"
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 text-center sm:text-left">
              <span className="text-lg select-none">👀</span>
              <div>
                <span className="font-bold bg-white/20 px-2 py-0.5 rounded-md mr-1.5 text-xs">
                  ডেমো প্রিভিউ মোড
                </span>
                <span className="opacity-95">
                  আপনি বর্তমানে ডেমো খামার দেখছেন। নিজের খামারের তথ্য সংরক্ষণ ও হিসাব শুরু করতে একাউন্ট তৈরি করুন।
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  openAuthModalWithReason(
                    'নতুন একাউন্ট খুললে আপনার খামারের ড্যাশবোর্ড সম্পূর্ণ ব্ল্যাঙ্ক (Blank) থাকবে এবং আপনার নিজস্ব ব্যাচ শুরু করতে পারবেন।'
                  )
                }
                className="px-3.5 py-1.5 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold whitespace-nowrap shadow-xs transition-all active:scale-95"
              >
                বিনামূল্যে একাউন্ট খুলুন ➔
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full min-w-0 mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 pb-24 sm:pb-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            activeBatch={activeBatch}
            summary={summary}
            batches={batches}
            onSelectBatch={handleSelectBatch}
            onOpenNewBatch={handleOpenNewBatchModal}
            onNavigateTab={setActiveTab}
            medicines={medicines}
            recentExpenses={expenses}
            recentSales={sales}
            onToggleMedicine={handleToggleMedicine}
            onRequestArchiveBatch={handleRequestArchive}
            onImportDemoData={handleImportDemoData}
          />
        )}

        {activeTab === 'batch' && (
          <BatchManager
            activeBatch={activeBatch}
            batches={batches}
            growthRecords={growthRecords}
            onSelectBatch={handleSelectBatch}
            onOpenNewBatchModal={handleOpenNewBatchModal}
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
            batches={batches}
            medicines={medicines}
            diseaseLogs={diseaseLogs}
            onToggleStatus={handleToggleMedicine}
            onSetSlotStatus={handleSetSlotStatus}
            onAddMedicine={handleAddMedicine}
            onUpdateMedicine={handleUpdateMedicine}
            onDeleteMedicine={handleDeleteMedicine}
            onCopyMedicinesToDays={handleCopyMedicinesToDays}
            onImportRoutineFromBatch={handleImportRoutineFromBatch}
            onSaveCurrentAsTemplate={handleSaveCurrentAsTemplate}
            onClearAll={handleClearAllMedicines}
            onResetToDefault={handleResetMedicineSchedule}
            onAddDiseaseLog={handleAddDiseaseLog}
            onUpdateDiseaseLog={handleUpdateDiseaseLog}
            onToggleDiseaseStatus={handleToggleDiseaseStatus}
            onDeleteDiseaseLog={handleDeleteDiseaseLog}
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

        {activeTab === 'assistant' && (
          <AIAssistant
            currentUser={currentUser}
            activeBatch={activeBatch}
            batches={batches}
            onSelectBatch={handleSelectBatch}
          />
        )}

        {activeTab === 'users_directory' && (
          <UsersDirectory
            currentUser={currentUser}
            isAdmin={Boolean(currentUser?.email && currentUser.email.toLowerCase() === 'mehedihasanajmir2@gmail.com') || currentUser?.role === 'admin'}
            onOpenAuthModal={() =>
              openAuthModalWithReason('অ্যাডমিন ডিরেক্টরি দেখতে অনুগ্রহ করে আপনার অ্যাডমিন একাউন্ট mehedihasanajmir2@gmail.com দিয়ে লগইন করুন।')
            }
          />
        )}

        {activeTab === 'profile' && (
          <UserProfile
            batches={batches}
            activeBatchId={activeBatchId}
            onSelectBatch={handleSelectBatch}
            onArchiveBatch={handleRequestArchive}
            onRestoreBatch={handleRestoreBatch}
            onOpenNewBatchModal={handleOpenNewBatchModal}
            onOpenAdminPanel={() => setActiveTab('users_directory')}
          />
        )}
      </main>

      {/* Floating AI Quick-Assistant Action Button (FAB) */}
      {activeTab !== 'assistant' && (
        <button
          onClick={() => setActiveTab('assistant')}
          className="fixed bottom-16 right-4 sm:bottom-6 sm:right-6 z-40 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-xl shadow-emerald-700/30 border border-emerald-400/40 flex items-center gap-2 transition-all transform hover:scale-105 active:scale-95 group"
          title="খামার বন্ধু AI সহকারীকে প্রশ্ন করুন"
        >
          <div className="relative">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full"></span>
          </div>
          <span className="text-xs sm:text-sm font-black hidden sm:inline tracking-wide">
            AI সহকারী
          </span>
        </button>
      )}

      {/* Mobile Bottom Navigation Bar - Ultra Ergonomic & Touch-Friendly */}
      <nav aria-label="মোবাইল মেনু" className="sm:hidden fixed bottom-0 left-0 right-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-1 py-1 flex items-center justify-between gap-0.5 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'dashboard'
              ? 'text-emerald-700 bg-emerald-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="truncate w-full text-center">হোম</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('batch')}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'batch'
              ? 'text-emerald-700 bg-emerald-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="truncate w-full text-center">ব্যাচ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('medicine')}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'medicine'
              ? 'text-emerald-700 bg-emerald-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Syringe className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="truncate w-full text-center">ওষুধ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assistant')}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'assistant'
              ? 'text-emerald-700 bg-emerald-50 font-black'
              : 'text-emerald-600 hover:text-emerald-800'
          }`}
        >
          <Bot className="w-4 h-4 mb-0.5 text-emerald-600 shrink-0" />
          <span className="truncate w-full text-center">AI</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'expenses'
              ? 'text-rose-700 bg-rose-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="truncate w-full text-center">খরচ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'sales'
              ? 'text-teal-700 bg-teal-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="truncate w-full text-center">বিক্রি</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex-1 min-w-0 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[10px] font-bold transition-all ${
            activeTab === 'profile'
              ? 'text-indigo-700 bg-indigo-50'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4 mb-0.5 shrink-0" />
          <span className="truncate w-full text-center">প্রোফাইল</span>
        </button>
      </nav>

      {/* Modals */}
      <NewBatchModal
        isOpen={isNewBatchOpen}
        onClose={() => setIsNewBatchOpen(false)}
        onSaveBatch={handleCreateBatch}
        existingBatchCount={batches.length}
        previousBatches={batches}
        hasSavedTemplate={
          currentUser ? PoultryStorageService.getRoutineTemplate(currentUser.uid).length > 0 : false
        }
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

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <MainApp />
      </ConfirmProvider>
    </AuthProvider>
  );
}
