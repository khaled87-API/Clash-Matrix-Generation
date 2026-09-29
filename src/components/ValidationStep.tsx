import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  ArrowRight,
  ArrowLeft,
  Download,
  FileJson,
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { ValidationSummary, AppValidationIssue } from '../types/configuration';

interface ValidationStepProps {
  validationSummary: ValidationSummary;
  onNavigateToStep: (step: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const ValidationStep: React.FC<ValidationStepProps> = ({
  validationSummary,
  onNavigateToStep,
  onPrev,
  onNext,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  const filteredIssues = validationSummary.issues.filter((issue) => {
    if (filterType === 'all') return true;
    return issue.type === filterType;
  });

  // Download validation report as JSON
  const handleDownloadJsonReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      status: validationSummary.isValid ? 'PASSED' : 'FAILED',
      summary: {
        totalErrors: validationSummary.errorCount,
        totalWarnings: validationSummary.warningCount,
        totalInfos: validationSummary.infoCount,
      },
      issues: validationSummary.issues,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClashValidationReport_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download validation report as CSV
  const handleDownloadCsvReport = () => {
    const headers = ['Category', 'Type', 'Title', 'Description', 'Location', 'Suggested Fix'];
    const rows = validationSummary.issues.map((i) => [
      i.category,
      i.type.toUpperCase(),
      `"${i.title.replace(/"/g, '""')}"`,
      `"${i.description.replace(/"/g, '""')}"`,
      i.location || '',
      `"${(i.suggestedFix || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ClashValidationReport_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCategoryStepNumber = (category: string): number => {
    switch (category) {
      case 'excel':
        return 1;
      case 'selectionSets':
        return 2;
      case 'conditions':
        return 4;
      case 'clashMatrix':
        return 5;
      case 'clashTests':
        return 6;
      case 'xml':
        return 8;
      default:
        return 2;
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Phase 07 // Automated Quality Assurance
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-1.5">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
              Step 7: BIM Clash Validation Engine &amp; Health Checks
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Multi-layer structural verification covering Excel column mappings, UUID uniqueness, FindSpec conditions,
              matrix cell formats, tolerance boundaries, XML Well-Formedness, and Navisworks Structure Validated Against Reference.
            </p>
          </div>

          {/* Download Report Buttons */}
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={handleDownloadJsonReport}
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-medium border border-white/10 shadow-sm transition-all cursor-pointer"
            >
              <FileJson className="w-4 h-4 mr-1.5 text-cyan-400" />
              Report (JSON)
            </button>
            <button
              type="button"
              onClick={handleDownloadCsvReport}
              className="inline-flex items-center px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 text-xs font-medium border border-white/10 shadow-sm transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-400" />
              Report (CSV)
            </button>
          </div>
        </div>
      </div>

      {/* Main Health Status Banner */}
      <div
        className={`p-6 rounded-2xl border backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg ${
          validationSummary.isValid && validationSummary.warningCount === 0
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
            : validationSummary.isValid
            ? 'bg-amber-950/40 border-amber-500/40 text-amber-100 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
            : 'bg-rose-950/40 border-rose-500/40 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.15)]'
        }`}
      >
        <div className="flex items-center space-x-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
              validationSummary.isValid && validationSummary.warningCount === 0
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-500/40'
                : validationSummary.isValid
                ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                : 'bg-rose-900/60 text-rose-300 border border-rose-500/40'
            }`}
          >
            {validationSummary.isValid && validationSummary.warningCount === 0 ? (
              <CheckCircle2 className="w-8 h-8 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            ) : validationSummary.isValid ? (
              <AlertTriangle className="w-8 h-8 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            ) : (
              <AlertOctagon className="w-8 h-8 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold">
              {validationSummary.isValid && validationSummary.warningCount === 0
                ? 'All Validation Checks Passed Successfully'
                : validationSummary.isValid
                ? 'Validation Passed with Advisories / Warnings'
                : 'Critical Validation Errors Found'}
            </h3>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {validationSummary.isValid
                ? 'Your project configuration is structurally sound and ready to export into Autodesk Navisworks XML.'
                : 'Please resolve blocking validation errors before exporting to ensure smooth Navisworks import.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs self-start md:self-auto font-mono">
          <span className="px-3.5 py-2 rounded-xl bg-rose-950/80 text-rose-300 border border-rose-500/40 shadow-sm">
            Errors: <strong className="font-mono text-sm ml-1">{validationSummary.errorCount}</strong>
          </span>
          <span className="px-3.5 py-2 rounded-xl bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-sm">
            Warnings: <strong className="font-mono text-sm ml-1">{validationSummary.warningCount}</strong>
          </span>
        </div>
      </div>

      {/* Matrix Layout Verification & Sample Resolved Values */}
      {validationSummary.matrixLayoutVerification && (
        <div className="bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Active Matrix Layout Verification &amp; Sample Resolved Values
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact active user configuration coordinates and sample resolved clash tests used for Navisworks XML generation.
              </p>
            </div>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-800/50 px-2.5 py-1 rounded-lg">
              Format: {validationSummary.matrixLayoutVerification.hardPrefix}/
              {validationSummary.matrixLayoutVerification.clearancePrefix} [
              {validationSummary.matrixLayoutVerification.unit}] (
              {validationSummary.matrixLayoutVerification.delimiter ? `delim "${validationSummary.matrixLayoutVerification.delimiter}"` : 'no delim'})
            </span>
          </div>

          {/* Configured Layout Coordinates */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-[#050A15] rounded-xl border border-white/[0.08]">
              <span className="text-slate-400 block text-[11px]">Configured Sheet</span>
              <strong className="text-cyan-300 font-mono text-sm truncate block mt-0.5">
                {validationSummary.matrixLayoutVerification.sheet || 'Default'}
              </strong>
            </div>

            <div className="p-3 bg-[#050A15] rounded-xl border border-white/[0.08]">
              <span className="text-slate-400 block text-[11px]">Row ID Column</span>
              <strong className="text-emerald-300 font-mono text-sm block mt-0.5">
                Col {validationSummary.matrixLayoutVerification.rowGroupColumnLetter}{' '}
                <span className="text-slate-500 text-xs">
                  (Idx {validationSummary.matrixLayoutVerification.rowGroupColumnIndex})
                </span>
              </strong>
            </div>

            <div className="p-3 bg-[#050A15] rounded-xl border border-white/[0.08]">
              <span className="text-slate-400 block text-[11px]">Column ID Header Row</span>
              <strong className="text-slate-100 font-mono text-sm block mt-0.5">
                Row {validationSummary.matrixLayoutVerification.columnHeadersRowIndex + 1}{' '}
                <span className="text-slate-500 text-xs">
                  (Idx {validationSummary.matrixLayoutVerification.columnHeadersRowIndex})
                </span>
              </strong>
            </div>

            <div className="p-3 bg-[#050A15] rounded-xl border border-white/[0.08]">
              <span className="text-slate-400 block text-[11px]">Matrix Start Row</span>
              <strong className="text-slate-100 font-mono text-sm block mt-0.5">
                Row {validationSummary.matrixLayoutVerification.matrixStartRowIndex + 1}{' '}
                <span className="text-slate-500 text-xs">
                  (Idx {validationSummary.matrixLayoutVerification.matrixStartRowIndex})
                </span>
              </strong>
            </div>

            <div className="p-3 bg-[#050A15] rounded-xl border border-white/[0.08]">
              <span className="text-slate-400 block text-[11px]">Matrix Start Column</span>
              <strong className="text-amber-300 font-mono text-sm block mt-0.5">
                Col {validationSummary.matrixLayoutVerification.matrixStartColumnLetter}{' '}
                <span className="text-slate-500 text-xs">
                  (Idx {validationSummary.matrixLayoutVerification.matrixStartColumnIndex})
                </span>
              </strong>
            </div>
          </div>

          {/* Sample Resolved Values Table */}
          {validationSummary.matrixLayoutVerification.sampleResolvedTests.length > 0 ? (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-300 block">
                Sample Resolved Clash Tests (from active layout):
              </span>
              <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#050A15]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-slate-400 font-mono text-[11px] bg-white/[0.02]">
                      <th className="px-3 py-2">Row ID</th>
                      <th className="px-3 py-2">Column ID</th>
                      <th className="px-3 py-2">Matrix Value</th>
                      <th className="px-3 py-2">Clash Type</th>
                      <th className="px-3 py-2">Tolerance (m)</th>
                      <th className="px-3 py-2">Generated Clash Test Name</th>
                      <th className="px-3 py-2">Cell</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] font-mono">
                    {validationSummary.matrixLayoutVerification.sampleResolvedTests.map((sample, sIdx) => (
                      <tr key={sIdx} className="hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-emerald-300 font-bold">{sample.rowElementId}</td>
                        <td className="px-3 py-2 text-cyan-300 font-bold">{sample.colElementId}</td>
                        <td className="px-3 py-2 text-amber-300">{sample.matrixValue}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                              sample.clashType === 'hard'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                                : 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                            }`}
                          >
                            {sample.clashType}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-200">{sample.tolerance}</td>
                        <td className="px-3 py-2 text-indigo-300 font-semibold">{sample.testName}</td>
                        <td className="px-3 py-2 text-slate-400">{sample.cellAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-950/20 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              No sample clash tests could be resolved from the active matrix layout coordinates.
            </div>
          )}
        </div>
      )}

      {/* Issues List with Filter Tabs */}
      <div className="bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden shadow-sm space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            Validation Findings
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-white/[0.05] text-slate-300 border border-white/10">
              {validationSummary.issues.length}
            </span>
          </h3>

          <div className="flex items-center space-x-1.5 text-xs bg-[#050A15] p-1 rounded-xl border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({validationSummary.issues.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('error')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'error'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30'
                  : 'text-slate-400 hover:text-rose-300'
              }`}
            >
              Errors ({validationSummary.errorCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('warning')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                filterType === 'warning'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              Warnings ({validationSummary.warningCount})
            </button>
          </div>
        </div>

        {/* Issues List */}
        <div className="space-y-3.5">
          {filteredIssues.length > 0 ? (
            filteredIssues.map((issue) => {
              const isError = issue.type === 'error';
              const isWarning = issue.type === 'warning';
              const stepTarget = getCategoryStepNumber(issue.category);

              return (
                <div
                  key={issue.id}
                  className={`p-4 rounded-xl border text-xs space-y-2.5 transition-all ${
                    isError
                      ? 'bg-rose-950/20 border-rose-500/40 text-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.08)]'
                      : isWarning
                      ? 'bg-amber-950/20 border-amber-500/40 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.08)]'
                      : 'bg-[#050A15] border-white/[0.08] text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      {isError ? (
                        <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      ) : isWarning ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      ) : (
                        <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      )}
                      <span className="font-bold text-slate-100 text-sm">{issue.title}</span>
                      <span className="px-2 py-0.5 rounded-full uppercase font-mono text-[9px] bg-white/[0.05] text-slate-300 border border-white/10">
                        {issue.category}
                      </span>
                    </div>

                    {issue.location && (
                      <span className="font-mono text-cyan-300 bg-black/40 px-2.5 py-0.5 rounded-lg border border-white/10 text-[11px]">
                        Location: {issue.location}
                      </span>
                    )}
                  </div>

                  <p className="text-slate-300 pl-6 leading-relaxed">{issue.description}</p>

                  {issue.suggestedFix && (
                    <div className="pl-6 pt-1 text-slate-400 italic">
                      💡 Suggested Action: {issue.suggestedFix}
                    </div>
                  )}

                  <div className="pl-6 pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onNavigateToStep(stepTarget)}
                      className="inline-flex items-center text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      Jump to Step {stepTarget} to inspect
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs space-y-2">
              <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              <p>No validation issues found for the selected filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
        <button
          onClick={onPrev}
          id="btn-val-prev"
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-sm font-medium border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Clash Tests Preview
        </button>

        <button
          onClick={onNext}
          id="btn-val-next"
          type="button"
          className="inline-flex items-center px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer border border-cyan-300/30"
        >
          Proceed to Final Export &amp; XML Viewer
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};
