import React, { useState, useMemo } from 'react';
import {
  CompleteDiffReport,
  FinalResultConfig,
  ExportScopeMode,
  SearchSetDependencyStatus,
} from '../../xmlComparing/types';
import {
  determineClashTestsToExport,
  determineSelectionSetsToExport,
  resolveRequiredSelectionSetsWithSummary,
  buildComparedNavisworksXml,
} from '../../xmlComparing/finalXmlBuilder';
import { validateFinalXmlStructure } from '../../xmlComparing/validator';
import {
  Download,
  Eye,
  AlertCircle,
  FileCode,
  Copy,
  Check,
  X,
  Sliders,
  ShieldCheck,
  Layers,
  Search,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface FinalResultSectionProps {
  report: CompleteDiffReport;
}

type StatusFilterType =
  | 'ALL_REQUIRED'
  | 'EXPORTED_ONLY'
  | 'NOT_EXPORTED_ONLY'
  | 'NEW'
  | 'MODIFIED'
  | 'EXISTING'
  | 'GUID_ONLY';

export const FinalResultSection: React.FC<FinalResultSectionProps> = ({ report }) => {
  const [exportScope, setExportScope] = useState<ExportScopeMode>('DELTA_ONLY');
  const [includeRemovedAsResolved, setIncludeRemovedAsResolved] = useState<boolean>(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('ALL_REQUIRED');
  const [isUnusedSetsOpen, setIsUnusedSetsOpen] = useState<boolean>(false);

  // Compute final config
  const config: FinalResultConfig = useMemo(() => {
    let includeNew = true;
    let includeMod = true;
    let includeUnch = false;

    if (exportScope === 'FULL_MERGED') {
      includeUnch = true;
    } else if (exportScope === 'NEW_ONLY') {
      includeMod = false;
    } else if (exportScope === 'MODIFIED_ONLY') {
      includeNew = false;
    }

    return {
      exportScope,
      includeNewTests: includeNew,
      includeModifiedTests: includeMod,
      includeUnchangedTests: includeUnch,
      includeRemovedAsResolved,
      batchTestMetadataSource: 'NEW',
    };
  }, [exportScope, includeRemovedAsResolved]);

  // Determine export clash tests
  const testsToExport = useMemo(
    () => determineClashTestsToExport(report, config),
    [report, config]
  );

  // DEPENDENCY RESOLUTION:
  // Inspect Left & Right targets of all exported Clash Tests and collect ONLY the required sets
  const dependencySummary = useMemo(
    () => resolveRequiredSelectionSetsWithSummary(report, testsToExport, exportScope),
    [report, testsToExport, exportScope]
  );

  // TRUE DELTA EXPORT:
  // Only search sets that have isExported === true are included in the physical XML output
  const setsToExport = useMemo(
    () => determineSelectionSetsToExport(report, testsToExport, config),
    [report, testsToExport, config]
  );

  // Validation with baseline awareness
  const validation = useMemo(
    () =>
      validateFinalXmlStructure(
        testsToExport,
        setsToExport,
        report.newDoc.units || 'm',
        report.oldDoc.selectionSets
      ),
    [testsToExport, setsToExport, report.newDoc.units, report.oldDoc.selectionSets]
  );

  // Generate XML string
  const finalXmlString = useMemo(() => {
    return buildComparedNavisworksXml(report, config);
  }, [report, config]);

  // Filter required sets for inspectable table
  const filteredRequiredSets = useMemo(() => {
    return dependencySummary.requiredSets.filter((item) => {
      let matchesFilter = true;
      if (statusFilter === 'EXPORTED_ONLY') {
        matchesFilter = item.isExported;
      } else if (statusFilter === 'NOT_EXPORTED_ONLY') {
        matchesFilter = !item.isExported;
      } else if (statusFilter !== 'ALL_REQUIRED') {
        matchesFilter = item.status === statusFilter;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.folderName.toLowerCase().includes(q) ||
        item.locator.toLowerCase().includes(q) ||
        item.usedByClashTests.some((t) => t.toLowerCase().includes(q));

      return matchesFilter && matchesSearch;
    });
  }, [dependencySummary.requiredSets, statusFilter, searchQuery]);

  // Export action
  const handleExport = () => {
    if (!validation.isValid) return;

    const blob = new Blob([finalXmlString], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const baseName = report.newDoc.fileName.replace(/\.xml$/i, '');
    const scopeTag = exportScope.toLowerCase();
    link.href = url;
    link.download = `${baseName}_compared_${scopeTag}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyXml = () => {
    navigator.clipboard.writeText(finalXmlString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { summary } = report;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#0A1124]/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">FINAL RESULT</h3>
              <p className="text-xs text-slate-400">
                Verified Navisworks Exchange XML package built from comparison results
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-white/[0.08] transition-all cursor-pointer shadow-sm"
          >
            <Eye className="w-4 h-4 mr-2 text-cyan-400" />
            Preview Final XML
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={!validation.isValid || testsToExport.length === 0}
            className={`inline-flex items-center px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer ${
              validation.isValid && testsToExport.length > 0
                ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-emerald-500/20'
                : 'bg-slate-800 text-slate-500 border border-white/[0.05] cursor-not-allowed opacity-60'
            }`}
          >
            <Download className="w-4 h-4 mr-2" />
            Export XML
          </button>
        </div>
      </div>

      {/* Comparison Metrics Grid */}
      <div>
        <span className="text-xs font-semibold text-slate-400 uppercase font-mono mb-2 block">
          Document Difference Overview
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
            <span className="text-slate-400 font-mono text-[10px] uppercase block">New Clash Tests</span>
            <span className="text-lg font-bold text-emerald-300 font-mono">{summary.clashTests.newCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
            <span className="text-slate-400 font-mono text-[10px] uppercase block">Modified Clash Tests</span>
            <span className="text-lg font-bold text-amber-300 font-mono">{summary.clashTests.modifiedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
            <span className="text-slate-400 font-mono text-[10px] uppercase block">Removed Clash Tests</span>
            <span className="text-lg font-bold text-rose-300 font-mono">{summary.clashTests.removedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
            <span className="text-slate-400 font-mono text-[10px] uppercase block">Unchanged Clash Tests</span>
            <span className="text-lg font-bold text-slate-300 font-mono">{summary.clashTests.unchangedCount}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
            <span className="text-slate-400 font-mono text-[10px] uppercase block">New Search Sets</span>
            <span className="text-lg font-bold text-emerald-300 font-mono">{summary.selectionSets.newCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
            <span className="text-slate-400 font-mono text-[10px] uppercase block">Modified Search Sets</span>
            <span className="text-lg font-bold text-amber-300 font-mono">{summary.selectionSets.modifiedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
            <span className="text-slate-400 font-mono text-[10px] uppercase block">Removed Search Sets</span>
            <span className="text-lg font-bold text-rose-300 font-mono">{summary.selectionSets.removedCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
            <span className="text-slate-400 font-mono text-[10px] uppercase block">Unchanged Search Sets</span>
            <span className="text-lg font-bold text-slate-300 font-mono">{summary.selectionSets.unchangedCount}</span>
          </div>
        </div>
      </div>

      {/* Scope Mode & Workflow Selection */}
      <div className="p-5 rounded-2xl bg-[#070D1B]/80 border border-white/[0.06] space-y-4">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h4 className="text-sm font-bold text-white">Export Scope Strategy</h4>
          <span className="text-[11px] text-slate-400">(Prevents duplicate clash tests in Navisworks)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label
            className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
              exportScope === 'DELTA_ONLY'
                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-black/30 border-white/[0.06] hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-xs text-white">Delta Only</span>
              <input
                type="radio"
                name="exportScope"
                value="DELTA_ONLY"
                checked={exportScope === 'DELTA_ONLY'}
                onChange={() => setExportScope('DELTA_ONLY')}
                className="text-cyan-500 focus:ring-cyan-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Exports only <strong>New + Modified</strong> tests. Recommended so re-importing does not duplicate existing tests in Navisworks.
            </p>
          </label>

          <label
            className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
              exportScope === 'FULL_MERGED'
                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-black/30 border-white/[0.06] hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-xs text-white">Full Merged</span>
              <input
                type="radio"
                name="exportScope"
                value="FULL_MERGED"
                checked={exportScope === 'FULL_MERGED'}
                onChange={() => setExportScope('FULL_MERGED')}
                className="text-cyan-500 focus:ring-cyan-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Exports <strong>New + Modified + Unchanged</strong> tests for a complete replacement batch.
            </p>
          </label>

          <label
            className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
              exportScope === 'NEW_ONLY'
                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-black/30 border-white/[0.06] hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-xs text-white">New Tests Only</span>
              <input
                type="radio"
                name="exportScope"
                value="NEW_ONLY"
                checked={exportScope === 'NEW_ONLY'}
                onChange={() => setExportScope('NEW_ONLY')}
                className="text-cyan-500 focus:ring-cyan-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Exports only newly added clash tests without any modifications or legacy tests.
            </p>
          </label>

          <label
            className={`p-3.5 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
              exportScope === 'MODIFIED_ONLY'
                ? 'bg-cyan-950/40 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-black/30 border-white/[0.06] hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-xs text-white">Modified Only</span>
              <input
                type="radio"
                name="exportScope"
                value="MODIFIED_ONLY"
                checked={exportScope === 'MODIFIED_ONLY'}
                onChange={() => setExportScope('MODIFIED_ONLY')}
                className="text-cyan-500 focus:ring-cyan-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Exports only tests whose type or tolerance changed between revisions.
            </p>
          </label>
        </div>
      </div>

      {/* DEPENDENCY-DRIVEN SEARCH SET PACKAGING SECTION */}
      <div className="p-6 rounded-2xl bg-[#070D1B]/90 border border-cyan-500/20 shadow-lg space-y-6">
        {/* Section Header & Dependency Chain Visualization */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-950/70 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white tracking-tight">
                  DEPENDENCY-DRIVEN SEARCH SET PACKAGING
                </h4>
                <p className="text-xs text-slate-400">
                  Left and Right references from exported Clash Tests resolve to required Search Sets only
                </p>
              </div>
            </div>

            <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
              Dependency Chain Enforced
            </span>
          </div>

          {/* Visual Dependency Chain */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[10px] font-bold flex items-center justify-center">1</span>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Exported Clash Tests</span>
                <span className="font-bold text-white font-mono">{testsToExport.length} Tests Selected</span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-cyan-400/60 hidden sm:block shrink-0" />

            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold flex items-center justify-center">2</span>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Required by Tests</span>
                <span className="font-bold text-sky-300 font-mono">{dependencySummary.totalRequired} Sets Referenced</span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-cyan-400/60 hidden sm:block shrink-0" />

            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold flex items-center justify-center">3</span>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Exported Search Sets</span>
                <span className="font-bold text-emerald-300 font-mono">{dependencySummary.totalExported} Sets in Delta XML</span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-purple-400/60 hidden sm:block shrink-0" />

            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold flex items-center justify-center">4</span>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Not Exported</span>
                <span className="font-bold text-purple-300 font-mono">{dependencySummary.totalNotExported} Baseline Sets</span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-500 hidden sm:block shrink-0" />

            <div className="flex items-center space-x-2">
              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] font-bold flex items-center justify-center">5</span>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-mono block">Unused / Unrelated</span>
                <span className="font-bold text-slate-400 font-mono">{dependencySummary.unusedCount} Sets Omitted</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dependency Metrics Breakdown Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
            <span className="text-cyan-300/80 font-mono text-[10px] uppercase block">Total Required</span>
            <span className="text-xl font-bold text-cyan-200 font-mono">{dependencySummary.totalRequired}</span>
            <span className="text-[10px] text-cyan-400/80 block mt-0.5">Referenced by tests</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
            <span className="text-emerald-300/90 font-mono text-[10px] uppercase block">Exported in XML</span>
            <span className="text-xl font-bold text-emerald-300 font-mono">{dependencySummary.totalExported}</span>
            <span className="text-[10px] text-emerald-400/80 block mt-0.5">NEW + MODIFIED</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
            <span className="text-emerald-300/80 font-mono text-[10px] uppercase block">New Sets</span>
            <span className="text-xl font-bold text-emerald-300 font-mono">{dependencySummary.newCount}</span>
            <span className="text-[10px] text-emerald-400/70 block mt-0.5">Exported</span>
          </div>

          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
            <span className="text-amber-300/80 font-mono text-[10px] uppercase block">Modified Sets</span>
            <span className="text-xl font-bold text-amber-300 font-mono">{dependencySummary.modifiedCount}</span>
            <span className="text-[10px] text-amber-400/70 block mt-0.5">Exported (New Def)</span>
          </div>

          <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/20">
            <span className="text-sky-300/80 font-mono text-[10px] uppercase block">Unchanged Sets</span>
            <span className="text-xl font-bold text-sky-300 font-mono">{dependencySummary.existingCount}</span>
            <span className="text-[10px] text-sky-400/70 block mt-0.5">Not Exported</span>
          </div>

          <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20">
            <span className="text-purple-300/80 font-mono text-[10px] uppercase block">GUID Only</span>
            <span className="text-xl font-bold text-purple-300 font-mono">{dependencySummary.guidOnlyCount}</span>
            <span className="text-[10px] text-purple-400/70 block mt-0.5">Not Exported</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
            <span className="text-slate-400 font-mono text-[10px] uppercase block">Unreferenced</span>
            <span className="text-xl font-bold text-slate-300 font-mono">{dependencySummary.unusedCount}</span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Excluded</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL_REQUIRED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'ALL_REQUIRED'
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Required ({dependencySummary.totalRequired})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('EXPORTED_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'EXPORTED_ONLY'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
              }`}
            >
              Exported in Delta XML ({dependencySummary.totalExported})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('NOT_EXPORTED_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'NOT_EXPORTED_ONLY'
                  ? 'bg-purple-500 text-slate-950 font-semibold'
                  : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/50'
              }`}
            >
              Not Exported ({dependencySummary.totalNotExported})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('NEW')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'NEW'
                  ? 'bg-emerald-500 text-slate-950 font-semibold'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
              }`}
            >
              New ({dependencySummary.newCount})
            </button>
            {dependencySummary.modifiedCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('MODIFIED')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === 'MODIFIED'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                }`}
              >
                Modified ({dependencySummary.modifiedCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setStatusFilter('EXISTING')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'EXISTING'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Unchanged ({dependencySummary.existingCount})
            </button>
            {dependencySummary.guidOnlyCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('GUID_ONLY')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === 'GUID_ONLY'
                    ? 'bg-purple-500 text-slate-950 font-semibold'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700'
                }`}
              >
                GUID Only ({dependencySummary.guidOnlyCount})
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[260px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search required search sets or clash tests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900/90 border border-white/[0.08] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Required Search Sets Table */}
        <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/40">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0A1020] text-slate-400 font-mono text-[11px] uppercase border-b border-white/[0.06]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Search Set Name &amp; Folder</th>
                <th className="py-2.5 px-4 font-semibold">Classification</th>
                <th className="py-2.5 px-4 font-semibold">Package Status</th>
                <th className="py-2.5 px-4 font-semibold">Referenced By Clash Tests</th>
                <th className="py-2.5 px-4 font-semibold">Locator Path</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredRequiredSets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No required search sets match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRequiredSets.map((item, index) => (
                  <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 px-4 font-mono font-medium text-white">
                      <div>{item.name}</div>
                      <span className="text-[10px] text-slate-400 font-sans">
                        Folder: {item.folderName || '(root)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      {item.status === 'NEW' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-mono">
                          NEW
                        </span>
                      )}
                      {item.status === 'EXISTING' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-950/60 text-sky-300 border border-sky-500/30 font-mono">
                          UNCHANGED
                        </span>
                      )}
                      {item.status === 'MODIFIED' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/30 font-mono">
                          MODIFIED
                        </span>
                      )}
                      {item.status === 'GUID_ONLY' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-500/30 font-mono">
                          GUID ONLY
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {item.isExported ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 font-mono">
                            EXPORTED
                          </span>
                          <span className="block text-[10px] text-slate-400">{item.exportReason}</span>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-white/[0.08] font-mono">
                            NOT EXPORTED
                          </span>
                          <span className="block text-[10px] text-slate-500">{item.exportReason}</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {item.usedByClashTests.map((ctName, ctIdx) => (
                          <span
                            key={ctIdx}
                            className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800 border border-white/[0.06] text-cyan-300 text-[11px] font-mono"
                          >
                            {ctName}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400 truncate max-w-xs" title={item.locator}>
                      {item.locator}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Collapsible Section for Omitted / Unused Search Sets */}
        {dependencySummary.unusedSets.length > 0 && (
          <div className="border border-white/[0.06] rounded-xl bg-black/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setIsUnusedSetsOpen(!isUnusedSetsOpen)}
              className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-medium text-slate-300 hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Info className="w-4 h-4 text-slate-400" />
                <span>
                  Omitted Unused Search Sets ({dependencySummary.unusedCount})
                </span>
                <span className="text-[11px] text-slate-500">
                  (Excluded to avoid model bloat)
                </span>
              </div>
              {isUnusedSetsOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {isUnusedSetsOpen && (
              <div className="p-4 border-t border-white/[0.06] space-y-3 bg-[#050A15]/80">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  These Search Sets exist in the loaded XML files but are not referenced by any of the {testsToExport.length} exported Clash Tests. In accordance with the Dependency-Driven Delta principle, they are omitted from the final XML to keep the update package minimal and prevent redundant definitions in Navisworks.
                </p>
                <div className="overflow-x-auto rounded-lg border border-white/[0.04]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#0A1020] text-slate-400 font-mono text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Search Set Name</th>
                        <th className="py-2 px-3">Folder</th>
                        <th className="py-2 px-3">Locator</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04] text-[11px]">
                      {dependencySummary.unusedSets.map((s, idx) => (
                        <tr key={idx} className="text-slate-400">
                          <td className="py-1.5 px-3 font-mono font-medium text-slate-300">{s.name}</td>
                          <td className="py-1.5 px-3">{s.folderName || '(root)'}</td>
                          <td className="py-1.5 px-3 font-mono text-[10px]">{s.locator}</td>
                          <td className="py-1.5 px-3">
                            <span className="text-[10px] text-slate-500 font-mono">Omitted</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Safety Validation Summary Card */}
      <div
        className={`p-4 rounded-xl border text-xs ${
          validation.isValid
            ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
            : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {validation.isValid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div>
              <h5 className="font-bold text-white">
                {validation.isValid ? 'Navisworks Safety Validation Passed' : 'Validation Errors Detected'}
              </h5>
              <p className="text-[11px] text-slate-300">
                Packaging {testsToExport.length} Clash Tests and {setsToExport.length} Selection Sets across {validation.viewFoldersToExportCount} View Folders.
                {validation.baselineResolvedCount && validation.baselineResolvedCount > 0
                  ? ` (${validation.baselineResolvedCount} search set references verified against Navisworks baseline)`
                  : ''}
              </p>
            </div>
          </div>

          <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-black/40 border border-white/[0.06] text-slate-300">
            nw-exchange-12.0.xsd
          </span>
        </div>

        {validation.errors.length > 0 && (
          <ul className="mt-3 space-y-1 list-disc list-inside text-rose-300 text-[11px] pt-2 border-t border-rose-500/20">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        )}

        {validation.warnings.length > 0 && (
          <ul className="mt-2 space-y-1 list-disc list-inside text-amber-300 text-[11px]">
            {validation.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Full Screen XML Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-[#0A1020] border border-white/[0.1] rounded-2xl shadow-2xl flex flex-col h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#060B16]">
              <div className="flex items-center space-x-3">
                <FileCode className="w-5 h-5 text-cyan-400" />
                <div>
                  <h4 className="text-base font-bold text-white">FINAL NAVISWORKS XML PREVIEW</h4>
                  <p className="text-xs text-slate-400">
                    {testsToExport.length} Clash Tests | {setsToExport.length} Selection Sets | Tolerance: 10 decimals
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleCopyXml}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  {copied ? 'Copied' : 'Copy XML'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* XML Body */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#030712]">
              <pre className="text-xs font-mono text-cyan-200/90 leading-relaxed whitespace-pre-wrap break-all">
                {finalXmlString}
              </pre>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.08] bg-[#060B16] text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Target: Autodesk Navisworks 2024–2026 nw-exchange-12.0.xsd
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleExport();
                    setIsPreviewOpen(false);
                  }}
                  disabled={!validation.isValid}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300"
                >
                  Download XML
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
