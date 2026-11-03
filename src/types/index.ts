export type BirdType = 'ব্রয়লার' | 'সোনালী' | 'লেয়ার' | 'কক / টাইগার' | 'দেশি মুরগি';

export type ExpenseCategory =
  | 'বাচ্চা ক্রয়'
  | 'ফিড/খাবার'
  | 'ওষুধ ও টিকা'
  | 'বিদ্যুৎ/জ্বালানি'
  | 'পরিবহন'
  | 'তুষ ও লিটার'
  | 'শ্রমিক ও মজুরি'
  | 'বাকি জমা / পরিশোধ'
  | 'অন্যান্য';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  farmName: string;
  phone: string;
  location: string;
  capacity: number;
  birdType?: BirdType;
  registrationDate: string;
  passwordHash?: string;
}

export interface Batch {
  id: string;
  userId: string;
  batchNumber: string;
  batchName: string;
  startDate: string; // YYYY-MM-DD
  birdType: BirdType;
  initialChicks: number;
  chickPricePerUnit: number; // ৳
  supplierName: string;
  targetWeightGrams: number;
  status: 'active' | 'completed';
  notes?: string;
  createdAt: string;
  completedDate?: string;
}

export interface GrowthRecord {
  id: string;
  batchId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  dayAge: number; // কত দিন বয়সে মাপ দেওয়া হয়েছে
  avgWeightGrams: number; // প্রতিটি মুরগির গড় ওজন (গ্রাম)
  dailyMortality: number;
  feedIntakeKg: number;
  notes?: string;
  // ৫-মুরগি স্যাম্পল ও লটের মোট ওজন সম্পর্কিত তথ্য
  sampleBirdsCount?: number; // স্যাম্পল মুরগির সংখ্যা (ডিফল্ট ৫টি)
  sampleTotalWeightKg?: number; // ৫টি মুরগির মোট ওজন (কেজি)
  lotTotalWeightKg?: number; // সম্পূর্ণ লটের জীবিত মুরগির মোট আনুমানিক ওজন (কেজি)
  lotTotalWeightMaund?: number; // সম্পূর্ণ লটের মোট ওজন মণ-এ (৪০ কেজি = ১ মণ)
}

export interface MedicineScheduleItem {
  id: string;
  batchId: string;
  userId: string;
  dayAge: number;
  endDayAge?: number; // Optional end day for multi-day courses (e.g., day 3 to 5)
  durationDays?: number;
  courseId?: string; // কোর্স গ্রুপ আইডি
  courseDayIndex?: number; // কোর্সের কততম দিন (যেমন: ১, ২, ৩)
  totalCourseDays?: number; // কোর্সের মোট দিন সংখ্যা
  medicineName: string; // ওষুধের নাম
  symptoms: string; // রোগের লক্ষণ (Symptoms / Disease Sign)
  timingAndDosage: string; // কখন ও কীভাবে খাওয়াতে হবে (Timing & Dosage)
  purpose?: string; // উদ্দেশ্য (compatibility)
  dosage?: string; // মাত্রা (compatibility)
  medicineType?: 'টিকা (ভ্যাকসিন)' | 'অ্যান্টিবায়োটিক' | 'ভিটামিন / মিনারেল' | 'স্যালাইন / গ্লুকোজ' | 'কৃমিনাশক' | 'অন্যান্য ওষুধ';
  timeOfDay?:
    | 'সকাল ও রাতে'
    | 'দুপুর ও রাতে'
    | 'সকাল'
    | 'সকালে'
    | 'দুপুর'
    | 'দুপুরে'
    | 'রাত'
    | 'রাতে'
    | 'সকাল, দুপুর ও রাত'
    | 'সারাদিন'
    | 'সারাদিন পানিতে'
    | 'পানির সাথে'
    | string;
  status: 'pending' | 'completed';
  completedAt?: string;
  notes?: string;
  isCustom?: boolean;
}

export interface DuePaymentEntry {
  id: string;
  expenseId?: string;
  batchId: string;
  userId: string;
  date: string;
  amount: number; // জমা দেওয়া টাকা
  paymentMethod: 'নগদ' | 'বিকাশ/নগদ/রকেট' | 'ব্যাংক';
  supplierOrParty?: string;
  note?: string;
}

export interface ExpenseRecord {
  id: string;
  batchId: string;
  userId: string;
  date: string;
  category: ExpenseCategory;
  amount: number; // সর্বমোট খরচের টাকা বা জমা দেওয়া টাকা
  paidAmount?: number; // নগদ পরিশোধিত টাকা (Cash Paid)
  dueAmount?: number; // শুরুতে বাকি নেওয়া টাকা (Initial Due Taken)
  repaidAmount?: number; // পরবর্তীতে বাকি থেকে জমা/পরিশোধ করা টাকা (Due Repaid / Deposited)
  supplierName?: string; // দোকান/সরবরাহকারীর নাম
  note: string;
  paymentMethod?: 'নগদ' | 'বিকাশ/নগদ/রকেট' | 'ব্যাংক' | 'বাকি' | 'আংশিক নগদ ও বাকি';
  paymentsHistory?: DuePaymentEntry[];
  linkedExpenseId?: string; // নির্দিষ্ট বাকির ভাউচারের আইডি (যদি কিস্তিতে জমা হয়)
}

export interface SaleRecord {
  id: string;
  batchId: string;
  userId: string;
  saleDate: string;
  birdsSoldCount: number;
  totalWeightKg: number;
  pricePerKg: number;
  totalAmount: number; // totalWeightKg * pricePerKg
  buyerName: string;
  buyerPhone?: string;
  notes?: string;
}

export interface BatchSummary {
  batchAgeDays: number;
  currentLiveBirds: number;
  totalMortality: number;
  mortalityRatePercent: number;
  latestAvgWeightGrams: number;
  totalFeedConsumedKg: number;
  totalExpense: number; // সর্বমোট খরচ
  totalCashPaid: number; // মোট নগদ পরিশোধ
  totalDueTaken: number; // মোট বাকি নেওয়া
  totalDueRepaid: number; // বাকি থেকে মোট জমা/পরিশোধ
  currentRemainingDue: number; // বর্তমান অবশিষ্ট বকেয়া (বাকি নেওয়া - মোট জমা)
  totalRevenue: number;
  netProfit: number;
  totalBirdsSold: number;
  totalWeightSoldKg: number;
  totalLotWeightKg?: number; // সম্পূর্ণ লটের জীবিত মুরগির মোট আনুমানিক ওজন (কেজি)
  totalLotWeightMaund?: number; // সম্পূর্ণ লটের মোট ওজন মণ-এ
  isProfitable: boolean;
  profitMarginPercent: number;
}
