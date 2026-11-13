import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit3,
  HeartPulse,
  PlusCircle,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Check,
  Calendar
} from 'lucide-react';
import { Batch, DiseaseOutbreakRecord } from '../types';
import { formatBnDate, getTodayDateString, toBnNumber } from '../utils/formatters';
import { useConfirm } from '../context/ConfirmContext';

interface DiseaseOutbreakTabProps {
  activeBatch: Batch;
  currentAge: number;
  diseaseLogs: DiseaseOutbreakRecord[];
  onAddDiseaseLog: (log: Omit<DiseaseOutbreakRecord, 'id' | 'batchId' | 'userId' | 'createdAt'>) => void;
  onUpdateDiseaseLog: (log: DiseaseOutbreakRecord) => void;
  onToggleDiseaseStatus: (logId: string) => void;
  onDeleteDiseaseLog: (logId: string) => void;
}

const EMERGENCY_PRESETS = [
  {
    diseaseName: 'ঠাণ্ডা, সর্দি ও সিআরডি (CRD)',
    symptoms: 'হাঁচি, কাশি, নাক দিয়ে পানি পড়া ও শ্বাস নেওয়ার সময় ঘড়ঘড় শব্দ',
    emergencyMedicines: 'টাইলোসিন / এনরোফ্লক্সাসিন + ব্রোমহেক্সিন (কফ সিরাপ)',
    dosageAndTiming: 'সকালে ও রাতে ১ লিটার পানিতে ১ গ্রাম/মিলি',
    durationDays: 4
  },
  {
    diseaseName: 'রক্ত আমাশয় (কক্সিডিওসিস)',
    symptoms: 'পাতলা লালচে বা রক্ত মিশ্রিত পায়খানা, ঝিমিয়ে পড়া ও খাবার অনীহা',
    emergencyMedicines: 'টল্ট্রাজুরিল / অ্যাম্প্রোলিয়াম + ভিটামিন কে (Vitamin K)',
    dosageAndTiming: 'দুপুরে ১ লিটার পানিতে ১ মিলি করে টানা ৩ দিন',
    durationDays: 3
  },
  {
    diseaseName: 'গামবোরো (IBD) সন্দেহ',
    symptoms: 'সাদা চুনের মতো পাতলা পায়খানা, পালক উস্কোখুস্কো ও অতিরিক্ত পানি পিপাসা',
    emergencyMedicines: 'কিডনি টনিক (নেফ্রোকেয়ার) + ভিটামিন সি + ইলেকট্রোলাইট স্যালাইন',
    dosageAndTiming: 'সারাদিন খাবার পানির সাথে ১ লিটারে ২ মিলি',
    durationDays: 4
  },
  {
    diseaseName: 'হিট স্ট্রোক ও তাপজনিত ধকল',
    symptoms: 'মুখ হাঁ করে ঘন ঘন শ্বাস নেওয়া, ডানা ঝুলে পড়া, হঠাৎ সুস্থ মুরগি মারা যাওয়া',
    emergencyMedicines: 'গ্লুকোজ + ইলেকট্রোলাইট স্যালাইন + ভিটামিন সি',
    dosageAndTiming: 'দুপুর ১২টা থেকে বিকাল ৪টা পর্যন্ত ঠাণ্ডা পানিতে',
    durationDays: 2
  },
  {
    diseaseName: 'ই-কোলাই (E.Coli) ও পা অবশ',
    symptoms: 'নাভী ফোলা, পেটে পানি জমা, খোঁড়ানো বা দাঁড়াতে না পারা',
    emergencyMedicines: 'নিওমাইসিন / সিপ্রোফ্লক্সাসিন + তরল ক্যালসিয়াম ও ডি৩',
    dosageAndTiming: 'সকাল ও রাতে ১ লিটার পানিতে ১ গ্রাম/মিলি',
    durationDays: 4
  }
];

export const DiseaseOutbreakTab: React.FC<DiseaseOutbreakTabProps> = ({
  activeBatch,
  currentAge,
  diseaseLogs,
  onAddDiseaseLog,
  onUpdateDiseaseLog,
  onToggleDiseaseStatus,
  onDeleteDiseaseLog
}) => {
  const { confirmAction } = useConfirm();
  const [filterStatus, setFilterStatus] = useState<'all' | 'ongoing' | 'recovered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState<DiseaseOutbreakRecord | null>(null);

  // Form states
  const [date, setDate] = useState(getTodayDateString());
  const [dayAge, setDayAge] = useState(currentAge.toString());
  const [diseaseName, setDiseaseName] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [emergencyMedicines, setEmergencyMedicines] = useState('');
  const [dosageAndTiming, setDosageAndTiming] = useState('');
  const [durationDays, setDurationDays] = useState('3');
  const [affectedBirds, setAffectedBirds] = useState('');
  const [status, setStatus] = useState<'ongoing' | 'recovered'>('ongoing');
  const [notes, setNotes] = useState('');

  const ongoingCount = useMemo(
    () => diseaseLogs.filter((d) => d.status === 'ongoing').length,
    [diseaseLogs]
  );
  const recoveredCount = useMemo(
    () => diseaseLogs.filter((d) => d.status === 'recovered').length,
    [diseaseLogs]
  );

  const filteredLogs = useMemo(() => {
    return diseaseLogs.filter((log) => {
      if (filterStatus !== 'all' && log.status !== filterStatus) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const hit =
          log.diseaseName.toLowerCase().includes(q) ||
          log.symptoms.toLowerCase().includes(q) ||
          log.emergencyMedicines.toLowerCase().includes(q) ||
          (log.notes || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [diseaseLogs, filterStatus, searchQuery]);

  const handleOpenAdd = () => {
    setEditingLog(null);
    setDate(getTodayDateString());
    setDayAge(Math.max(1, currentAge).toString());
    setDiseaseName('');
    setSymptoms('');
    setEmergencyMedicines('');
    setDosageAndTiming('');
    setDurationDays('3');
    setAffectedBirds('');
    setStatus('ongoing');
    setNotes('');
    setShowModal(true);
  };

  const handleOpenEdit = (log: DiseaseOutbreakRecord) => {
    setEditingLog(log);
    setDate(log.date);
    setDayAge(log.dayAge.toString());
    setDiseaseName(log.diseaseName);
    setSymptoms(log.symptoms);
    setEmergencyMedicines(log.emergencyMedicines);
    setDosageAndTiming(log.dosageAndTiming);
    setDurationDays(log.durationDays.toString());
    setAffectedBirds(log.affectedBirds !== undefined ? log.affectedBirds.toString() : '');
    setStatus(log.status);
    setNotes(log.notes || '');
    setShowModal(true);
  };

  const handleApplyPreset = (preset: typeof EMERGENCY_PRESETS[0]) => {
    setDiseaseName(preset.diseaseName);
    setSymptoms(preset.symptoms);
    setEmergencyMedicines(preset.emergencyMedicines);
    setDosageAndTiming(preset.dosageAndTiming);
    setDurationDays(preset.durationDays.toString());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diseaseName.trim() || !emergencyMedicines.trim()) return;

    const payload = {
      date,
      dayAge: Math.max(1, parseInt(dayAge, 10) || currentAge || 1),
      diseaseName: diseaseName.trim(),
      symptoms: symptoms.trim() || 'লক্ষণ উল্লেখ করা হয়নি',
      emergencyMedicines: emergencyMedicines.trim(),
      dosageAndTiming: dosageAndTiming.trim() || 'নির্দেশ অনুযায়ী খাবার পানির সাথে',
      durationDays: Math.max(1, parseInt(durationDays, 10) || 3),
      affectedBirds: affectedBirds ? Math.max(0, parseInt(affectedBirds, 10) || 0) : undefined,
      status,
      recoveredDate: status === 'recovered' ? getTodayDateString() : undefined,
      notes: notes.trim()
    };

    if (editingLog) {
      onUpdateDiseaseLog({
        ...editingLog,
        ...payload
      });
    } else {
      onAddDiseaseLog(payload);
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-5 w-full min-w-0">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-rose-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 w-full min-w-0">
        <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 flex-1">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base sm:text-xl font-black text-slate-900 break-words">
              জরুরি রোগ ও হঠাৎ চিকিৎসা লগ ({activeBatch.batchName})
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
              হঠাৎ কোনো রোগ দেখা দিলে লক্ষণ, জরুরি ওষুধ ও কোর্সের মেয়াদ এখানে আলাদাভাবে লিখে রাখুন। এই রেকর্ডগুলো শুধু এই ব্যাচের স্বাস্থ্য লগে থাকবে এবং নতুন ব্যাচের নিয়মিত রুটিনে মিশবে না।
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-all active:scale-95 shrink-0"
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>+ হঠাৎ রোগ ও চিকিৎসা যোগ করুন</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">বর্তমানে চিকিৎসা চলমান</span>
            <span className="text-2xl font-black text-rose-600 font-mono tabular-nums mt-0.5 block">
              {toBnNumber(ongoingCount)} <span className="text-xs font-sans font-semibold text-slate-500">টি</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">সুস্থ / চিকিৎসা সম্পন্ন</span>
            <span className="text-2xl font-black text-emerald-600 font-mono tabular-nums mt-0.5 block">
              {toBnNumber(recoveredCount)} <span className="text-xs font-sans font-semibold text-slate-500">টি</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold block">মোট জরুরি চিকিৎসার ইতিহাস</span>
            <span className="text-2xl font-black text-slate-900 font-mono tabular-nums mt-0.5 block">
              {toBnNumber(diseaseLogs.length)} <span className="text-xs font-sans font-semibold text-slate-500">টি</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterStatus === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            সব ({toBnNumber(diseaseLogs.length)})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('ongoing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterStatus === 'ongoing' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            চিকিৎসা চলমান ({toBnNumber(ongoingCount)})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('recovered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filterStatus === 'recovered' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            সুস্থ হয়েছে ({toBnNumber(recoveredCount)})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="রোগ, লক্ষণ বা ওষুধ খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
          />
        </div>
      </div>

      {/* Disease Records List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h4 className="text-base font-bold text-slate-800">
            {diseaseLogs.length === 0
              ? 'কোনো হঠাৎ রোগ বা জরুরি চিকিৎসার রেকর্ড নেই'
              : 'এই ফিল্টারে কোনো রেকর্ড পাওয়া যায়নি'}
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            মুরগির ঝাঁকে হঠাৎ সর্দি, রক্ত আমাশয়, পাতলা পায়খানা বা অন্য কোনো রোগ দেখা দিলে নিয়মিত ওষুধের শীট না ভেঙে এখানে আলাদা লগ তৈরি করে রাখুন।
          </p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ প্রথম জরুরি রোগের রেকর্ড লিখুন</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredLogs.map((log) => {
            const isRecovered = log.status === 'recovered';
            return (
              <div
                key={log.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all bg-white ${
                  isRecovered ? 'border-emerald-200' : 'border-rose-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1 min-w-0">
                    {/* Meta Header */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                          isRecovered
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isRecovered ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>সুস্থ হয়েছে</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>চিকিৎসা চলমান</span>
                          </>
                        )}
                      </span>

                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-bold tabular-nums">
                        বয়সের {toBnNumber(log.dayAge)}তম দিন
                      </span>

                      <span className="text-[11px] text-slate-500 font-semibold">
                        তারিখ: {formatBnDate(log.date)}
                      </span>

                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-[11px] font-bold tabular-nums">
                        কোর্স: {toBnNumber(log.durationDays)} দিন
                      </span>

                      {log.affectedBirds !== undefined && log.affectedBirds > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-bold tabular-nums">
                          আক্রান্ত: {toBnNumber(log.affectedBirds)} টি মুরগি
                        </span>
                      )}
                    </div>

                    {/* Disease Name */}
                    <h4 className="text-base sm:text-lg font-black text-slate-900">
                      {log.diseaseName}
                    </h4>

                    {/* Symptoms & Emergency Medicines Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 space-y-1">
                        <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                          দৃশ্যমান রোগের লক্ষণ
                        </span>
                        <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                          {log.symptoms}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/70 space-y-1">
                        <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider block">
                          জরুরি ওষুধ ও খাওয়ানোর নিয়ম
                        </span>
                        <p className="text-xs font-black text-rose-950">{log.emergencyMedicines}</p>
                        <p className="text-[11px] font-semibold text-slate-700">{log.dosageAndTiming}</p>
                      </div>
                    </div>

                    {log.notes && (
                      <p className="text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/70">
                        নোট: {log.notes}
                      </p>
                    )}

                    {isRecovered && log.recoveredDate && (
                      <p className="text-[11px] font-bold text-emerald-700">
                        ✓ সুস্থ হওয়ার তারিখ: {formatBnDate(log.recoveredDate)}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0 self-end lg:self-center pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 w-full lg:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => onToggleDiseaseStatus(log.id)}
                      className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[40px] ${
                        isRecovered
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      {isRecovered ? (
                        <>
                          <Clock className="w-4 h-4" />
                          <span>চলমান করুন</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>সুস্থ হয়েছে মার্ক করুন</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(log)}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors min-h-[40px]"
                      title="সম্পাদনা করুন"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirmAction({
                          title: 'রোগের রেকর্ড মুছে ফেলবেন?',
                          message: `আপনি কি "${log.diseaseName}" রেকর্ডটি মুছে ফেলতে চান?`,
                          confirmLabel: 'হ্যাঁ, মুছে ফেলুন',
                          tone: 'danger'
                        });
                        if (ok) {
                          onDeleteDiseaseLog(log.id);
                        }
                      }}
                      className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors min-h-[40px]"
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
      )}

      {/* Add / Edit Disease Outbreak Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {editingLog ? 'জরুরি রোগের তথ্য সম্পাদনা' : 'নতুন হঠাৎ রোগ ও জরুরি চিকিৎসা'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    হঠাৎ অসুস্থতা ও প্রদত্ত জরুরি ওষুধ আলাদাভাবে লিপিবদ্ধ করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto pr-1 space-y-4 mt-3 flex-1">
              {!editingLog && (
                <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200/70 space-y-2">
                  <span className="text-[11px] font-bold text-rose-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-rose-600" />
                    সাধারণ জরুরি রোগের ধরন (এক ক্লিকে ফর্ম পূরণ করুন):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {EMERGENCY_PRESETS.map((p) => (
                      <button
                        key={p.diseaseName}
                        type="button"
                        onClick={() => handleApplyPreset(p)}
                        className="px-2.5 py-1 rounded-xl bg-white border border-rose-200 text-rose-900 text-[11px] font-semibold hover:bg-rose-600 hover:text-white transition-colors"
                      >
                        + {p.diseaseName}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">তারিখ *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">মুরগির বয়স (দিন) *</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={dayAge}
                    onChange={(e) => setDayAge(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">চিকিৎসার মেয়াদ (দিন) *</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">রোগের নাম বা ধরন *</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: ঠাণ্ডা-সর্দি, রক্ত আমাশয় বা গামবোরো"
                    value={diseaseName}
                    onChange={(e) => setDiseaseName(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">আক্রান্ত মুরগির সংখ্যা (ঐচ্ছিক)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="যেমন: ৫০"
                    value={affectedBirds}
                    onChange={(e) => setAffectedBirds(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">দৃশ্যমান লক্ষণসমূহ (ঐচ্ছিক)</label>
                <textarea
                  rows={2}
                  placeholder="যেমন: মুরগি ঝিমিয়ে পড়েছে, পাতলা সাদা/লালচে পায়খানা, ঘড়ঘড় শব্দ..."
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">জরুরি ওষুধের নাম *</label>
                  <input
                    type="text"
                    required
                    placeholder="যেমন: সিপ্রোসিন + ব্রোমহেক্সিন"
                    value={emergencyMedicines}
                    onChange={(e) => setEmergencyMedicines(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">খাওয়ানোর নিয়ম ও মাত্রা (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    placeholder="যেমন: সকালে ও রাতে ১ লিটারে ১ মিলি"
                    value={dosageAndTiming}
                    onChange={(e) => setDosageAndTiming(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">চিকিৎসার বর্তমান অবস্থা</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ongoing' | 'recovered')}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  >
                    <option value="ongoing">চিকিৎসা চলমান</option>
                    <option value="recovered">সুস্থ হয়েছে</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">অতিরিক্ত নোট (ঐচ্ছিক)</label>
                  <input
                    type="text"
                    placeholder="যেমন: আলাদা শেডে রাখা হয়েছে বা ডাক্তারের পরামর্শ"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingLog ? 'আপডেট সংরক্ষণ করুন' : 'জরুরি চিকিৎসা সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
