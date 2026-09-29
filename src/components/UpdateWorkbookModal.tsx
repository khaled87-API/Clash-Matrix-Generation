import React, { useState } from 'react';
import {
  RefreshCw,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  X,
  Layers,
  ArrowRight,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { WorkbookUpdateComparison } from '../excel/workbookUpdater';

interface UpdateWorkbookModalProps {
  isOpen: boolean;
  comparison: WorkbookUpdateComparison | null;
  onConfirm: (adoptDetectedStructure?: boolean, selectedSheet?: string) => void;
  onCancel: () => void;
}

export const UpdateWorkbookModal: React.FC<UpdateWorkbookModalProps> = ({
  isOpen,
  comparison,
  onConfirm,
  onCancel,
}) => {
  const [selectedSheet, setSelectedSheet] = useState<string>(
    comparison ? comparison.targetSheet : ''
  );

  if (!isOpen || !comparison) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#090F1E] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <RefreshCw className="w-5 h-5 animate-spin-reverse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Update Workbook?
              </h2>
              <p className="text-xs text-slate-400">
                Re-reads data while preserving all column mappings and project settings
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Reassurance Banner */}
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-200/90 leading-relaxed">
              <span className="font-semibold text-emerald-300">Configuration Preserved:</span> Your column mappings, Selection Set naming rules, FindSpec conditions, custom categories, and matrix tolerances will remain intact. Only the underlying spreadsheet rows and matrix values will be refreshed.
            </div>
          </div>

          {/* File & Sheet Comparison Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.08]">
              <span className="text-[11px] font-mono uppercase text-slate-400 block mb-1">
                Current Workbook
              </span>
              <div className="text-sm font-semibold text-slate-200 truncate flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{comparison.previousFileName}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                {comparison.totalRowsBefore} rows
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
              <span className="text-[11px] font-mono uppercase text-cyan-400 block mb-1">
                Updated Workbook
              </span>
              <div className="text-sm font-semibold text-cyan-200 truncate flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="truncate">{comparison.newFileName}</span>
              </div>
              <div className="text-xs text-cyan-300/80 mt-1 font-mono">
                {comparison.totalRowsAfter} rows
              </div>
            </div>
          </div>

          {/* Sheet Selection & Warning if missing */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Target Worksheet
            </label>
            {comparison.sheetPreserved ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-white/[0.08]">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">{comparison.targetSheet}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                  Sheet Matched & Preserved
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    Previous sheet <code className="font-mono bg-amber-900/50 px-1 py-0.5 rounded">{comparison.targetSheet}</code> was not found in the updated workbook. Please select a replacement worksheet below:
                  </div>
                </div>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full bg-[#050A15] border border-cyan-500/40 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  {comparison.availableSheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quick Projected Changes Summary */}
          <div className="p-4 rounded-xl bg-[#060B16] border border-white/[0.08] space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <span>Projected Data Impact</span>
              <span className="font-mono text-[11px] text-cyan-400">
                Selection Sets & Matrix
              </span>
            </h4>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-500/20">
                <div className="font-mono font-bold text-emerald-300 text-base">
                  +{comparison.addedElements.length}
                </div>
                <div className="text-[11px] text-emerald-400/80">Added Elements</div>
              </div>

              <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/20">
                <div className="font-mono font-bold text-rose-300 text-base">
                  -{comparison.removedElements.length}
                </div>
                <div className="text-[11px] text-rose-400/80">Removed Elements</div>
              </div>

              <div className="p-2 rounded-lg bg-cyan-950/30 border border-cyan-500/20">
                <div className="font-mono font-bold text-cyan-300 text-base">
                  {comparison.changedMatrixValuesCount}
                </div>
                <div className="text-[11px] text-cyan-400/80">Tolerance Changes</div>
              </div>
            </div>

            {/* Added / Removed previews */}
            {comparison.addedElements.length > 0 && (
              <div className="text-xs flex items-center gap-1.5 flex-wrap">
                <span className="text-emerald-400 font-medium">New Elements:</span>
                {comparison.addedElements.slice(0, 5).map((el) => (
                  <span
                    key={el}
                    className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]"
                  >
                    {el}
                  </span>
                ))}
                {comparison.addedElements.length > 5 && (
                  <span className="text-slate-400 font-mono text-[11px]">
                    +{comparison.addedElements.length - 5} more
                  </span>
                )}
              </div>
            )}

            {comparison.removedElements.length > 0 && (
              <div className="text-xs flex items-center gap-1.5 flex-wrap">
                <span className="text-rose-400 font-medium">Removed Elements:</span>
                {comparison.removedElements.slice(0, 5).map((el) => (
                  <span
                    key={el}
                    className="px-1.5 py-0.5 rounded bg-rose-950/80 border border-rose-500/30 text-rose-300 font-mono text-[11px]"
                  >
                    {el}
                  </span>
                ))}
                {comparison.removedElements.length > 5 && (
                  <span className="text-slate-400 font-mono text-[11px]">
                    +{comparison.removedElements.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Column Warnings if any */}
          {comparison.columnWarnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 space-y-1.5 text-xs text-amber-200">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Column Mapping Notice:
              </div>
              <ul className="list-disc list-inside space-y-1 text-amber-300/90 font-mono text-[11px]">
                {comparison.columnWarnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] bg-slate-900/60">
          <button
            onClick={onCancel}
            id="btn-update-cancel"
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.06] hover:bg-white/[0.12] transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={() => onConfirm(false, selectedSheet)}
            id="btn-update-confirm"
            type="button"
            className="inline-flex items-center px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer border border-cyan-300/30"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Update Workbook & Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};
