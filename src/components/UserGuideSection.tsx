import React, { useState } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Columns,
  FolderTree,
  Filter,
  Grid,
  FileCheck,
  ShieldCheck,
  Download,
  GitCompare,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';

interface UserGuideSectionProps {
  activeTab?: 'matrix' | 'comparing';
  hardPrefix?: string;
  clearancePrefix?: string;
  unit?: string;
}

export const UserGuideSection: React.FC<UserGuideSectionProps> = ({
  activeTab = 'matrix',
  hardPrefix = 'H',
  clearancePrefix = 'C',
  unit = 'MM',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<'all' | 'tab1' | 'tab2' | 'legend'>('all');

  return (
    <div className="w-full mt-10 rounded-2xl border border-white/[0.08] bg-[#0A101D]/80 backdrop-blur-xl shadow-2xl overflow-hidden transition-all">
      {/* Header / Accordion Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-[#070D1B]/90 hover:bg-white/[0.02] border-b border-white/[0.06] transition-colors cursor-pointer text-left"
        id="btn-toggle-user-guide"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                User Guide &amp; Legend
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
                Reference
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Workflow walkthrough for Clash Matrix XML Generation (Tab 1), XML Comparing (Tab 2), and BIM standards legend
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <span className="hidden sm:inline font-mono text-[11px]">
            {isOpen ? 'Click to Collapse' : 'Click to Expand'}
          </span>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-cyan-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="p-6 sm:p-8 space-y-8 bg-[#050A15]/60 text-xs">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap pb-4 border-b border-white/[0.06]">
            <button
              type="button"
              onClick={() => setSelectedTopic('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedTopic === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Topics
            </button>
            <button
              type="button"
              onClick={() => setSelectedTopic('tab1')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedTopic === 'tab1'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Tab 1 — Clash Matrix XML
            </button>
            <button
              type="button"
              onClick={() => setSelectedTopic('tab2')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedTopic === 'tab2'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Tab 2 — XML Comparing
            </button>
            <button
              type="button"
              onClick={() => setSelectedTopic('legend')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                selectedTopic === 'legend'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'bg-slate-800/70 text-slate-300 hover:bg-slate-700'
              }`}
            >
              General Legend &amp; Flags
            </button>
          </div>

          {/* TAB 1: CLASH MATRIX XML GENERATION */}
          {(selectedTopic === 'all' || selectedTopic === 'tab1') && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-cyan-400">
                <FileSpreadsheet className="w-4 h-4" />
                <h4 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                  TAB 1 — Clash Matrix XML Generation (8-Step Workflow)
                </h4>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Create verified Autodesk Navisworks Clash Detective Exchange XML packages directly from an Excel clash matrix.
                Follow the 8 sequential steps below:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                {/* Step 1 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-[10px] font-mono flex items-center justify-center">1</span>
                    <span>Upload Excel</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Upload your Clash Matrix workbook (.xlsx or .xls). The sheet viewer displays a raw grid preview and sheet selector.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-[10px] font-mono flex items-center justify-center">2</span>
                    <span>Map Columns</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Select which Excel columns represent Folder, Priority, Element ID, and Group fields used for naming and grouping.
                  </p>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-[10px] font-mono flex items-center justify-center">3</span>
                    <span>Selection Sets</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Configure folder grouping and set naming rules (e.g. <code>A-HW0010</code>). Preview generated Selection Sets live.
                  </p>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-[10px] font-mono flex items-center justify-center">4</span>
                    <span>Conditions (FindSpec)</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Configure category, property, test, and flags. Use <strong>Standard BIM Rule</strong> (Element → Category) or add custom rules.
                  </p>
                </div>

                {/* Step 5 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-[10px] font-mono flex items-center justify-center">5</span>
                    <span>Clash Matrix</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Configure matrix layout coordinates: Row Element ID, Header Row, Data Start Row &amp; Column. Settings are 100% authoritative.
                  </p>
                </div>

                {/* Step 6 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-[10px] font-mono flex items-center justify-center">6</span>
                    <span>Clash Tests</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Inspect parsed clash test pairs. Verifies Left and Right locators, clash types (Hard/Clearance), and tolerance values.
                  </p>
                </div>

                {/* Step 7 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-[10px] font-mono flex items-center justify-center">7</span>
                    <span>Validation</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Safety verification checking for duplicate names, unresolved locators, and Autodesk nw-exchange-12.0 schema conformity.
                  </p>
                </div>

                {/* Step 8 */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center space-x-2 text-cyan-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-[10px] font-mono flex items-center justify-center">8</span>
                    <span>Export XML</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Download the complete Navisworks Exchange XML package ready for immediate import into Autodesk Navisworks Clash Detective.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: XML COMPARING */}
          {(selectedTopic === 'all' || selectedTopic === 'tab2') && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-emerald-400">
                <GitCompare className="w-4 h-4" />
                <h4 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                  TAB 2 — XML Comparing (Delta Difference Engine)
                </h4>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Compare baseline and updated Navisworks Exchange XML documents. Identifies semantic clash test revisions,
                tracks Search Set condition changes independently of GUID regeneration, and builds a clean <strong>Delta XML</strong> package.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                {/* 1. OLD XML */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[10px] font-mono flex items-center justify-center">1</span>
                    <span>OLD XML Document</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Upload the baseline Navisworks XML already imported in your project or load sample baseline data for testing.
                  </p>
                </div>

                {/* 2. NEW XML */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[10px] font-mono flex items-center justify-center">2</span>
                    <span>NEW XML Document</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Upload the newly generated or modified Navisworks XML to evaluate additions, deletions, and property revisions.
                  </p>
                </div>

                {/* 3. DIFFERENCE REPORT */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[10px] font-mono flex items-center justify-center">3</span>
                    <span>Difference Report</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Audits New, Modified, Removed, and Unchanged Clash Tests, alongside Search Set condition logic vs GUID-only regenerations.
                  </p>
                </div>

                {/* 4. FINAL RESULT (Delta Package) */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-[10px] font-mono flex items-center justify-center">4</span>
                    <span>Final Result (Delta Only)</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Packages ONLY New/Modified Clash Tests and their required Search Sets. Omits unchanged sets to prevent duplicate sets in Navisworks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* GENERAL LEGEND & STANDARDS */}
          {(selectedTopic === 'all' || selectedTopic === 'legend') && (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-amber-400">
                <Info className="w-4 h-4" />
                <h4 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                  General Legend &amp; Navisworks Standards
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Conditions Legend */}
                <div className="p-4 rounded-xl bg-[#070D1B] border border-white/[0.08] space-y-3">
                  <h5 className="font-semibold text-cyan-300 font-mono text-[11px] uppercase tracking-wider">
                    Conditions Flags Legend
                  </h5>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-black/40 border border-cyan-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-cyan-300">10 → AND</span>
                        <span className="text-[10px] text-cyan-400 font-mono">Flags: 10</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-snug">
                        All conditions must be satisfied. Every element in the set must match this criteria in conjunction with others.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/40 border border-purple-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-purple-300">74 → OR</span>
                        <span className="text-[10px] text-purple-400 font-mono">Flags: 74</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-snug">
                        Any condition in the logical OR branch can be satisfied. Ideal for multi-category or alternate parameter queries.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clash Types Legend */}
                <div className="p-4 rounded-xl bg-[#070D1B] border border-white/[0.08] space-y-3">
                  <h5 className="font-semibold text-emerald-300 font-mono text-[11px] uppercase tracking-wider">
                    Clash Types ({hardPrefix} / {clearancePrefix})
                  </h5>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg bg-black/40 border border-emerald-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-300">{hardPrefix} → Hard Clash</span>
                        <span className="text-[10px] text-emerald-400 font-mono">test_type=&quot;hard&quot;</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-snug">
                        Physical intersection between 3D solids. Triggers when geometry from Selection Set A penetrates Selection Set B.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/40 border border-sky-500/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sky-300">{clearancePrefix} → Clearance Clash</span>
                        <span className="text-[10px] text-sky-400 font-mono">test_type=&quot;clearance&quot;</span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-snug">
                        Proximity violation within specified buffer distance. Triggers when geometry is closer than the configured tolerance.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tolerance & Conversion */}
                <div className="p-4 rounded-xl bg-[#070D1B] border border-white/[0.08] space-y-3">
                  <h5 className="font-semibold text-amber-300 font-mono text-[11px] uppercase tracking-wider">
                    Tolerance &amp; Unit Conversion
                  </h5>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Matrix cell values format as <code>&lt;Type&gt;-&lt;Value&gt;</code> and are converted into meters with 10 decimal places for Navisworks XML compliance.
                  </p>
                  <div className="space-y-1.5 font-mono text-[11px] p-2.5 rounded-lg bg-black/40 border border-amber-500/20">
                    <div className="flex justify-between text-slate-300">
                      <span>{hardPrefix}-400 ({unit}):</span>
                      <span className="text-cyan-300 font-bold">0.4000000000 m</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>{clearancePrefix}-100 ({unit}):</span>
                      <span className="text-cyan-300 font-bold">0.1000000000 m</span>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>{hardPrefix}-25 ({unit}):</span>
                      <span className="text-cyan-300 font-bold">0.0250000000 m</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Configured unit: {unit}. Custom prefixes and unit scales are fully supported.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
