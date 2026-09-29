import React from 'react';
import { Columns, Plus, Trash2, ArrowRight, ArrowLeft, Layers, Eye, Sparkles } from 'lucide-react';
import { ParsedWorkbook } from '../types/excel';
import { SelectionSetConfig } from '../types/selectionSet';
import { ClashMatrixConfig } from '../types/clashTest';
import { colIndexToLetter } from '../excel/parser';

interface ColumnMappingStepProps {
  workbook: ParsedWorkbook;
  selectionSetConfig: SelectionSetConfig;
  clashMatrixConfig: ClashMatrixConfig;
  onUpdateSelectionSetConfig: (updater: (prev: SelectionSetConfig) => SelectionSetConfig) => void;
  onUpdateClashMatrixConfig: (updater: (prev: ClashMatrixConfig) => ClashMatrixConfig) => void;
  onPrev: () => void;
  onNext: () => void;
}

export const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({
  workbook,
  selectionSetConfig,
  clashMatrixConfig,
  onUpdateSelectionSetConfig,
  onUpdateClashMatrixConfig,
  onPrev,
  onNext,
}) => {
  const currentSheetData = workbook.sheetsData[workbook.selectedSheet] || [];

  // Helper to handle Folder Column change
  const handleFolderColChange = (colIndex: number) => {
    const letter = colIndexToLetter(colIndex);
    onUpdateSelectionSetConfig((prev) => ({
      ...prev,
      folderColumnIndex: colIndex,
      folderColumnLetter: letter,
    }));
  };

  // Helper to add a name part
  const handleAddNamePart = () => {
    const defaultCol = workbook.columns[0]?.index || 0;
    onUpdateSelectionSetConfig((prev) => ({
      ...prev,
      nameParts: [
        ...prev.nameParts,
        {
          columnIndex: defaultCol,
          columnLetter: colIndexToLetter(defaultCol),
          separator: '-',
        },
      ],
    }));
  };

  // Helper to update a name part column
  const handleNamePartColChange = (partIdx: number, newColIndex: number) => {
    onUpdateSelectionSetConfig((prev) => {
      const nextParts = [...prev.nameParts];
      nextParts[partIdx] = {
        ...nextParts[partIdx],
        columnIndex: newColIndex,
        columnLetter: colIndexToLetter(newColIndex),
      };
      return { ...prev, nameParts: nextParts };
    });
  };

  // Helper to remove a name part
  const handleRemoveNamePart = (partIdx: number) => {
    if (selectionSetConfig.nameParts.length <= 1) return;
    onUpdateSelectionSetConfig((prev) => ({
      ...prev,
      nameParts: prev.nameParts.filter((_, idx) => idx !== partIdx),
    }));
  };

  // Helper to update separator
  const handleSeparatorChange = (sep: string) => {
    onUpdateSelectionSetConfig((prev) => ({
      ...prev,
      nameSeparator: sep,
    }));
  };

  // Helper to update matrix row group column
  const handleRowGroupColChange = (colIndex: number) => {
    onUpdateClashMatrixConfig((prev) => ({
      ...prev,
      rowGroupColumnIndex: colIndex,
      rowGroupColumnLetter: colIndexToLetter(colIndex),
    }));
  };

  // Generate a live sample preview of 6 rows
  const previewRows: { rowNum: number; folder: string; name: string; group: string }[] = [];
  const startRow = Math.max(workbook.headerRowIndex + 1, clashMatrixConfig.matrixStartRowIndex || 0);

  for (let r = startRow; r < Math.min(currentSheetData.length, startRow + 8); r++) {
    const row = currentSheetData[r];
    if (!row || !Array.isArray(row)) continue;

    const rawFolder = row[selectionSetConfig.folderColumnIndex];
    const folder = rawFolder !== undefined && rawFolder !== null ? String(rawFolder).trim() : '';

    const parts = selectionSetConfig.nameParts.map((p) => {
      const v = row[p.columnIndex];
      return v !== undefined && v !== null ? String(v).trim() : '';
    });

    const name = parts.filter(Boolean).join(selectionSetConfig.nameSeparator || '-');
    const groupVal = row[clashMatrixConfig.rowGroupColumnIndex];
    const group = groupVal !== undefined && groupVal !== null ? String(groupVal).trim() : '';

    if (folder || name) {
      previewRows.push({
        rowNum: r + 1,
        folder: folder || '(empty)',
        name: name || '(empty)',
        group: group || '(empty)',
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.37)]">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            Phase 02 // Structure Mapping
          </span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-1.5">
          <Columns className="w-6 h-6 text-cyan-400" />
          Step 2: Map Excel Columns to Selection Sets
        </h2>
        <p className="text-sm text-slate-300 mt-1 max-w-3xl">
          Specify which Excel columns contain the View Folder, Selection Set Name components, and Clash Group identifiers.
          Columns are matched dynamically without hardcoded positions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* View Folder Column Card */}
          <div className="bg-[#0A101D]/70 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08] shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <label htmlFor="select-folder-col" className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                View Folder Column (Discipline / Hierarchy)
              </label>
              <span className="text-xs text-slate-400 font-mono">
                Current: Column {selectionSetConfig.folderColumnLetter}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              In Navisworks, Selection Sets are grouped inside View Folders (e.g. <code className="text-cyan-300 bg-[#050A15] px-1.5 py-0.5 rounded border border-white/10 font-mono">AR</code>, <code className="text-cyan-300 bg-[#050A15] px-1.5 py-0.5 rounded border border-white/10 font-mono">ST</code>, <code className="text-cyan-300 bg-[#050A15] px-1.5 py-0.5 rounded border border-white/10 font-mono">HV</code>).
            </p>
            <select
              id="select-folder-col"
              value={selectionSetConfig.folderColumnIndex}
              onChange={(e) => handleFolderColChange(parseInt(e.target.value, 10))}
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none transition-all"
            >
              {workbook.columns.map((col) => (
                <option key={col.index} value={col.index}>
                  Column {col.letter} — {col.header} {col.sampleValues[0] ? `(e.g. ${col.sampleValues[0]})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selection Set Name Composition Card */}
          <div className="bg-[#0A101D]/70 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08] shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Selection Set Name Composition
              </label>
              <button
                type="button"
                onClick={handleAddNamePart}
                id="btn-add-name-part"
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-cyan-950/40 hover:bg-cyan-900/60 text-xs font-semibold text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.15)] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Name Part
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Combine multiple Excel columns with a separator to construct the Selection Set name (e.g. Priority Column + &quot;-&quot; + Group Column = <code className="text-amber-300 font-bold bg-[#050A15] px-1.5 py-0.5 rounded border border-white/10 font-mono">A-AR0010</code>).
            </p>

            {/* Name Parts List */}
            <div className="space-y-3">
              {selectionSetConfig.nameParts.map((part, idx) => (
                <div key={idx} className="flex items-center space-x-3 bg-[#050A15]/80 p-3 rounded-xl border border-white/[0.08]">
                  <span className="text-xs font-semibold text-slate-400 w-16">
                    Part #{idx + 1}
                  </span>
                  <select
                    id={`select-name-part-${idx}`}
                    value={part.columnIndex}
                    onChange={(e) => handleNamePartColChange(idx, parseInt(e.target.value, 10))}
                    className="flex-1 bg-[#070D1B] border border-white/[0.12] rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  >
                    {workbook.columns.map((col) => (
                      <option key={col.index} value={col.index}>
                        Column {col.letter} — {col.header}
                      </option>
                    ))}
                  </select>

                  {selectionSetConfig.nameParts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveNamePart(idx)}
                      id={`btn-remove-name-part-${idx}`}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Remove this name part"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Name Separator */}
            <div className="flex items-center space-x-3 pt-2">
              <label htmlFor="input-name-separator" className="text-xs font-semibold text-slate-300">
                Name Separator:
              </label>
              <input
                type="text"
                id="input-name-separator"
                value={selectionSetConfig.nameSeparator}
                onChange={(e) => handleSeparatorChange(e.target.value)}
                placeholder="-"
                className="w-20 bg-[#050A15] border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono text-center focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
              <span className="text-xs text-slate-400">
                (e.g. &quot;-&quot; produces <span className="font-mono text-cyan-300">A-AR0010</span>, &quot;&quot; produces <span className="font-mono text-cyan-300">AAR0010</span>)
              </span>
            </div>
          </div>

          {/* Clash Matrix Row Group Column Card */}
          <div className="bg-[#0A101D]/70 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08] shadow-sm space-y-3">
            <label htmlFor="select-matrix-row-group-col" className="text-sm font-semibold text-slate-100 block">
              Matrix Row Clash Group Identifier Column
            </label>
            <p className="text-xs text-slate-400">
              The column containing the unique clash group code (e.g. <code className="text-cyan-300 bg-[#050A15] px-1.5 py-0.5 rounded border border-white/10 font-mono">AR0010</code>, <code className="text-cyan-300 bg-[#050A15] px-1.5 py-0.5 rounded border border-white/10 font-mono">ST0510</code>) used in clash test names like <code className="text-cyan-300 bg-[#050A15] px-1.5 py-0.5 rounded border border-white/10 font-mono">AR0020_v_AR0010</code>.
            </p>
            <select
              id="select-matrix-row-group-col"
              value={clashMatrixConfig.rowGroupColumnIndex}
              onChange={(e) => handleRowGroupColChange(parseInt(e.target.value, 10))}
              className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none transition-all"
            >
              {workbook.columns.map((col) => (
                <option key={col.index} value={col.index}>
                  Column {col.letter} — {col.header} {col.sampleValues[0] ? `(e.g. ${col.sampleValues[0]})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Column: Live Selection Set Name Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#0A101D]/70 backdrop-blur-xl p-6 rounded-2xl border border-white/[0.08] shadow-sm sticky top-20">
            <div className="flex items-center space-x-2 border-b border-white/[0.08] pb-3">
              <Eye className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Mapping Preview</h3>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Based on your current configuration, here is how the first few Selection Sets and Locators will be resolved:
            </p>

            <div className="mt-4 space-y-2.5">
              {previewRows.length > 0 ? (
                previewRows.map((item, idx) => (
                  <div key={idx} className="bg-[#050A15]/90 p-3.5 rounded-xl border border-white/[0.08] text-xs space-y-1.5 hover:border-cyan-500/40 transition-colors">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="font-mono text-[11px]">Excel Row #{item.rowNum}</span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 text-[10px] font-mono border border-cyan-800/60">
                        Folder: {item.folder}
                      </span>
                    </div>

                    <div className="text-slate-200 font-semibold flex items-center justify-between">
                      <span>Selection Set:</span>
                      <span className="font-mono text-cyan-300 text-sm bg-black/40 px-2 py-0.5 rounded-md border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                        {item.name}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono truncate pt-1 border-t border-white/[0.06]">
                      <span className="text-slate-500">Locator: </span>
                      lcop_selection_set_tree/{item.folder}/{item.name}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No preview rows available. Check column selections.
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
          id="btn-mapping-prev"
          type="button"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white text-sm font-medium border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Upload
        </button>

        <button
          onClick={onNext}
          id="btn-mapping-next"
          type="button"
          className="inline-flex items-center px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer border border-cyan-300/30"
        >
          Proceed to Selection Sets &amp; Folders
          <ArrowRight className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};
