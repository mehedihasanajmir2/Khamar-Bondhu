import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Syringe,
  Receipt,
  TrendingUp,
  FileSpreadsheet,
  UserCheck,
  ShieldCheck,
  LogOut,
  Repeat,
  PlusCircle,
  Bot,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatTaka, toBnNumber } from '../utils/formatters';

export type TabType =
  | 'dashboard'
  | 'batch'
  | 'medicine'
  | 'expenses'
  | 'sales'
  | 'reports'
  | 'assistant'
  | 'users_directory'
  | 'profile';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenNewBatchModal: () => void;
  onOpenAuthModal: () => void;
  remainingDue?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewBatchModal,
  onOpenAuthModal,
  remainingDue
}) => {
  const { currentUser, logout, switchUser, switchToDemo, allDemoUsers, isGuest } = useAuth();
  const [logoTapCount, setLogoTapCount] = React.useState<number>(0);
  const [logoTapTimeout, setLogoTapTimeout] = React.useState<NodeJS.Timeout | null>(null);

  const ADMIN_EMAIL = 'mehedihasanajmir2@gmail.com';
  const isAdminPhone = Boolean(
    currentUser?.phone && currentUser.phone.replace(/[^0-9]/g, '').endsWith('1946406095')
  );
  const isAdminEmail = Boolean(
    currentUser?.email &&
      (currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ||
        currentUser.email.includes('01946406095'))
  );
  const isAdmin = (isAdminPhone || isAdminEmail || currentUser?.role === 'admin') && !isGuest;

  // Secret 3-tap gesture on FarmHisab Logo
  const handleLogoTap = () => {
    const nextCount = logoTapCount + 1;
    setLogoTapCount(nextCount);

    if (logoTapTimeout) clearTimeout(logoTapTimeout);

    if (nextCount >= 3) {
      setLogoTapCount(0);
      if (isAdmin) {
        // Direct launch into Admin Panel
        setActiveTab('users_directory');
      } else {
        // If not logged in as admin yet, open AuthModal with admin hint
        onOpenAuthModal();
      }
    } else {
      const timer = setTimeout(() => {
        setLogoTapCount(0);
      }, 1200);
      setLogoTapTimeout(timer);
    }
  };

  const navItems: { id: TabType; label: string; icon: React.ReactNode; isSpecial?: boolean }[] = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'batch', label: 'ব্যাচ ও বৃদ্ধি', icon: <Layers className="w-5 h-5" /> },
    { id: 'medicine', label: 'ওষুধ ও টিকা', icon: <Syringe className="w-5 h-5" /> },
    { id: 'expenses', label: 'খরচ হিসাব', icon: <Receipt className="w-5 h-5" /> },
    { id: 'sales', label: 'বিক্রি ও আয়', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'reports', label: 'হিসাব বিবরণী', icon: <FileSpreadsheet className="w-5 h-5" /> },
    { id: 'assistant', label: 'AI সহকারী', icon: <Bot className="w-5 h-5" /> },
    ...(isAdmin
      ? [
          {
            id: 'users_directory' as TabType,
            label: '👑 অ্যাডমিন কন্ট্রোল',
            icon: <Users className="w-5 h-5" />,
            isSpecial: true
          }
        ]
      : []),
    { id: 'profile', label: 'প্রোফাইল', icon: <UserCheck className="w-5 h-5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Logo & Farm Branding with Secret 3-Tap gesture */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleLogoTap}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl overflow-hidden shadow-md shadow-emerald-600/20 ring-2 ring-emerald-200 bg-emerald-700 shrink-0 cursor-pointer active:scale-95 transition-transform"
              title="FarmHisab Logo"
            >
              <img
                src="/assets/aistudio/Gemini_Generated_Image_gm2r1igm2r1igm2r_1d927ad2.jpg"
                alt="FarmHisab Logo"
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            </button>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                  Farm<span className="text-emerald-600">Hisab</span>
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-500">
                  (ফার্মহিসাব)
                </span>
                {isGuest ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                    👀 ডেমো মোড
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    নিরাপদ ক্লাউড
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {isGuest
                  ? `${currentUser?.farmName || 'ডেমো খামার'} (ডেমো প্রিভিউ - শুধুমাত্র দেখার জন্য)`
                  : `${currentUser?.farmName || 'পোল্ট্রি ফার্মিং সফটওয়্যার'} • ${currentUser?.location || 'বাংলাদেশ'}`}
              </p>
            </div>
          </div>

          {/* User Bar & Multi-tenant actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isGuest ? (
              <>
                {/* Demo Switcher for exploring different demo profiles */}
                <div className="relative group hidden md:block">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                    title="অন্যান্য ডেমো খামার দেখুন"
                  >
                    <Repeat className="w-3.5 h-3.5 text-slate-600" />
                    <span>অন্যান্য ডেমো</span>
                  </button>
                  <div className="absolute right-0 mt-1 w-64 p-2 bg-white rounded-xl shadow-xl border border-slate-100 hidden group-hover:block transition-all z-50">
                    <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                      ডেমো খামারসমূহ
                    </div>
                    {allDemoUsers.map((user) => (
                      <button
                        key={user.uid}
                        onClick={() => switchUser(user.uid)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          user.uid === currentUser?.uid
                            ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{user.farmName}</p>
                        </div>
                        {user.uid === currentUser?.uid && (
                          <span className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded-sm">
                            বর্তমান
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Prominent Login / Register Button */}
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30 transition-all active:scale-95"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>একাউন্ট তৈরি / লগইন</span>
                </button>

                {/* New Batch button (will trigger auth gate) */}
                <button
                  onClick={onOpenNewBatchModal}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all active:scale-95"
                  title="নতুন ব্যাচ যোগ করতে একাউন্ট প্রয়োজন"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <span>+ নতুন ব্যাচ</span>
                </button>
              </>
            ) : currentUser ? (
              <>
                {/* Remaining Due Quick Glance Pill */}
                {remainingDue !== undefined && remainingDue > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('expenses')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-black transition-all shadow-2xs active:scale-95"
                    title="বাকি ও জমার খাতা দেখতে ক্লিক করুন"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
                    <span>এখন বাকি: {formatTaka(remainingDue)}</span>
                  </button>
                )}

                {/* Farmer Profile Badge */}
                <div
                  onClick={() => setActiveTab('profile')}
                  className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                  title="আপনার প্রোফাইল দেখতে ক্লিক করুন"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="leading-tight">
                    <p className="text-xs font-bold text-slate-800 truncate max-w-[130px]">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      আইডি: {currentUser.uid.length > 12 ? `${currentUser.uid.substring(0, 10)}...` : currentUser.uid}
                    </p>
                  </div>
                </div>

                {/* Switch to demo button */}
                <button
                  type="button"
                  onClick={switchToDemo}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl text-slate-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors shadow-2xs"
                  title="ডেমো খামারের হিসাব দেখতে ক্লিক করুন"
                >
                  <Repeat className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline">ডেমো খামার দেখুন</span>
                  <span className="sm:hidden">ডেমো</span>
                </button>

                {/* Only Admin sees the quick Admin Panel button in header */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('users_directory')}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-xl border transition-all shadow-xs ${
                      activeTab === 'users_directory'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-amber-100/80 hover:bg-amber-200/90 text-amber-900 border-amber-300'
                    }`}
                    title="খামারী তালিকা, ফোন নম্বর ও বাল্ক SMS পাঠাতে অ্যাডমিন প্যানেল"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-700" />
                    <span className="hidden md:inline">অ্যাডমিন প্যানেল</span>
                    <span className="md:hidden">অ্যাডমিন</span>
                  </button>
                )}

                {/* New Batch button */}
                <button
                  onClick={onOpenNewBatchModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">নতুন ব্যাচ</span>
                </button>

                {/* Logout button */}
                <button
                  onClick={logout}
                  className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="লগআউট (ডেমো মোডে ফিরুন)"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                লগইন / খামারী সাইন আপ
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2 scrollbar-none border-t border-slate-100">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? item.isSpecial
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30 font-bold'
                      : 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold'
                    : item.isSpecial
                    ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
