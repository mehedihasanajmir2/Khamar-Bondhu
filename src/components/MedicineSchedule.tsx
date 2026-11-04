import React, { useState, useMemo } from 'react';
import {
  Syringe,
  CheckCircle2,
  Clock,
  PlusCircle,
  Trash2,
  Edit3,
  Search,
  Check,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  LayoutList,
  LayoutGrid,
  Activity,
  Clock3,
  Layers,
  FileSpreadsheet,
  Plus,
  Sunrise,
  Sun,
  Moon,
  Droplet,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink
} from 'lucide-react';
import { Batch, MedicineScheduleItem } from '../types';
import { calculateBatchAgeDays, formatBnDate, toBnNumber } from '../utils/formatters';

interface MedicineScheduleProps {
  activeBatch: Batch | null;
  medicines: MedicineScheduleItem[];
  onToggleStatus: (itemId: string) => void;
  onAddMedicine: (
    item:
      | Omit<MedicineScheduleItem, 'id' | 'batchId' | 'userId'>
      | Array<Omit<MedicineScheduleItem, 'id' | 'batchId' | 'userId'>>
  ) => void;
  onUpdateMedicine: (item: MedicineScheduleItem) => void;
  onDeleteMedicine: (itemId: string) => void;
  onClearAll: () => void;
  onResetToDefault: () => void;
}

// Available dose timings / application times
export interface MedicineTimingOption {
  id: string;
  label: string;
  shortLabel: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  defaultDosageNote: string;
  icon: string;
}

export const MEDICINE_TIMING_OPTIONS: MedicineTimingOption[] = [
  {
    id: 'সকাল ও রাতে',
    label: '🌅 🌙 সকাল ও রাতে (দিনে ২ বার)',
    shortLabel: 'সকাল ও রাতে',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-200',
    defaultDosageNote: 'সকালে ও রাতে খাবার পানির সাথে (১ লিটারে ১ মিলি/গ্রাম)',
    icon: '🌅🌙'
  },
  {
    id: 'দুপুর ও রাতে',
    label: '☀️ 🌙 দুপুর ও রাতে (দিনে ২ বার)',
    shortLabel: 'দুপুর ও রাতে',
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-800',
    badgeBorder: 'border-purple-200',
    defaultDosageNote: 'দুপুরে ও রাতে খাবার পানির সাথে (১ লিটারে ১ মিলি/গ্রাম)',
    icon: '☀️🌙'
  },
  {
    id: 'সকালে',
    label: '🌅 সকালে (১ম পানি)',
    shortLabel: 'সকালে',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    defaultDosageNote: 'সকালে ১ লিটার পানিতে ১ মিলি',
    icon: '🌅'
  },
  {
    id: 'দুপুরে',
    label: '☀️ দুপুরে (২য় পানি)',
    shortLabel: 'দুপুরে',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-800',
    badgeBorder: 'border-orange-200',
    defaultDosageNote: 'দুপুরে ১ লিটার পানিতে ১ মিলি',
    icon: '☀️'
  },
  {
    id: 'রাতে',
    label: '🌙 রাতে (৩য় পানি)',
    shortLabel: 'রাতে',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
    defaultDosageNote: 'রাতে ১ লিটার পানিতে ১ গ্রাম',
    icon: '🌙'
  },
  {
    id: 'সকাল, দুপুর ও রাত',
    label: '🌅 ☀️ 🌙 সকাল, দুপুর ও রাত (দিনে ৩ বার)',
    shortLabel: 'দিনে ৩ বার',
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-800',
    badgeBorder: 'border-teal-200',
    defaultDosageNote: 'সকাল, দুপুর ও রাতে খাবার পানির সাথে',
    icon: '🌅☀️🌙'
  },
  {
    id: 'সারাদিন পানিতে',
    label: '💧 সারাদিন পানিতে (২৪ ঘণ্টা)',
    shortLabel: 'সারাদিন পানিতে',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-800',
    badgeBorder: 'border-sky-200',
    defaultDosageNote: 'সারাদিন ২৪ ঘণ্টা খাবার পানির সাথে',
    icon: '💧'
  },
  {
    id: 'প্রয়োজন অনুযায়ী',
    label: '🕒 প্রয়োজন অনুযায়ী / অন্যান্য',
    shortLabel: 'প্রয়োজন অনুযায়ী',
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-800',
    badgeBorder: 'border-slate-200',
    defaultDosageNote: 'প্রয়োজন অনুযায়ী নিয়ম মেনে',
    icon: '🕒'
  }
];

// Single row interface inside a multi-medicine sheet
interface MedicineSheetRow {
  id: string;
  isExisting?: boolean; // Whether this row is an existing saved item being edited
  medicineName: string;
  symptoms: string;
  timingAndDosage: string;
  medicineType: MedicineScheduleItem['medicineType'];
  timeOfDay: string;
  notes: string;
}

// Quick symptom tags for one-tap fill
const QUICK_SYMPTOMS = [
  'সর্দি, কাশি ও ঘড়ঘড় শব্দ',
  'পাতলা পায়খানা ও আমাশয়',
  'ঝিমিয়ে পড়া ও খাবার অরুচি',
  'রানীক্ষেত রোগ প্রতিরোধ',
  'গামবোরো রোগ প্রতিরোধ',
  'পা অবশ হওয়া ও প্যারালাইসিস',
  'ভ্রমণজনিত ক্লান্তি ও ডিহাইড্রেশন',
  'নাভী কাঁচা থাকা ও ইনফেকশন',
  'হিট স্ট্রোক ও অতিরিক্ত গরম',
  'ওজন বৃদ্ধি ও FCR উন্নয়ন'
];

// Quick full-day routine combos (যেমন: সারা দিনে ৩টি ওষুধের সমন্বিত কোর্স)
const ROUTINE_COMBOS = [
  {
    title: '৩ দিনের প্রাথমিক ব্রুডিং কম্বো (৩ ওষুধ)',
    days: 3,
    rows: [
      {
        medicineName: 'গ্লুকোজ + ইলেকট্রোলাইট স্যালাইন',
        symptoms: 'ক্লান্তি ও পানিশূন্যতা দূর করা',
        timingAndDosage: 'সকালে প্রথম ৪-৬ ঘণ্টা খাবারের আগে প্রতি লিটার পানিতে ৫০ গ্রাম',
        medicineType: 'স্যালাইন / গ্লুকোজ' as const,
        timeOfDay: 'সকাল' as const,
        notes: 'বাচ্চা ছাড়ার সাথে সাথে'
      },
      {
        medicineName: 'ভিটামিন সি ও বি-কমপ্লেক্স',
        symptoms: 'দুর্বলতা রোধ ও খাবার রুচি বৃদ্ধি',
        timingAndDosage: 'দুপুরে ঠাণ্ডা পানির সাথে প্রতি ৪ লিটারে ১ মিলি',
        medicineType: 'ভিটামিন / মিনারেল' as const,
        timeOfDay: 'দুপুর' as const,
        notes: 'দুপুরের রোদ ও গরমে'
      },
      {
        medicineName: 'অ্যান্টিবায়োটিক (সিপ্রোসিন / ডক্সিসাইক্লিন)',
        symptoms: 'নাভী শুকানো ও ডায়রিয়া ইনফেকশন রোধ',
        timingAndDosage: 'রাতে খাবার পানির সাথে প্রতি লিটারে ১ গ্রাম',
        medicineType: 'অ্যান্টিবায়োটিক' as const,
        timeOfDay: 'রাত' as const,
        notes: 'রাতের পরিষ্কার পানিতে'
      }
    ]
  },
  {
    title: '৩ দিনের গ্রোথ ও হাড় মজবুত কোর্স (২ ওষুধ)',
    days: 3,
    rows: [
      {
        medicineName: 'তরল ক্যালসিয়াম ও ভিটামিন ডি৩',
        symptoms: 'পা দুর্বল হওয়া, খোঁড়ানো ও প্যারালাইসিস রোধ',
        timingAndDosage: 'সকালে ১ লিটার পানিতে ১ মিলি',
        medicineType: 'ভিটামিন / মিনারেল' as const,
        timeOfDay: 'সকাল' as const,
        notes: 'সকালের তাজা পানিতে'
      },
      {
        medicineName: 'লিভার টনিক (Liver Tonic)',
        symptoms: 'হজম শক্তি ও খাবার রুচি বৃদ্ধি',
        timingAndDosage: 'দুপুরে ১ লিটার পানিতে ১ মিলি',
        medicineType: 'ভিটামিন / মিনারেল' as const,
        timeOfDay: 'দুপুর' as const,
        notes: 'ফিড ভালো হজমের জন্য'
      }
    ]
  },
  {
    title: 'ঠাণ্ডা, সর্দি ও আমাশয় নিরাময় কোর্স (২ ওষুধ)',
    days: 3,
    rows: [
      {
        medicineName: 'অ্যান্টিবায়োটিক (টাইলোসিন / ডক্সিসাইক্লিন)',
        symptoms: 'সর্দি, কাশি ও ঘড়ঘড় শব্দ',
        timingAndDosage: 'সকালে ও রাতে ১ লিটার পানিতে ১ গ্রাম',
        medicineType: 'অ্যান্টিবায়োটিক' as const,
        timeOfDay: 'সকাল' as const,
        notes: 'টানা ৩ দিন চলবে'
      },
      {
        medicineName: 'টল্ট্রাজুরিল (কক্সিডিওসিস ওষুধ)',
        symptoms: 'রক্ত আমাশয় ও পাতলা পায়খানা',
        timingAndDosage: 'দুপুরে ১ লিটার পানিতে ১ মিলি',
        medicineType: 'অন্যান্য ওষুধ' as const,
        timeOfDay: 'দুপুর' as const,
        notes: 'টানা ২-৩ দিন'
      }
    ]
  }
];

export const MedicineSchedule: React.FC<MedicineScheduleProps> = ({
  activeBatch,
  medicines,
  onToggleStatus,
  onAddMedicine,
  onUpdateMedicine,
  onDeleteMedicine,
  onClearAll,
  onResetToDefault
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed' | 'vaccine' | 'antibiotic'>('all');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MedicineScheduleItem | null>(null);

  // Multi-Medicine Sheet Form State
  const [dayAge, setDayAge] = useState<string>('1');
  const [courseDurationDays, setCourseDurationDays] = useState<string>('1'); // ১ দিন, ৩ দিন, ৫ দিন বা যত খুশি দিন
  const [sheetRows, setSheetRows] = useState<MedicineSheetRow[]>([
    {
      id: 'row_1',
      medicineName: '',
      symptoms: '',
      timingAndDosage: '',
      medicineType: 'ভিটামিন / মিনারেল',
      timeOfDay: 'সকাল',
      notes: ''
    }
  ]);

  // Edit scope option if editing an existing single item that belongs to a course
  const [editScope, setEditScope] = useState<'single' | 'allCourse'>('single');

  // Dedicated Day Medicine View State (ক্লিক করলে ওই দিনের সব ওষুধ বিস্তারিত দেখা যাবে)
  const [viewingDay, setViewingDay] = useState<number | null>(null);
  const [copiedPrescription, setCopiedPrescription] = useState(false);

  if (!activeBatch) {
    return (
      <div className="py-12 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
        <Syringe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">কোনো ব্যাচ সক্রিয় নেই</h3>
        <p className="text-sm text-slate-500 mt-1">ওষুধ ও ভ্যাকসিনের তালিকা দেখতে একটি ব্যাচ নির্বাচন করুন বা নতুন ব্যাচ শুরু করুন।</p>
      </div>
    );
  }

  const currentAge = calculateBatchAgeDays(activeBatch.startDate);

  // Distinct days list for filter dropdown
  const distinctDays = useMemo(() => {
    const daysSet = new Set<number>();
    medicines.forEach((m) => daysSet.add(m.dayAge));
    return Array.from(daysSet).sort((a, b) => a - b);
  }, [medicines]);

  // Medicines for the currently selected day
  const dayMedicines = useMemo(() => {
    if (viewingDay === null) return [];
    return medicines
      .filter((m) => m.dayAge === viewingDay)
      .sort((a, b) => {
        const order: Record<string, number> = {
          'সকালে': 1,
          'সকাল': 1,
          'সকাল ও রাতে': 2,
          'দুপুরে': 3,
          'দুপুর': 3,
          'দুপুর ও রাতে': 4,
          'রাতে': 5,
          'রাত': 5,
          'সকাল, দুপুর ও রাত': 6,
          'সারাদিন পানিতে': 7,
          'সারাদিন': 7,
        };
        const aVal = order[a.timeOfDay || ''] || 10;
        const bVal = order[b.timeOfDay || ''] || 10;
        return aVal - bVal;
      });
  }, [medicines, viewingDay]);

  // Copy prescription for this day
  const handleCopyDayPrescription = () => {
    if (viewingDay === null || dayMedicines.length === 0) return;
    const text = `🐔 খামার বন্ধু - ${activeBatch?.batchName || 'পোল্ট্রি খামার'}
📅 বয়সের ${toBnNumber(viewingDay)}তম দিনের ওষুধের তালিকা:
------------------------------------------
${dayMedicines
  .map(
    (m, i) =>
      `${toBnNumber(i + 1)}. ${m.medicineName} (${m.timeOfDay || 'নিয়ম অনুযায়ী'})
   • রোগের লক্ষণ: ${m.symptoms || m.purpose || 'সাধারণ পরিচর্যা'}
   • খাওয়ানোর নিয়ম: ${m.timingAndDosage || m.dosage || 'নির্দেশ অনুযায়ী'}
   • স্ট্যাটাস: ${m.status === 'completed' ? '✓ সম্পন্ন' : '⏳ বাকি আছে'}`
  )
  .join('\n\n')}
------------------------------------------
মোট ওষুধ: ${toBnNumber(dayMedicines.length)} টি`;

    navigator.clipboard.writeText(text);
    setCopiedPrescription(true);
    setTimeout(() => setCopiedPrescription(false), 2500);
  };

  // Helper to render dose timing badge with icons and colors
  const renderTimingBadge = (timeOfDay?: string) => {
    if (!timeOfDay) return null;
    const match = MEDICINE_TIMING_OPTIONS.find(
      (opt) =>
        opt.id === timeOfDay ||
        (timeOfDay === 'সকাল' && opt.id === 'সকালে') ||
        (timeOfDay === 'দুপুর' && opt.id === 'দুপুরে') ||
        (timeOfDay === 'রাত' && opt.id === 'রাতে') ||
        (timeOfDay.includes('সকাল ও রাত') && opt.id === 'সকাল ও রাতে') ||
        (timeOfDay.includes('দুপুর ও রাত') && opt.id === 'দুপুর ও রাতে')
    );

    if (match) {
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${match.badgeBg} ${match.badgeText} ${match.badgeBorder}`}
        >
          <span>{match.icon}</span>
          <span>{match.shortLabel}</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Clock className="w-3 h-3 text-slate-500" />
        <span>{timeOfDay}</span>
      </span>
    );
  };

  // Open modal for adding a new multi-medicine sheet
  const handleOpenAddModal = (presetDay?: number, defaultCourseDays = '1') => {
    setEditingItem(null);
    setDayAge(presetDay !== undefined ? presetDay.toString() : currentAge.toString());
    setCourseDurationDays(defaultCourseDays);
    setSheetRows([
      {
        id: `row_${Date.now()}_1`,
        isExisting: false,
        medicineName: '',
        symptoms: '',
        timingAndDosage: 'সকালে ও রাতে খাবার পানির সাথে (১ লিটারে ১ মিলি/গ্রাম)',
        medicineType: 'ভিটামিন / মিনারেল',
        timeOfDay: 'সকাল ও রাতে',
        notes: ''
      }
    ]);
    setShowModal(true);
  };

  // Open modal for editing an existing item (also allows adding extra new medicines to that day!)
  const handleOpenEditModal = (item: MedicineScheduleItem) => {
    setEditingItem(item);
    setDayAge(item.dayAge.toString());
    setCourseDurationDays('1');
    setSheetRows([
      {
        id: item.id,
        isExisting: true,
        medicineName: item.medicineName,
        symptoms: item.symptoms || item.purpose || '',
        timingAndDosage: item.timingAndDosage || item.dosage || '',
        medicineType: item.medicineType || 'অন্যান্য ওষুধ',
        timeOfDay: item.timeOfDay || 'সকাল ও রাতে',
        notes: item.notes || ''
      }
    ]);
    setEditScope('single');
    setShowModal(true);
  };

  // Add another medicine row to the sheet (works in both Add and Edit modes)
  const handleAddRow = () => {
    const nextIndex = sheetRows.length + 1;
    let defaultTime = 'সকাল ও রাতে';
    let defaultTiming = 'সকালে ও রাতে খাবার পানির সাথে (১ লিটারে ১ মিলি/গ্রাম)';

    if (nextIndex === 2) {
      defaultTime = 'দুপুর ও রাতে';
      defaultTiming = 'দুপুরে ও রাতে খাবার পানির সাথে (১ লিটারে ১ মিলি/গ্রাম)';
    } else if (nextIndex === 3) {
      defaultTime = 'সকালে';
      defaultTiming = 'সকালে ১ লিটার পানিতে ১ মিলি';
    } else if (nextIndex === 4) {
      defaultTime = 'রাতে';
      defaultTiming = 'রাতে ১ লিটার পানিতে ১ গ্রাম';
    }

    setSheetRows([
      ...sheetRows,
      {
        id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        isExisting: false,
        medicineName: '',
        symptoms: '',
        timingAndDosage: defaultTiming,
        medicineType: 'অন্যান্য ওষুধ',
        timeOfDay: defaultTime,
        notes: ''
      }
    ]);
  };

  // Remove a row from the sheet
  const handleRemoveRow = (rowId: string) => {
    setSheetRows((prevRows) => {
      if (prevRows.length <= 1) return prevRows;
      return prevRows.filter((r) => r.id !== rowId);
    });
  };

  // Update specific field in a row atomically with functional updater
  const handleUpdateRowField = (rowId: string, field: keyof MedicineSheetRow, value: any) => {
    setSheetRows((prevRows) =>
      prevRows.map((r) => {
        if (r.id === rowId) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  // Update multiple fields in a row atomically
  const handleUpdateRowMultiple = (rowId: string, updates: Partial<MedicineSheetRow>) => {
    setSheetRows((prevRows) =>
      prevRows.map((r) => {
        if (r.id === rowId) {
          return { ...r, ...updates };
        }
        return r;
      })
    );
  };

  // Apply a pre-built combo routine into the sheet
  const handleApplyCombo = (combo: typeof ROUTINE_COMBOS[0]) => {
    setCourseDurationDays(combo.days.toString());
    setSheetRows(
      combo.rows.map((r, i) => ({
        id: `row_combo_${Date.now()}_${i}`,
        isExisting: false,
        medicineName: r.medicineName,
        symptoms: r.symptoms,
        timingAndDosage: r.timingAndDosage,
        medicineType: r.medicineType,
        timeOfDay: r.timeOfDay,
        notes: r.notes
      }))
    );
  };

  // Handle Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const startDay = parseInt(dayAge, 10) || 1;
    const duration = Math.max(1, parseInt(courseDurationDays, 10) || 1);

    // Validate that at least one row has a medicine name
    const validRows = sheetRows.filter((r) => r.medicineName.trim() !== '');
    if (validRows.length === 0) {
      alert('অনুগ্রহ করে অন্তত একটি ওষুধের নাম লিখুন।');
      return;
    }

    if (editingItem) {
      // 1. Update the existing item (first valid row)
      const firstRow = validRows[0];
      if (editScope === 'allCourse' && editingItem.courseId) {
        // Update all items in this course group
        medicines.forEach((m) => {
          if (m.courseId === editingItem.courseId) {
            onUpdateMedicine({
              ...m,
              medicineName: firstRow.medicineName.trim(),
              symptoms: firstRow.symptoms.trim() || 'সাধারণ রোগ প্রতিরোধ ও সুস্থতা',
              timingAndDosage: firstRow.timingAndDosage.trim() || 'প্যাকেটের নির্দেশ অনুযায়ী পানির সাথে',
              purpose: firstRow.symptoms.trim(),
              dosage: firstRow.timingAndDosage.trim(),
              medicineType: firstRow.medicineType,
              timeOfDay: firstRow.timeOfDay,
              notes: firstRow.notes.trim(),
              isCustom: true
            });
          }
        });
      } else {
        onUpdateMedicine({
          ...editingItem,
          dayAge: startDay,
          medicineName: firstRow.medicineName.trim(),
          symptoms: firstRow.symptoms.trim() || 'সাধারণ রোগ প্রতিরোধ ও সুস্থতা',
          timingAndDosage: firstRow.timingAndDosage.trim() || 'প্যাকেটের নির্দেশ অনুযায়ী পানির সাথে',
          purpose: firstRow.symptoms.trim(),
          dosage: firstRow.timingAndDosage.trim(),
          medicineType: firstRow.medicineType,
          timeOfDay: firstRow.timeOfDay,
          notes: firstRow.notes.trim(),
          isCustom: true
        });
      }

      // 2. If the user also added new medicine rows while in edit mode, add them to this day!
      if (validRows.length > 1) {
        const extraRows = validRows.slice(1);
        const newItemsToAdd: Array<Omit<MedicineScheduleItem, 'id' | 'batchId' | 'userId'>> = extraRows.map((row) => {
          const trimmedName = row.medicineName.trim();
          const trimmedSymptoms = row.symptoms.trim() || 'সাধারণ রোগ প্রতিরোধ ও সুস্থতা';
          const trimmedTiming = row.timingAndDosage.trim() || 'প্যাকেটের নির্দেশ অনুযায়ী পানির সাথে';

          return {
            dayAge: startDay,
            medicineName: trimmedName,
            symptoms: trimmedSymptoms,
            timingAndDosage: trimmedTiming,
            purpose: trimmedSymptoms,
            dosage: trimmedTiming,
            medicineType: row.medicineType,
            timeOfDay: row.timeOfDay,
            status: 'pending',
            notes: row.notes.trim() || `এডিট করার সময় যুক্ত ওষুধ (${toBnNumber(startDay)}তম দিন)`,
            isCustom: true
          };
        });

        onAddMedicine(newItemsToAdd);
      }
    } else {
      // Adding new multi-medicine sheet across duration days
      const courseId = duration > 1 ? `course_${Date.now()}_${Math.random().toString(36).substring(2, 6)}` : undefined;
      const itemsToAdd: Array<Omit<MedicineScheduleItem, 'id' | 'batchId' | 'userId'>> = [];

      for (let dayOffset = 0; dayOffset < duration; dayOffset++) {
        const targetDay = startDay + dayOffset;
        const dayIndex = dayOffset + 1;

        validRows.forEach((row) => {
          const trimmedName = row.medicineName.trim();
          const trimmedSymptoms = row.symptoms.trim() || 'সাধারণ রোগ প্রতিরোধ ও সুস্থতা';
          const trimmedTiming = row.timingAndDosage.trim() || 'প্যাকেটের নির্দেশ অনুযায়ী পানির সাথে';

          itemsToAdd.push({
            dayAge: targetDay,
            courseId,
            courseDayIndex: duration > 1 ? dayIndex : undefined,
            totalCourseDays: duration > 1 ? duration : undefined,
            medicineName: trimmedName,
            symptoms: trimmedSymptoms,
            timingAndDosage: trimmedTiming,
            purpose: trimmedSymptoms,
            dosage: trimmedTiming,
            medicineType: row.medicineType,
            timeOfDay: row.timeOfDay,
            status: 'pending',
            notes: row.notes.trim()
              ? row.notes.trim()
              : duration > 1
              ? `কোর্সের ${toBnNumber(dayIndex)}ম দিন (মোট ${toBnNumber(duration)} দিন)`
              : '',
            isCustom: true
          });
        });
      }

      onAddMedicine(itemsToAdd);
    }

    setShowModal(false);
    setViewingDay(startDay);
  };

  // Filter Items
  const filteredItems = medicines.filter((item) => {
    if (filter === 'pending' && item.status !== 'pending') return false;
    if (filter === 'completed' && item.status !== 'completed') return false;
    if (filter === 'vaccine' && item.medicineType !== 'টিকা (ভ্যাকসিন)' && !item.medicineName.includes('টিকা') && !item.medicineName.includes('ভ্যাকসিন')) return false;
    if (filter === 'antibiotic' && item.medicineType !== 'অ্যান্টিবায়োটিক' && !item.medicineName.includes('অ্যান্টিবায়োটিক')) return false;

    if (selectedDayFilter !== 'all' && item.dayAge.toString() !== selectedDayFilter) {
      return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = item.medicineName.toLowerCase().includes(q);
      const matchSym = (item.symptoms || item.purpose || '').toLowerCase().includes(q);
      const matchTiming = (item.timingAndDosage || item.dosage || '').toLowerCase().includes(q);
      const matchDay = item.dayAge.toString().includes(q) || (item.endDayAge && item.endDayAge.toString().includes(q));
      if (!matchName && !matchSym && !matchTiming && !matchDay) return false;
    }

    return true;
  });

  // Calculate day-wise count for showing "১ দিনে কয়টি ওষুধ রয়েছে"
  const dayCounts = useMemo(() => {
    const map: Record<number, number> = {};
    medicines.forEach((m) => {
      map[m.dayAge] = (map[m.dayAge] || 0) + 1;
    });
    return map;
  }, [medicines]);

  const completedCount = medicines.filter((m) => m.status === 'completed').length;
  const pendingCount = medicines.filter((m) => m.status === 'pending').length;

  return (
    <div className="space-y-6 pb-12">
      {/* =========================================================================
          DEDICATED DAY MEDICINE VIEW (ওই দিনের সব ওষুধ ও প্রেসক্রিপশন পাতা)
          ========================================================================= */}
      {viewingDay !== null ? (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Top Navigation Bar: Back button, Batch info, and Day Navigator */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setViewingDay(null)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold transition-all active:scale-95 border border-slate-200 shadow-2xs"
                title="সকল দিনের তালিকায় ফিরুন"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>← সকল ওষুধের তালিকা</span>
              </button>

              <div className="hidden sm:block h-6 w-px bg-slate-200"></div>

              <span className="text-xs font-semibold text-slate-500">
                ব্যাচ: <strong className="text-slate-800">{activeBatch.batchName}</strong> ({activeBatch.birdType})
              </span>
            </div>

            {/* Previous Day & Next Day Nav */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                disabled={viewingDay <= 1}
                onClick={() => setViewingDay((prev) => (prev && prev > 1 ? prev - 1 : 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="আগের দিনের ওষুধ দেখুন"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>{toBnNumber(Math.max(1, viewingDay - 1))}ম দিন</span>
              </button>

              <span className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs sm:text-sm shadow-xs">
                {toBnNumber(viewingDay)}তম দিন
              </span>

              <button
                type="button"
                onClick={() => setViewingDay((prev) => (prev ? prev + 1 : 2))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
                title="পরের দিনের ওষুধ দেখুন"
              >
                <span>{toBnNumber(viewingDay + 1)}ম দিন</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Hero Banner for this Day */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-lg border border-emerald-500/25 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex flex-col items-center justify-center font-black shadow-lg shadow-emerald-500/30 ring-4 ring-emerald-400/20 shrink-0">
                  <span className="text-[10px] uppercase font-bold tracking-wider leading-none">দিন</span>
                  <span className="text-xl sm:text-2xl mt-0.5">{toBnNumber(viewingDay)}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      বয়সের {toBnNumber(viewingDay)}তম দিনের ওষুধের তালিকা ও রুটিন
                    </h2>
                    {viewingDay === currentAge ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-400 text-emerald-950 animate-pulse">
                        ⭐ আজকের দিন (বর্তমান বয়স)
                      </span>
                    ) : viewingDay < currentAge ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-slate-200">
                        অতীত দিন ({toBnNumber(currentAge - viewingDay)} দিন আগে)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                        আসন্ন দিন ({toBnNumber(viewingDay - currentAge)} দিন পর)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    এই দিনে সকাল, দুপুর ও রাতে কোন কোন ওষুধ খাওয়াতে হবে, রোগের লক্ষণ ও প্রয়োগকালের সম্পূর্ণ প্রেসক্রিপশন।
                  </p>
                </div>
              </div>

              {/* Action Buttons: Add Medicine on this day, Copy */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal(viewingDay, '1')}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ এই দিনে ওষুধ যোগ করুন</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyDayPrescription}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold border border-white/10 transition-colors"
                  title="এই দিনের প্রেসক্রিপশন কপি করুন"
                >
                  {copiedPrescription ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-300">কপি হয়েছে!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>কপি করুন</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick stats on banner */}
            <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
              <div className="bg-white/5 rounded-2xl p-2.5">
                <span className="text-[10px] text-slate-300 block">মোট ওষুধ</span>
                <span className="text-base sm:text-lg font-black text-white">{toBnNumber(dayMedicines.length)} টি</span>
              </div>
              <div className="bg-white/5 rounded-2xl p-2.5">
                <span className="text-[10px] text-emerald-300 block">সম্পন্ন হয়েছে</span>
                <span className="text-base sm:text-lg font-black text-emerald-400">
                  {toBnNumber(dayMedicines.filter((m) => m.status === 'completed').length)} টি
                </span>
              </div>
              <div className="bg-white/5 rounded-2xl p-2.5">
                <span className="text-[10px] text-amber-300 block">এখনো বাকি আছে</span>
                <span className="text-base sm:text-lg font-black text-amber-400">
                  {toBnNumber(dayMedicines.filter((m) => m.status === 'pending').length)} টি
                </span>
              </div>
            </div>
          </div>

          {/* List of Medicines on This Day */}
          {dayMedicines.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Syringe className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">
                  {toBnNumber(viewingDay)}তম দিনে কোনো ওষুধ নির্ধারিত নেই
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  এই দিনে সকাল, দুপুর বা রাতে কোনো ওষুধ খাওয়াতে চাইলে নিচের বাটনে চাপ দিয়ে ওষুধ যুক্ত করুন।
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenAddModal(viewingDay, '1')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ {toBnNumber(viewingDay)}তম দিনে ওষুধ যোগ করুন</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  এই দিনের নির্ধারিত ওষুধের তালিকা ({toBnNumber(dayMedicines.length)} টি)
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">
                  প্রয়োগ সম্পন্ন হলে স্ট্যাটাস বাটনে চাপ দিন
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {dayMedicines.map((item, idx) => {
                  const isDone = item.status === 'completed';
                  return (
                    <div
                      key={item.id}
                      className={`p-4 sm:p-5 rounded-3xl border transition-all shadow-xs relative ${
                        isDone
                          ? 'bg-emerald-50/40 border-emerald-200/80'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* Left: Timing badge, name, symptoms, dosage */}
                        <div className="space-y-2.5 flex-1 min-w-0">
                          {/* Timing Badge & Serial */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {toBnNumber(idx + 1)}
                            </span>

                            {renderTimingBadge(item.timeOfDay)}

                            {item.medicineType && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {item.medicineType}
                              </span>
                            )}

                            {item.courseDayIndex && item.totalCourseDays && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                কোর্সের {toBnNumber(item.courseDayIndex)}ম দিন (মোট {toBnNumber(item.totalCourseDays)} দিন)
                              </span>
                            )}
                          </div>

                          {/* Medicine Name */}
                          <h3 className={`text-base sm:text-lg font-black ${isDone ? 'text-emerald-950' : 'text-slate-900'}`}>
                            {item.medicineName}
                          </h3>

                          {/* Two Key Fields: Symptoms and Timing & Dosage */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {/* Disease / Symptoms */}
                            <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-100 space-y-0.5">
                              <span className="text-[10px] font-bold text-rose-800 flex items-center gap-1 uppercase tracking-wider">
                                <Activity className="w-3.5 h-3.5 text-rose-600" /> রোগের লক্ষণ / উদ্দেশ্য
                              </span>
                              <p className="text-xs font-bold text-slate-800 leading-snug">
                                {item.symptoms || item.purpose || 'সাধারণ রোগ প্রতিরোধ ও সুস্থতা'}
                              </p>
                            </div>

                            {/* Dosage & Timing */}
                            <div className="bg-blue-50/70 p-3 rounded-2xl border border-blue-100 space-y-0.5">
                              <span className="text-[10px] font-bold text-blue-800 flex items-center gap-1 uppercase tracking-wider">
                                <Clock3 className="w-3.5 h-3.5 text-blue-600" /> খাওয়ানোর সময় ও মাত্রা (Dosage)
                              </span>
                              <p className="text-xs font-bold text-slate-800 leading-snug">
                                {item.timingAndDosage || item.dosage || 'নির্দেশ অনুযায়ী পানির সাথে'}
                              </p>
                            </div>
                          </div>

                          {item.notes && (
                            <p className="text-[11px] text-slate-500 italic pt-0.5">
                              বিশেষ নোট: {item.notes}
                            </p>
                          )}
                        </div>

                        {/* Right: Toggle Status, Edit, Delete */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto justify-between md:justify-end">
                          <button
                            type="button"
                            onClick={() => onToggleStatus(item.id)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                            }`}
                          >
                            {isDone ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                <span>সম্পন্ন হয়েছে</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4" />
                                <span>সম্পন্ন মার্ক করুন</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2.5 text-slate-600 hover:text-emerald-700 rounded-2xl hover:bg-emerald-50 border border-slate-200 transition-colors"
                            title="এই ওষুধটি পরিবর্তন / এডিট করুন"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`আপনি কি "${item.medicineName}" মুছে ফেলতে চান?`)) {
                                onDeleteMedicine(item.id);
                              }
                            }}
                            className="p-2.5 text-slate-400 hover:text-rose-600 rounded-2xl hover:bg-rose-50 border border-slate-200 transition-colors"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom bar of day page */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal(viewingDay, '1')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ এই {toBnNumber(viewingDay)}তম দিনে আরও একটি নতুন ওষুধ যোগ করুন</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingDay(null)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 underline"
                >
                  ← সকল ওষুধের তালিকায় ফিরে যান
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Top Header Card */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  ওষুধ ও টিকাদান খাতা (Prescription & Medicine Sheet)
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  একই শীটে একাধিক ওষুধ
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                একই শীটে সকাল, দুপুর ও রাতের সব ওষুধ একসাথে যোগ করুন এবং ৩ বা ৫ দিনের কোর্সে সব দিনগুলোতে অটো সেট করুন।
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenAddModal(currentAge, '3')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            একই শীটে একাধিক ওষুধ যোগ করুন
          </button>

          {/* Schedule Utilities */}
          <div className="relative group">
            <button
              type="button"
              className="p-2.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors"
              title="শিডিউল অপশন"
            >
              <RotateCcw className="w-4 h-4 text-slate-600" />
            </button>
            <div className="absolute right-0 mt-1 w-64 p-2 bg-white rounded-2xl shadow-xl border border-slate-100 hidden group-hover:block transition-all z-30 text-xs">
              <button
                onClick={onResetToDefault}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-slate-700 font-semibold flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-emerald-600" />
                আদর্শ পোল্ট্রি সূচি লোড করুন
              </button>
              <button
                onClick={() => {
                  if (confirm('আপনি কি এই ব্যাচের সব ওষুধ ও টিকা মুছে সম্পূর্ণ খালি খাতা তৈরি করতে চান?')) {
                    onClearAll();
                  }
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2 mt-1"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                সব মুছে নতুন করে শুরু করুন
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats and Current Day Notice */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-500" /> বর্তমান বয়স
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {toBnNumber(currentAge)} <span className="text-xs font-normal text-slate-500">দিন</span>
            </div>
            <p className="text-[11px] text-blue-600 font-medium mt-0.5">
              আজকের নির্ধারিত ওষুধ: {toBnNumber(medicines.filter((m) => m.dayAge === currentAge).length)} টি
            </p>
          </div>
          <button
            onClick={() => handleOpenAddModal(currentAge, '1')}
            className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold transition-colors shadow-2xs"
          >
            + আজকের শীট
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-500" /> বাকি থাকা ওষুধ (পেন্ডিং)
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {toBnNumber(pendingCount)} <span className="text-xs font-normal text-slate-500">টি</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            মোট শিডিউলভুক্ত: {toBnNumber(medicines.length)} টি এন্ট্রি
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> সম্পন্ন ওষুধ/টিকা
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {toBnNumber(completedCount)} <span className="text-xs font-normal text-slate-500">টি</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
            সম্পন্নতার হার: {medicines.length > 0 ? toBnNumber(Math.round((completedCount / medicines.length) * 100)) : 0}%
          </p>
        </div>
      </div>

      {/* Search, Filter & View Toggle Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            সব ({toBnNumber(medicines.length)})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filter === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            বাকি ({toBnNumber(pendingCount)})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filter === 'completed' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            সম্পন্ন ({toBnNumber(completedCount)})
          </button>
          <button
            onClick={() => setFilter('vaccine')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filter === 'vaccine' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            টিকা (Vaccine)
          </button>
          <button
            onClick={() => setFilter('antibiotic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              filter === 'antibiotic' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            অ্যান্টিবায়োটিক
          </button>
        </div>

        {/* Right side: Day filter, Search & View Mode Switcher */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {distinctDays.length > 0 && (
            <select
              value={selectedDayFilter}
              onChange={(e) => setSelectedDayFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
              title="নির্দিষ্ট দিনের ওষুধ ফিল্টার"
            >
              <option value="all">সব দিন ({toBnNumber(distinctDays.length)}টি দিন)</option>
              {distinctDays.map((d) => (
                <option key={d} value={d.toString()}>
                  {toBnNumber(d)}তম দিন ({toBnNumber(dayCounts[d] || 0)}টি ওষুধ)
                </option>
              ))}
            </select>
          )}

          <div className="relative w-full sm:w-52">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="লক্ষণ, ওষুধ বা দিন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* View mode toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'table' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="একনজরে খাতা / টেবিল ভিউ"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">খাতা ভিউ</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                viewMode === 'cards' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="কার্ড ভিউ"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">কার্ড ভিউ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Cards */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-xs">
          <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">কোনো ওষুধ বা টিকা পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            একই শীটে একাধিক ওষুধ (সকাল, দুপুর, রাত) এবং ৩ বা ৫ দিনের কোর্স একসাথে যুক্ত করতে পারেন।
          </p>
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => handleOpenAddModal(currentAge, '3')}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              একই শীটে একাধিক ওষুধ যোগ করুন
            </button>
            <button
              onClick={onResetToDefault}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              আদর্শ সূচি লোড করুন
            </button>
          </div>
        </div>
      ) : viewMode === 'table' ? (
        /* AT-A-GLANCE TABLE VIEW */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <LayoutList className="w-4 h-4 text-emerald-600" />
                একনজরে ওষুধ ও টিকা খাতা (At-a-Glance Register)
              </span>
              <span className="text-[11px] text-slate-500 font-semibold">
                (মোট {toBnNumber(filteredItems.length)} টি এন্ট্রি)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                যেকোনো ওষুধ পরিবর্তন করতে ✏️ এডিট চাপুন
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                  <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap w-28">বয়সের দিন</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap min-w-[140px]">রোগের লক্ষণ (Symptoms)</th>
                  <th className="py-3 px-3 sm:px-4 whitespace-nowrap min-w-[160px]">ওষুধের নাম</th>
                  <th className="py-3 px-3 sm:px-4 min-w-[230px]">কখন ও কীভাবে খাওয়াতে হবে (Timing & Dosage)</th>
                  <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap w-28">স্ট্যাটাস</th>
                  <th className="py-3 px-3 sm:px-4 text-center whitespace-nowrap w-24">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.map((item) => {
                  const isCompleted = item.status === 'completed';
                  const isCurrentAge = item.dayAge === currentAge;
                  const isPastPending = item.dayAge < currentAge && !isCompleted;

                  const displaySymptoms = item.symptoms || item.purpose || 'সাধারণ লক্ষণ';
                  const displayTiming = item.timingAndDosage || item.dosage || 'নিয়ম অনুযায়ী পানির সাথে';
                  const countThisDay = dayCounts[item.dayAge] || 1;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setViewingDay(item.dayAge)}
                      className={`transition-colors cursor-pointer group ${
                        isCompleted
                          ? 'bg-slate-50/50 hover:bg-emerald-50/70'
                          : isCurrentAge
                          ? 'bg-emerald-50/70 hover:bg-emerald-100/70 font-medium'
                          : isPastPending
                          ? 'bg-amber-50/60 hover:bg-amber-100/70'
                          : 'hover:bg-emerald-50/70'
                      }`}
                      title={`${toBnNumber(item.dayAge)}তম দিনের সব ওষুধ ও প্রেসক্রিপশন দেখতে ক্লিক করুন`}
                    >
                      {/* Column 1: বয়সের দিন & '+ এই দিনে যোগ' shortcut */}
                      <td className="py-3 px-3 sm:px-4 text-center align-middle">
                        <div className="flex flex-col items-center justify-center">
                          <div
                            className={`inline-flex flex-col items-center justify-center px-2.5 py-1 rounded-xl text-center font-black ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isCurrentAge
                                ? 'bg-emerald-600 text-white shadow-xs animate-pulse'
                                : isPastPending
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            <span className="text-[9px] uppercase font-bold leading-none">বয়স</span>
                            <span className="text-xs font-black mt-0.5 whitespace-nowrap">
                              {toBnNumber(item.dayAge)} দিন
                            </span>
                          </div>

                          {/* How many medicines on this day & quick add button */}
                          <div className="mt-1 flex items-center gap-1">
                            {countThisDay > 1 && (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1 rounded" title={`এই দিনে মোট ${toBnNumber(countThisDay)}টি ওষুধ নির্ধারিত রয়েছে`}>
                                {toBnNumber(countThisDay)}টি ওষুধ
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddModal(item.dayAge, '1');
                              }}
                              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                              title={`এই দিনে (${toBnNumber(item.dayAge)}তম দিন) আরও একটি ওষুধ যোগ করুন`}
                            >
                              +আরও
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: রোগের লক্ষণ */}
                      <td className="py-3 px-3 sm:px-4 align-middle">
                        <div className="flex items-start gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-slate-900 text-xs block">
                              {displaySymptoms}
                            </span>
                            {item.courseDayIndex && item.totalCourseDays && (
                              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60 inline-block mt-0.5">
                                কোর্সের {toBnNumber(item.courseDayIndex)}ম দিন (মোট {toBnNumber(item.totalCourseDays)} দিন)
                              </span>
                            )}
                            {item.notes && (
                              <span className="text-[10px] text-slate-400 italic block mt-0.5">
                                {item.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 3: ওষুধের নাম */}
                      <td className="py-3 px-3 sm:px-4 align-middle">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                          <span className="text-emerald-950 font-black group-hover:text-emerald-700 group-hover:underline underline-offset-2">
                            {item.medicineName}
                          </span>
                          {item.medicineType && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                              {item.medicineType}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 group-hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs">
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span>ওই দিনের সব ওষুধ ➔</span>
                          </span>
                        </div>
                      </td>

                      {/* Column 4: কখন ও কীভাবে খাওয়াতে হবে */}
                      <td className="py-3 px-3 sm:px-4 align-middle">
                        <div className="flex items-start gap-1.5">
                          <Clock3 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-xs text-slate-700 font-semibold leading-relaxed block">
                              {displayTiming}
                            </span>
                            {item.timeOfDay && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {renderTimingBadge(item.timeOfDay)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 5: স্ট্যাটাস (Clickable Checkbox) */}
                      <td className="py-3 px-3 sm:px-4 text-center align-middle">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(item.id);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all shadow-2xs whitespace-nowrap ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                              : isPastPending
                              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white border border-slate-200'
                          }`}
                          title="ক্লিক করে স্ট্যাটাস পরিবর্তন করুন"
                        >
                          {isCompleted ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>সম্পন্ন</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>বাকি আছে</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Column 6: অ্যাকশন */}
                      <td className="py-3 px-3 sm:px-4 text-center align-middle whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(item);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors border border-transparent hover:border-emerald-200"
                            title="এই নির্দিষ্ট দিনের ওষুধ পরিবর্তন / এডিট করুন"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`আপনি কি "${item.medicineName}" মুছে ফেলতে চান?`)) {
                                onDeleteMedicine(item.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* CARD VIEW */
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isCompleted = item.status === 'completed';
            const isCurrentAge = item.dayAge === currentAge;
            const isPastPending = item.dayAge < currentAge && !isCompleted;

            const displaySymptoms = item.symptoms || item.purpose || 'সাধারণ লক্ষণ';
            const displayTiming = item.timingAndDosage || item.dosage || 'নিয়ম অনুযায়ী পানির সাথে';
            const countThisDay = dayCounts[item.dayAge] || 1;

            return (
              <div
                key={item.id}
                onClick={() => setViewingDay(item.dayAge)}
                className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isCompleted
                    ? 'bg-slate-50/70 border-slate-200 opacity-90 hover:border-emerald-300'
                    : isCurrentAge
                    ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/40 shadow-xs hover:border-emerald-400'
                    : isPastPending
                    ? 'bg-amber-50/80 border-amber-300 hover:border-amber-400'
                    : 'bg-white border-slate-200/80 hover:border-emerald-400 hover:shadow-xs'
                }`}
                title={`${toBnNumber(item.dayAge)}তম দিনের সব ওষুধ ও চিকিৎসাপত্র দেখতে ক্লিক করুন`}
              >
                {/* Left Side: Age Badge and Details */}
                <div className="flex items-start gap-4">
                  {/* Age Badge */}
                  <div className="flex flex-col items-center shrink-0">
                    <div
                      className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black text-center shadow-2xs ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isCurrentAge
                          ? 'bg-emerald-600 text-white'
                          : isPastPending
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold leading-none">বয়স</span>
                      <span className="text-base font-black mt-0.5 leading-tight">
                        {toBnNumber(item.dayAge)}
                      </span>
                      <span className="text-[9px] font-semibold leading-none">দিন</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddModal(item.dayAge, '1');
                      }}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline mt-1"
                    >
                      + এই দিনে যোগ
                    </button>
                  </div>

                  {/* Information */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-slate-900 text-base group-hover:text-emerald-700 group-hover:underline underline-offset-2">
                        {item.medicineName}
                      </h4>

                      {item.medicineType && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                          {item.medicineType}
                        </span>
                      )}

                      {countThisDay > 1 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                          এই দিনে {toBnNumber(countThisDay)}টি ওষুধ
                        </span>
                      )}

                      {item.courseDayIndex && item.totalCourseDays && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                          কোর্সের {toBnNumber(item.courseDayIndex)}/{toBnNumber(item.totalCourseDays)} দিন
                        </span>
                      )}

                      {isCurrentAge && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white animate-pulse">
                          আজকের জন্য ({toBnNumber(currentAge)} দিন)
                        </span>
                      )}

                      {isPastPending && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          বাকি রয়েছে
                        </span>
                      )}
                    </div>

                    {/* Symptoms Field */}
                    <div className="flex items-center gap-1.5 text-xs text-rose-700 font-bold bg-rose-50/80 px-2.5 py-1 rounded-lg border border-rose-100 w-fit">
                      <Activity className="w-3.5 h-3.5" />
                      <span>রোগের লক্ষণ: {displaySymptoms}</span>
                    </div>

                    {/* Timing & Dosage Field */}
                    <div className="text-xs text-slate-700 flex items-center gap-2 font-semibold pt-0.5 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <Clock3 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span><strong>খাওয়ানোর নিয়ম:</strong> {displayTiming}</span>
                      </div>
                      {item.timeOfDay && renderTimingBadge(item.timeOfDay)}
                    </div>

                    {item.notes && (
                      <p className="text-[11px] text-slate-500 italic">
                        নোট: {item.notes}
                      </p>
                    )}

                    {isCompleted && item.completedAt && (
                      <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                        <Check className="w-3.5 h-3.5" />
                        সম্পন্ন করার তারিখ: {formatBnDate(item.completedAt.split('T')[0])}
                      </p>
                    )}

                    {/* Click-to-Day View Pill */}
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>এই {toBnNumber(item.dayAge)}তম দিনের সব ওষুধ বিস্তারিত দেখুন ({toBnNumber(countThisDay)}টি) ➔</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Toggle Status, Edit, and Delete */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(item.id);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        সম্পন্ন হয়েছে
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        সম্পন্ন মার্ক করুন
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(item);
                    }}
                    className="p-2 text-slate-500 hover:text-emerald-700 rounded-xl hover:bg-emerald-50 border border-slate-200 transition-colors"
                    title="এই নির্দিষ্ট দিনের ওষুধ পরিবর্তন / এডিট করুন"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`আপনি কি "${item.medicineName}" মুছে ফেলতে চান?`)) {
                        onDeleteMedicine(item.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 border border-slate-200 transition-colors"
                    title="মুছে ফেলুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Multi-Medicine Sheet Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[94vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingItem ? 'ওষুধ বা টিকা সম্পাদনা / পরিবর্তন' : 'একই শীটে একাধিক ওষুধ যোগ করুন'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingItem
                      ? 'নির্দিষ্ট দিনের ওষুধ বা পুরো কোর্সের তথ্য পরিবর্তন করুন'
                      : 'একই দিনে একাধিক ওষুধ (সকাল, দুপুর, রাত) এবং ৩ বা ৫ দিনের কোর্স একসাথে সেট করুন'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Quick Routine Combos Helper (When adding new sheet) */}
            {!editingItem && (
              <div className="my-3 p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 shrink-0">
                <span className="text-[11px] font-bold text-emerald-900 block mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> এক ক্লিকে সারাদিনের সম্পূর্ণ রুটিন লোড করুন (ঐচ্ছিক):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {ROUTINE_COMBOS.map((combo) => (
                    <button
                      key={combo.title}
                      type="button"
                      onClick={() => handleApplyCombo(combo)}
                      className="px-2.5 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-900 text-[11px] font-semibold hover:bg-emerald-600 hover:text-white transition-colors text-left"
                    >
                      + {combo.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto pr-1 space-y-4 flex-1">
              
              {/* Day & Duration Selector Bar */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                
                {/* 1. Start Day */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">
                      ১. পাখির বয়স / শুরুর দিন *
                    </label>
                    <button
                      type="button"
                      onClick={() => setDayAge(currentAge.toString())}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      আজকের দিন ({toBnNumber(currentAge)})
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      max="365"
                      required
                      placeholder="যেমন: ৩"
                      value={dayAge}
                      onChange={(e) => setDayAge(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">তম দিন</span>
                  </div>
                </div>

                {/* 2. Course Duration */}
                {!editingItem ? (
                  <div>
                    <label className="text-xs font-bold text-slate-800 block mb-1">
                      ২. কোর্সের সময়কাল (কয় দিন চলবে?) *
                    </label>
                    <div className="flex items-center gap-1.5">
                      {['1', '3', '5', '7'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setCourseDurationDays(d)}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-colors ${
                            courseDurationDays === d
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {toBnNumber(d)} দিন
                        </button>
                      ))}
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={courseDurationDays}
                        onChange={(e) => setCourseDurationDays(e.target.value)}
                        className="w-14 text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-xl bg-white text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                        title="কাস্টম দিন সংখ্যা"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-bold text-slate-800 block mb-1">
                      সম্পাদনার পরিধি
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditScope('single')}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold ${
                          editScope === 'single' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                        }`}
                      >
                        শুধুমাত্র এই দিন
                      </button>
                      {editingItem.courseId && (
                        <button
                          type="button"
                          onClick={() => setEditScope('allCourse')}
                          className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold ${
                            editScope === 'allCourse' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                          }`}
                        >
                          কোর্সের সব দিন
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Course Days Notice */}
              {!editingItem && parseInt(courseDurationDays, 10) > 1 && (
                <div className="p-2.5 bg-blue-50/80 rounded-xl border border-blue-200/80 text-[11px] text-blue-900 font-semibold flex items-center justify-between">
                  <span>
                    💡 নিচের সব ওষুধ টানা <strong>{toBnNumber(courseDurationDays)} দিন</strong> ({toBnNumber(dayAge || 1)}ম দিন থেকে {toBnNumber((parseInt(dayAge || '1', 10) + parseInt(courseDurationDays, 10) - 1))}তম দিন পর্যন্ত) স্বয়ংক্রিয়ভাবে খাতা ও শিডিউলে যুক্ত হবে।
                  </span>
                </div>
              )}

              {/* MULTI-MEDICINE ROWS SECTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    ওষুধের তালিকা ({toBnNumber(sheetRows.length)} টি ওষুধ এই শীটে)
                  </span>
                  
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-colors border border-emerald-200/70"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {editingItem ? '+ এই দিনে আরও নতুন ওষুধ যোগ করুন' : '+ আরও ওষুধ যোগ করুন'}
                  </button>
                </div>

                {sheetRows.map((row, index) => (
                  <div
                    key={row.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3 relative hover:border-slate-300 transition-colors"
                  >
                    {/* Row Header: Number, Existing/New badge, and Delete Row */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                          {toBnNumber(index + 1)}
                        </span>
                        <span className="text-xs font-bold text-slate-800">
                          {row.isExisting
                            ? 'ওষুধ #১ (বর্তমান ওষুধ সম্পাদনা)'
                            : editingItem
                            ? `নতুন ওষুধ #${toBnNumber(index + 1)} (এই দিনে যোগ হবে)`
                            : `ওষুধ #${toBnNumber(index + 1)}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Remove Row Button for extra rows */}
                        {sheetRows.length > 1 && !row.isExisting && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="flex items-center gap-1 px-2 py-1 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold transition-colors border border-rose-200/60"
                            title="এই ওষুধটি শীট থেকে বাদ দিন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>মুছুন</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dose Timing Buttons (Multi-Dose options) */}
                    <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <Clock3 className="w-3.5 h-3.5 text-blue-600" />
                          খাওয়ানোর সময় বা প্রয়োগকাল (Dose Timing) *
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium">
                          বর্তমানে নির্বাচিত: <strong className="text-emerald-700">{row.timeOfDay || 'সকাল ও রাতে'}</strong>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {MEDICINE_TIMING_OPTIONS.map((opt) => {
                          const isSelected =
                            row.timeOfDay === opt.id ||
                            (row.timeOfDay === 'সকাল' && opt.id === 'সকালে') ||
                            (row.timeOfDay === 'দুপুর' && opt.id === 'দুপুরে') ||
                            (row.timeOfDay === 'রাত' && opt.id === 'রাতে');
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const shouldUpdateDosage =
                                  !row.timingAndDosage.trim() ||
                                  MEDICINE_TIMING_OPTIONS.some((o) => row.timingAndDosage === o.defaultDosageNote);
                                
                                handleUpdateRowMultiple(row.id, {
                                  timeOfDay: opt.id,
                                  ...(shouldUpdateDosage ? { timingAndDosage: opt.defaultDosageNote } : {})
                                });
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer select-none active:scale-95 shadow-2xs ${
                                isSelected
                                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/30 font-black'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60'
                              }`}
                            >
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Row Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Medicine Name */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          ওষুধের নাম *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="যেমন: ডক্সিসাইক্লিন, সিপ্রোসিন বা ক্যালসিয়াম"
                          value={row.medicineName}
                          onChange={(e) => handleUpdateRowField(row.id, 'medicineName', e.target.value)}
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      {/* Medicine Type */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          ওষুধের ধরন
                        </label>
                        <select
                          value={row.medicineType}
                          onChange={(e) => handleUpdateRowField(row.id, 'medicineType', e.target.value)}
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                        >
                          <option value="ভিটামিন / মিনারেল">ভিটামিন / মিনারেল</option>
                          <option value="অ্যান্টিবায়োটিক">অ্যান্টিবায়োটিক</option>
                          <option value="টিকা (ভ্যাকসিন)">টিকা (ভ্যাকসিন)</option>
                          <option value="স্যালাইন / গ্লুকোজ">স্যালাইন / গ্লুকোজ</option>
                          <option value="কৃমিনাশক">কৃমিনাশক</option>
                          <option value="অন্যান্য ওষুধ">অন্যান্য ওষুধ</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick Symptom Tags */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">
                        দ্রুত রোগ বা লক্ষণ নির্বাচন করুন (ক্লিক করলে ঘরে বসে যাবে):
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto scrollbar-thin">
                        {QUICK_SYMPTOMS.map((sym) => (
                          <button
                            key={sym}
                            type="button"
                            onClick={() => handleUpdateRowField(row.id, 'symptoms', sym)}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[10px] font-semibold text-slate-600 transition-colors"
                          >
                            + {sym}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Symptoms & Timing */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Symptoms */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          রোগের লক্ষণ বা উদ্দেশ্য *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="যেমন: খাবারের অরুচি, সর্দি, বা দুর্বলতা"
                          value={row.symptoms}
                          onChange={(e) => handleUpdateRowField(row.id, 'symptoms', e.target.value)}
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>

                      {/* Timing & Dosage */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          কখন ও কী পরিমাণ খাওয়াবেন (Timing & Dosage) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="যেমন: সকালে ও রাতে খাবার পানির সাথে ১ লিটারে ১ মিলি"
                          value={row.timingAndDosage}
                          onChange={(e) => handleUpdateRowField(row.id, 'timingAndDosage', e.target.value)}
                          className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                        />
                      </div>
                    </div>

                    {/* Extra Notes */}
                    <div>
                      <input
                        type="text"
                        placeholder="অতিরিক্ত সতর্কতা বা নিয়ম (ঐচ্ছিক)"
                        value={row.notes}
                        onChange={(e) => handleUpdateRowField(row.id, 'notes', e.target.value)}
                        className="w-full text-[11px] font-medium px-3 py-1.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-slate-50/50"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Add Row button (available in both add and edit modes) */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="w-full py-2.5 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  {editingItem
                    ? '+ এই দিনে আরেকটি নতুন ওষুধ যোগ করুন (যেমন: ভিটামিন/স্যালাইন/অ্যান্টিবায়োটিক)'
                    : '+ এই শীটে আরও একটি ওষুধ যোগ করুন (সকাল/দুপুর/রাত)'}
                </button>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                <span className="text-[11px] text-slate-500 font-medium">
                  {editingItem
                    ? sheetRows.filter((r) => r.medicineName.trim() !== '').length > 1
                      ? `১টি ওষুধ আপডেট হবে এবং ${toBnNumber(sheetRows.filter((r) => r.medicineName.trim() !== '').length - 1)}টি নতুন ওষুধ যুক্ত হবে`
                      : '১টি ওষুধ আপডেট হবে'
                    : `${toBnNumber(sheetRows.length)}টি ওষুধ × ${toBnNumber(courseDurationDays)} দিন = মোট ${toBnNumber(sheetRows.length * (parseInt(courseDurationDays, 10) || 1))}টি এন্ট্রি তৈরি হবে`}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {editingItem
                      ? sheetRows.filter((r) => r.medicineName.trim() !== '').length > 1
                        ? 'আপডেট ও নতুন ওষুধ সংরক্ষণ করুন'
                        : 'আপডেট সংরক্ষণ করুন'
                      : 'একসাথে সব ওষুধ সংরক্ষণ করুন'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
