import React, { useState } from 'react';
import {
  FolderTree,
  Folder,
  Layers,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Search,
  Code,
  Tag,
  Hash,
} from 'lucide-react';
import { ViewFolder, SelectionSet } from '../types/selectionSet';

interface SelectionSetsStepProps {
  viewFolders: ViewFolder[];
  selectionSets: SelectionSet[];
  onPrev: () => void;
  onNext: () => void;
}

export const SelectionSetsStep: React.FC<SelectionSetsStepProps> = ({
  viewFolders,
  selectionSets,
  onPrev,
  onNext,
}) => {
  const [selectedSetKey, setSelectedSetKey] = useState<string | null>(null);
  const selectedSet =
    (selectedSetKey
      ? selectionSets.find((s) => s.id === selectedSetKey || s.name === selectedSetKey)
      : null) ||
    selectionSets[0] ||
    null;
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    viewFolders.forEach((vf) => {
      init[vf.name] = true;
    });
    return init;
  });
  const [searchTerm, setSearchTerm] = useState('');

  const toggleFolder = (folderName: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const filteredFolders = viewFolders
    .map((vf) => {
      const filteredSets = vf.selectionSets.filter(
        (ss) =>
          ss.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ss.clashGroup.toLowerCase().includes(searchTerm.toLowerCase()) ||
          vf.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return {
        ...vf,
        selectionSets: filteredSets,
      };
    })
    .filter((vf) => vf.selectionSets.length > 0);

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                Phase 03 // Hierarchy &amp; Locators
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-1.5">
              <FolderTree className="w-6 h-6 text-cyan-400" />
              Step 3: View Folders &amp; Selection Sets Hierarchy
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              Selection Sets are generated for each Excel data row and organized cleanly by View Folder.
              Each set has a unique UUID v4 and a standard Navisworks tree locator path.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <div className="bg-[#050A15] px-3.5 py-2 rounded-xl border border-white/[0.08] shadow-inner">
              <span className="text-slate-400">Folders: </span>
              <span className="text-cyan-300 font-bold font-mono">{viewFolders.length}</span>
            </div>
            <div className="bg-[#050A15] px-3.5 py-2 rounded-xl border border-white/[0.08] shadow-inner">
              <span className="text-slate-400">Total Sets: </span>
              <span className="text-emerald-300 font-bold font-mono">{selectionSets.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Tree View on Left + Details Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Search & Folders Tree */}
        <div className="lg:col-span-5 bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-5 space-y-4 shadow-sm">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              id="input-search-selection-sets"
              placeholder="Search folders, sets, or groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
            />
          </div>

          <div className="max-h-[520px] overflow-y-auto space-y-2.5 pr-1">
            {filteredFolders.length > 0 ? (
              filteredFolders.map((folder) => {
                const isExpanded = expandedFolders[folder.name] !== false;
                return (
                  <div key={folder.name} className="border border-white/[0.08] rounded-xl overflow-hidden bg-[#050A15]/60">
                    {/* Folder Header */}
                    <button
                      type="button"
                      onClick={() => toggleFolder(folder.name)}
                      className="w-full px-3.5 py-2.5 bg-slate-900/60 hover:bg-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center space-x-2">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <Folder className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                        <span className="font-mono text-cyan-300 font-bold">{folder.name}</span>
                        <span className="text-slate-400 font-normal text-[11px]">
                          ({folder.selectionSets.length} sets)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {folder.guid.slice(0, 8)}...
                      </span>
                    </button>

                    {/* Selection Sets in Folder */}
                    {isExpanded && (
                      <div className="p-1.5 space-y-1 bg-black/20">
                        {folder.selectionSets.map((set) => {
                          const isSelected = selectedSet?.id === set.id;
                          return (
                            <button
                              key={set.id}
                              type="button"
                              onClick={() => setSelectedSetKey(set.id)}
                              className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-600/20 text-cyan-200 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-semibold'
                                  : 'text-slate-300 hover:bg-white/[0.05] hover:text-white border border-transparent'
                              }`}
                            >
                              <div className="flex items-center space-x-2 truncate">
                                <Layers className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                                <span className="font-mono truncate">{set.name}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono ml-2 flex-shrink-0">
                                Row {set.sourceRowIndex + 1}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs">
                No matching selection sets found.
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Selection Set Inspector */}
        <div className="lg:col-span-7 bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl border border-white/[0.08] p-6 space-y-5 shadow-sm">
          {selectedSet ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                <div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    ViewFolder: <strong className="text-cyan-300">{selectedSet.folder}</strong> • Excel Row: <strong className="text-slate-200">{selectedSet.sourceRowIndex + 1}</strong>
                  </span>
                  <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2 mt-0.5">
                    {selectedSet.name}
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-lg bg-[#050A15] text-cyan-400 border border-cyan-500/30 text-xs font-mono font-semibold shadow-[0_0_10px_rgba(6,182,212,0.15)]">
                  Group: {selectedSet.clashGroup}
                </span>
              </div>

              {/* Metadata Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-[#050A15]/80 p-3.5 rounded-xl border border-white/[0.08] space-y-1">
                  <div className="text-slate-400 flex items-center gap-1.5 font-medium text-[11px]">
                    <Hash className="w-3.5 h-3.5 text-cyan-400" />
                    Generated Navisworks GUID:
                  </div>
                  <div className="font-mono text-cyan-300 text-[11px] break-all bg-black/40 p-2 rounded-lg border border-white/[0.06]">
                    {selectedSet.guid}
                  </div>
                </div>

                <div className="bg-[#050A15]/80 p-3.5 rounded-xl border border-white/[0.08] space-y-1">
                  <div className="text-slate-400 flex items-center gap-1.5 font-medium text-[11px]">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    Navisworks Locator Path:
                  </div>
                  <div className="font-mono text-emerald-300 text-[11px] break-all bg-black/40 p-2 rounded-lg border border-white/[0.06]">
                    {selectedSet.locator}
                  </div>
                </div>
              </div>

              {/* Conditions List */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>Compiled FindSpec Search Conditions ({selectedSet.conditions.length})</span>
                  <span className="text-[11px] text-slate-400 font-mono font-normal lowercase bg-white/[0.05] px-2 py-0.5 rounded">mode=&quot;all&quot;</span>
                </h4>

                {selectedSet.conditions.length > 0 ? (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {selectedSet.conditions.map((cond, idx) => (
                      <div
                        key={idx}
                        className="bg-[#050A15]/80 p-3.5 rounded-xl border border-white/[0.08] text-xs space-y-2 hover:border-cyan-500/30 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-md bg-cyan-950/60 text-cyan-300 font-medium text-[11px] border border-cyan-500/30 font-mono">
                            Category: {cond.categoryName} ({cond.categoryInternal})
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            flags=&quot;{cond.flags}&quot;
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1">
                          <div>
                            <span className="text-slate-500 text-[11px]">Property: </span>
                            <span className="font-mono text-slate-100 font-medium">{cond.propertyName}</span>
                            <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                              internal: {cond.propertyInternal}
                            </div>
                          </div>

                          <div>
                            <span className="text-slate-500 text-[11px]">Condition: </span>
                            <span className="text-amber-300 font-mono">test=&quot;{cond.test}&quot;</span>
                            <div className="font-mono text-emerald-300 font-semibold mt-0.5">
                              value=&quot;{cond.value}&quot;
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs bg-[#050A15] rounded-xl border border-white/[0.06]">
                    No active conditions for this selection set. Configure condition rules in Step 4.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm">
              Select a selection set on the left to inspect its details.
            </div>
          )}
        </div>
      </div>

      {/* Nav Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
        <button
          onClick={onPrev}
          id="btn-sets-prev"
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-sm font-medium border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Column Mapping
        </button>

        <button
          onClick={onNext}
          id="btn-sets-next"
          type="button"
          className="inline-flex items-center px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer border border-cyan-300/30"
        >
          Configure Search Conditions
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};
