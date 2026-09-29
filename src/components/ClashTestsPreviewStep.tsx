import React, { useState, useMemo } from 'react';
import {
  ListFilter,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  FileSpreadsheet,
  Download,
  Flame,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ClashTest, ClashMatrixSummary } from '../types/clashTest';
import { ViewFolder } from '../types/selectionSet';

interface ClashTestsPreviewStepProps {
  clashTests: ClashTest[];
  matrixSummary: ClashMatrixSummary;
  viewFolders: ViewFolder[];
  onPrev: () => void;
  onNext: () => void;
}

export const ClashTestsPreviewStep: React.FC<ClashTestsPreviewStepProps> = ({
  clashTests,
  matrixSummary,
  viewFolders,
  onPrev,
  onNext,
}) => {
  console.log('[C] Immediately before Step 6 renders:', {
    receivedCount: clashTests.length,
    firstTestName: clashTests[0]?.name,
    lastTestName: clashTests[clashTests.length - 1]?.name,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'hard' | 'clearance'>('all');
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [selfClashFilter, setSelfClashFilter] = useState<'all' | 'only' | 'exclude'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Filtered tests
  const filteredTests = useMemo(() => {
    return clashTests.filter((t) => {
      // Type filter
      if (typeFilter !== 'all' && t.testType !== typeFilter) return false;

      // Folder filter
      if (folderFilter !== 'all' && t.leftFolder !== folderFilter && t.rightFolder !== folderFilter) {
        return false;
      }

      // Self clash filter
      if (selfClashFilter === 'only' && !t.isSelfClash) return false;
      if (selfClashFilter === 'exclude' && t.isSelfClash) return false;

      // Search term
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          t.name.toLowerCase().includes(s) ||
          t.leftSelectionSet.toLowerCase().includes(s) ||
          t.rightSelectionSet.toLowerCase().includes(s) ||
          t.cellAddress.toLowerCase().includes(s) ||
          t.leftFolder.toLowerCase().includes(s) ||
          t.rightFolder.toLowerCase().includes(s)
        );
      }

      return true;
    });
  }, [clashTests, typeFilter, folderFilter, selfClashFilter, searchTerm]);

  console.log('[D] Immediately after Step 6 filtering:', {
    beforeCount: clashTests.length,
    afterCount: filteredTests.length,
    activeFilters: { typeFilter, folderFilter, selfClashFilter, searchTerm },
  });

  const totalPages = Math.ceil(filteredTests.length / pageSize) || 1;
  const paginatedTests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTests.slice(start, start + pageSize);
  }, [filteredTests, currentPage, pageSize]);

  console.log('[E] Immediately before the table map():', {
    finalCount: paginatedTests.length,
  });

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Phase 06 // Test Suite Inspection
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-1.5">
              <ListFilter className="w-6 h-6 text-cyan-400" />
              Step 6: Generated Clash Tests Table Preview
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Preview every generated Navisworks Clash Detective test before building the final XML.
              Tests are linked directly to left and right selection set locators.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="bg-[#050A15] px-4 py-2.5 rounded-xl border border-white/[0.08] text-xs">
              <span className="text-slate-400 font-mono">Total Clash Tests: </span>
              <span className="text-emerald-400 font-bold font-mono text-base ml-1.5 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                {clashTests.length.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0A101D]/70 backdrop-blur-xl p-5 rounded-2xl border border-white/[0.08] shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            id="input-search-clash-tests"
            placeholder="Search test names, sets, cells..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
          />
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">All Clash Types (Hard &amp; Clearance)</option>
            <option value="hard">Hard Clashes Only</option>
            <option value="clearance">Clearance Clashes Only</option>
          </select>
        </div>

        {/* Folder Filter */}
        <div>
          <select
            value={folderFilter}
            onChange={(e) => {
              setFolderFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">All View Folders</option>
            {viewFolders.map((f) => (
              <option key={f.name} value={f.name}>
                Folder: {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Self Clash Filter */}
        <div>
          <select
            value={selfClashFilter}
            onChange={(e) => {
              setSelfClashFilter(e.target.value as any);
              setCurrentPage(1);
            }}
            className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all cursor-pointer"
          >
            <option value="all">Include Self-Clashes</option>
            <option value="only">Self-Clashes Only</option>
            <option value="exclude">Exclude Self-Clashes</option>
          </select>
        </div>
      </div>

      {/* Tests Table */}
      <div className="bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden shadow-sm">
        <div className="px-6 py-3.5 border-b border-white/[0.08] bg-[#070D1B]/90 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200">
            Showing {filteredTests.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}–
            {Math.min(currentPage * pageSize, filteredTests.length)} of {filteredTests.length} tests
          </span>

          {/* Pagination Controls */}
          <div className="flex items-center space-x-2 text-xs">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="p-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-slate-400 font-mono px-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="p-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[520px] custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#050A15] text-slate-400 font-medium border-b border-white/[0.08] sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center font-mono">#</th>
                <th className="py-3 px-3.5 font-semibold text-cyan-300">Element A</th>
                <th className="py-3 px-3.5 font-semibold text-emerald-300">Element B</th>
                <th className="py-3 px-4 font-semibold text-slate-200">Clash Test Name</th>
                <th className="py-3 px-3.5 text-center">Type</th>
                <th className="py-3 px-3.5 text-right font-mono">XML Tolerance (m)</th>
                <th className="py-3 px-3.5">Left Selection Set</th>
                <th className="py-3 px-3.5">Right Selection Set</th>
                <th className="py-3 px-3.5 text-center font-mono">Cell</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-slate-300 font-mono">
              {paginatedTests.length > 0 ? (
                paginatedTests.map((t, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const isHard = t.testType === 'hard';

                  return (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 px-3.5 text-center text-slate-500 text-[11px]">
                        {globalIdx}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-cyan-400">
                        {t.leftGroup}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-emerald-400">
                        {t.rightGroup}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-100 font-mono flex items-center space-x-2">
                        <span>{t.name}</span>
                        {t.isSelfClash && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 font-sans">
                            self
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 text-center font-sans">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isHard
                              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                              : 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                          }`}
                        >
                          {t.testType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right text-cyan-300 font-mono text-[11px]">
                        {t.toleranceFormatted}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="text-cyan-300 font-medium">{t.leftSelectionSet}</span>
                        <span className="text-[10px] text-slate-500 font-sans ml-1">({t.leftFolder})</span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="text-emerald-300 font-medium">{t.rightSelectionSet}</span>
                        <span className="text-[10px] text-slate-500 font-sans ml-1">({t.rightFolder})</span>
                      </td>
                      <td className="py-2.5 px-3.5 text-center text-slate-400 text-[11px]">
                        {t.cellAddress}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 text-xs font-sans">
                    No clash tests match your active search and filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nav Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
        <button
          onClick={onPrev}
          id="btn-tests-prev"
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-sm font-medium border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Matrix Grid
        </button>

        <button
          onClick={onNext}
          id="btn-tests-next"
          type="button"
          className="inline-flex items-center px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer border border-cyan-300/30"
        >
          Run Full Project Validation
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};
