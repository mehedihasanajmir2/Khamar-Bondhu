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
  PlusCircle
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
  const { currentUser, logout, switchUser, allDemoUsers } = useAuth();

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'batch', label: 'ব্যাচ ও বৃদ্ধি', icon: <Layers className="w-5 h-5" /> },
    { id: 'medicine', label: 'ওষুধ ও টিকা', icon: <Syringe className="w-5 h-5" /> },
    { id: 'expenses', label: 'খরচ হিসাব', icon: <Receipt className="w-5 h-5" /> },
    { id: 'sales', label: 'বিক্রি ও আয়', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'reports', label: 'হিসাব বিবরণী', icon: <FileSpreadsheet className="w-5 h-5" /> },
    { id: 'profile', label: 'প্রোফাইল', icon: <UserCheck className="w-5 h-5" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      {/* Top Banner with Farm Identity and Multi-tenant Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          
          {/* Logo & Farm Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-200">
              <span className="text-2xl" role="img" aria-label="poultry">🐓</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  খামার<span className="text-emerald-600">বন্ধু</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  নিরাপদ আইসোলেশন
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">
                {currentUser?.farmName || 'পোল্ট্রি ফার্মিং সফটওয়্যার'} • {currentUser?.location || 'বাংলাদেশ'}
              </p>
            </div>
          </div>

          {/* User Bar & Multi-tenant actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
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

                {/* Farmer quick badge */}
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
                      আইডি: {currentUser.uid}
                    </p>
                  </div>
                </div>

                {/* Quick Tenant Switcher (to test multi-tenancy) */}
                <div className="relative group">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                    title="অন্য খামারীর আইসোলেটেড একাউন্টে সুইচ করুন"
                  >
                    <Repeat className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="hidden lg:inline">খামারী পরিবর্তন</span>
                  </button>
                  <div className="absolute right-0 mt-1 w-64 p-2 bg-white rounded-xl shadow-xl border border-slate-100 hidden group-hover:block transition-all z-50">
                    <div className="px-2 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                      আইসোলেশন পরীক্ষা (খামারী সুইচ)
                    </div>
                    {allDemoUsers.map((user) => (
                      <button
                        key={user.uid}
                        onClick={() => switchUser(user.uid)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                          user.uid === currentUser.uid
                            ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="truncate">
                          <p className="truncate font-medium">{user.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{user.farmName}</p>
                        </div>
                        {user.uid === currentUser.uid && (
                          <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded-sm">
                            অ্যাক্টিভ
                          </span>
                        )}
                      </button>
                    ))}
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={onOpenAuthModal}
                        className="w-full text-center text-xs text-emerald-600 hover:text-emerald-700 font-semibold py-1"
                      >
                        + নতুন খামারী একাউন্ট নিবন্ধন
                      </button>
                    </div>
                  </div>
                </div>

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
                  title="লগআউট"
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
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold'
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
