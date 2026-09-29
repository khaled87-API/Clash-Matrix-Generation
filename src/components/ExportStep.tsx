import React, { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  Code2,
  FileCode,
  FileSpreadsheet,
  Settings,
  ArrowLeft,
  BookOpen,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';
import { ProjectSettings, ExportMode } from '../types/configuration';
import { ViewFolder } from '../types/selectionSet';
import { ClashTest } from '../types/clashTest';
import { buildNavisworksXml } from '../xml/navisworksXmlBuilder';

interface ExportStepProps {
  projectSettings: ProjectSettings;
  viewFolders: ViewFolder[];
  clashTests: ClashTest[];
  exportMode: ExportMode;
  onUpdateProjectSettings: (settings: Partial<ProjectSettings>) => void;
  onUpdateExportMode: (mode: ExportMode) => void;
  onPrev: () => void;
}

export const ExportStep: React.FC<ExportStepProps> = ({
  projectSettings,
  viewFolders,
  clashTests,
  exportMode,
  onUpdateProjectSettings,
  onUpdateExportMode,
  onPrev,
}) => {
  const [copied, setCopied] = useState(false);
  const [xmlSearch, setXmlSearch] = useState('');

  // Generate XML content based on settings and mode
  const xmlContent = useMemo(() => {
    return buildNavisworksXml(projectSettings, viewFolders, clashTests, exportMode);
  }, [projectSettings, viewFolders, clashTests, exportMode]);

  const xmlLines = useMemo(() => {
    return xmlContent.split('\n');
  }, [xmlContent]);

  const filteredXmlLines = useMemo(() => {
    if (!xmlSearch) return xmlLines.map((line, idx) => ({ num: idx + 1, text: line }));
    return xmlLines
      .map((line, idx) => ({ num: idx + 1, text: line }))
      .filter((item) => item.text.toLowerCase().includes(xmlSearch.toLowerCase()));
  }, [xmlLines, xmlSearch]);

  const handleDownloadXml = () => {
    const cleanProjectName = (projectSettings.batchTestName || 'Project11').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanProjectName}_ClashTests.xml`;

    const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = async () => {
    try {
      await navigator.clipboard.writeText(xmlContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
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
                Phase 08 // Final Payload &amp; Deployment
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-1.5">
              <Download className="w-6 h-6 text-cyan-400" />
              Step 8: Export Autodesk Navisworks Clash Detective XML
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              XML Well-Formed and Navisworks Structure Validated Against Reference.
              Ready for import into Autodesk Navisworks Manage Clash Detective.
            </p>
          </div>

          {/* Quick Action Button */}
          <button
            type="button"
            onClick={handleDownloadXml}
            id="btn-download-xml-primary"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all cursor-pointer whitespace-nowrap self-start md:self-auto border border-cyan-300/30"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Navisworks XML
          </button>
        </div>
      </div>

      {/* Project & BatchTest Configuration Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-[#0A101D]/70 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08] shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-white/[0.08] pb-3">
              <Settings className="w-4 h-4 text-cyan-400" />
              BatchTest &amp; XML Settings
            </h3>

            {/* Batch Test Name */}
            <div>
              <label htmlFor="input-batch-test-name" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Batch Test Name
              </label>
              <input
                type="text"
                id="input-batch-test-name"
                value={projectSettings.batchTestName}
                onChange={(e) => onUpdateProjectSettings({ batchTestName: e.target.value })}
                placeholder="e.g. Project11"
                className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
              />
            </div>

            {/* Internal Name */}
            <div>
              <label htmlFor="input-internal-name" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Internal Name
              </label>
              <input
                type="text"
                id="input-internal-name"
                value={projectSettings.internalName}
                onChange={(e) => onUpdateProjectSettings({ internalName: e.target.value })}
                placeholder="e.g. Project11"
                className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
              />
            </div>

            {/* Units */}
            <div>
              <label htmlFor="select-xml-units" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Navisworks Exchange Units
              </label>
              <select
                id="select-xml-units"
                value={projectSettings.units}
                onChange={(e) => onUpdateProjectSettings({ units: e.target.value as any })}
                className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all cursor-pointer"
              >
                <option value="m">Meters (m) — Standard Navisworks</option>
                <option value="mm">Millimeters (mm)</option>
                <option value="ft">Feet (ft)</option>
                <option value="in">Inches (in)</option>
              </select>
            </div>

            {/* Export Mode */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Export Mode
              </label>
              <div className="space-y-2 bg-[#050A15] p-3 rounded-xl border border-white/[0.08]">
                <label className="flex items-center space-x-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="export-mode"
                    value="full"
                    checked={exportMode === 'full'}
                    onChange={() => onUpdateExportMode('full')}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Complete Navisworks XML (Sets + Tests)</span>
                </label>
                <label className="flex items-center space-x-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="export-mode"
                    value="selectionSetsOnly"
                    checked={exportMode === 'selectionSetsOnly'}
                    onChange={() => onUpdateExportMode('selectionSetsOnly')}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Selection Sets Only</span>
                </label>
                <label className="flex items-center space-x-2.5 text-xs text-slate-200 cursor-pointer">
                  <input
                    type="radio"
                    name="export-mode"
                    value="clashTestsOnly"
                    checked={exportMode === 'clashTestsOnly'}
                    onChange={() => onUpdateExportMode('clashTestsOnly')}
                    className="accent-cyan-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Clash Tests Only</span>
                </label>
              </div>
            </div>
          </div>

          {/* Navisworks Import Guide */}
          <div className="bg-[#0A101D]/70 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08] shadow-sm space-y-3.5">
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              How to Import in Autodesk Navisworks
            </h3>
            <ol className="text-xs text-slate-300 space-y-2.5 list-decimal list-inside leading-relaxed">
              <li>Open your project model in <strong>Autodesk Navisworks Manage</strong>.</li>
              <li>Open the <strong>Clash Detective</strong> tool from the ribbon (Home tab).</li>
              <li>Click the <strong>Import/Export</strong> button at the bottom left of Clash Detective.</li>
              <li>Select <strong>Import Clash Tests</strong> and choose this downloaded <code className="text-cyan-300 font-mono bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">.xml</code> file.</li>
              <li>All Selection Sets and Clash Tests will be populated automatically with correct tolerances and locators.</li>
            </ol>
          </div>
        </div>

        {/* Right: Live Formatted XML Viewer */}
        <div className="lg:col-span-8 space-y-3">
          <div className="bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden shadow-sm flex flex-col h-[600px]">
            {/* Viewer Header */}
            <div className="px-5 py-3.5 border-b border-white/[0.08] bg-[#070D1B]/90 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FileCode className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200 font-mono">
                  {projectSettings.batchTestName || 'Project11'}_ClashTests.xml
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({xmlLines.length.toLocaleString()} lines)
                </span>
              </div>

              <div className="flex items-center space-x-2.5">
                {/* Search in XML */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    id="input-search-xml"
                    placeholder="Search XML..."
                    value={xmlSearch}
                    onChange={(e) => setXmlSearch(e.target.value)}
                    className="bg-[#050A15] border border-white/[0.12] rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none w-40 transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCopyClipboard}
                  id="btn-copy-xml"
                  className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-slate-200 border border-white/10 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1 text-cyan-400" />
                      Copy XML
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* XML Lines View */}
            <div className="flex-1 bg-[#050A15]/90 overflow-auto font-mono text-[11px] p-4 text-slate-300 select-text leading-5 custom-scrollbar">
              {filteredXmlLines.slice(0, 1500).map((item) => (
                <div key={item.num} className="flex hover:bg-white/[0.03] transition-colors">
                  <span className="w-12 text-slate-600 select-none text-right pr-3.5 flex-shrink-0">
                    {item.num}
                  </span>
                  <span className="whitespace-pre">{item.text}</span>
                </div>
              ))}
              {filteredXmlLines.length > 1500 && (
                <div className="py-2.5 text-center text-slate-500 text-xs italic">
                  ... ({filteredXmlLines.length - 1500} more lines truncated in preview — full content included in download) ...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nav Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
        <button
          onClick={onPrev}
          id="btn-export-prev"
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-sm font-medium border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Validation
        </button>

        <button
          onClick={handleDownloadXml}
          id="btn-download-xml-bottom"
          type="button"
          className="inline-flex items-center px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer border border-emerald-300/30"
        >
          <Download className="w-4 h-4 mr-2" />
          Download Navisworks XML
        </button>
      </div>
    </div>
  );
};
