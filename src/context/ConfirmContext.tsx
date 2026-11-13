import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, Trash2, RotateCcw } from 'lucide-react';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning' | 'emerald';
}

interface ConfirmContextType {
  confirmAction: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirmAction = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setDialog(options);
    });
  }, []);

  const handleResolve = (result: boolean) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    setDialog(null);
    if (resolve) resolve(result);
  };

  const tone = dialog?.tone || 'danger';

  return (
    <ConfirmContext.Provider value={{ confirmAction }}>
      {children}

      {dialog && (
        <div
          className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => handleResolve(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  tone === 'danger'
                    ? 'bg-rose-100 text-rose-600'
                    : tone === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {tone === 'danger' ? (
                  <Trash2 className="w-5 h-5" />
                ) : tone === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <RotateCcw className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-slate-900">
                  {dialog.title || (tone === 'danger' ? 'নিশ্চিত করুন' : 'অনুমতি দিন')}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed break-words">
                  {dialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleResolve(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors min-h-[40px]"
              >
                {dialog.cancelLabel || 'বাতিল'}
              </button>
              <button
                type="button"
                onClick={() => handleResolve(true)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all active:scale-95 min-h-[40px] ${
                  tone === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : tone === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {dialog.confirmLabel || (tone === 'danger' ? 'হ্যাঁ, মুছে ফেলুন' : 'হ্যাঁ, নিশ্চিত')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return ctx;
};
