import React, { useState, useMemo } from 'react';
import {
  Grid,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Eye,
  Info,
  Layers,
  Sparkles,
  Bookmark,
  Plus,
  Trash2,
  FileCode,
} from 'lucide-react';
import { ParsedWorkbook } from '../types/excel';
import {
  ClashMatrixConfig,
  ClashMatrixSummary,
  ClashMatrixCellEntry,
  MatrixToleranceUnit,
  MatrixFormatProfile,
} from '../types/clashTest';
import { SelectionSet } from '../types/selectionSet';
import { colIndexToLetter } from '../excel/parser';
import { parseClashValue, formatToleranceToNavisworksMeters } from '../clashTests/toleranceParser';
import {
  loadMatrixFormatProfiles,
  saveCustomFormatProfile,
  deleteCustomFormatProfile,
  setActiveFormatProfile,
} from '../clashTests/matrixFormatProfileManager';

interface ClashMatrixStepProps {
  workbook: ParsedWorkbook;
  clashMatrixConfig: ClashMatrixConfig;
  matrixSummary: ClashMatrixSummary;
  matrixCellEntries: ClashMatrixCellEntry[];
  matrixGridRowHeaders: { rowIndex: number; group: string; name: string; folder: string }[];
  matrixGridColHeaders: { colIndex: number; letter: string; headerText: string; group: string; name: string; folder: string }[];
  selectionSets: SelectionSet[];
  onUpdateClashMatrixConfig: (updater: (prev: ClashMatrixConfig) => ClashMatrixConfig) => void;
  onSheetChange?: (sheetName: string) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const ClashMatrixStep: React.FC<ClashMatrixStepProps> = ({
  workbook,
  clashMatrixConfig,
  matrixSummary,
  matrixCellEntries,
  matrixGridRowHeaders,
  matrixGridColHeaders,
  onUpdateClashMatrixConfig,
  onSheetChange,
  onPrev,
  onNext,
}) => {
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<MatrixFormatProfile[]>(() => loadMatrixFormatProfiles());
  const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileNotes, setNewProfileNotes] = useState('');

  // Live test input state
  const [testInput, setTestInput] = useState('H-400');

  // Build a quick 2D lookup map for rendering the grid
  const cellMap = new Map<string, ClashMatrixCellEntry>();
  matrixCellEntries.forEach((entry) => {
    cellMap.set(`${entry.rowIndex}_${entry.colIndex}`, entry);
  });

  const selectedCell = selectedCellKey ? cellMap.get(selectedCellKey) || null : null;

  // Active format settings
  const hardPrefix = clashMatrixConfig.hardPrefix || 'H';
  const clearancePrefix = clashMatrixConfig.clearancePrefix || 'C';
  const unit: MatrixToleranceUnit = clashMatrixConfig.unit || 'MM';
  const delimiter = clashMatrixConfig.delimiter !== undefined ? clashMatrixConfig.delimiter : '-';

  // Live preview parse calculation
  const liveParsed = useMemo(() => {
    return parseClashValue(testInput, {
      hardPrefix,
      clearancePrefix,
      unit,
      delimiter,
    });
  }, [testInput, hardPrefix, clearancePrefix, unit, delimiter]);

  const handleRowGroupColChange = (colIndex: number) => {
    onUpdateClashMatrixConfig((prev) => ({
      ...prev,
      rowGroupColumnIndex: colIndex,
      rowGroupColumnLetter: colIndexToLetter(colIndex),
    }));
  };

  const handleStartColChange = (colIndex: number) => {
    onUpdateClashMatrixConfig((prev) => ({
      ...prev,
      matrixStartColumnIndex: colIndex,
      matrixStartColumnLetter: colIndexToLetter(colIndex),
    }));
  };

  const handleStartRowChange = (rowIndex: number) => {
    onUpdateClashMatrixConfig((prev) => ({
      ...prev,
      matrixStartRowIndex: rowIndex,
    }));
  };

  const handleHeadersRowChange = (rowIndex: number) => {
    onUpdateClashMatrixConfig((prev) => ({
      ...prev,
      columnHeadersRowIndex: rowIndex,
    }));
  };

  const handleNamingFormatChange = (fmt: 'group_v_group' | 'full_v_full') => {
    onUpdateClashMatrixConfig((prev) => ({
      ...prev,
      namingFormat: fmt,
    }));
  };

  // Format profile handlers
  const handleProfileSelect = (profileId: string) => {
    const matched = profiles.find((p) => p.id === profileId);
    if (!matched) return;

    setActiveFormatProfile(profileId);
    onUpdateClashMatrixConfig((prev) => ({
      ...prev,
      activeProfileId: profileId,
      hardPrefix: matched.hardPrefix,
      clearancePrefix: matched.clearancePrefix,
      unit: matched.unit,
      delimiter: matched.delimiter,
    }));

    // Update live test input sample to match chosen profile
    if (matched.unit === 'M') {
      setTestInput(`${matched.hardPrefix}${matched.delimiter || ''}1`);
    } else if (matched.unit === 'CM') {
      setTestInput(`${matched.hardPrefix}${matched.delimiter || ''}50`);
    } else {
      setTestInput(`${matched.hardPrefix}${matched.delimiter || ''}400`);
    }
  };

  const handleSaveCustomProfile = () => {
    if (!newProfileName.trim()) return;
    const created = saveCustomFormatProfile({
      name: newProfileName.trim(),
      hardPrefix,
      clearancePrefix,
      unit,
      delimiter,
      notes: newProfileNotes.trim(),
    });

    const updatedProfiles = loadMatrixFormatProfiles();
    setProfiles(updatedProfiles);
    onUpdateClashMatrixConfig((prev) => ({
      ...prev,
      activeProfileId: created.id,
    }));

    setIsNewProfileModalOpen(false);
    setNewProfileName('');
    setNewProfileNotes('');
  };

  const handleDeleteProfile = (profileId: string) => {
    const success = deleteCustomFormatProfile(profileId);
    if (success) {
      const updated = loadMatrixFormatProfiles();
      setProfiles(updated);
      if (clashMatrixConfig.activeProfileId === profileId) {
        handleProfileSelect(updated[0].id);
      }
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
                Phase 05 // Matrix Mapping &amp; Tolerances
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-1.5">
              <Grid className="w-6 h-6 text-cyan-400" />
              Step 5: BIM Clash Detection Matrix Structure &amp; Intersections
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl">
              The matrix maps row Selection Sets against column Selection Sets. Configure coordinates and customizable
              cell format profiles to determine Hard and Clearance tests in Navisworks XML meters.
            </p>
          </div>

          <div className="flex items-center space-x-2.5 bg-[#050A15] p-2 rounded-xl border border-white/[0.08]">
            <span className="text-xs text-slate-400 font-mono pl-1">Naming:</span>
            <select
              value={clashMatrixConfig.namingFormat}
              onChange={(e) => handleNamingFormatChange(e.target.value as any)}
              id="select-matrix-naming-format"
              className="bg-[#070D1B] border border-white/[0.12] rounded-lg px-3 py-1.5 text-xs text-slate-200 font-medium focus:ring-1 focus:ring-cyan-500 focus:outline-none cursor-pointer"
            >
              <option value="group_v_group">Group_v_Group (AR0020_v_AR0010)</option>
              <option value="full_v_full">Full_v_Full (A-AR0020_v_A-AR0010)</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 1: Matrix Layout Configuration (5 Authoritative Fields) */}
      <div className="bg-[#0A101D]/70 backdrop-blur-xl p-6 rounded-2xl border border-cyan-500/20 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Matrix Layout Configuration
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Single source of truth for matrix coordinates. All 5 settings are user-configurable with zero auto-detection assumptions.
            </p>
          </div>
          <span className="text-xs text-cyan-400/80 font-mono bg-cyan-950/40 px-2.5 py-0.5 rounded-full border border-cyan-800/50">
            Sheet: {clashMatrixConfig.sheet || workbook.selectedSheet} | Row IDs: Col {clashMatrixConfig.rowGroupColumnLetter} | Header: Row {clashMatrixConfig.columnHeadersRowIndex + 1} | Data: Row {clashMatrixConfig.matrixStartRowIndex + 1} Col {clashMatrixConfig.matrixStartColumnLetter}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          {/* 1. Sheet */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">
              Sheet
            </label>
            <select
              id="select-matrix-sheet"
              value={clashMatrixConfig.sheet || workbook.selectedSheet}
              onChange={(e) => {
                const sheetName = e.target.value;
                if (onSheetChange) {
                  onSheetChange(sheetName);
                }
                onUpdateClashMatrixConfig((prev) => ({
                  ...prev,
                  sheet: sheetName,
                }));
              }}
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-cyan-300 font-semibold focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all cursor-pointer"
            >
              {workbook.sheetNames.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Target worksheet</p>
          </div>

          {/* 2. Row Element ID Column */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">
              Row Element ID Column
            </label>
            <select
              id="select-row-element-column"
              value={clashMatrixConfig.rowGroupColumnIndex}
              onChange={(e) => handleRowGroupColChange(parseInt(e.target.value, 10))}
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-emerald-300 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all cursor-pointer"
            >
              {workbook.columns.map((col) => (
                <option key={col.index} value={col.index}>
                  Column {col.letter} — {col.header}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Row IDs source (e.g. F, C, B)</p>
          </div>

          {/* 3. Column Element ID Header Row */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">
              Column Element ID Header Row
            </label>
            <select
              id="select-column-header-row"
              value={clashMatrixConfig.columnHeadersRowIndex}
              onChange={(e) => handleHeadersRowChange(parseInt(e.target.value, 10))}
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all cursor-pointer"
            >
              {Array.from({ length: Math.min(workbook.totalRows, 50) }).map((_, idx) => (
                <option key={idx} value={idx}>
                  Row {idx + 1}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Column IDs row (e.g. 14, 7, 5)</p>
          </div>

          {/* 4. Matrix Data Start Row */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">
              Matrix Data Start Row
            </label>
            <select
              id="select-matrix-start-row"
              value={clashMatrixConfig.matrixStartRowIndex}
              onChange={(e) => handleStartRowChange(parseInt(e.target.value, 10))}
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all cursor-pointer"
            >
              {Array.from({ length: Math.min(workbook.totalRows, 60) }).map((_, idx) => (
                <option key={idx} value={idx}>
                  Row {idx + 1}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">First data row (e.g. 17, 10, 8)</p>
          </div>

          {/* 5. Matrix Start Column */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">
              Matrix Start Column
            </label>
            <select
              id="select-matrix-start-col"
              value={clashMatrixConfig.matrixStartColumnIndex}
              onChange={(e) => handleStartColChange(parseInt(e.target.value, 10))}
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-amber-300 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all cursor-pointer"
            >
              {workbook.columns.map((col) => (
                <option key={col.index} value={col.index}>
                  Column {col.letter} — {col.header}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">First matrix column (e.g. I, E, G)</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Clash Value Format Configuration */}
      <div className="bg-[#0A101D]/70 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08] shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Clash Value Format Configuration
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure Hard and Clearance prefixes, delimiter, and unit. Exactly one authoritative parseClashValue() parser is used across the application.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <select
              id="select-format-profile"
              value={clashMatrixConfig.activeProfileId || profiles[0]?.id}
              onChange={(e) => handleProfileSelect(e.target.value)}
              className="bg-[#050A15] border border-cyan-500/40 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-semibold focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isBuiltIn ? '(Built-in)' : '(Custom)'}
                </option>
              ))}
            </select>

            <button
              type="button"
              id="btn-save-format-profile"
              onClick={() => setIsNewProfileModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30 transition-all cursor-pointer"
              title="Save current format settings as a new profile"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Save Profile
            </button>
          </div>
        </div>

        {/* 4 Format Configuration Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          {/* Hard Prefix */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">
              Hard Prefix
            </label>
            <input
              type="text"
              id="input-hard-prefix"
              value={hardPrefix}
              onChange={(e) =>
                onUpdateClashMatrixConfig((prev) => ({
                  ...prev,
                  hardPrefix: e.target.value.toUpperCase(),
                }))
              }
              placeholder="e.g. H or HR"
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-emerald-300 font-mono font-bold focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all uppercase"
            />
            <p className="text-[11px] text-slate-500 mt-1">e.g. &quot;H&quot; in H-400, &quot;HR&quot; in HR-1</p>
          </div>

          {/* Clearance Prefix */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">
              Clearance Prefix
            </label>
            <input
              type="text"
              id="input-clearance-prefix"
              value={clearancePrefix}
              onChange={(e) =>
                onUpdateClashMatrixConfig((prev) => ({
                  ...prev,
                  clearancePrefix: e.target.value.toUpperCase(),
                }))
              }
              placeholder="e.g. C or CR"
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-cyan-300 font-mono font-bold focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all uppercase"
            />
            <p className="text-[11px] text-slate-500 mt-1">e.g. &quot;C&quot; in C-100, &quot;CR&quot; in CR-0.5</p>
          </div>

          {/* Delimiter */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">
              Delimiter
            </label>
            <input
              type="text"
              id="input-matrix-delimiter"
              value={delimiter}
              onChange={(e) =>
                onUpdateClashMatrixConfig((prev) => ({
                  ...prev,
                  delimiter: e.target.value,
                }))
              }
              placeholder="e.g. - or _ or blank"
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-slate-100 font-mono font-bold focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all"
            />
            <p className="text-[11px] text-slate-500 mt-1">&quot;-&quot; for H-100, &quot;_&quot; for HC_40, &quot;&quot; for H100</p>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">
              Unit
            </label>
            <select
              id="select-matrix-unit"
              value={unit}
              onChange={(e) =>
                onUpdateClashMatrixConfig((prev) => ({
                  ...prev,
                  unit: e.target.value as MatrixToleranceUnit,
                }))
              }
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all cursor-pointer"
            >
              <option value="MM">MM (Millimeters → ÷1000 m)</option>
              <option value="CM">CM (Centimeters → ÷100 m)</option>
              <option value="M">M (Meters → ×1 m)</option>
              <option value="IN">IN (Inches → ×0.0254 m)</option>
              <option value="FT">FT (Feet → ×0.3048 m)</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Navisworks XML converts to meters</p>
          </div>
        </div>

        {/* SECTION 3: Live Preview (Based ONLY on these settings) */}
        <div className="bg-[#050A15] p-4 rounded-xl border border-white/[0.08] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              Live Preview (Based ONLY on Active Settings)
            </span>
            <span className="text-[11px] text-slate-400">
              Type any sample cell value to verify real-time parsing accuracy.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-4">
              <input
                type="text"
                id="input-live-tester"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                placeholder="e.g. H-400, HR-1, HC_40"
                className="w-full bg-[#070D1B] border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-cyan-200 font-mono font-bold focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all shadow-inner"
              />
            </div>

            <div className="md:col-span-8 flex flex-wrap items-center gap-2 text-xs font-mono">
              {liveParsed.type ? (
                <>
                  <span
                    id="badge-test-type"
                    className={`px-2.5 py-1 rounded-lg font-bold border ${
                      liveParsed.type === 'hard'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
                        : 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                    }`}
                  >
                    {liveParsed.type.toUpperCase()} CLASH
                  </span>

                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-amber-300 border border-white/[0.08]">
                    Raw: {liveParsed.toleranceRaw} {unit}
                  </span>

                  <span
                    id="badge-test-meters"
                    className="px-2.5 py-1 rounded-lg bg-slate-900 text-cyan-300 border border-cyan-500/30 font-bold"
                  >
                    Navisworks: {formatToleranceToNavisworksMeters(liveParsed.toleranceMeters || 0)} m
                  </span>

                  <span className="px-2 py-1 rounded-lg bg-black/60 text-slate-400 border border-white/[0.05] text-[11px] truncate max-w-xs">
                    &lt;clashtest test_type=&quot;{liveParsed.type}&quot; tolerance=&quot;
                    {formatToleranceToNavisworksMeters(liveParsed.toleranceMeters || 0)}&quot;&gt;
                  </span>
                </>
              ) : liveParsed.ignored ? (
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 border border-white/[0.08]">
                  IGNORED ({liveParsed.ignoredReason})
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-rose-950 text-rose-300 border border-rose-500/50 font-bold">
                  {liveParsed.error || 'INVALID FORMAT'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Statistics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-[#0A101D]/70 backdrop-blur-xl p-4 rounded-2xl border border-white/[0.08] shadow-sm">
          <div className="text-[11px] text-slate-400 font-semibold">Valid Clash Tests</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {matrixSummary.validClashTests.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#0A101D]/70 backdrop-blur-xl p-4 rounded-2xl border border-white/[0.08] shadow-sm">
          <div className="text-[11px] text-slate-400 font-semibold">Hard Clashes ({hardPrefix})</div>
          <div className="text-2xl font-bold text-green-400 font-mono mt-1">
            {matrixSummary.hardClashes.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#0A101D]/70 backdrop-blur-xl p-4 rounded-2xl border border-white/[0.08] shadow-sm">
          <div className="text-[11px] text-slate-400 font-semibold">Clearance ({clearancePrefix})</div>
          <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
            {matrixSummary.clearanceClashes.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#0A101D]/70 backdrop-blur-xl p-4 rounded-2xl border border-white/[0.08] shadow-sm">
          <div className="text-[11px] text-slate-400 font-semibold">Ignored Blank</div>
          <div className="text-2xl font-bold text-slate-400 font-mono mt-1">
            {matrixSummary.ignoredBlank.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#0A101D]/70 backdrop-blur-xl p-4 rounded-2xl border border-white/[0.08] shadow-sm">
          <div className="text-[11px] text-slate-400 font-semibold">Ignored N/A</div>
          <div className="text-2xl font-bold text-slate-400 font-mono mt-1">
            {matrixSummary.ignoredNA.toLocaleString()}
          </div>
        </div>

        <div className="bg-[#0A101D]/70 backdrop-blur-xl p-4 rounded-2xl border border-white/[0.08] shadow-sm">
          <div className="text-[11px] text-slate-400 font-semibold">Invalid Formats</div>
          <div
            className={`text-2xl font-bold font-mono mt-1 ${
              matrixSummary.invalidCells.length > 0 ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {matrixSummary.invalidCells.length}
          </div>
        </div>
      </div>

      {/* Interactive Clash Matrix Grid */}
      <div className="bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden shadow-sm space-y-3.5 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              Interactive Matrix Visualizer &amp; Heatmap
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any cell to inspect tolerance conversion, locator paths, and clash test metadata.
            </p>
          </div>

          {/* Matrix Cell Legend */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="flex items-center space-x-1.5 bg-[#050A15] px-2 py-1 rounded-lg border border-white/[0.08]">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span className="text-slate-300 font-mono">Hard ({hardPrefix})</span>
            </span>
            <span className="flex items-center space-x-1.5 bg-[#050A15] px-2 py-1 rounded-lg border border-white/[0.08] ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></span>
              <span className="text-slate-300 font-mono">Clearance ({clearancePrefix})</span>
            </span>
            <span className="flex items-center space-x-1.5 bg-[#050A15] px-2 py-1 rounded-lg border border-white/[0.08] ml-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
              <span className="text-slate-500 font-mono">n/a / blank</span>
            </span>
          </div>
        </div>

        {/* Matrix Grid Container */}
        <div className="overflow-x-auto max-h-[500px] border border-white/[0.08] rounded-xl bg-[#050A15]/80 relative custom-scrollbar">
          <table className="border-collapse text-center text-xs">
            {/* Table Header: Column Elements */}
            <thead className="bg-[#070D1B] text-slate-300 sticky top-0 z-20 shadow">
              <tr>
                <th className="p-2.5 border-r border-b border-white/[0.08] bg-[#0A101D] sticky left-0 z-30 min-w-[130px] text-left text-[11px] font-bold text-cyan-300">
                  Row Element \ Col
                </th>
                {matrixGridColHeaders.map((col) => (
                  <th
                    key={col.colIndex}
                    className="p-2 border-r border-b border-white/[0.08] min-w-[85px] max-w-[100px] text-[11px] font-medium truncate font-mono text-slate-200"
                    title={`${col.headerText} (${col.group}) — Column ${col.letter}`}
                  >
                    <div className="truncate font-bold">{col.group || col.headerText}</div>
                    <div className="text-[9px] text-slate-500 font-sans font-normal truncate">
                      {col.headerText}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-white/[0.04]">
              {matrixGridRowHeaders.map((rowH) => (
                <tr key={rowH.rowIndex} className="hover:bg-white/[0.02]">
                  {/* Left Sticky Row Header */}
                  <th className="p-2.5 border-r border-white/[0.08] bg-[#0A101D] sticky left-0 z-10 text-left font-mono font-semibold text-slate-200 text-[11px] whitespace-nowrap shadow">
                    <span className="text-cyan-400 font-bold">{rowH.group}</span>
                    {rowH.folder && (
                      <span className="text-slate-500 text-[10px] ml-1.5 font-sans font-normal">
                        ({rowH.folder})
                      </span>
                    )}
                  </th>

                  {/* Matrix Cells */}
                  {matrixGridColHeaders.map((colH) => {
                    const entry = cellMap.get(`${rowH.rowIndex}_${colH.colIndex}`);
                    if (!entry) {
                      return (
                        <td
                          key={colH.colIndex}
                          className="p-1 border-r border-white/[0.04] text-slate-700 font-mono text-[10px]"
                        >
                          -
                        </td>
                      );
                    }

                    const parsed = entry.parsedCell;
                    const isHard = parsed.type === 'hard';
                    const isClearance = parsed.type === 'clearance';
                    const isInvalid = !!parsed.error;
                    const cellKey = `${entry.rowIndex}_${entry.colIndex}`;
                    const isSelected = selectedCellKey === cellKey;

                    let bgClass = 'bg-white/[0.02] text-slate-600 border border-transparent';
                    if (isHard) {
                      bgClass = 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 font-bold hover:bg-emerald-900/80 shadow-[0_0_8px_rgba(16,185,129,0.15)]';
                    } else if (isClearance) {
                      bgClass = 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 font-bold hover:bg-cyan-900/80 shadow-[0_0_8px_rgba(6,182,212,0.15)]';
                    } else if (isInvalid) {
                      bgClass = 'bg-rose-950/80 text-rose-300 border border-rose-500/50 font-bold hover:bg-rose-900 shadow-[0_0_8px_rgba(244,63,94,0.2)]';
                    }

                    return (
                      <td
                        key={colH.colIndex}
                        className="p-1 border-r border-white/[0.04]"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedCellKey(cellKey)}
                          className={`w-full py-1 px-1.5 rounded-md text-[11px] font-mono transition-all truncate cursor-pointer ${bgClass} ${
                            isSelected ? 'ring-2 ring-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.4)]' : ''
                          }`}
                          title={`${entry.cellAddress}: ${entry.rowGroup} vs ${entry.colGroup} -> ${parsed.raw || 'empty'}`}
                        >
                          {parsed.raw || '-'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Selected Cell Modal/Drawer Inspector */}
        {selectedCell && (
          <div className="bg-[#050A15] p-5 rounded-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)] space-y-3.5 mt-3">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 font-mono font-bold text-xs border border-cyan-500/40 shadow-inner">
                  Cell {selectedCell.cellAddress}
                </span>
                <span className="text-xs font-bold text-slate-100 font-mono">
                  {selectedCell.rowGroup} × {selectedCell.colGroup}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCellKey(null)}
                className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer px-2 py-1 rounded hover:bg-white/[0.05]"
              >
                Close Inspector
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">Raw Cell Value:</span>
                <div className="font-mono text-slate-100 font-bold mt-0.5">
                  &quot;{selectedCell.parsedCell.raw || '(empty)'}&quot;
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px]">Test Type:</span>
                <div className="font-mono mt-0.5">
                  {selectedCell.parsedCell.type ? (
                    <span className="capitalize text-emerald-400 font-bold">
                      {selectedCell.parsedCell.type} Clash
                    </span>
                  ) : (
                    <span className="text-slate-500">Ignored / None</span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px]">Tolerance Conversion:</span>
                <div className="font-mono text-cyan-300 font-bold mt-0.5">
                  {selectedCell.parsedCell.toleranceMeters !== undefined ? (
                    `${selectedCell.parsedCell.toleranceRaw || selectedCell.parsedCell.toleranceMm} ${unit} → ${formatToleranceToNavisworksMeters(selectedCell.parsedCell.toleranceMeters)} m`
                  ) : (
                    '-'
                  )}
                </div>
              </div>

              <div>
                <span className="text-slate-400 text-[11px]">Generated Test Name:</span>
                <div className="font-mono text-amber-300 font-bold mt-0.5 truncate">
                  {selectedCell.clashTest?.name || 'N/A'}
                </div>
              </div>
            </div>

            {selectedCell.clashTest && (
              <div className="bg-black/40 p-3 rounded-xl border border-white/[0.06] text-[11px] font-mono text-slate-300 space-y-1">
                <div>
                  <span className="text-slate-500">Left Locator: </span>
                  <span className="text-cyan-300">{selectedCell.clashTest.leftLocator}</span>
                </div>
                <div>
                  <span className="text-slate-500">Right Locator: </span>
                  <span className="text-emerald-300">{selectedCell.clashTest.rightLocator}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Custom Profile Modal */}
      {isNewProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0A101D] border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-[0_0_40px_rgba(6,182,212,0.2)]">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-cyan-400" />
              Save Custom Format Profile
            </h4>
            <p className="text-xs text-slate-300">
              Save current settings (Hard: {hardPrefix}, Clearance: {clearancePrefix}, Unit: {unit}, Delimiter: &quot;{delimiter}&quot;) for reuse.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Profile Name</label>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="e.g. Infrastructure Strict Meters"
                  className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Notes / Description</label>
                <input
                  type="text"
                  value={newProfileNotes}
                  onChange={(e) => setNewProfileNotes(e.target.value)}
                  placeholder="e.g. For highway cross-section clearance checks"
                  className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3 py-2 text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setIsNewProfileModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomProfile}
                disabled={!newProfileName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
        <button
          onClick={onPrev}
          id="btn-matrix-prev"
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-sm font-medium border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Conditions
        </button>

        <button
          onClick={onNext}
          id="btn-matrix-next"
          type="button"
          className="inline-flex items-center px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer border border-cyan-300/30"
        >
          Preview Generated Clash Tests
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};
