import React from 'react';
import { AlertCircle, X, ShieldCheck } from 'lucide-react';

interface UpdateErrorModalProps {
  isOpen: boolean;
  errorMessage: string | null;
  onClose: () => void;
}

export const UpdateErrorModal: React.FC<UpdateErrorModalProps> = ({
  isOpen,
  errorMessage,
  onClose,
}) => {
  if (!isOpen || !errorMessage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[#090F1E] border border-rose-500/40 rounded-2xl shadow-[0_0_50px_rgba(244,63,94,0.3)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-rose-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Excel Update Failed</h2>
              <p className="text-xs text-slate-300">The selected file could not be parsed safely</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs font-mono break-words leading-relaxed">
            {errorMessage}
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.08] flex items-center gap-2.5 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Your existing project and current workbook data have been kept completely intact.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-white/[0.08] bg-slate-900/60">
          <button
            onClick={onClose}
            id="btn-update-error-close"
            type="button"
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
