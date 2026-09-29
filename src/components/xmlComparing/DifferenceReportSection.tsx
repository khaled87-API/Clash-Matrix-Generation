import React, { useState } from 'react';
import {
  CompleteDiffReport,
  DiffStatus,
  ClashTestDiff,
  SelectionSetDiff,
} from '../../xmlComparing/types';
import {
  GitCompare,
  PlusCircle,
  FileEdit,
  Trash2,
  CheckCircle,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  FolderTree,
  ListFilter,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DifferenceReportSectionProps {
  report: CompleteDiffReport;
}

export const DifferenceReportSection: React.FC<DifferenceReportSectionProps> = ({ report }) => {
  const [clashFilter, setClashFilter] = useState<'ALL' | DiffStatus>('ALL');
  const [searchSetFilter, setSearchSetFilter] = useState<'ALL' | DiffStatus>('ALL');
  const [clashSearch, setClashSearch] = useState<string>('');
  const [searchSetSearch, setSearchSetSearch] = useState<string>('');

  const { summary, ambiguities } = report;

  // Filter clash tests
  const filteredClashDiffs = report.clashTestDiffs.filter((d) => {
    const matchesFilter = clashFilter === 'ALL' || d.status === clashFilter;
    const matchesSearch = d.name.toLowerCase().includes(clashSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Filter selection sets
  const filteredSetDiffs = report.selectionSetDiffs.filter((d) => {
    const matchesFilter = searchSetFilter === 'ALL' || d.status === searchSetFilter;
    const matchesSearch =
      d.name.toLowerCase().includes(searchSetSearch.toLowerCase()) ||
      d.folderName.toLowerCase().includes(searchSetSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Ambiguity Warning Banner if Duplicates Exist */}
      {(ambiguities.duplicateClashTestNamesOld.length > 0 ||
        ambiguities.duplicateClashTestNamesNew.length > 0 ||
        ambiguities.duplicateSelectionSetNamesOld.length > 0 ||
        ambiguities.duplicateSelectionSetNamesNew.length > 0) && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-semibold text-amber-100">Duplicate Name Ambiguities Detected</h4>
            <p className="text-slate-300">
              Autodesk Navisworks files should have unique Clash Test and Selection Set names. Duplicates have been flagged without silent merging:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-300">
              {ambiguities.duplicateClashTestNamesOld.map((n) => (
                <li key={`dco_${n}`}>OLD XML duplicate test: "{n}"</li>
              ))}
              {ambiguities.duplicateClashTestNamesNew.map((n) => (
                <li key={`dcn_${n}`}>NEW XML duplicate test: "{n}"</li>
              ))}
              {ambiguities.duplicateSelectionSetNamesOld.map((n) => (
                <li key={`dso_${n}`}>OLD XML duplicate selection set: "{n}"</li>
              ))}
              {ambiguities.duplicateSelectionSetNamesNew.map((n) => (
                <li key={`dsn_${n}`}>NEW XML duplicate selection set: "{n}"</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Summary KPI Cards Grid (Section 9) */}
      <div>
        <div className="flex items-center space-x-2 mb-3">
          <GitCompare className="w-5 h-5 text-indigo-400" />
          <h3 className="text-lg font-bold text-white tracking-tight">Difference Report Summary</h3>
          <span className="text-xs text-slate-400">
            Comparing <code className="text-amber-300">{report.oldDoc.fileName}</code> against <code className="text-cyan-300">{report.newDoc.fileName}</code>
          </span>
        </div>

        {/* 1. Clash Test Summary Cards */}
        <div className="mb-4">
          <span className="text-xs font-semibold text-slate-400 uppercase font-mono mb-2 block">
            Clash Tests Overview (Total: {summary.clashTests.totalNew} New XML vs {summary.clashTests.totalOld} Old XML)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setClashFilter('NEW')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                clashFilter === 'NEW'
                  ? 'bg-emerald-950/60 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : 'bg-slate-900/60 border-white/[0.06] hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300">NEW CLASH TESTS</span>
                <PlusCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono mt-2">
                {summary.clashTests.newCount}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">In NEW, absent in OLD</span>
            </div>

            <div
              onClick={() => setClashFilter('MODIFIED')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                clashFilter === 'MODIFIED'
                  ? 'bg-amber-950/60 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                  : 'bg-slate-900/60 border-white/[0.06] hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300">MODIFIED CLASH TESTS</span>
                <FileEdit className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono mt-2">
                {summary.clashTests.modifiedCount}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Type or tolerance changed</span>
            </div>

            <div
              onClick={() => setClashFilter('REMOVED')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                clashFilter === 'REMOVED'
                  ? 'bg-rose-950/60 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]'
                  : 'bg-slate-900/60 border-white/[0.06] hover:border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-300">REMOVED CLASH TESTS</span>
                <Trash2 className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono mt-2">
                {summary.clashTests.removedCount}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">In OLD, absent in NEW</span>
            </div>

            <div
              onClick={() => setClashFilter('UNCHANGED')}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                clashFilter === 'UNCHANGED'
                  ? 'bg-slate-800/80 border-slate-400 shadow-md'
                  : 'bg-slate-900/60 border-white/[0.06] hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">UNCHANGED CLASH TESTS</span>
                <CheckCircle className="w-4 h-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-white font-mono mt-2">
                {summary.clashTests.unchangedCount}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Identical parameters</span>
            </div>
          </div>
        </div>

        {/* 2. Selection Set Summary Cards */}
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase font-mono mb-2 block">
            Search Sets / Selection Sets Overview (Total: {summary.selectionSets.totalNew} New XML vs {summary.selectionSets.totalOld} Old XML)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setSearchSetFilter('NEW')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                searchSetFilter === 'NEW'
                  ? 'bg-emerald-950/60 border-emerald-500'
                  : 'bg-slate-900/60 border-white/[0.06] hover:border-emerald-500/40'
              }`}
            >
              <span className="text-[11px] font-semibold text-emerald-300">NEW SEARCH SETS</span>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {summary.selectionSets.newCount}
              </div>
            </div>

            <div
              onClick={() => setSearchSetFilter('MODIFIED')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                searchSetFilter === 'MODIFIED'
                  ? 'bg-amber-950/60 border-amber-500'
                  : 'bg-slate-900/60 border-white/[0.06] hover:border-amber-500/40'
              }`}
            >
              <span className="text-[11px] font-semibold text-amber-300">MODIFIED SEARCH SETS</span>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {summary.selectionSets.modifiedCount}
              </div>
            </div>

            <div
              onClick={() => setSearchSetFilter('REMOVED')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                searchSetFilter === 'REMOVED'
                  ? 'bg-rose-950/60 border-rose-500'
                  : 'bg-slate-900/60 border-white/[0.06] hover:border-rose-500/40'
              }`}
            >
              <span className="text-[11px] font-semibold text-rose-300">REMOVED SEARCH SETS</span>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {summary.selectionSets.removedCount}
              </div>
            </div>

            <div
              onClick={() => setSearchSetFilter('UNCHANGED')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                searchSetFilter === 'UNCHANGED'
                  ? 'bg-slate-800/80 border-slate-400'
                  : 'bg-slate-900/60 border-white/[0.06] hover:border-slate-500'
              }`}
            >
              <span className="text-[11px] font-semibold text-slate-300">UNCHANGED SEARCH SETS</span>
              <div className="text-xl font-bold text-white font-mono mt-1">
                {summary.selectionSets.unchangedCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION A: Clash Test Differences (Section 10) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0A1124]/90 backdrop-blur-xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <ListFilter className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Clash Test Differences</h4>
              <p className="text-xs text-slate-400">
                Detailed comparison per test definition ({filteredClashDiffs.length} shown)
              </p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-900/80 border border-white/[0.06] text-xs">
              {(['ALL', 'MODIFIED', 'NEW', 'REMOVED', 'UNCHANGED'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setClashFilter(status)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    clashFilter === status
                      ? 'bg-indigo-500/20 text-indigo-200 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative w-40">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search test..."
                value={clashSearch}
                onChange={(e) => setClashSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-2.5 py-1 bg-black/40 border border-white/[0.08] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/40"
              />
            </div>
          </div>
        </div>

        {/* Clash Test Difference Cards */}
        <div className="space-y-3">
          {filteredClashDiffs.map((diff) => {
            const isMod = diff.status === 'MODIFIED';
            const isNew = diff.status === 'NEW';
            const isRem = diff.status === 'REMOVED';
            const isUnch = diff.status === 'UNCHANGED';

            const activeTest = diff.newTest || diff.oldTest!;

            // Find specific changes for clean presentation
            const typeChange = diff.changes.find((c) => c.property === 'testType');
            const tolChange = diff.changes.find((c) => c.property === 'tolerance');
            const leftSetChange = diff.changes.find((c) => c.property === 'leftSetName');
            const rightSetChange = diff.changes.find((c) => c.property === 'rightSetName');

            return (
              <div
                key={diff.name}
                className={`p-4 rounded-xl border transition-all ${
                  isMod
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : isNew
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : isRem
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-black/30 border-white/[0.05]'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wide uppercase ${
                        isMod
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : isNew
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isRem
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-800 text-slate-400 border border-white/[0.08]'
                      }`}
                    >
                      {diff.status} CLASH TEST
                    </span>
                    <h5 className="text-sm font-bold text-white font-mono">{diff.name}</h5>
                  </div>

                  <span className="text-xs font-mono text-slate-400">
                    {isMod && <span className="text-amber-300 font-semibold">{diff.changes.length} change(s)</span>}
                    {isNew && <span className="text-emerald-400">Added to new XML</span>}
                    {isRem && <span className="text-rose-400">Removed in new XML</span>}
                    {isUnch && <span className="text-slate-500">Unchanged</span>}
                  </span>
                </div>

                {/* Property Breakdown Grid (Section 10 Requirement) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                  {/* 1. Clash Type */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Clash Type</span>
                    {typeChange ? (
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        <span className="text-rose-300 line-through text-[11px]">{typeChange.oldValue}</span>
                        <ArrowRight className="w-3 h-3 text-amber-400" />
                        <span className="text-emerald-300 font-bold">{typeChange.newValue}</span>
                      </div>
                    ) : (
                      <div className="text-slate-300 flex items-center justify-between">
                        <span className="capitalize">{activeTest.testType}</span>
                        {isMod && <span className="text-[10px] text-slate-500 font-mono">Unchanged</span>}
                      </div>
                    )}
                  </div>

                  {/* 2. Tolerance */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Tolerance</span>
                    {tolChange ? (
                      <div className="flex items-center gap-1.5 font-mono text-white">
                        <span className="text-rose-300 line-through text-[11px]">{tolChange.oldValue}</span>
                        <ArrowRight className="w-3 h-3 text-amber-400" />
                        <span className="text-emerald-300 font-bold">{tolChange.newValue}</span>
                      </div>
                    ) : (
                      <div className="text-slate-300 font-mono flex items-center justify-between">
                        <span>{activeTest.toleranceFormatted} m</span>
                        {isMod && <span className="text-[10px] text-slate-500 font-mono">Unchanged</span>}
                      </div>
                    )}
                  </div>

                  {/* 3. Left Selection Set */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Left Search Set</span>
                    {leftSetChange ? (
                      <div className="flex items-center gap-1.5 text-white">
                        <span className="text-rose-300 line-through text-[11px]">{leftSetChange.oldValue}</span>
                        <ArrowRight className="w-3 h-3 text-amber-400" />
                        <span className="text-emerald-300 font-bold">{leftSetChange.newValue}</span>
                      </div>
                    ) : (
                      <div className="text-slate-300 flex items-center justify-between truncate" title={activeTest.left.locator}>
                        <span className="truncate">{activeTest.left.selectionSetName || activeTest.left.locator}</span>
                        {isMod && <span className="text-[10px] text-slate-500 font-mono ml-1">Unchanged</span>}
                      </div>
                    )}
                  </div>

                  {/* 4. Right Selection Set */}
                  <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.04]">
                    <span className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Right Search Set</span>
                    {rightSetChange ? (
                      <div className="flex items-center gap-1.5 text-white">
                        <span className="text-rose-300 line-through text-[11px]">{rightSetChange.oldValue}</span>
                        <ArrowRight className="w-3 h-3 text-amber-400" />
                        <span className="text-emerald-300 font-bold">{rightSetChange.newValue}</span>
                      </div>
                    ) : (
                      <div className="text-slate-300 flex items-center justify-between truncate" title={activeTest.right.locator}>
                        <span className="truncate">{activeTest.right.selectionSetName || activeTest.right.locator}</span>
                        {isMod && <span className="text-[10px] text-slate-500 font-mono ml-1">Unchanged</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredClashDiffs.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              No clash tests match the active filter ({clashFilter})
            </div>
          )}
        </div>
      </div>

      {/* SECTION B: Selection Set Differences */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0A1124]/90 backdrop-blur-xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
              <FolderTree className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Selection Set Differences</h4>
              <p className="text-xs text-slate-400">
                FindSpec condition and query logic comparison ({filteredSetDiffs.length} shown)
              </p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-900/80 border border-white/[0.06] text-xs">
              {(['ALL', 'MODIFIED', 'NEW', 'REMOVED', 'UNCHANGED'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setSearchSetFilter(status)}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    searchSetFilter === status
                      ? 'bg-cyan-500/20 text-cyan-200 shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="relative w-40">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search set..."
                value={searchSetSearch}
                onChange={(e) => setSearchSetSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-2.5 py-1 bg-black/40 border border-white/[0.08] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/40"
              />
            </div>
          </div>
        </div>

        {/* Selection Set Difference Cards */}
        <div className="space-y-3">
          {filteredSetDiffs.map((diff) => {
            const isMod = diff.status === 'MODIFIED';
            const isNew = diff.status === 'NEW';
            const isRem = diff.status === 'REMOVED';
            const isUnch = diff.status === 'UNCHANGED';

            const activeSet = diff.newSet || diff.oldSet!;

            return (
              <div
                key={`${diff.folderName}_${diff.name}`}
                className={`p-4 rounded-xl border transition-all ${
                  isMod
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : isNew
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : isRem
                    ? 'bg-rose-950/20 border-rose-500/40'
                    : 'bg-black/30 border-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wide uppercase ${
                        isMod
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : isNew
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isRem
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-slate-800 text-slate-400 border border-white/[0.08]'
                      }`}
                    >
                      {diff.status} SET
                    </span>
                    <h5 className="text-sm font-bold text-cyan-300 font-mono">{diff.name}</h5>
                    <span className="text-xs text-slate-400">Folder: {diff.folderName || '(root)'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {diff.guidChangedOnly && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-500/30" title="FindSpec conditions are identical; only the internal GUID regenerated.">
                        GUID Updated (Logical Unchanged)
                      </span>
                    )}
                    <span className="text-xs font-mono text-slate-500">
                      {activeSet.findSpec?.conditions?.length || 0} condition(s)
                    </span>
                  </div>
                </div>

                {/* Locator Info */}
                <div className="text-[11px] font-mono text-slate-400 mb-2">
                  Locator: <code className="text-slate-300">{diff.locator}</code>
                </div>

                {/* Show Condition Changes if modified */}
                {isMod && diff.conditionChanges.length > 0 && (
                  <div className="p-3 rounded-lg bg-black/40 border border-white/[0.04] space-y-1.5 text-xs">
                    <span className="text-[10px] text-amber-400 font-mono font-semibold uppercase block">
                      Condition Changes:
                    </span>
                    {diff.conditionChanges.map((c, i) => (
                      <div key={i} className="text-slate-300 text-[11px] space-y-0.5">
                        {c.categoryChanged && (
                          <div>
                            Category: <span className="line-through text-rose-300">{c.categoryChanged.old}</span> → <strong className="text-emerald-300">{c.categoryChanged.new}</strong>
                          </div>
                        )}
                        {c.propertyChanged && (
                          <div>
                            Property: <span className="line-through text-rose-300">{c.propertyChanged.old}</span> → <strong className="text-emerald-300">{c.propertyChanged.new}</strong>
                          </div>
                        )}
                        {c.valueChanged && (
                          <div>
                            Value: <span className="line-through text-rose-300">{c.valueChanged.old}</span> → <strong className="text-emerald-300">{c.valueChanged.new}</strong>
                          </div>
                        )}
                        {c.operatorChanged && (
                          <div>
                            Operator: <span className="line-through text-rose-300">{c.operatorChanged.old}</span> → <strong className="text-emerald-300">{c.operatorChanged.new}</strong>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {filteredSetDiffs.length === 0 && (
            <div className="py-8 text-center text-slate-500 text-xs">
              No selection sets match the filter ({searchSetFilter})
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
