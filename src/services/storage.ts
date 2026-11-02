import {
  Batch,
  BatchSummary,
  DuePaymentEntry,
  ExpenseRecord,
  GrowthRecord,
  MedicineScheduleItem,
  SaleRecord,
  UserProfile,
} from '../types';
import { calculateBatchAgeDays, simpleHash } from '../utils/formatters';
import { generateInitialSchedule } from '../data/medicineTemplates';
import { doc, setDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';

// Storage keys partitioned by user for strict Row-Level Isolation
const USERS_KEY = 'poultry_app_users_v2';
const CURRENT_USER_KEY = 'poultry_app_active_user_v2';

/**
 * Throws a Row-Level Security (RLS) violation error if a tenant attempts cross-boundary access
 */
function assertOwnership(requestUserId: string, resourceUserId: string) {
  if (!requestUserId || requestUserId !== resourceUserId) {
    console.error(`[RLS_VIOLATION] Attempt to access data belonging to ${resourceUserId} by user ${requestUserId}`);
    throw new Error('অননুমোদিত অ্যাক্সেস: আপনি অন্য খামারীর তথ্য দেখতে বা পরিবর্তন করতে পারবেন না (Row-Level Security Scoped)');
  }
}

// Initial demo profiles for realistic multi-tenancy verification
export const DEMO_PROFILES: UserProfile[] = [
  {
    uid: 'FRM-GAZ-849102',
    email: 'hasan.poultry@gmail.com',
    name: 'মোঃ হাসান মিয়া',
    farmName: 'হাসান ব্রয়লার পোল্ট্রি ফার্ম',
    phone: '০১৭৮৯-১২৩৪৫৬',
    location: 'কাপাসিয়া, গাজীপুর',
    capacity: 2000,
    birdType: 'ব্রয়লার',
    registrationDate: '2026-08-15',
    passwordHash: simpleHash('123456')
  },
  {
    uid: 'FRM-BOG-921473',
    email: 'rahim.agro@yahoo.com',
    name: 'মোঃ রহিম চৌধুরী',
    farmName: 'রহিম এগ্রো খামার',
    phone: '০১৮১২-৯৮৭৬৫৪',
    location: 'শেরপুর, বগুড়া',
    capacity: 3500,
    birdType: 'সোনালী',
    registrationDate: '2026-09-01',
    passwordHash: simpleHash('123456')
  }
];

// Helper to strip undefined values so Firestore never errors on undefined
export function cleanForFirestore<T>(data: T): any {
  if (data === null || data === undefined) return null;
  return JSON.parse(
    JSON.stringify(data, (key, value) => (value === undefined ? null : value))
  );
}

export class PoultryStorageService {
  static getKey(prefix: string, userId: string): string {
    return `${prefix}_${userId}`;
  }

  // Stable, deterministic user ID derived from email
  static getDeterministicUid(email: string): string {
    const clean = email.trim().toLowerCase();
    return 'usr_' + clean.replace(/[^a-zA-Z0-9]/g, '_');
  }

  // --- Background Cloud Firestore Sync Helpers ---
  private static async syncFirestoreDoc(path: string, data: any): Promise<void> {
    try {
      if (auth.currentUser) {
        const segments = path.split('/');
        const pathUserId = segments[1];
        if (auth.currentUser.uid === pathUserId) {
          const docRef = doc(db, path);
          const sanitized = cleanForFirestore(data);
          await setDoc(docRef, sanitized, { merge: true });
        }
      }
    } catch (error) {
      console.warn(`Firestore sync warning for ${path}:`, error);
    }
  }

  private static async deleteFirestoreDoc(path: string): Promise<void> {
    try {
      if (auth.currentUser) {
        const segments = path.split('/');
        const pathUserId = segments[1];
        if (auth.currentUser.uid === pathUserId) {
          const docRef = doc(db, path);
          await deleteDoc(docRef);
        }
      }
    } catch (error) {
      console.warn(`Firestore delete warning for ${path}:`, error);
    }
  }

  /**
   * Pulls all batches and child collections from Cloud Firestore into local storage
   * and merges two-way with local storage so no data is ever lost.
   */
  static async syncUserFromFirestore(userId: string): Promise<boolean> {
    if (!userId) return false;
    if (auth.currentUser && auth.currentUser.uid !== userId) {
      return false;
    }
    try {
      const batchesRef = collection(db, 'users', userId, 'batches');
      const batchSnaps = await getDocs(batchesRef);
      const localBatches = this.getBatches(userId);

      if (batchSnaps.empty) {
        // If Firestore is empty, sync any local batches and subcollections to Cloud Firestore
        for (const b of localBatches) {
          await this.syncFirestoreDoc(`users/${userId}/batches/${b.id}`, b);
          const g = this.getGrowthRecords(userId, b.id);
          for (const rec of g) await this.syncFirestoreDoc(`users/${userId}/batches/${b.id}/growth/${rec.id}`, rec);
          const m = this.getMedicineSchedule(userId, b.id);
          for (const med of m) await this.syncFirestoreDoc(`users/${userId}/batches/${b.id}/medicines/${med.id}`, med);
          const exp = this.getExpenses(userId, b.id);
          for (const e of exp) await this.syncFirestoreDoc(`users/${userId}/batches/${b.id}/expenses/${e.id}`, e);
          const s = this.getSales(userId, b.id);
          for (const sale of s) await this.syncFirestoreDoc(`users/${userId}/batches/${b.id}/sales/${sale.id}`, sale);
        }
        return true;
      }

      const remoteBatches: Batch[] = [];
      for (const batchDoc of batchSnaps.docs) {
        const batchData = batchDoc.data() as Batch;
        remoteBatches.push(batchData);
        const batchId = batchData.id;

        // Sync growth
        try {
          const gSnaps = await getDocs(collection(db, 'users', userId, 'batches', batchId, 'growth'));
          const growthList: GrowthRecord[] = [];
          gSnaps.forEach((d) => growthList.push(d.data() as GrowthRecord));
          if (growthList.length > 0) {
            localStorage.setItem(this.getKey(`growth_${batchId}`, userId), JSON.stringify(growthList));
          }
        } catch (e) {
          console.warn('Sync growth error:', e);
        }

        // Sync medicines
        try {
          const mSnaps = await getDocs(collection(db, 'users', userId, 'batches', batchId, 'medicines'));
          const medList: MedicineScheduleItem[] = [];
          mSnaps.forEach((d) => medList.push(d.data() as MedicineScheduleItem));
          if (medList.length > 0) {
            localStorage.setItem(this.getKey(`meds_${batchId}`, userId), JSON.stringify(medList));
          }
        } catch (e) {
          console.warn('Sync medicines error:', e);
        }

        // Sync expenses
        try {
          const eSnaps = await getDocs(collection(db, 'users', userId, 'batches', batchId, 'expenses'));
          const expList: ExpenseRecord[] = [];
          eSnaps.forEach((d) => expList.push(d.data() as ExpenseRecord));
          if (expList.length > 0) {
            localStorage.setItem(this.getKey(`expenses_${batchId}`, userId), JSON.stringify(expList));
          }
        } catch (e) {
          console.warn('Sync expenses error:', e);
        }

        // Sync sales
        try {
          const sSnaps = await getDocs(collection(db, 'users', userId, 'batches', batchId, 'sales'));
          const saleList: SaleRecord[] = [];
          sSnaps.forEach((d) => saleList.push(d.data() as SaleRecord));
          if (saleList.length > 0) {
            localStorage.setItem(this.getKey(`sales_${batchId}`, userId), JSON.stringify(saleList));
          }
        } catch (e) {
          console.warn('Sync sales error:', e);
        }
      }

      // Merge remote and local batches without dropping anything
      const mergedMap = new Map<string, Batch>();
      remoteBatches.forEach((b) => mergedMap.set(b.id, b));
      localBatches.forEach((b) => {
        if (!mergedMap.has(b.id)) {
          mergedMap.set(b.id, b);
          // Upload local batch that wasn't in cloud
          this.syncFirestoreDoc(`users/${userId}/batches/${b.id}`, b);
        }
      });

      const mergedList = Array.from(mergedMap.values());
      if (mergedList.length > 0) {
        localStorage.setItem(this.getKey('poultry_batches', userId), JSON.stringify(mergedList));
      }
      return true;
    } catch (err) {
      console.warn('Failed to sync from Firestore:', err);
      return false;
    }
  }

  /**
   * Pushes all local batches and subcollections to Cloud Firestore
   */
  static async pushAllToFirestore(userId: string): Promise<boolean> {
    if (!userId || !auth.currentUser || auth.currentUser.uid !== userId) return false;
    try {
      const batches = this.getBatches(userId);
      for (const b of batches) {
        await this.syncFirestoreDoc(`users/${userId}/batches/${b.id}`, b);
        const growth = this.getGrowthRecords(userId, b.id);
        for (const g of growth) {
          await this.syncFirestoreDoc(`users/${userId}/batches/${b.id}/growth/${g.id}`, g);
        }
        const meds = this.getMedicineSchedule(userId, b.id);
        for (const m of meds) {
          await this.syncFirestoreDoc(`users/${userId}/batches/${b.id}/medicines/${m.id}`, m);
        }
        const exp = this.getExpenses(userId, b.id);
        for (const e of exp) {
          await this.syncFirestoreDoc(`users/${userId}/batches/${b.id}/expenses/${e.id}`, e);
        }
        const sales = this.getSales(userId, b.id);
        for (const s of sales) {
          await this.syncFirestoreDoc(`users/${userId}/batches/${b.id}/sales/${s.id}`, s);
        }
      }
      return true;
    } catch (e) {
      console.error('Push all to Firestore error:', e);
      return false;
    }
  }

  /**
   * Exports full farmer data as JSON string for lifetime offline backup
   */
  static exportFullBackup(userId: string): string {
    const user = this.getUserById(userId);
    const batches = this.getBatches(userId);
    const data: Record<string, any> = {
      version: '2.0',
      exportDate: new Date().toISOString(),
      user,
      batches,
      records: {}
    };
    for (const b of batches) {
      data.records[b.id] = {
        growth: this.getGrowthRecords(userId, b.id),
        medicines: this.getMedicineSchedule(userId, b.id),
        expenses: this.getExpenses(userId, b.id),
        sales: this.getSales(userId, b.id),
      };
    }
    return JSON.stringify(data, null, 2);
  }

  // --- User Profiles & Auth ---
  static getUsers(): UserProfile[] {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) {
      localStorage.setItem(USERS_KEY, JSON.stringify(DEMO_PROFILES));
      this.seedInitialDemoData();
      return DEMO_PROFILES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return DEMO_PROFILES;
    }
  }

  static getUserById(uid: string): UserProfile | null {
    const users = this.getUsers();
    return users.find((u) => u.uid === uid) || null;
  }

  static getUserByEmail(email: string): UserProfile | null {
    const users = this.getUsers();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  static getUserByEmailOrPhone(identifier: string): UserProfile | null {
    const users = this.getUsers();
    const clean = identifier.trim().toLowerCase();
    const digitsOnly = clean.replace(/[^0-9]/g, '');
    return (
      users.find((u) => {
        if (u.email.toLowerCase() === clean) return true;
        if (u.phone) {
          const userPhoneDigits = u.phone.replace(/[^0-9]/g, '');
          if (digitsOnly && digitsOnly.length >= 6 && userPhoneDigits.endsWith(digitsOnly)) return true;
        }
        if (u.email.includes('@')) {
          const userEmailDigits = u.email.split('@')[0].replace(/[^0-9]/g, '');
          if (digitsOnly && digitsOnly.length >= 6 && userEmailDigits === digitsOnly) return true;
        }
        return false;
      }) || null
    );
  }

  static saveUser(user: UserProfile): void {
    const users = this.getUsers();
    const idx = users.findIndex((u) => u.uid === user.uid);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  static getActiveUserId(): string | null {
    return localStorage.getItem(CURRENT_USER_KEY);
  }

  static setActiveUserId(uid: string | null): void {
    if (uid) {
      localStorage.setItem(CURRENT_USER_KEY, uid);
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }

  // --- Batches (Strictly Scoped by userId) ---
  static getBatches(userId: string): Batch[] {
    if (!userId) return [];
    const key = this.getKey('poultry_batches', userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      if (userId === DEMO_PROFILES[0].uid) {
        this.seedInitialDemoData();
        return this.getBatches(userId);
      }
      return [];
    }
    try {
      const items: Batch[] = JSON.parse(raw);
      // RLS Check: every item must belong to userId
      const userItems = items.filter((b) => b.userId === userId);

      // Ensure demo archived batch exists for Hasan for instant testing of Previous Batches History
      if (userId === DEMO_PROFILES[0].uid && !userItems.some((b) => b.id === 'batch_hasan_archived_04')) {
        this.seedArchivedDemoBatch(userId);
        const refreshed = localStorage.getItem(key);
        if (refreshed) {
          return JSON.parse(refreshed).filter((b: Batch) => b.userId === userId);
        }
      }

      return userItems;
    } catch {
      return [];
    }
  }

  static getBatchById(userId: string, batchId: string): Batch | null {
    const batches = this.getBatches(userId);
    const found = batches.find((b) => b.id === batchId);
    if (found) {
      assertOwnership(userId, found.userId);
    }
    return found || null;
  }

  static saveBatch(userId: string, batch: Batch): void {
    assertOwnership(userId, batch.userId);
    const batches = this.getBatches(userId);
    const idx = batches.findIndex((b) => b.id === batch.id);
    if (idx >= 0) {
      batches[idx] = batch;
    } else {
      batches.unshift(batch);
      // Auto generate standard medicine schedule for new batch!
      const initialMeds = generateInitialSchedule(batch.id, userId);
      this.saveMedicineSchedule(userId, batch.id, initialMeds);
    }
    const key = this.getKey('poultry_batches', userId);
    localStorage.setItem(key, JSON.stringify(batches));

    // Cloud Firestore Sync
    this.syncFirestoreDoc(`users/${userId}/batches/${batch.id}`, batch);
  }

  static deleteBatch(userId: string, batchId: string): void {
    const batches = this.getBatches(userId);
    const target = batches.find((b) => b.id === batchId);
    if (target) {
      assertOwnership(userId, target.userId);
    }
    const filtered = batches.filter((b) => b.id !== batchId);
    localStorage.setItem(this.getKey('poultry_batches', userId), JSON.stringify(filtered));

    // Cleanup related records
    localStorage.removeItem(this.getKey(`growth_${batchId}`, userId));
    localStorage.removeItem(this.getKey(`meds_${batchId}`, userId));
    localStorage.removeItem(this.getKey(`expenses_${batchId}`, userId));
    localStorage.removeItem(this.getKey(`sales_${batchId}`, userId));

    // Cloud Firestore Delete
    this.deleteFirestoreDoc(`users/${userId}/batches/${batchId}`);
  }

  static archiveBatch(userId: string, batchId: string): Batch | null {
    const batch = this.getBatchById(userId, batchId);
    if (!batch) return null;
    assertOwnership(userId, batch.userId);
    const updated: Batch = {
      ...batch,
      status: 'completed',
      completedDate: new Date().toISOString().split('T')[0]
    };
    this.saveBatch(userId, updated);
    return updated;
  }

  static restoreBatch(userId: string, batchId: string): Batch | null {
    const batch = this.getBatchById(userId, batchId);
    if (!batch) return null;
    assertOwnership(userId, batch.userId);
    const updated: Batch = {
      ...batch,
      status: 'active',
      completedDate: undefined
    };
    this.saveBatch(userId, updated);
    return updated;
  }

  static getBatchFullHistory(userId: string, batchId: string) {
    const batch = this.getBatchById(userId, batchId);
    if (!batch) return null;
    assertOwnership(userId, batch.userId);
    const growth = this.getGrowthRecords(userId, batchId);
    const medicines = this.getMedicineSchedule(userId, batchId);
    const expenses = this.getExpenses(userId, batchId);
    const sales = this.getSales(userId, batchId);
    const summary = this.calculateBatchSummary(userId, batch);
    return { batch, summary, growth, medicines, expenses, sales };
  }

  // --- Growth & Mortality Tracker ---
  static getGrowthRecords(userId: string, batchId: string): GrowthRecord[] {
    if (!userId || !batchId) return [];
    const key = this.getKey(`growth_${batchId}`, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const records: GrowthRecord[] = JSON.parse(raw);
      return records
        .filter((r) => r.userId === userId && r.batchId === batchId)
        .sort((a, b) => a.dayAge - b.dayAge);
    } catch {
      return [];
    }
  }

  static saveGrowthRecord(userId: string, record: GrowthRecord): void {
    assertOwnership(userId, record.userId);
    const records = this.getGrowthRecords(userId, record.batchId);
    const idx = records.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      records[idx] = record;
    } else {
      records.push(record);
    }
    records.sort((a, b) => a.dayAge - b.dayAge);
    const key = this.getKey(`growth_${record.batchId}`, userId);
    localStorage.setItem(key, JSON.stringify(records));

    // Cloud Firestore Sync
    this.syncFirestoreDoc(`users/${userId}/batches/${record.batchId}/growth/${record.id}`, record);
  }

  static deleteGrowthRecord(userId: string, batchId: string, recordId: string): void {
    const records = this.getGrowthRecords(userId, batchId);
    const filtered = records.filter((r) => r.id !== recordId);
    const key = this.getKey(`growth_${batchId}`, userId);
    localStorage.setItem(key, JSON.stringify(filtered));

    // Cloud Firestore Delete
    this.deleteFirestoreDoc(`users/${userId}/batches/${batchId}/growth/${recordId}`);
  }

  // --- Medicine & Vaccination Schedule ---
  static getMedicineSchedule(userId: string, batchId: string): MedicineScheduleItem[] {
    if (!userId || !batchId) return [];
    const key = this.getKey(`meds_${batchId}`, userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = generateInitialSchedule(batchId, userId);
      this.saveMedicineSchedule(userId, batchId, initial);
      return initial;
    }
    try {
      const items: MedicineScheduleItem[] = JSON.parse(raw);
      return items
        .filter((i) => i.userId === userId && i.batchId === batchId)
        .map((item) => ({
          ...item,
          symptoms: item.symptoms || item.purpose || 'সাধারণ স্বাস্থ্য ও রোগ প্রতিরোধ',
          timingAndDosage: item.timingAndDosage || item.dosage || 'নিয়ম অনুযায়ী পানির সাথে'
        }))
        .sort((a, b) => a.dayAge - b.dayAge);
    } catch {
      return [];
    }
  }

  static saveMedicineSchedule(userId: string, batchId: string, items: MedicineScheduleItem[]): void {
    items.forEach((i) => assertOwnership(userId, i.userId));
    const key = this.getKey(`meds_${batchId}`, userId);
    localStorage.setItem(key, JSON.stringify(items));

    // Cloud Firestore Sync for each medicine item
    items.forEach((item) => {
      this.syncFirestoreDoc(`users/${userId}/batches/${batchId}/medicines/${item.id}`, item);
    });
  }

  static toggleMedicineStatus(userId: string, batchId: string, itemId: string): MedicineScheduleItem[] {
    const items = this.getMedicineSchedule(userId, batchId);
    const updated = items.map((item) => {
      if (item.id === itemId) {
        assertOwnership(userId, item.userId);
        const nextStatus = item.status === 'completed' ? 'pending' : 'completed';
        return {
          ...item,
          status: nextStatus as 'completed' | 'pending',
          completedAt: nextStatus === 'completed' ? new Date().toISOString() : undefined
        };
      }
      return item;
    });
    this.saveMedicineSchedule(userId, batchId, updated);
    return updated;
  }

  static addMedicineItem(userId: string, item: MedicineScheduleItem): void {
    assertOwnership(userId, item.userId);
    const items = this.getMedicineSchedule(userId, item.batchId);
    items.push(item);
    items.sort((a, b) => a.dayAge - b.dayAge);
    this.saveMedicineSchedule(userId, item.batchId, items);
  }

  static addMedicineItems(userId: string, itemsToAdd: MedicineScheduleItem[]): void {
    if (itemsToAdd.length === 0) return;
    const batchId = itemsToAdd[0].batchId;
    itemsToAdd.forEach((i) => assertOwnership(userId, i.userId));
    const items = this.getMedicineSchedule(userId, batchId);
    items.push(...itemsToAdd);
    items.sort((a, b) => a.dayAge - b.dayAge);
    this.saveMedicineSchedule(userId, batchId, items);
  }

  static updateMedicineItem(userId: string, item: MedicineScheduleItem): void {
    assertOwnership(userId, item.userId);
    const items = this.getMedicineSchedule(userId, item.batchId);
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
      items.sort((a, b) => a.dayAge - b.dayAge);
      this.saveMedicineSchedule(userId, item.batchId, items);
    }
  }

  static deleteMedicineItem(userId: string, batchId: string, itemId: string): void {
    const items = this.getMedicineSchedule(userId, batchId);
    const filtered = items.filter((i) => i.id !== itemId);
    this.saveMedicineSchedule(userId, batchId, filtered);

    // Cloud Firestore Delete
    this.deleteFirestoreDoc(`users/${userId}/batches/${batchId}/medicines/${itemId}`);
  }

  static clearAllMedicines(userId: string, batchId: string): void {
    this.saveMedicineSchedule(userId, batchId, []);
  }

  static resetMedicineSchedule(userId: string, batchId: string): MedicineScheduleItem[] {
    const initial = generateInitialSchedule(batchId, userId);
    this.saveMedicineSchedule(userId, batchId, initial);
    return initial;
  }

  // --- Expense Log (খরচ হিসাব) ---
  static getExpenses(userId: string, batchId: string): ExpenseRecord[] {
    if (!userId || !batchId) return [];
    const key = this.getKey(`expenses_${batchId}`, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const items: ExpenseRecord[] = JSON.parse(raw);

      // Auto-migrate: If Hasan's initial batch has exp_02 with repaidAmount but no exp_repay_01 entry, inject both demo repayments
      if (batchId === 'batch_hasan_01' && !items.some((e) => e.id === 'exp_repay_01')) {
        const repay1: ExpenseRecord = {
          id: 'exp_repay_01',
          batchId,
          userId,
          date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category: 'বাকি জমা / পরিশোধ',
          amount: 20000,
          paidAmount: 20000,
          dueAmount: 0,
          repaidAmount: 20000,
          supplierName: 'মেসার্স ভাই ভাই ফিড সেন্টার',
          note: 'মেসার্স ভাই ভাই ফিড সেন্টার এর ফিড ক্রয়ের বাকি পরিশোধ বাবদ ১ম কিস্তি নগদ জমা',
          paymentMethod: 'নগদ',
          linkedExpenseId: 'exp_02',
          paymentsHistory: []
        };
        const repay2: ExpenseRecord = {
          id: 'exp_repay_02',
          batchId,
          userId,
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category: 'বাকি জমা / পরিশোধ',
          amount: 10000,
          paidAmount: 10000,
          dueAmount: 0,
          repaidAmount: 10000,
          supplierName: 'আফতাব ফিড ডিলার',
          note: 'আফতাব ফিড ডিলার এর ফিড ক্রয়ের বাকি পরিশোধ বাবদ বিকাশে কিস্তি জমা',
          paymentMethod: 'বিকাশ/নগদ/রকেট',
          linkedExpenseId: 'exp_04',
          paymentsHistory: []
        };
        items.push(repay1, repay2);
        localStorage.setItem(key, JSON.stringify(items));
      }

      return items
        .filter((e) => e.userId === userId && e.batchId === batchId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch {
      return [];
    }
  }

  static saveExpense(userId: string, expense: ExpenseRecord): void {
    assertOwnership(userId, expense.userId);
    const items = this.getExpenses(userId, expense.batchId);
    const idx = items.findIndex((e) => e.id === expense.id);
    if (idx >= 0) {
      items[idx] = expense;
    } else {
      items.unshift(expense);
    }
    const key = this.getKey(`expenses_${expense.batchId}`, userId);
    localStorage.setItem(key, JSON.stringify(items));

    // Cloud Firestore Sync
    this.syncFirestoreDoc(`users/${userId}/batches/${expense.batchId}/expenses/${expense.id}`, expense);
  }

  static deleteExpense(userId: string, batchId: string, expenseId: string): void {
    const items = this.getExpenses(userId, batchId);
    const target = items.find((e) => e.id === expenseId);
    if (target) {
      assertOwnership(userId, target.userId);

      // If deleting a deposit voucher that was linked to a specific purchase voucher:
      if (target.category === 'বাকি জমা / পরিশোধ' && target.linkedExpenseId) {
        const parentExp = items.find((e) => e.id === target.linkedExpenseId);
        if (parentExp) {
          parentExp.repaidAmount = Math.max(0, (parentExp.repaidAmount || 0) - target.amount);
          if (parentExp.paymentsHistory) {
            parentExp.paymentsHistory = parentExp.paymentsHistory.filter(
              (p) => !(p.amount === target.amount && p.date === target.date)
            );
          }
        }
      }

      // If deleting a purchase voucher that had linked deposit vouchers, unlink them
      if (target.category !== 'বাকি জমা / পরিশোধ') {
        items.forEach((item) => {
          if (item.linkedExpenseId === expenseId) {
            item.linkedExpenseId = undefined;
          }
        });
      }
    }

    const filtered = items.filter((e) => e.id !== expenseId);
    const key = this.getKey(`expenses_${batchId}`, userId);
    localStorage.setItem(key, JSON.stringify(filtered));

    // Cloud Firestore Delete
    this.deleteFirestoreDoc(`users/${userId}/batches/${batchId}/expenses/${expenseId}`);
  }

  // --- Sales & Revenue Log (বিক্রি ও আয়) ---
  static getSales(userId: string, batchId: string): SaleRecord[] {
    if (!userId || !batchId) return [];
    const key = this.getKey(`sales_${batchId}`, userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const items: SaleRecord[] = JSON.parse(raw);
      return items
        .filter((s) => s.userId === userId && s.batchId === batchId)
        .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    } catch {
      return [];
    }
  }

  static saveSale(userId: string, sale: SaleRecord): void {
    assertOwnership(userId, sale.userId);
    // Ensure accurate auto-calculation
    const totalAmount = Math.round(sale.totalWeightKg * sale.pricePerKg);
    const recordToSave = { ...sale, totalAmount };

    const items = this.getSales(userId, sale.batchId);
    const idx = items.findIndex((s) => s.id === sale.id);
    if (idx >= 0) {
      items[idx] = recordToSave;
    } else {
      items.unshift(recordToSave);
    }
    const key = this.getKey(`sales_${sale.batchId}`, userId);
    localStorage.setItem(key, JSON.stringify(items));

    // Cloud Firestore Sync
    this.syncFirestoreDoc(`users/${userId}/batches/${sale.batchId}/sales/${sale.id}`, recordToSave);
  }

  static deleteSale(userId: string, batchId: string, saleId: string): void {
    const items = this.getSales(userId, batchId);
    const target = items.find((s) => s.id === saleId);
    if (target) {
      assertOwnership(userId, target.userId);
    }
    const filtered = items.filter((s) => s.id !== saleId);
    const key = this.getKey(`sales_${batchId}`, userId);
    localStorage.setItem(key, JSON.stringify(filtered));

    // Cloud Firestore Delete
    this.deleteFirestoreDoc(`users/${userId}/batches/${batchId}/sales/${saleId}`);
  }

  static recordDuePayment(
    userId: string,
    batchId: string,
    expenseId: string,
    paymentAmount: number,
    paymentDate: string,
    paymentMethod: 'নগদ' | 'বিকাশ/নগদ/রকেট' | 'ব্যাংক' = 'নগদ',
    note?: string
  ): ExpenseRecord | null {
    const expenses = this.getExpenses(userId, batchId);
    const exp = expenses.find((e) => e.id === expenseId);
    if (!exp) return null;
    assertOwnership(userId, exp.userId);

    const paymentEntryId = `due_pay_${Date.now()}`;
    const formattedNote = note || `${exp.supplierName ? exp.supplierName + ' এর ' : ''}বাকি পরিশোধ বাবদ কিস্তি জমা`;

    const newPayment: DuePaymentEntry = {
      id: paymentEntryId,
      expenseId,
      batchId,
      userId,
      date: paymentDate,
      amount: paymentAmount,
      paymentMethod,
      supplierOrParty: exp.supplierName,
      note: formattedNote
    };

    exp.repaidAmount = (exp.repaidAmount || 0) + paymentAmount;
    exp.paymentsHistory = [...(exp.paymentsHistory || []), newPayment];

    // Create a first-class visible ExpenseRecord in the ledger table
    const repaymentVoucher: ExpenseRecord = {
      id: `exp_repay_${Date.now()}`,
      batchId,
      userId,
      date: paymentDate,
      category: 'বাকি জমা / পরিশোধ',
      amount: paymentAmount,
      paidAmount: paymentAmount,
      dueAmount: 0,
      repaidAmount: paymentAmount,
      supplierName: exp.supplierName || 'বকেয়া মহাজন/ডিলার',
      note: formattedNote,
      paymentMethod,
      linkedExpenseId: expenseId,
      paymentsHistory: []
    };

    expenses.unshift(repaymentVoucher);
    const key = this.getKey(`expenses_${batchId}`, userId);
    localStorage.setItem(key, JSON.stringify(expenses));

    // Cloud Firestore Sync for both updated parent expense and repayment voucher
    this.syncFirestoreDoc(`users/${userId}/batches/${batchId}/expenses/${exp.id}`, exp);
    this.syncFirestoreDoc(`users/${userId}/batches/${batchId}/expenses/${repaymentVoucher.id}`, repaymentVoucher);

    return exp;
  }

  // --- Calculate Batch Summary ---
  static calculateBatchSummary(userId: string, batch: Batch): BatchSummary {
    assertOwnership(userId, batch.userId);
    const batchAgeDays = calculateBatchAgeDays(batch.startDate);
    const growth = this.getGrowthRecords(userId, batch.id);
    const expenses = this.getExpenses(userId, batch.id);
    const sales = this.getSales(userId, batch.id);

    // Sum mortality
    const totalMortality = growth.reduce((sum, g) => sum + (g.dailyMortality || 0), 0);
    const totalFeedConsumedKg = growth.reduce((sum, g) => sum + (g.feedIntakeKg || 0), 0);
    const latestGrowth = growth.length > 0 ? growth[growth.length - 1] : null;
    const latestAvgWeightGrams = latestGrowth ? latestGrowth.avgWeightGrams : 0;

    // Sum sales
    const totalBirdsSold = sales.reduce((sum, s) => sum + (s.birdsSoldCount || 0), 0);
    const totalWeightSoldKg = sales.reduce((sum, s) => sum + (s.totalWeightKg || 0), 0);
    const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

    // Current Live Birds
    const currentLiveBirds = Math.max(0, batch.initialChicks - totalMortality - totalBirdsSold);
    const mortalityRatePercent = batch.initialChicks > 0 ? (totalMortality / batch.initialChicks) * 100 : 0;

    // Purchase expenses vs standalone due repayments
    const purchaseExpenses = expenses.filter((e) => e.category !== 'বাকি জমা / পরিশোধ');
    const directRepaymentEntries = expenses.filter((e) => e.category === 'বাকি জমা / পরিশোধ');

    // Sum pure purchase expenses (does not double-count due repayments)
    const totalExpense = purchaseExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Cash, Due Taken, Due Repaid, and Remaining Due Calculations
    let totalDueTaken = 0;
    let totalDueRepaidFromItems = 0;
    let totalInitialCashPaid = 0;

    purchaseExpenses.forEach((e) => {
      let itemDue = 0;
      let itemPaid = 0;
      if (e.paymentMethod === 'বাকি') {
        itemDue = e.dueAmount !== undefined ? e.dueAmount : e.amount;
        itemPaid = e.paidAmount !== undefined ? e.paidAmount : 0;
      } else if (e.paymentMethod === 'আংশিক নগদ ও বাকি') {
        itemPaid = e.paidAmount || 0;
        itemDue = e.dueAmount !== undefined ? e.dueAmount : Math.max(0, e.amount - itemPaid);
      } else {
        // নগদ বা বিকাশ
        itemPaid = e.paidAmount !== undefined ? e.paidAmount : e.amount;
        itemDue = e.dueAmount || 0;
      }
      const itemRepaid = e.repaidAmount || 0;

      totalDueTaken += itemDue;
      totalInitialCashPaid += itemPaid;
    });

    // Direct due repayment vouchers in the ledger
    const totalRepaymentsFromEntries = directRepaymentEntries.reduce((sum, r) => sum + (r.amount || 0), 0);

    // Also account for any legacy voucher repaidAmount that isn't represented by a directRepaymentEntry
    let unrecordedRepaid = 0;
    purchaseExpenses.forEach((e) => {
      const recordedForThisItem = directRepaymentEntries
        .filter((r) => r.linkedExpenseId === e.id)
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      const itemRepaid = e.repaidAmount || 0;
      if (itemRepaid > recordedForThisItem) {
        unrecordedRepaid += itemRepaid - recordedForThisItem;
      }
    });

    const totalDueRepaid = totalRepaymentsFromEntries + unrecordedRepaid;
    const currentRemainingDue = Math.max(0, totalDueTaken - totalDueRepaid);
    const totalCashPaid = totalInitialCashPaid + totalDueRepaid;

    // Net Profit/Loss: Net Profit = Total Revenue - Total Expense
    const netProfit = totalRevenue - totalExpense;
    const isProfitable = netProfit >= 0;
    const profitMarginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Total Lot Biomass / Weight Calculation
    const totalLotWeightKg = currentLiveBirds > 0 && latestAvgWeightGrams > 0
      ? parseFloat(((currentLiveBirds * latestAvgWeightGrams) / 1000).toFixed(1))
      : 0;
    const totalLotWeightMaund = parseFloat((totalLotWeightKg / 40).toFixed(2));

    return {
      batchAgeDays,
      currentLiveBirds,
      totalMortality,
      mortalityRatePercent,
      latestAvgWeightGrams,
      totalFeedConsumedKg,
      totalExpense,
      totalCashPaid,
      totalDueTaken,
      totalDueRepaid,
      currentRemainingDue,
      totalRevenue,
      netProfit,
      totalBirdsSold,
      totalWeightSoldKg,
      totalLotWeightKg,
      totalLotWeightMaund,
      isProfitable,
      profitMarginPercent
    };
  }

  // --- Initial Seed for Hasan's Poultry Farm ---
  private static seedInitialDemoData(): void {
    const hasan = DEMO_PROFILES[0];
    const batchId = 'batch_hasan_01';
    
    // Create Batch #01
    const initialBatch: Batch = {
      id: batchId,
      userId: hasan.uid,
      batchNumber: 'ব্যাচ #১ (ব্রয়লার ২০২৬)',
      batchName: 'কপ ৫০০ ব্রয়লার লট-১',
      startDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Day 26
      birdType: 'ব্রয়লার',
      initialChicks: 1500,
      chickPricePerUnit: 48,
      supplierName: 'সিপি বাংলাদেশ হ্যাচারি',
      targetWeightGrams: 2200,
      status: 'active',
      notes: 'সুস্থ ও সতেজ গ্রেড-এ একদিনের বাচ্চা সংগ্রহ করা হয়েছে।',
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
    };

    localStorage.setItem(this.getKey('poultry_batches', hasan.uid), JSON.stringify([initialBatch]));

    // Seed Expenses with realistic Cash, Due, and Repayments
    const expenses: ExpenseRecord[] = [
      {
        id: 'exp_01',
        batchId,
        userId: hasan.uid,
        date: initialBatch.startDate,
        category: 'বাচ্চা ক্রয়',
        amount: 1500 * 48, // 72,000
        paidAmount: 72000,
        dueAmount: 0,
        repaidAmount: 0,
        supplierName: 'সিপি হ্যাচারি',
        note: '১৫০০ টি সি.পি ব্রয়লার বাচ্চা ক্রয় (নগদ পরিশোধ)',
        paymentMethod: 'নগদ'
      },
      {
        id: 'exp_02',
        batchId,
        userId: hasan.uid,
        date: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'ফিড/খাবার',
        amount: 45000,
        paidAmount: 0,
        dueAmount: 45000, // বাকি নেওয়া হয়েছিল ৪৫,০০০ ৳
        repaidAmount: 20000, // পরবর্তীতে জমা/পরিশোধ করা হয়েছে ২০,০০০ ৳
        supplierName: 'মেসার্স ভাই ভাই ফিড সেন্টার',
        note: 'ব্রয়লার স্টার্টার ফিড ১৫ বস্তা (বাকিতে নেওয়া হয়েছিল)',
        paymentMethod: 'বাকি',
        paymentsHistory: [
          {
            id: 'due_pay_demo_1',
            expenseId: 'exp_02',
            batchId,
            userId: hasan.uid,
            date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            amount: 20000,
            paymentMethod: 'নগদ',
            supplierOrParty: 'মেসার্স ভাই ভাই ফিড সেন্টার',
            note: 'বাকি থেকে ১ম কিস্তি নগদ জমা দেওয়া হয়েছে'
          }
        ]
      },
      {
        id: 'exp_repay_01',
        batchId,
        userId: hasan.uid,
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'বাকি জমা / পরিশোধ',
        amount: 20000,
        paidAmount: 20000,
        dueAmount: 0,
        repaidAmount: 20000,
        supplierName: 'মেসার্স ভাই ভাই ফিড সেন্টার',
        note: 'মেসার্স ভাই ভাই ফিড সেন্টার এর ফিড ক্রয়ের বাকি পরিশোধ বাবদ ১ম কিস্তি নগদ জমা',
        paymentMethod: 'নগদ',
        linkedExpenseId: 'exp_02',
        paymentsHistory: []
      },
      {
        id: 'exp_03',
        batchId,
        userId: hasan.uid,
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'ওষুধ ও টিকা',
        amount: 4200,
        paidAmount: 4200,
        dueAmount: 0,
        repaidAmount: 0,
        supplierName: 'জনতা ফার্মেসি',
        note: 'ভ্যাকসিন, ভিটামিন সি ও স্যালাইন ক্রয় (নগদ)',
        paymentMethod: 'নগদ'
      },
      {
        id: 'exp_04',
        batchId,
        userId: hasan.uid,
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'ফিড/খাবার',
        amount: 63000,
        paidAmount: 23000, // নগদে পরিশোধ ২৩,০০০ ৳
        dueAmount: 40000, // বাকি নেওয়া ৪০,০০০ ৳
        repaidAmount: 10000, // জমা দেওয়া হয়েছে ১০,০০০ ৳
        supplierName: 'আফতাব ফিড ডিলার',
        note: 'ব্রয়লার গ্রোয়ার ফিড ২১ বস্তা (আংশিক নগদ ২৩,০০০ ও বাকি ৪০,০০০)',
        paymentMethod: 'আংশিক নগদ ও বাকি',
        paymentsHistory: [
          {
            id: 'due_pay_demo_2',
            expenseId: 'exp_04',
            batchId,
            userId: hasan.uid,
            date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            amount: 10000,
            paymentMethod: 'বিকাশ/নগদ/রকেট',
            supplierOrParty: 'আফতাব ফিড ডিলার',
            note: 'বিকাশে কিস্তি জমা'
          }
        ]
      },
      {
        id: 'exp_repay_02',
        batchId,
        userId: hasan.uid,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'বাকি জমা / পরিশোধ',
        amount: 10000,
        paidAmount: 10000,
        dueAmount: 0,
        repaidAmount: 10000,
        supplierName: 'আফতাব ফিড ডিলার',
        note: 'আফতাব ফিড ডিলার এর ফিড ক্রয়ের বাকি পরিশোধ বাবদ বিকাশে কিস্তি জমা',
        paymentMethod: 'বিকাশ/নগদ/রকেট',
        linkedExpenseId: 'exp_04',
        paymentsHistory: []
      },
      {
        id: 'exp_05',
        batchId,
        userId: hasan.uid,
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'তুষ ও লিটার',
        amount: 3500,
        paidAmount: 3500,
        dueAmount: 0,
        repaidAmount: 0,
        supplierName: 'স মিল তুষ সরবরাহকারী',
        note: 'শুকনো কাঠের তুষ ও পরিবহন খরচ',
        paymentMethod: 'নগদ'
      },
      {
        id: 'exp_06',
        batchId,
        userId: hasan.uid,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category: 'বিদ্যুৎ/জ্বালানি',
        amount: 3800,
        paidAmount: 3800,
        dueAmount: 0,
        repaidAmount: 0,
        note: 'ব্রুডিং লাইটিং ও ফ্যান বিদ্যুৎ বিল',
        paymentMethod: 'বিকাশ/নগদ/রকেট'
      }
    ];
    localStorage.setItem(this.getKey(`expenses_${batchId}`, hasan.uid), JSON.stringify(expenses));

    // Seed Growth
    const growth: GrowthRecord[] = [
      { id: 'g_1', batchId, userId: hasan.uid, date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dayAge: 1, avgWeightGrams: 45, dailyMortality: 3, feedIntakeKg: 18, notes: 'প্রথম দিন সুস্থ সবল বাচ্চা' },
      { id: 'g_2', batchId, userId: hasan.uid, date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dayAge: 5, avgWeightGrams: 140, dailyMortality: 2, feedIntakeKg: 42, notes: 'রুচি ভালো, বি-কমপ্লেক্স চলছে' },
      { id: 'g_3', batchId, userId: hasan.uid, date: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dayAge: 8, avgWeightGrams: 260, dailyMortality: 1, feedIntakeKg: 65, notes: 'রানীক্ষেত ড্রপ সম্পন্ন' },
      { id: 'g_4', batchId, userId: hasan.uid, date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dayAge: 12, avgWeightGrams: 480, dailyMortality: 2, feedIntakeKg: 95, notes: 'লিটার শুকনো ও ফ্রেশ রাখা হয়েছে' },
      { id: 'g_5', batchId, userId: hasan.uid, date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dayAge: 16, avgWeightGrams: 790, dailyMortality: 1, feedIntakeKg: 135, notes: 'গামবোরো ১ম ডোজ সম্পন্ন' },
      { id: 'g_6', batchId, userId: hasan.uid, date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], dayAge: 21, avgWeightGrams: 1250, dailyMortality: 2, feedIntakeKg: 180, notes: 'রানীক্ষেত বুস্টার ডোজ সম্পন্ন' },
      { id: 'g_7', batchId, userId: hasan.uid, date: new Date().toISOString().split('T')[0], dayAge: 26, avgWeightGrams: 1680, dailyMortality: 1, feedIntakeKg: 210, notes: 'বর্তমান গড় ওজন ১.৬৮ কেজি' }
    ];
    localStorage.setItem(this.getKey(`growth_${batchId}`, hasan.uid), JSON.stringify(growth));

    // Seed Medicine Schedule with some completed
    const meds = generateInitialSchedule(batchId, hasan.uid).map((m) => {
      if (m.dayAge <= 21) {
        return { ...m, status: 'completed' as const, completedAt: new Date(Date.now() - (26 - m.dayAge) * 24 * 60 * 60 * 1000).toISOString() };
      }
      return m;
    });
    localStorage.setItem(this.getKey(`meds_${batchId}`, hasan.uid), JSON.stringify(meds));

    // Seed Partial Sales
    const sales: SaleRecord[] = [
      {
        id: 'sale_01',
        batchId,
        userId: hasan.uid,
        saleDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        birdsSoldCount: 300,
        totalWeightKg: 510, // avg 1.7kg
        pricePerKg: 195,
        totalAmount: 510 * 195, // 99,450 ৳
        buyerName: 'আলমগীর ট্রেডার্স (পাইকার)',
        buyerPhone: '০১৯১১-২২৩৩৪৪',
        notes: 'প্রথম লটের ৩০০ মুরগি নগদ মূল্যে বিক্রি।'
      },
      {
        id: 'sale_02',
        batchId,
        userId: hasan.uid,
        saleDate: new Date().toISOString().split('T')[0],
        birdsSoldCount: 400,
        totalWeightKg: 688, // avg 1.72kg
        pricePerKg: 200,
        totalAmount: 688 * 200, // 137,600 ৳
        buyerName: 'মেসার্স ভাই ভাই পোল্ট্রি',
        buyerPhone: '০১৭৭৭-৮৮৯৯০০',
        notes: 'দ্বিতীয় লটের ৪০০ মুরগি বিক্রি।'
      }
    ];
    localStorage.setItem(this.getKey(`sales_${batchId}`, hasan.uid), JSON.stringify(sales));
  }

  public static seedArchivedDemoBatch(userId: string): void {
    const archBatchId = 'batch_hasan_archived_04';
    const archivedBatch: Batch = {
      id: archBatchId,
      userId,
      batchNumber: 'ব্যাচ #০৪ (আগের ব্রয়লার লট)',
      batchName: 'কপ ৫০০ ব্রয়লার - সফল সমাপ্তি',
      startDate: '2026-05-10',
      completedDate: '2026-06-18', // 39 days batch
      birdType: 'ব্রয়লার',
      initialChicks: 1200,
      chickPricePerUnit: 46,
      supplierName: 'সিপি বাংলাদেশ হ্যাচারি',
      targetWeightGrams: 2100,
      status: 'completed',
      notes: 'অত্যন্ত লাভজনক সমাপ্ত ব্যাচ। গড় ওজন ২.১৮ কেজি অর্জিত হয়েছিল (লক্ষ্য ছিল ২.১ কেজি)।',
      createdAt: '2026-05-10T08:00:00.000Z'
    };

    const batchesKey = this.getKey('poultry_batches', userId);
    const existingRaw = localStorage.getItem(batchesKey);
    const existing: Batch[] = existingRaw ? JSON.parse(existingRaw) : [];
    if (!existing.some((b) => b.id === archBatchId)) {
      existing.push(archivedBatch);
      localStorage.setItem(batchesKey, JSON.stringify(existing));
    }

    // Seed Expenses
    const archExpenses: ExpenseRecord[] = [
      {
        id: 'arch_exp_01',
        batchId: archBatchId,
        userId,
        date: '2026-05-10',
        category: 'বাচ্চা ক্রয়',
        amount: 55200,
        paidAmount: 55200,
        dueAmount: 0,
        repaidAmount: 0,
        supplierName: 'সিপি বাংলাদেশ হ্যাচারি',
        note: '১২০০ টি ব্রয়লার বাচ্চা ক্রয় (প্রতিটি ৪৬ ৳)',
        paymentMethod: 'নগদ'
      },
      {
        id: 'arch_exp_02',
        batchId: archBatchId,
        userId,
        date: '2026-05-12',
        category: 'ফিড/খাবার',
        amount: 68000,
        paidAmount: 68000,
        dueAmount: 0,
        repaidAmount: 0,
        supplierName: 'মেসার্স ভাই ভাই ফিড',
        note: 'স্টার্টার ও গ্রোয়ার ফিড ২২ বস্তা (পরিশোধিত)',
        paymentMethod: 'নগদ'
      },
      {
        id: 'arch_exp_03',
        batchId: archBatchId,
        userId,
        date: '2026-05-18',
        category: 'ওষুধ ও টিকা',
        amount: 5400,
        paidAmount: 5400,
        dueAmount: 0,
        repaidAmount: 0,
        supplierName: 'জনতা ফার্মেসি',
        note: 'রানীক্ষেত, গামবোরো ও ভিটামিন কোর্স',
        paymentMethod: 'নগদ'
      },
      {
        id: 'arch_exp_04',
        batchId: archBatchId,
        userId,
        date: '2026-05-11',
        category: 'তুষ ও লিটার',
        amount: 3200,
        paidAmount: 3200,
        dueAmount: 0,
        repaidAmount: 0,
        note: 'শুকনো কাঠের তুষ',
        paymentMethod: 'নগদ'
      },
      {
        id: 'arch_exp_05',
        batchId: archBatchId,
        userId,
        date: '2026-06-15',
        category: 'বিদ্যুৎ/জ্বালানি',
        amount: 4500,
        paidAmount: 4500,
        dueAmount: 0,
        repaidAmount: 0,
        note: 'ব্রুডিং ও ফ্যান বিদ্যুৎ বিল',
        paymentMethod: 'বিকাশ/নগদ/রকেট'
      }
    ];
    localStorage.setItem(this.getKey(`expenses_${archBatchId}`, userId), JSON.stringify(archExpenses));

    // Seed Sales
    const archSales: SaleRecord[] = [
      {
        id: 'arch_sale_01',
        batchId: archBatchId,
        userId,
        saleDate: '2026-06-16',
        birdsSoldCount: 600,
        totalWeightKg: 1308,
        pricePerKg: 205,
        totalAmount: 1308 * 205, // 268,140
        buyerName: 'আলমগীর ট্রেডার্স (পাইকার)',
        buyerPhone: '০১৯১১-২২৩৩৪৪',
        notes: '১ম লটের ৬০০ ব্রয়লার বিক্রি (গড় ওজন ২.১৮ কেজি)'
      },
      {
        id: 'arch_sale_02',
        batchId: archBatchId,
        userId,
        saleDate: '2026-06-18',
        birdsSoldCount: 545,
        totalWeightKg: 1188,
        pricePerKg: 208,
        totalAmount: 1188 * 208, // 247,104
        buyerName: 'মেসার্স ভাই ভাই পোল্ট্রি',
        buyerPhone: '০১৭৭৭-৮৮৯৯০০',
        notes: 'চূড়ান্ত লটের অবশিষ্ট ৫৪৫ মুরগি সম্পূর্ণ বিক্রি'
      }
    ];
    localStorage.setItem(this.getKey(`sales_${archBatchId}`, userId), JSON.stringify(archSales));

    // Seed Growth
    const archGrowth: GrowthRecord[] = [
      { id: 'ag_1', batchId: archBatchId, userId, date: '2026-05-10', dayAge: 1, avgWeightGrams: 44, dailyMortality: 4, feedIntakeKg: 15, notes: 'বাচ্চা গ্রহণ' },
      { id: 'ag_2', batchId: archBatchId, userId, date: '2026-05-17', dayAge: 8, avgWeightGrams: 240, dailyMortality: 3, feedIntakeKg: 55, notes: 'প্রথম সপ্তাহের ওজন সন্তোষজনক' },
      { id: 'ag_3', batchId: archBatchId, userId, date: '2026-05-24', dayAge: 15, avgWeightGrams: 680, dailyMortality: 2, feedIntakeKg: 115, notes: 'গামবোরো সম্পন্ন' },
      { id: 'ag_4', batchId: archBatchId, userId, date: '2026-05-31', dayAge: 22, avgWeightGrams: 1210, dailyMortality: 1, feedIntakeKg: 170, notes: 'গড় ওজন ১.২ কেজি অতিক্রম' },
      { id: 'ag_5', batchId: archBatchId, userId, date: '2026-06-07', dayAge: 29, avgWeightGrams: 1720, dailyMortality: 2, feedIntakeKg: 210, notes: 'লিটার শুকনো' },
      { id: 'ag_6', batchId: archBatchId, userId, date: '2026-06-14', dayAge: 36, avgWeightGrams: 2080, dailyMortality: 1, feedIntakeKg: 230, notes: 'বিক্রির জন্য প্রস্তুত' },
      { id: 'ag_7', batchId: archBatchId, userId, date: '2026-06-18', dayAge: 39, avgWeightGrams: 2180, dailyMortality: 0, feedIntakeKg: 120, notes: 'চূড়ান্ত গড় ওজন ২.১৮ কেজি' }
    ];
    localStorage.setItem(this.getKey(`growth_${archBatchId}`, userId), JSON.stringify(archGrowth));

    // Seed Completed Medicines
    const archMeds = generateInitialSchedule(archBatchId, userId).map((m) => ({
      ...m,
      status: 'completed' as const,
      completedAt: '2026-06-05T10:00:00.000Z'
    }));
    localStorage.setItem(this.getKey(`meds_${archBatchId}`, userId), JSON.stringify(archMeds));
  }
}
