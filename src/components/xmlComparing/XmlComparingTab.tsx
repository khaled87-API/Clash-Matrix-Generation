import React, { useState, useMemo } from 'react';
import {
  NavisworksParsedDocument,
  CompleteDiffReport,
} from '../../xmlComparing/types';
import { parseNavisworksXml } from '../../xmlComparing/xmlParser';
import { generateDifferenceReport } from '../../xmlComparing/differenceReport';
import { SAMPLE_OLD_XML, SAMPLE_NEW_XML } from '../../xmlComparing/sampleXmlData';
import { XmlDocumentViewer } from './XmlDocumentViewer';
import { DifferenceReportSection } from './DifferenceReportSection';
import { FinalResultSection } from './FinalResultSection';
import {
  GitCompare,
  Layers,
  Sparkles,
  ArrowDown,
  RotateCcw,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';

export const XmlComparingTab: React.FC = () => {
  const [oldDoc, setOldDoc] = useState<NavisworksParsedDocument | null>(null);
  const [newDoc, setNewDoc] = useState<NavisworksParsedDocument | null>(null);

  // File upload handlers
  const handleOldFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseNavisworksXml(text, file.name);
      setOldDoc(parsed);
    };
    reader.readAsText(file);
  };

  const handleNewFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseNavisworksXml(text, file.name);
      setNewDoc(parsed);
    };
    reader.readAsText(file);
  };

  // Sample comparison loader for immediate verification
  const handleLoadSampleComparison = () => {
    const parsedOld = parseNavisworksXml(SAMPLE_OLD_XML, 'Highway_Clash_v1.xml');
    const parsedNew = parseNavisworksXml(SAMPLE_NEW_XML, 'Highway_Clash_v2_Updated.xml');
    setOldDoc(parsedOld);
    setNewDoc(parsedNew);
  };

  const handleReset = () => {
    setOldDoc(null);
    setNewDoc(null);
  };

  // Compute Difference Report when both documents are loaded
  const diffReport: CompleteDiffReport | null = useMemo(() => {
    if (!oldDoc || !newDoc) return null;
    return generateDifferenceReport(oldDoc, newDoc);
  }, [oldDoc, newDoc]);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Sample Action */}
      <div className="xml-comparing-banner rounded-2xl border border-white/[0.08] bg-[#0A1124]/90 backdrop-blur-xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-950/70 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.25)]">
            <GitCompare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">XML Comparing</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide uppercase bg-indigo-950/80 text-indigo-300 border border-indigo-500/30">
                Navisworks Clash Detective
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Compare OLD vs NEW Navisworks Exchange XML files, review semantic changes, and export updated deltas without duplicates.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handleLoadSampleComparison}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold text-cyan-200 bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/60 hover:text-white transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.2)]"
            title="Load sample OLD and NEW Navisworks XML files demonstrating New, Modified, Removed, and Unchanged tests"
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-cyan-400" />
            Load Sample Comparison
          </button>

          {(oldDoc || newDoc) && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-white/[0.06] transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* SECTIONS 1 & 2: Side-by-Side Dual Document Viewers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 1: OLD XML */}
        <div>
          <XmlDocumentViewer
            title="SECTION 1 — OLD XML"
            badgeLabel="OLD XML"
            badgeColor="amber"
            document={oldDoc}
            onFileUpload={handleOldFileUpload}
            onLoadSample={() => {
              const parsed = parseNavisworksXml(SAMPLE_OLD_XML, 'Highway_Clash_v1.xml');
              setOldDoc(parsed);
            }}
            sampleLabel="Load Sample Old"
          />
        </div>

        {/* SECTION 2: NEW XML */}
        <div>
          <XmlDocumentViewer
            title="SECTION 2 — NEW XML"
            badgeLabel="NEW XML"
            badgeColor="cyan"
            document={newDoc}
            onFileUpload={handleNewFileUpload}
            onLoadSample={() => {
              const parsed = parseNavisworksXml(SAMPLE_NEW_XML, 'Highway_Clash_v2_Updated.xml');
              setNewDoc(parsed);
            }}
            sampleLabel="Load Sample New"
          />
        </div>
      </div>

      {/* Guide notice when only one document is loaded */}
      {(!oldDoc || !newDoc) && (
        <div className="p-8 rounded-2xl border border-dashed border-white/[0.08] bg-black/20 text-center">
          <div className="max-w-md mx-auto space-y-2">
            <Layers className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-300">
              Upload Both XML Files to Generate Difference Report
            </h4>
            <p className="text-xs text-slate-400">
              Provide both the reference <strong>OLD XML</strong> and the updated <strong>NEW XML</strong> to run full semantic clash comparison and build the final export package.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 3: DIFFERENCE REPORT (Section 9 & 10) */}
      {diffReport && (
        <div className="pt-4">
          <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">
            <span>SECTION 3</span>
            <span>·</span>
            <span>DIFFERENCE REPORT</span>
          </div>
          <DifferenceReportSection report={diffReport} />
        </div>
      )}

      {/* SECTION 4: FINAL RESULT (Section 11, 12, 13, 14, 15) */}
      {diffReport && (
        <div className="pt-4">
          <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 uppercase tracking-wider mb-2">
            <span>SECTION 4</span>
            <span>·</span>
            <span>FINAL RESULT & EXPORT</span>
          </div>
          <FinalResultSection report={diffReport} />
        </div>
      )}
    </div>
  );
};
