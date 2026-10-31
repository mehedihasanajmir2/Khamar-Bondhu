import { MedicineScheduleItem } from '../types';

export interface MedicineTemplateItem {
  dayAge: number;
  endDayAge?: number;
  medicineName: string;
  symptoms: string; // রোগের লক্ষণ
  timingAndDosage: string; // কখন ও কীভাবে খাওয়াতে হবে
  purpose?: string;
  dosage?: string;
  notes?: string;
  medicineType?: MedicineScheduleItem['medicineType'];
}

export const BROILER_MEDICINE_SCHEDULE: MedicineTemplateItem[] = [
  {
    dayAge: 1,
    medicineName: 'গ্লুকোজ + ইলেকট্রোলাইট স্যালাইন + ভিটামিন সি',
    symptoms: 'বাচ্চার দীর্ঘ যাত্রার ক্লান্তি, ডিহাইড্রেশন (পানিশূন্যতা) ও দুর্বলতা',
    timingAndDosage: '১ম দিন, বাচ্চা ছাড়ার সাথে সাথে প্রথম ৪-৬ ঘণ্টা খাবারের আগে প্রতি লিটার পানিতে ৫০ গ্রাম',
    purpose: 'বাচ্চার ক্লান্তি দূরীকরণ, পানিশূন্যতা রোধ ও দ্রুত সতেজ করা',
    dosage: 'প্রতি লিটার পানিতে ৫০ গ্রাম গ্লুকোজ ও ১ গ্রাম ইলেকট্রোলাইট',
    medicineType: 'স্যালাইন / গ্লুকোজ',
    notes: 'বাচ্চা খামারে ছাড়ার পর খাবার দেওয়ার আগে এই পানি দিতে হবে।'
  },
  {
    dayAge: 2,
    endDayAge: 4,
    medicineName: 'অ্যান্টিবায়োটিক (সিপ্রোসিন / ডক্সিসাইক্লিন)',
    symptoms: 'কাঁচা নাভী ও ব্যাকটেরিয়াল ডায়রিয়া সংক্রমণ রোধ',
    timingAndDosage: '২য় থেকে ৪র্থ দিন, সকালে ও রাতে ১ লিটার পানিতে ১ গ্রাম',
    purpose: 'নাভী শুকানো ও ব্যাকটেরিয়া সংক্রমণ রোধ',
    dosage: 'প্রতি লিটার পানিতে ১ গ্রাম (৩ দিন)',
    medicineType: 'অ্যান্টিবায়োটিক',
    notes: 'ব্রুডিং তাপমাত্রা ৯৫°F বজায় রাখুন।'
  },
  {
    dayAge: 5,
    endDayAge: 6,
    medicineName: 'ভিটামিন বি-কমপ্লেক্স (B-Complex)',
    symptoms: 'খাবারে অরুচি, ঝিমিয়ে পড়া ও স্নায়ুবিক দুর্বলতা',
    timingAndDosage: '৫ম থেকে ৬ষ্ঠ দিন, সকালের ঠাণ্ডা পানিতে প্রতি ৪ লিটারে ১ মিলি',
    purpose: 'হজমরস বৃদ্ধি, খাবার রুচি ও দ্রুত বৃদ্ধি',
    dosage: 'প্রতি ৪ লিটার পানিতে ১ মিলি',
    medicineType: 'ভিটামিন / মিনারেল',
    notes: 'খাবার রুচি বাড়াতে দারুণ সহায়ক।'
  },
  {
    dayAge: 7,
    medicineName: 'রানীক্ষেত ও ব্রঙ্কাইটিস টিকা (BCRDV / Ma5)',
    symptoms: 'সর্দি, কাশি, চোখ দিয়ে পানি পড়া ও রানীক্ষেত রোগ প্রতিরোধ',
    timingAndDosage: '৭ম দিন, সকালে প্রতি বাচ্চার চোখে ১ ফোঁটা ড্রপ',
    purpose: 'রানীক্ষেত ও সংক্রামক ব্রঙ্কাইটিস রোগ প্রতিরোধ',
    dosage: 'চোখে ১ ফোঁটা ড্রপ',
    medicineType: 'টিকা (ভ্যাকসিন)',
    notes: 'সকাল বেলা বা রাতে ঠাণ্ডা আবহাওয়ায় দিতে হবে।'
  },
  {
    dayAge: 9,
    endDayAge: 11,
    medicineName: 'ক্যালসিয়াম ও ভিটামিন ডি৩ (Liquid Calcium)',
    symptoms: 'পা দুর্বল হয়ে যাওয়া, খোড়ানো ও পক্ষাঘাতগ্রস্ত (প্যারালাইসিস) হওয়া',
    timingAndDosage: '৯ম থেকে ১১তম দিন পর্যন্ত, দুপুরের পানিতে ১ লিটারে ১ মিলি',
    purpose: 'হাড় শক্ত করা ও ওজন বহনের ক্ষমতা বাড়ানো',
    dosage: 'প্রতি ১ লিটার পানিতে ১ মিলি (টানা ৩ দিন)',
    medicineType: 'ভিটামিন / মিনারেল',
    notes: 'পা দুর্বল হওয়া রোধ করে।'
  },
  {
    dayAge: 14,
    medicineName: 'গামবোরো ১ম টিকা (IBD - Intermediate)',
    symptoms: 'সাদা পাতলা পায়খানা, পালক ফুলিয়ে কাঁপা ও গামবোরো প্রতিরোধ',
    timingAndDosage: '১৪তম দিন, ফুটানো ঠাণ্ডা পানিতে দুধ মিশিয়ে সকালে ১-২ ঘণ্টায় শেষ করা',
    purpose: 'মারাত্মক গামবোরো রোগ প্রতিরোধ',
    dosage: 'ঠাণ্ডা খাবার পানির সাথে',
    medicineType: 'টিকা (ভ্যাকসিন)',
    notes: 'ভ্যাকসিন দেওয়ার ২ ঘণ্টা আগে পানির পাত্র সরিয়ে তৃষ্ণার্ত রাখুন।'
  },
  {
    dayAge: 17,
    endDayAge: 19,
    medicineName: 'লিভার টনিক ও রেনাল কেয়ার (Liver Tonic)',
    symptoms: 'ফিড টক্সিন, পেটের চর্বি জমা ও লিভার দুর্বল হওয়া',
    timingAndDosage: '১৭তম থেকে ১৯তম দিন, সকালের পানিতে প্রতি লিটারে ১ মিলি',
    purpose: 'লিভার সুস্থ রাখা, টক্সিন দূরীকরণ ও হজম বৃদ্ধি',
    dosage: 'প্রতি লিটার পানিতে ১ মিলি (৩ দিন)',
    medicineType: 'ভিটামিন / মিনারেল',
    notes: 'ফিডের ফাঙ্গাস টক্সিন থেকে লিভার সুরক্ষিত রাখে।'
  },
  {
    dayAge: 21,
    medicineName: 'রানীক্ষেত বুস্টার টিকা (ND Clone-30 / Lasota)',
    symptoms: 'রানীক্ষেতের স্থায়ী ভাইরাসরোধী রোগ প্রতিরোধ ক্ষমতা',
    timingAndDosage: '২১তম দিন, সকালে ঠাণ্ডা পানির সাথে ১-২ ঘণ্টায় পান করানো',
    purpose: 'রানীক্ষেত রোগের দীর্ঘমেয়াদী প্রতিরোধ ক্ষমতা তৈরি',
    dosage: 'ঠাণ্ডা খাবার পানির সাথে',
    medicineType: 'টিকা (ভ্যাকসিন)',
    notes: 'ক্লোরিনমুক্ত পানি ব্যবহার করুন।'
  },
  {
    dayAge: 24,
    medicineName: 'গামবোরো বুস্টার টিকা (IBD Booster)',
    symptoms: 'গামবোরো রোগের বিরুদ্ধে স্থায়ী বুস্টার প্রতিরক্ষা',
    timingAndDosage: '২৪তম দিন, সকালের প্রথম ঠাণ্ডা পানির সাথে',
    purpose: 'গামবোরো রোগের বিরুদ্ধে স্থায়ী রোগ প্রতিরোধ',
    dosage: 'ঠাণ্ডা পানির সাথে',
    medicineType: 'টিকা (ভ্যাকসিন)',
    notes: 'সকালের প্রথম ঠাণ্ডা পানিতে প্রয়োগ করা উত্তম।'
  },
  {
    dayAge: 27,
    endDayAge: 29,
    medicineName: 'ভিটামিন ই + সেলেনিয়াম (Vit E-Selenium)',
    symptoms: 'হঠাৎ মৃত্যু (SDS), হিট স্ট্রোক ও পেশীর দুর্বলতা',
    timingAndDosage: '২৭তম থেকে ২৯তম দিন, দুপুরের হালকা ঠাণ্ডা পানিতে ২ লিটারে ১ মিলি',
    purpose: 'হঠাৎ মৃত্যু রোধ ও রোগ প্রতিরোধ ক্ষমতা',
    dosage: 'প্রতি ২ লিটার পানিতে ১ মিলি',
    medicineType: 'ভিটামিন / মিনারেল',
    notes: 'ব্রয়লারের শেষ বয়সে ওজন বাড়াতে সহায়তা করে।'
  },
  {
    dayAge: 30,
    endDayAge: 32,
    medicineName: 'জিংক ও গ্রোথ টনিক (Zinc + Growth)',
    symptoms: 'ওজন কম হওয়া, FCR বৃদ্ধি ও পালক খসে পড়া',
    timingAndDosage: '৩০তম থেকে ৩২তম দিন, রাতের পানির সাথে ১ লিটারে ১ মিলি',
    purpose: 'দ্রুত ওজন বৃদ্ধি (FCR উন্নয়ন) ও সুন্দর স্বাস্থ্য',
    dosage: 'প্রতি লিটার পানিতে ১ মিলি',
    medicineType: 'ভিটামিন / মিনারেল',
    notes: 'বিক্রির আগে দ্রুত ওজন বৃদ্ধিতে সাহায্য করে।'
  }
];

export function generateInitialSchedule(batchId: string, userId: string): MedicineScheduleItem[] {
  return BROILER_MEDICINE_SCHEDULE.map((item, index) => ({
    id: `med_${batchId}_${index + 1}_${Date.now()}`,
    batchId,
    userId,
    dayAge: item.dayAge,
    endDayAge: item.endDayAge,
    medicineName: item.medicineName,
    symptoms: item.symptoms,
    timingAndDosage: item.timingAndDosage,
    purpose: item.purpose || item.symptoms,
    dosage: item.dosage || item.timingAndDosage,
    medicineType: item.medicineType,
    status: 'pending',
    notes: item.notes,
    isCustom: false
  }));
}

