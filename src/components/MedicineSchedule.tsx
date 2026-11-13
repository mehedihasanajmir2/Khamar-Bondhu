import React, { useMemo, useState, useEffect } from 'react';
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
  RotateCcw,
  Sparkles,
  LayoutList,
  Sunrise,
  Sun,
  Moon,
  Droplet,
  ChevronLeft,
  ChevronRight,
  ClipboardPaste,
  HeartPulse,
  FolderSync,
  BookmarkCheck,
  MoreVertical,
  Plus,
  X
} from 'lucide-react';
import { Batch, DiseaseOutbreakRecord, MedicineScheduleItem } from '../types';
import { calculateBatchAgeDays, formatBnDate, toBnNumber } from '../utils/formatters';
import { DiseaseOutbreakTab } from './DiseaseOutbreakTab';

interface MedicineScheduleProps {
  activeBatch: Batch | null;
  batches: Batch[];
  medicines: MedicineScheduleItem[];
  diseaseLogs: DiseaseOutbreakRecord[];
  onToggleStatus: (itemId: string) => void;
  onSetSlotStatus: (itemIds: string[], targetStatus: 'completed' | 'pending') => void;
  onAddMedicine: (
    item:
      | Omit<MedicineScheduleItem, 'id' | 'batchId' | 'userId'>
      | Array<Omit<MedicineScheduleItem, 'id' | 'batchId' | 'userId'>>
  ) => void;
  onUpdateMedicine: (item: MedicineScheduleItem) => void;
  onDeleteMedicine: (itemId: string) => void;
  onCopyMedicinesToDays: (sourceItems: MedicineScheduleItem[], targetDays: number[]) => void;
  onImportRoutineFromBatch: (sourceBatchId: string, mode: 'replace' | 'merge') => void;
  onSaveCurrentAsTemplate: () => void;
  onClearAll: () => void;
  onResetToDefault: () => void;
  onAddDiseaseLog: (log: Omit<DiseaseOutbreakRecord, 'id' | 'batchId' | 'userId' | 'createdAt'>) => void;
  onUpdateDiseaseLog: (log: DiseaseOutbreakRecord) => void;
  onToggleDiseaseStatus: (logId: string) => void;
  onDeleteDiseaseLog: (logId: string) => void;
}

type SlotKey = 'morning' | 'noon' | 'night' | 'allday';

const SLOT_CONFIG: Record<
  SlotKey,
  {
    title: string;
    timeValue: string;
    defaultDosage: string;
    headerBg: string;
    borderColor: string;
    iconBg: string;
  }
> = {
  morning: {
    title: 'সকাল',
    timeValue: 'সকালে',
    defaultDosage: 'সকালে খাবার পানির সাথে',
    headerBg: 'bg-amber-50/80',
    borderColor: 'border-amber-200',
    iconBg: 'bg-amber-100 text-amber-700'
  },
  noon: {
    title: 'দুপুর',
    timeValue: 'দুপুরে',
    defaultDosage: 'দুপুরে খাবার পানির সাথে',
    headerBg: 'bg-orange-50/80',
    borderColor: 'border-orange-200',
    iconBg: 'bg-orange-100 text-orange-700'
  },
  night: {
    title: 'রাত',
    timeValue: 'রাতে',
    defaultDosage: 'রাতে খাবার পানির সাথে',
    headerBg: 'bg-indigo-50/80',
    borderColor: 'border-indigo-200',
    iconBg: 'bg-indigo-100 text-indigo-700'
  },
  allday: {
    title: 'সারাদিন / একাধিক বেলা',
    timeValue: 'সারাদিন পানিতে',
    defaultDosage: 'সারাদিন খাবার পানির সাথে',
    headerBg: 'bg-sky-50/80',
    borderColor: 'border-sky-200',
    iconBg: 'bg-sky-100 text-sky-700'
  }
};

const QUICK_MEDICINES = [
  'গ্লুকোজ ও স্যালাইন',
  'ভিটামিন সি ও বি-কমপ্লেক্স',
  'ক্যালসিয়াম ও ডি৩',
  'লিভার টনিক',
  'অ্যান্টিবায়োটিক (সিপ্রোসিন)',
  'রানীক্ষেত টিকা (BCRDV)',
  'গামবোরো টিকা',
  'নাপা / প্যারাসিটামল'
];

function classifySlotGroup(timeOfDay?: string): SlotKey {
  const t = (timeOfDay || '').trim();
  if (t === 'সকাল' || t === 'সকালে') return 'morning';
  if (t === 'দুপুর' || t === 'দুপুরে') return 'noon';
  if (t === 'রাত' || t === 'রাতে') return 'night';
  return 'allday';
}

function getDateForDayAge(startDateStr: string, dayAge: number): string {
  try {
    const base = new Date(startDateStr);
    if (Number.isNaN(base.getTime())) return '';
    base.setDate(base.getDate() + Math.max(0, dayAge - 1));
    return base.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export const MedicineSchedule: React.FC<MedicineScheduleProps> = ({
  activeBatch,
  batches,
  medicines,
  diseaseLogs,
  onToggleStatus,
  onSetSlotStatus,
  onAddMedicine,
  onUpdateMedicine,
  onDeleteMedicine,
  onCopyMedicinesToDays,
  onImportRoutineFromBatch,
  onSaveCurrentAsTemplate,
  onClearAll,
  onResetToDefault,
  onAddDiseaseLog,
  onUpdateDiseaseLog,
  onToggleDiseaseStatus,
  onDeleteDiseaseLog
}) => {
  const [sectionTab, setSectionTab] = useState<'routine' | 'emergency'>('routine');
  const [viewType, setViewType] = useState<'day' | 'all'>('day');

  const currentAge = activeBatch ? Math.max(1, calculateBatchAgeDays(activeBatch.startDate)) : 1;
  const [selectedDay, setSelectedDay] = useState<number>(currentAge);
  const [jumpDayInput, setJumpDayInput] = useState('');

  useEffect(() => {
    if (activeBatch) {
      setSelectedDay(Math.max(1, calculateBatchAgeDays(activeBatch.startDate)));
    }
  }, [activeBatch?.id]);

  // Inline Quick-Add state per slot (no popup needed!)
  const [activeQuickSlot, setActiveQuickSlot] = useState<SlotKey | null>(null);
  const [quickMedName, setQuickMedName] = useState('');
  const [quickDosage, setQuickDosage] = useState('');
  const [quickSymptoms, setQuickSymptoms] = useState('');
  const [quickDaysCount, setQuickDaysCount] = useState('1');
  const [quickShowExtra, setQuickShowExtra] = useState(false);

  // Inline Quick-Edit state for any single item (no popup needed!)
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDosage, setEditDosage] = useState('');
  const [editSymptoms, setEditSymptoms] = useState('');
  const [editTime, setEditTime] = useState('সকালে');

  // Menu dropdown
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Copy Modal (when user wants multiple/custom days)
  const [copySourceDay, setCopySourceDay] = useState<number | null>(null);
  const [selectedCopyIds, setSelectedCopyIds] = useState<string[]>([]);
  const [targetCopyDays, setTargetCopyDays] = useState<number[]>([]);
  const [customDaysText, setCustomDaysText] = useState('');

  // Import Routine Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importSourceId, setImportSourceId] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');

  // All-days table filter
  const [allFilter, setAllFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const distinctDays = useMemo(() => {
    const s = new Set<number>();
    medicines.forEach((m) => s.add(m.dayAge));
    return Array.from(s).sort((a, b) => a - b);
  }, [medicines]);

  const dayStatsMap = useMemo(() => {
    const map: Record<number, { total: number; pending: number; done: number }> = {};
    medicines.forEach((m) => {
      if (!map[m.dayAge]) map[m.dayAge] = { total: 0, pending: 0, done: 0 };
      map[m.dayAge].total += 1;
      if (m.status === 'completed') map[m.dayAge].done += 1;
      else map[m.dayAge].pending += 1;
    });
    return map;
  }, [medicines]);

  const dayMedicines = useMemo(
    () => medicines.filter((m) => m.dayAge === selectedDay),
    [medicines, selectedDay]
  );

  const prevDayMedicines = useMemo(
    () => (selectedDay > 1 ? medicines.filter((m) => m.dayAge === selectedDay - 1) : []),
    [medicines, selectedDay]
  );

  const slots = useMemo(() => {
    const morning: MedicineScheduleItem[] = [];
    const noon: MedicineScheduleItem[] = [];
    const night: MedicineScheduleItem[] = [];
    const allday: MedicineScheduleItem[] = [];
    dayMedicines.forEach((m) => {
      const k = classifySlotGroup(m.timeOfDay);
      if (k === 'morning') morning.push(m);
      else if (k === 'noon') noon.push(m);
      else if (k === 'night') night.push(m);
      else allday.push(m);
    });
    return { morning, noon, night, allday };
  }, [dayMedicines]);

  const quickDayChips = useMemo(() => {
    const s = new Set<number>([1, 2, 3, currentAge, selectedDay]);
    distinctDays.forEach((d) => s.add(d));
    return Array.from(s)
      .filter((d) => d >= 1)
      .sort((a, b) => a - b);
  }, [distinctDays, currentAge, selectedDay]);

  const filteredAllItems = useMemo(() => {
    return medicines.filter((m) => {
      if (allFilter === 'pending' && m.status !== 'pending') return false;
      if (allFilter === 'completed' && m.status !== 'completed') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hit =
          m.medicineName.toLowerCase().includes(q) ||
          (m.symptoms || '').toLowerCase().includes(q) ||
          (m.timingAndDosage || '').toLowerCase().includes(q) ||
          m.dayAge.toString().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [medicines, allFilter, searchQuery]);

  if (!activeBatch) {
    return (
      <div className="py-12 text-center bg-white rounded-3xl border border-slate-200 p-8">
        <Syringe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">কোনো ব্যাচ সক্রিয় নেই</h3>
        <p className="text-sm text-slate-500 mt-1">
          ওষুধের শীট দেখতে একটি ব্যাচ নির্বাচন করুন বা নতুন ব্যাচ শুরু করুন।
        </p>
      </div>
    );
  }

  const totalPending = medicines.filter((m) => m.status !== 'completed').length;
  const ongoingDiseaseCount = diseaseLogs.filter((d) => d.status === 'ongoing').length;
  const otherBatches = batches.filter((b) => b.id !== activeBatch.id);
  const selectedDayDate = getDateForDayAge(activeBatch.startDate, selectedDay);
  const dayDoneCount = dayMedicines.filter((m) => m.status === 'completed').length;

  // Open Inline Quick-Add inside a specific slot
  const handleOpenQuickAdd = (slot: SlotKey) => {
    setActiveQuickSlot(slot);
    setQuickMedName('');
    setQuickDosage('');
    setQuickSymptoms('');
    setQuickDaysCount('1');
    setQuickShowExtra(false);
    setInlineEditId(null);
  };

  // Save directly from inline slot form
  const handleSaveQuickAdd = (e: React.FormEvent, slot: SlotKey) => {
    e.preventDefault();
    if (!quickMedName.trim()) return;

    const cfg = SLOT_CONFIG[slot];
    const duration = Math.max(1, Math.min(30, parseInt(quickDaysCount, 10) || 1));
    const itemsToAdd: Array<Omit<MedicineScheduleItem, 'id' | 'batchId' | 'userId'>> = [];

    for (let offset = 0; offset < duration; offset++) {
      itemsToAdd.push({
        dayAge: selectedDay + offset,
        medicineName: quickMedName.trim(),
        symptoms: quickSymptoms.trim() || 'নিয়মিত স্বাস্থ্য পরিচর্যা',
        timingAndDosage: quickDosage.trim() || cfg.defaultDosage,
        purpose: quickSymptoms.trim() || 'নিয়মিত স্বাস্থ্য পরিচর্যা',
        dosage: quickDosage.trim() || cfg.defaultDosage,
        medicineType: 'ভিটামিন / মিনারেল',
        timeOfDay: cfg.timeValue,
        status: 'pending',
        isCustom: true,
        isRoutineTemplate: true
      });
    }

    onAddMedicine(itemsToAdd);
    // Keep slot open & clear input so user can type 2nd, 3rd medicine immediately!
    setQuickMedName('');
    setQuickDosage('');
    setQuickSymptoms('');
    setQuickDaysCount('1');
  };

  // Start Inline Edit on a single medicine
  const handleStartInlineEdit = (item: MedicineScheduleItem) => {
    setInlineEditId(item.id);
    setEditName(item.medicineName);
    setEditDosage(item.timingAndDosage || item.dosage || '');
    setEditSymptoms(item.symptoms || item.purpose || '');
    setEditTime(item.timeOfDay || 'সকালে');
    setActiveQuickSlot(null);
  };

  const handleSaveInlineEdit = (e: React.FormEvent, item: MedicineScheduleItem) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onUpdateMedicine({
      ...item,
      medicineName: editName.trim(),
      timingAndDosage: editDosage.trim() || 'নিয়ম অনুযায়ী পানির সাথে',
      dosage: editDosage.trim() || 'নিয়ম অনুযায়ী পানির সাথে',
      symptoms: editSymptoms.trim() || 'সাধারণ স্বাস্থ্য পরিচর্যা',
      purpose: editSymptoms.trim() || 'সাধারণ স্বাস্থ্য পরিচর্যা',
      timeOfDay: editTime,
      isCustom: true
    });
    setInlineEditId(null);
  };

  // 1-Click Quick Copy Day -> Next Day
  const handleQuickCopyToNextDay = () => {
    if (dayMedicines.length === 0) return;
    const nextDay = selectedDay + 1;
    onCopyMedicinesToDays(dayMedicines, [nextDay]);
    setSelectedDay(nextDay);
  };

  // Open multi-day Copy Modal
  const handleOpenCopyModal = (sourceDay: number) => {
    const items = medicines.filter((m) => m.dayAge === sourceDay);
    setCopySourceDay(sourceDay);
    setSelectedCopyIds(items.map((i) => i.id));
    setTargetCopyDays([sourceDay + 1]);
    setCustomDaysText('');
  };

  const parseDaysText = (txt: string): number[] => {
    const out: number[] = [];
    txt
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((p) => {
        if (p.includes('-')) {
          const [a, b] = p.split('-').map((n) => parseInt(n.trim(), 10));
          if (!Number.isNaN(a) && !Number.isNaN(b) && b >= a) {
            for (let d = a; d <= Math.min(b, a + 30); d++) {
              if (d >= 1 && d <= 365) out.push(d);
            }
          }
        } else {
          const n = parseInt(p, 10);
          if (!Number.isNaN(n) && n >= 1 && n <= 365) out.push(n);
        }
      });
    return out;
  };

  const handleConfirmCopyModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (copySourceDay === null) return;
    const items = medicines.filter((m) => m.dayAge === copySourceDay && selectedCopyIds.includes(m.id));
    const targets = Array.from(new Set([...targetCopyDays, ...parseDaysText(customDaysText)]))
      .filter((d) => d !== copySourceDay && d >= 1 && d <= 365)
      .sort((a, b) => a - b);
    if (items.length === 0 || targets.length === 0) return;

    onCopyMedicinesToDays(items, targets);
    setCopySourceDay(null);
    setSelectedDay(targets[0]);
    setViewType('day');
  };

  const renderSlotIcon = (slot: SlotKey) => {
    if (slot === 'morning') return <Sunrise className="w-5 h-5" />;
    if (slot === 'noon') return <Sun className="w-5 h-5" />;
    if (slot === 'night') return <Moon className="w-5 h-5" />;
    return <Droplet className="w-5 h-5" />;
  };

  const renderSlotSection = (slot: SlotKey, items: MedicineScheduleItem[], hideIfEmpty = false) => {
    if (hideIfEmpty && items.length === 0 && activeQuickSlot !== slot) return null;

    const cfg = SLOT_CONFIG[slot];
    const pendingItems = items.filter((i) => i.status !== 'completed');
    const isAddingHere = activeQuickSlot === slot;

    return (
      <section className={`rounded-2xl border ${cfg.borderColor} bg-white overflow-hidden`}>
        {/* Simple Slot Header */}
        <div className={`px-4 py-3 border-b ${cfg.borderColor} ${cfg.headerBg} flex items-center justify-between gap-2 flex-wrap`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
              {renderSlotIcon(slot)}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm sm:text-base font-black text-slate-900">{cfg.title}</h4>
              <span className="text-xs font-bold text-slate-600 font-mono tabular-nums">
                ({toBnNumber(items.length)}টি)
              </span>
              {items.length > 0 && pendingItems.length === 0 && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  সব দেওয়া হয়েছে ✓
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pendingItems.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  onSetSlotStatus(
                    pendingItems.map((i) => i.id),
                    'completed'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>সব দিয়েছি</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => (isAddingHere ? setActiveQuickSlot(null) : handleOpenQuickAdd(slot))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 border transition-colors ${
                isAddingHere
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              {isAddingHere ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>বন্ধ করুন</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>ওষুধ লিখুন</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Inline Fast Quick-Add Form inside the slot! */}
        {isAddingHere && (
          <form
            onSubmit={(e) => handleSaveQuickAdd(e, slot)}
            className="p-3.5 bg-emerald-50/50 border-b border-emerald-200 space-y-2.5"
          >
            {/* 1-tap medicine name suggestions */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-[11px] font-bold text-slate-600 shrink-0">দ্রুত বেছে নিন:</span>
              {QUICK_MEDICINES.map((med) => (
                <button
                  key={med}
                  type="button"
                  onClick={() => setQuickMedName(med)}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-600 hover:text-white border border-slate-200 text-[11px] font-semibold text-slate-700 whitespace-nowrap transition-colors shrink-0"
                >
                  + {med}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                autoFocus
                required
                placeholder={`${cfg.title} বেলার ওষুধের নাম লিখুন (যেমন: ভিটামিন সি)`}
                value={quickMedName}
                onChange={(e) => setQuickMedName(e.target.value)}
                className="flex-1 text-xs sm:text-sm font-semibold px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                type="text"
                placeholder="মাত্রা / পরিমাণ (ঐচ্ছিক, যেমন: ১ লিটারে ১ মিলি)"
                value={quickDosage}
                onChange={(e) => setQuickDosage(e.target.value)}
                className="sm:w-64 text-xs font-semibold px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 flex items-center justify-center gap-1"
              >
                <Plus className="w-4 h-4" />
                <span>যোগ করুন</span>
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setQuickShowExtra((v) => !v)}
                className="text-[11px] font-bold text-emerald-800 hover:underline"
              >
                {quickShowExtra ? '▲ অতিরিক্ত অপশন লুকান' : '+ লক্ষণ বা টানা কয়দিন চলবে সেট করুন (ঐচ্ছিক)'}
              </button>
              <span className="text-[11px] text-slate-500">
                একই বেলায় ৩-৪টা ওষুধ যোগ করতে একটার পর একটা লিখে যোগ করুন।
              </span>
            </div>

            {quickShowExtra && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="রোগের লক্ষণ বা উদ্দেশ্য (ঐচ্ছিক)"
                  value={quickSymptoms}
                  onChange={(e) => setQuickSymptoms(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 shrink-0">টানা কয়দিন চলবে:</span>
                  {['1', '3', '5'].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setQuickDaysCount(d)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                        quickDaysCount === d
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      {toBnNumber(d)} দিন
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={quickDaysCount}
                    onChange={(e) => setQuickDaysCount(e.target.value)}
                    className="w-14 text-xs font-bold px-2 py-1.5 border border-slate-300 rounded-lg bg-white text-center"
                  />
                </div>
              </div>
            )}
          </form>
        )}

        {/* Medicine Items List */}
        {items.length === 0 ? (
          !isAddingHere && (
            <div className="px-4 py-4 flex items-center justify-between text-xs text-slate-500">
              <span>{cfg.title} বেলায় কোনো ওষুধ নেই।</span>
              <button
                type="button"
                onClick={() => handleOpenQuickAdd(slot)}
                className="font-bold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>ওষুধ যোগ করুন</span>
              </button>
            </div>
          )
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item, idx) => {
              const isDone = item.status === 'completed';
              const isEditing = inlineEditId === item.id;

              if (isEditing) {
                return (
                  <form
                    key={item.id}
                    onSubmit={(e) => handleSaveInlineEdit(e, item)}
                    className="p-3.5 bg-blue-50/60 space-y-2.5"
                  >
                    <div className="text-xs font-bold text-blue-900">ওষুধের তথ্য পরিবর্তন করুন:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        autoFocus
                        placeholder="ওষুধের নাম"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-xs font-bold px-3 py-2 border border-blue-300 rounded-xl bg-white outline-none"
                      />
                      <input
                        type="text"
                        placeholder="খাওয়ানোর নিয়ম ও মাত্রা"
                        value={editDosage}
                        onChange={(e) => setEditDosage(e.target.value)}
                        className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none"
                      />
                      <select
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white outline-none"
                      >
                        <option value="সকালে">সকালে (১ম বেলা)</option>
                        <option value="দুপুরে">দুপুরে (২য় বেলা)</option>
                        <option value="রাতে">রাতে (৩য় বেলা)</option>
                        <option value="সকাল ও রাতে">সকাল ও রাতে</option>
                        <option value="সারাদিন পানিতে">সারাদিন পানিতে</option>
                      </select>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <input
                        type="text"
                        placeholder="লক্ষণ বা নোট (ঐচ্ছিক)"
                        value={editSymptoms}
                        onChange={(e) => setEditSymptoms(e.target.value)}
                        className="flex-1 text-xs font-medium px-3 py-1.5 border border-slate-300 rounded-xl bg-white outline-none"
                      />
                      <div className="flex items-center gap-2 self-end">
                        <button
                          type="button"
                          onClick={() => setInlineEditId(null)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
                        >
                          বাতিল
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          সেভ করুন
                        </button>
                      </div>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={item.id}
                  className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isDone ? 'bg-emerald-50/40' : 'bg-white hover:bg-slate-50/70'
                  }`}
                >
                  {/* Left: Toggle + Name + Simple Details */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(item.id)}
                      className={`mt-0.5 w-7 h-7 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-300 hover:border-emerald-500 text-transparent'
                      }`}
                      title={isDone ? 'দিয়ে দিয়েছি' : 'দিয়ে দিলে চাপ দিন'}
                    >
                      <Check className="w-4 h-4" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-400 font-mono tabular-nums">
                          {toBnNumber(idx + 1)}.
                        </span>
                        <span
                          className={`text-sm sm:text-base font-black ${
                            isDone ? 'text-emerald-950 line-through decoration-emerald-500/50' : 'text-slate-900'
                          }`}
                        >
                          {item.medicineName}
                        </span>
                        {slot === 'allday' && item.timeOfDay && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
                            {item.timeOfDay}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 mt-0.5">
                        <span className="font-semibold text-blue-800">
                          {item.timingAndDosage || item.dosage || cfg.defaultDosage}
                        </span>
                        {(item.symptoms || item.purpose) && (
                          <span className="text-slate-500"> • {item.symptoms || item.purpose}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: Status Pill + Quick Change + Delete */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(item.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all min-h-[36px] ${
                        isDone
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-emerald-600 hover:text-white hover:border-emerald-600'
                      }`}
                    >
                      {isDone ? 'দিয়ে দিয়েছি ✓' : 'বাকি আছে'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartInlineEdit(item)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-700 hover:bg-blue-50 text-xs font-bold flex items-center gap-1 min-h-[36px]"
                      title="ওষুধ পরিবর্তন করুন"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>বদলান</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`"${item.medicineName}" মুছে ফেলবেন?`)) {
                          onDeleteMedicine(item.id);
                        }
                      }}
                      className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 min-h-[36px]"
                      title="মুছে ফেলুন"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top 2 Tabs: Daily Sheet vs Emergency Disease Tab */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex gap-1.5">
        <button
          type="button"
          onClick={() => setSectionTab('routine')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            sectionTab === 'routine'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Syringe className="w-4 h-4" />
          <span>দৈনিক ওষুধের শীট</span>
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums ${
              sectionTab === 'routine' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {toBnNumber(totalPending)} বাকি
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSectionTab('emergency')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            sectionTab === 'emergency'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-slate-700 hover:bg-rose-50 hover:text-rose-800'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>হঠাৎ রোগ ও জরুরি চিকিৎসা</span>
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono tabular-nums ${
              sectionTab === 'emergency'
                ? 'bg-white/20 text-white'
                : ongoingDiseaseCount > 0
                ? 'bg-rose-100 text-rose-800'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {ongoingDiseaseCount > 0
              ? `${toBnNumber(ongoingDiseaseCount)} চলমান`
              : toBnNumber(diseaseLogs.length)}
          </span>
        </button>
      </div>

      {sectionTab === 'emergency' ? (
        <DiseaseOutbreakTab
          activeBatch={activeBatch}
          currentAge={currentAge}
          diseaseLogs={diseaseLogs}
          onAddDiseaseLog={onAddDiseaseLog}
          onUpdateDiseaseLog={onUpdateDiseaseLog}
          onToggleDiseaseStatus={onToggleDiseaseStatus}
          onDeleteDiseaseLog={onDeleteDiseaseLog}
        />
      ) : (
        <>
          {/* Compact Control & View Switcher Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-black text-slate-900">{activeBatch.batchName}</span>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-mono tabular-nums">
                বয়স: {toBnNumber(currentAge)} দিন
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Simple View Switch */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewType('day')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewType === 'day' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  দিনের শীট
                </button>
                <button
                  type="button"
                  onClick={() => setViewType('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    viewType === 'all' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span>সব দিন ({toBnNumber(distinctDays.length)})</span>
                </button>
              </div>

              {/* Clean Overflow Menu for Batch Inheritance & Reset */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoreMenu((v) => !v)}
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1"
                >
                  <MoreVertical className="w-4 h-4" />
                  <span>ব্যাচ রুটিন</span>
                </button>

                {showMoreMenu && (
                  <div className="absolute right-0 mt-1.5 w-64 p-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-30 text-xs space-y-1">
                    {otherBatches.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMoreMenu(false);
                          setImportSourceId(otherBatches[0]?.id || '__default__');
                          setImportMode('replace');
                          setShowImportModal(true);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-slate-800 font-semibold flex items-center gap-2"
                      >
                        <FolderSync className="w-4 h-4 text-emerald-600" />
                        আগের ব্যাচ থেকে ওষুধ আনুন
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onSaveCurrentAsTemplate();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 text-slate-800 font-semibold flex items-center gap-2"
                    >
                      <BookmarkCheck className="w-4 h-4 text-emerald-600" />
                      নতুন ব্যাচের জন্য রুটিন সেভ করুন
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onResetToDefault();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      আদর্শ পোল্ট্রি সূচি লোড করুন
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        if (confirm('এই ব্যাচের সব ওষুধ মুছে খালি করবেন?')) {
                          onClearAll();
                        }
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      সব মুছে খালি করুন
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {viewType === 'day' ? (
            <div className="space-y-4">
              {/* Day Navigator + 1-Click Copy Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Day Switcher */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={selectedDay <= 1}
                      onClick={() => setSelectedDay((d) => Math.max(1, d - 1))}
                      className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-700" />
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black text-slate-900 font-mono tabular-nums">
                          {toBnNumber(selectedDay)}তম দিনের ওষুধ
                        </h3>
                        {selectedDay === currentAge && (
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            আজ
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-500 font-mono tabular-nums">
                          ({toBnNumber(dayDoneCount)}/{toBnNumber(dayMedicines.length)} দেওয়া হয়েছে)
                        </span>
                      </div>
                      {selectedDayDate && (
                        <p className="text-[11px] text-slate-500">{formatBnDate(selectedDayDate)}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedDay((d) => d + 1)}
                      className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-700" />
                    </button>
                  </div>

                  {/* Ultra-Easy Copy Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {dayMedicines.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={handleQuickCopyToNextDay}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
                        >
                          <ClipboardPaste className="w-3.5 h-3.5" />
                          <span>{toBnNumber(selectedDay + 1)}ম দিনে কপি করুন ➔</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCopyModal(selectedDay)}
                          className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-bold"
                        >
                          অন্য দিন বেছে কপি...
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Day Pills + Custom Jump */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 flex-1 scrollbar-thin">
                    {quickDayChips.map((d) => {
                      const stats = dayStatsMap[d];
                      const active = d === selectedDay;
                      const doneAll = stats && stats.total > 0 && stats.pending === 0;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedDay(d)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap border transition-all font-mono tabular-nums shrink-0 ${
                            active
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : doneAll
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          দিন {toBnNumber(d)}
                          {stats && stats.total > 0 ? ` (${toBnNumber(stats.total)})` : ''}
                        </button>
                      );
                    })}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const n = parseInt(jumpDayInput, 10);
                      if (!Number.isNaN(n) && n >= 1 && n <= 365) {
                        setSelectedDay(n);
                        setJumpDayInput('');
                      }
                    }}
                    className="flex items-center gap-1 shrink-0"
                  >
                    <input
                      type="number"
                      min="1"
                      max="365"
                      placeholder="দিন নং"
                      value={jumpDayInput}
                      onChange={(e) => setJumpDayInput(e.target.value)}
                      className="w-20 text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-xl outline-none"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-bold"
                    >
                      যান
                    </button>
                  </form>
                </div>
              </div>

              {/* Super helpful 1-tap paste banner if today is empty and yesterday has medicines */}
              {dayMedicines.length === 0 && prevDayMedicines.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-blue-950">
                      {toBnNumber(selectedDay)}তম দিনে এখনো কোনো ওষুধ লেখা নেই
                    </h4>
                    <p className="text-xs text-blue-800">
                      চাইলে আগের দিন ({toBnNumber(selectedDay - 1)}ম দিন)-এর {toBnNumber(prevDayMedicines.length)}টি ওষুধ এক ক্লিকে এখানে কপি করে আনতে পারেন।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopyMedicinesToDays(prevDayMedicines, [selectedDay])}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    <span>{toBnNumber(selectedDay - 1)}ম দিনের ওষুধ এখানে পেস্ট করুন</span>
                  </button>
                </div>
              )}

              {/* The 3 Clean Daily Slots (সকাল, দুপুর, রাত) + সারাদিন */}
              <div className="space-y-3.5">
                {renderSlotSection('morning', slots.morning)}
                {renderSlotSection('noon', slots.noon)}
                {renderSlotSection('night', slots.night)}
                {renderSlotSection('allday', slots.allday, true)}
              </div>
            </div>
          ) : (
            /* ALL DAYS SIMPLE REGISTER */
            <div className="space-y-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAllFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      allFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    সব ({toBnNumber(medicines.length)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllFilter('pending')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      allFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    বাকি ({toBnNumber(totalPending)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllFilter('completed')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      allFilter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    দিয়ে দিয়েছি ({toBnNumber(medicines.length - totalPending)})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="ওষুধ বা দিন খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {filteredAllItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">কোনো ওষুধ পাওয়া যায়নি।</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {filteredAllItems.map((item) => {
                      const isDone = item.status === 'completed';
                      return (
                        <div
                          key={item.id}
                          onClick={() => {
                            setSelectedDay(item.dayAge);
                            setViewType('day');
                          }}
                          className="p-3.5 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-black font-mono tabular-nums shrink-0">
                              দিন {toBnNumber(item.dayAge)}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-900 truncate">
                                {item.medicineName}
                              </div>
                              <div className="text-xs text-slate-500 truncate">
                                {item.timeOfDay || 'সকালে'} • {item.timingAndDosage || item.dosage}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStatus(item.id);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-900 border-amber-300'
                            }`}
                          >
                            {isDone ? 'দিয়ে দিয়েছি ✓' : 'বাকি আছে'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Copy-Paste Multi-Day Modal */}
      {copySourceDay !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {toBnNumber(copySourceDay)}তম দিনের ওষুধ কপি ও পেস্ট
              </h3>
              <button
                type="button"
                onClick={() => setCopySourceDay(null)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmCopyModal} className="overflow-y-auto space-y-4 mt-3 flex-1">
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-700 block">কোন ওষুধগুলো কপি করবেন?</span>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50">
                  {medicines
                    .filter((m) => m.dayAge === copySourceDay)
                    .map((m) => (
                      <label key={m.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedCopyIds.includes(m.id)}
                          onChange={() =>
                            setSelectedCopyIds((prev) =>
                              prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                            )
                          }
                          className="accent-blue-600"
                        />
                        <span className="font-bold text-slate-800 flex-1 truncate">{m.medicineName}</span>
                        <span className="text-[10px] text-slate-500">{m.timeOfDay}</span>
                      </label>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">কোন কোন দিনে বসাবেন?</span>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from({ length: 7 }, (_, i) => copySourceDay + i + 1).map((d) => {
                    const active = targetCopyDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          setTargetCopyDays((prev) =>
                            prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
                          )
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border font-mono tabular-nums ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        দিন {toBnNumber(d)}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="অথবা দিন লিখুন (যেমন: 5, 6 বা 8-10)"
                  value={customDaysText}
                  onChange={(e) => setCustomDaysText(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCopySourceDay(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  পেস্ট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Routine From Another Batch Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">আগের ব্যাচ থেকে ওষুধ আনুন</h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!importSourceId) return;
                onImportRoutineFromBatch(importSourceId, importMode);
                setShowImportModal(false);
              }}
              className="space-y-4 mt-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">কোন ব্যাচের রুটিন আনবেন?</label>
                <select
                  value={importSourceId}
                  onChange={(e) => setImportSourceId(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  {otherBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchName} ({b.batchNumber})
                    </option>
                  ))}
                  <option value="__template__">সেভ করা মাস্টার রুটিন</option>
                  <option value="__default__">আদর্শ ব্রয়লার সূচি</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`p-2.5 rounded-xl text-xs font-bold border ${
                    importMode === 'replace'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  নতুন করে বসান
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('merge')}
                  className={`p-2.5 rounded-xl text-xs font-bold border ${
                    importMode === 'merge'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  বর্তমানটার সাথে যোগ
                </button>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  নিয়ে আসুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
