import React from 'react';
import {
  CheckCircle,
  FileSpreadsheet,
  X,
  Layers,
  Activity,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Sliders,
} from 'lucide-react';
import { WorkbookUpdateComparison } from '../excel/workbookUpdater';

interface UpdateSummaryModalProps {
  isOpen: boolean;
  comparison: WorkbookUpdateComparison | null;
  onClose: () => void;
}

export const UpdateSummaryModal: React.FC<UpdateSummaryModalProps> = ({
  isOpen,
  comparison,
  onClose,
}) => {
  if (!isOpen || !comparison) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#090F1E] border border-emerald-500/40 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-emerald-950/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">EXCEL UPDATED</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Data Refreshed
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Workbook re-read and all Selection Sets and Clash Tests regenerated
              </p>
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

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
              <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-400 block mb-1">
                Added Elements
              </span>
              <span className="text-xl font-mono font-bold text-emerald-300">
                +{comparison.addedElements.length}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-center">
              <span className="text-[10px] uppercase font-mono tracking-wider text-rose-400 block mb-1">
                Removed Elements
              </span>
              <span className="text-xl font-mono font-bold text-rose-300">
                -{comparison.removedElements.length}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-center">
              <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 block mb-1">
                Changed Tolerances
              </span>
              <span className="text-xl font-mono font-bold text-cyan-300">
                {comparison.changedMatrixValuesCount}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.08] text-center">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                Unchanged Elements
              </span>
              <span className="text-xl font-mono font-bold text-slate-300">
                {comparison.unchangedElements.length}
              </span>
            </div>
          </div>

          {/* Counts Comparison */}
          <div className="p-4 rounded-xl bg-[#060B16] border border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200">Selection Sets</span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-xs">
                <span className="text-slate-400">Before: {comparison.selectionSetsCountBefore}</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-cyan-300">After: {comparison.selectionSetsCountAfter}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-slate-200">Clash Tests</span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-xs">
                <span className="text-slate-400">Before: {comparison.clashTestsCountBefore}</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-emerald-300">After: {comparison.clashTestsCountAfter}</span>
              </div>
            </div>
          </div>

          {/* Tolerance Changes Detailed Breakdown */}
          {comparison.toleranceChanges.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                <span>Matrix Tolerance Modifications ({comparison.toleranceChanges.length})</span>
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              </h4>
              <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-950/60 border border-white/[0.06]">
                {comparison.toleranceChanges.map((tc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs font-mono"
                  >
                    <span className="font-semibold text-cyan-300">{tc.testName}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 line-through">{tc.oldTolerance}</span>
                      <ArrowRight className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300 font-bold">{tc.newTolerance}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation & Clean Status */}
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>All validation checks automatically re-executed on updated data</span>
            </div>
            <span className="text-xs font-mono font-semibold text-emerald-400">
              Warnings: {comparison.columnWarnings.length + comparison.structureWarnings.length}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-white/[0.08] bg-slate-900/60">
          <button
            onClick={onClose}
            id="btn-update-summary-close"
            type="button"
            className="inline-flex items-center px-6 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer border border-emerald-300/30"
          >
            Continue with Updated Project
          </button>
        </div>
      </div>
    </div>
  );
};
