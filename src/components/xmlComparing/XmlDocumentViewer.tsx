import React, { useState } from 'react';
import {
  NavisworksParsedDocument,
  NavisworksClashTest,
  NavisworksSelectionSet,
} from '../../xmlComparing/types';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  ListFilter,
  Eye,
  Search,
  Code2,
  X,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface XmlDocumentViewerProps {
  title: string;
  badgeLabel: string;
  badgeColor: 'amber' | 'cyan';
  document: NavisworksParsedDocument | null;
  onFileUpload: (file: File) => void;
  onLoadSample?: () => void;
  sampleLabel?: string;
  isDragging?: boolean;
}

export const XmlDocumentViewer: React.FC<XmlDocumentViewerProps> = ({
  title,
  badgeLabel,
  badgeColor,
  document,
  onFileUpload,
  onLoadSample,
  sampleLabel,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'clashTests' | 'selectionSets' | 'rawXml'>('clashTests');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClashTest, setSelectedClashTest] = useState<NavisworksClashTest | null>(null);
  const [selectedSelectionSet, setSelectedSelectionSet] = useState<NavisworksSelectionSet | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  // Filtered lists
  const filteredClashTests = (document?.clashTests || []).filter((ct) =>
    ct.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ct.testType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ct.left.locator.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ct.right.locator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSelectionSets = (document?.selectionSets || []).filter((ss) =>
    ss.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ss.folderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ss.locator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="xml-document-viewer rounded-2xl border border-white/[0.08] bg-[#0A1124]/90 backdrop-blur-xl p-5 sm:p-6 shadow-xl flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4 mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
              badgeColor === 'amber'
                ? 'bg-amber-950/60 border border-amber-500/30 text-amber-300'
                : 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-300'
            }`}
          >
            {badgeLabel}
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {title}
              {document && document.isValid && (
                <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Valid Navisworks XML
                </span>
              )}
              {document && !document.isValid && (
                <span className="inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/30">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Invalid XML
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {document ? `${document.fileName} (${(document.fileSizeBytes / 1024).toFixed(1)} KB)` : 'No XML loaded yet'}
            </p>
          </div>
        </div>

        {/* Upload Button */}
        <div className="flex items-center gap-2">
          {onLoadSample && !document && (
            <button
              type="button"
              onClick={onLoadSample}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-indigo-500/30 text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/60 transition-all cursor-pointer"
            >
              {sampleLabel || 'Load Sample'}
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xml"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer shadow-sm ${
              badgeColor === 'amber'
                ? 'bg-amber-950/40 border-amber-500/30 text-amber-200 hover:bg-amber-900/60'
                : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200 hover:bg-cyan-900/60'
            }`}
          >
            {document ? 'Replace XML' : `Browse ${badgeLabel}`}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {!document ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex-1 min-h-[260px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-950/20'
              : 'border-white/[0.08] hover:border-slate-600 bg-black/20 hover:bg-black/30'
          }`}
        >
          <FileSpreadsheet className="w-10 h-10 text-slate-500 mb-3" />
          <p className="text-sm font-semibold text-slate-200">
            Click or drop {badgeLabel} (.xml) here
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Standard Autodesk Navisworks Clash Detective Exchange XML
          </p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="p-2 rounded-lg bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Clash Tests</span>
              <span className="text-base font-bold text-white font-mono">{document.clashTests.length}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Selection Sets</span>
              <span className="text-base font-bold text-cyan-300 font-mono">{document.selectionSets.length}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/60 border border-white/[0.06]">
              <span className="text-[10px] text-slate-400 uppercase font-mono block">View Folders</span>
              <span className="text-base font-bold text-amber-300 font-mono">{document.viewFolders.length}</span>
            </div>
          </div>

          {/* Subtabs and Search Bar */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center space-x-1 p-0.5 rounded-lg bg-slate-900/80 border border-white/[0.06] text-xs">
              <button
                type="button"
                onClick={() => setActiveSubTab('clashTests')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeSubTab === 'clashTests'
                    ? 'bg-cyan-500/20 text-cyan-200 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Clash Tests ({document.clashTests.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('selectionSets')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeSubTab === 'selectionSets'
                    ? 'bg-cyan-500/20 text-cyan-200 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Selection Sets ({document.selectionSets.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('rawXml')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  activeSubTab === 'rawXml'
                    ? 'bg-cyan-500/20 text-cyan-200 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Raw XML
              </button>
            </div>

            {activeSubTab !== 'rawXml' && (
              <div className="relative w-36 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-xs pl-8 pr-2.5 py-1 bg-black/40 border border-white/[0.08] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            )}
          </div>

          {/* Subtab Content: Clash Tests Table */}
          {activeSubTab === 'clashTests' && (
            <div className="flex-1 overflow-y-auto max-h-[360px] border border-white/[0.06] rounded-xl bg-black/30">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050B17] text-[11px] font-mono text-slate-400 sticky top-0 border-b border-white/[0.08] z-10">
                  <tr>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2">Tolerance</th>
                    <th className="py-2 px-2 hidden sm:table-cell">Left Set</th>
                    <th className="py-2 px-2 hidden sm:table-cell">Right Set</th>
                    <th className="py-2 px-2 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredClashTests.map((ct) => (
                    <tr
                      key={ct.id}
                      onClick={() => setSelectedClashTest(ct)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <td className="py-2 px-3 font-semibold text-white whitespace-nowrap">
                        {ct.name}
                      </td>
                      <td className="py-2 px-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium uppercase ${
                            ct.testType === 'hard'
                              ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {ct.testType}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-mono text-slate-300 text-[11px]">
                        {ct.toleranceFormatted} m
                      </td>
                      <td className="py-2 px-2 text-slate-400 hidden sm:table-cell truncate max-w-[120px]" title={ct.left.locator}>
                        {ct.left.selectionSetName || ct.left.folder}
                      </td>
                      <td className="py-2 px-2 text-slate-400 hidden sm:table-cell truncate max-w-[120px]" title={ct.right.locator}>
                        {ct.right.selectionSetName || ct.right.folder}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-3.5 h-3.5 inline" />
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredClashTests.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No clash tests match the search filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Subtab Content: Selection Sets Table */}
          {activeSubTab === 'selectionSets' && (
            <div className="flex-1 overflow-y-auto max-h-[360px] border border-white/[0.06] rounded-xl bg-black/30">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050B17] text-[11px] font-mono text-slate-400 sticky top-0 border-b border-white/[0.08] z-10">
                  <tr>
                    <th className="py-2 px-3">Set Name</th>
                    <th className="py-2 px-2">Folder</th>
                    <th className="py-2 px-2">Conditions</th>
                    <th className="py-2 px-2 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredSelectionSets.map((ss, idx) => (
                    <tr
                      key={`${ss.folderName}_${ss.name}_${idx}`}
                      onClick={() => setSelectedSelectionSet(ss)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <td className="py-2 px-3 font-semibold text-cyan-300">
                        {ss.name}
                      </td>
                      <td className="py-2 px-2 text-slate-400 font-mono text-[11px]">
                        {ss.folderName || '(root)'}
                      </td>
                      <td className="py-2 px-2 text-slate-300 text-[11px]">
                        {ss.findSpec?.conditions?.length || 0} rule(s)
                      </td>
                      <td className="py-2 px-2 text-right">
                        <span className="text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity">
                          <Eye className="w-3.5 h-3.5 inline" />
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredSelectionSets.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No selection sets match the filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Subtab Content: Raw XML */}
          {activeSubTab === 'rawXml' && (
            <div className="flex-1 overflow-y-auto max-h-[360px] border border-white/[0.06] rounded-xl bg-[#030712] p-3">
              <pre className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap break-all">
                {document.rawXml.slice(0, 4000)}
                {document.rawXml.length > 4000 ? '\n\n... [truncated preview for performance]' : ''}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Clash Test Detail Modal */}
      {selectedClashTest && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#0D152D] border border-white/[0.1] rounded-2xl p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setSelectedClashTest(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                <ListFilter className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">{selectedClashTest.name}</h4>
                <p className="text-xs text-slate-400">Detailed Clash Test Definition</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-black/30 border border-white/[0.06]">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Clash Type</span>
                  <span className="font-semibold text-white uppercase">{selectedClashTest.testType}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-mono block">Tolerance (Meters)</span>
                  <span className="font-mono text-cyan-300 font-semibold">{selectedClashTest.toleranceFormatted} m</span>
                </div>
              </div>

              {/* Left Search Set */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <span className="text-slate-400 text-[10px] uppercase font-mono block mb-1">LEFT SEARCH SET</span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Folder:</span>
                    <span className="font-semibold text-slate-200">{selectedClashTest.left.folder || '(root)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Set Name:</span>
                    <span className="font-semibold text-cyan-300">{selectedClashTest.left.selectionSetName}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 bg-black/40 p-1.5 rounded">
                    <span>Locator:</span>
                    <span className="text-slate-300 truncate max-w-[320px]">{selectedClashTest.left.locator}</span>
                  </div>
                </div>
              </div>

              {/* Right Search Set */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06]">
                <span className="text-slate-400 text-[10px] uppercase font-mono block mb-1">RIGHT SEARCH SET</span>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Folder:</span>
                    <span className="font-semibold text-slate-200">{selectedClashTest.right.folder || '(root)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Set Name:</span>
                    <span className="font-semibold text-cyan-300">{selectedClashTest.right.selectionSetName}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 bg-black/40 p-1.5 rounded">
                    <span>Locator:</span>
                    <span className="text-slate-300 truncate max-w-[320px]">{selectedClashTest.right.locator}</span>
                  </div>
                </div>
              </div>

              {/* XML Snippet */}
              {selectedClashTest.rawXmlSnippet && (
                <div className="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block mb-1">XML FRAGMENT</span>
                  <pre className="text-[10px] font-mono text-slate-300 overflow-x-auto p-2 bg-[#050B17] rounded">
                    {selectedClashTest.rawXmlSnippet}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={() => setSelectedClashTest(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selection Set Detail Modal */}
      {selectedSelectionSet && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#0D152D] border border-white/[0.1] rounded-2xl p-6 shadow-2xl relative max-h-[85vh] flex flex-col">
            <button
              type="button"
              onClick={() => setSelectedSelectionSet(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                <FolderTree className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">{selectedSelectionSet.name}</h4>
                <p className="text-xs text-slate-400">
                  Folder: {selectedSelectionSet.folderName || '(root)'} | GUID: {selectedSelectionSet.guid}
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs pr-1">
              <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06]">
                <span className="text-slate-400 text-[10px] uppercase font-mono block mb-1">LOCATOR</span>
                <code className="text-cyan-300 font-mono text-[11px] block">{selectedSelectionSet.locator}</code>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-mono block mb-2">
                  FINDSPEC CONDITIONS ({selectedSelectionSet.findSpec?.conditions?.length || 0})
                </span>
                <div className="space-y-2">
                  {(selectedSelectionSet.findSpec?.conditions || []).map((c, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-white">Rule {i + 1}</span>
                        <span className="text-cyan-300 uppercase font-mono text-[10px]">{c.test} (flags: {c.flags})</span>
                      </div>
                      <div className="text-slate-400 text-[11px] grid grid-cols-2 gap-1 pt-1 border-t border-white/[0.04]">
                        <div>Category: <strong className="text-slate-200">{c.category.displayName}</strong></div>
                        <div>Property: <strong className="text-slate-200">{c.property.displayName}</strong></div>
                        <div className="col-span-2">Value ({c.value.dataType}): <strong className="text-emerald-300">{c.value.value}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 text-right pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setSelectedSelectionSet(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
