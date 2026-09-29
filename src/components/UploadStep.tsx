import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Table,
  ArrowRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { ParsedWorkbook } from '../types/excel';

interface UploadStepProps {
  workbook: ParsedWorkbook | null;
  onFileUpload: (file: File) => void;
  onSheetChange: (sheetName: string) => void;
  onHeaderRowChange: (rowIndex: number) => void;
  onLoadSample?: () => void;
  onNext: () => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({
  workbook,
  onFileUpload,
  onSheetChange,
  onHeaderRowChange,
  onLoadSample,
  onNext,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const validExts = ['.xlsx', '.xls'];
    const hasValidExt = validExts.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      setUploadError('Please select a valid Microsoft Excel workbook (.xlsx or .xls).');
      return;
    }

    onFileUpload(file);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero Card */}
      <div
        id="hero-banner-upload-step"
        className="bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.37)]"
      >
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Phase 01 // Ingestion
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 mt-1.5">
            <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
            Step 1: Upload Excel Clash Detection Matrix
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-3xl">
            Upload your BIM Clash Matrix spreadsheet. The application will analyze the sheet structure,
            detect header rows, and extract selection set metadata and matrix clash intersections.
          </p>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        id="dropzone-excel-upload"
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 backdrop-blur-xl ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/40 ring-4 ring-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
            : workbook
            ? 'border-emerald-500/60 bg-emerald-950/20 hover:border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
            : 'border-white/[0.12] bg-[#0A101D]/60 hover:border-cyan-500/60 hover:bg-slate-900/60 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept=".xlsx, .xls"
          className="hidden"
          id="file-input-excel"
        />

        <div className="flex flex-col items-center justify-center space-y-3.5">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              workbook
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-white/[0.05] text-cyan-400 border border-white/10 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
            }`}
          >
            {workbook ? <CheckCircle className="w-8 h-8" /> : <UploadCloud className="w-8 h-8" />}
          </div>

          {workbook ? (
            <div>
              <p className="text-base font-semibold text-emerald-300 flex items-center justify-center gap-1.5">
                <span>Workbook Loaded:</span>
                <span className="font-mono bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50">
                  {workbook.fileName}
                </span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Click or drag another file to replace • <span className="text-cyan-300 font-mono">{workbook.totalRows}</span> rows detected across <span className="text-cyan-300 font-mono">{workbook.columns.length}</span> columns
              </p>
            </div>
          ) : (
            <div>
              <p className="text-base font-semibold text-slate-100">
                Drag and drop your Excel Clash Detection Matrix (.xlsx / .xls)
              </p>
              <p className="text-xs text-slate-400 mt-1.5">
                or <span className="text-cyan-400 underline font-medium hover:text-cyan-300">browse files</span> from your computer (processed 100% locally in browser)
              </p>
            </div>
          )}
        </div>
      </div>

      {uploadError && (
        <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-xl flex items-center text-rose-200 text-sm shadow-[0_0_15px_rgba(244,63,94,0.2)]">
          <AlertCircle className="w-5 h-5 mr-2.5 text-rose-400 flex-shrink-0" />
          {uploadError}
        </div>
      )}

      {/* Workbook Inspection Details */}
      {workbook && (
        <div className="space-y-6">
          {/* Controls Bar: Worksheet Selector & Header Row Selector */}
          <div className="bg-[#0A101D]/70 backdrop-blur-xl p-5 rounded-2xl border border-white/[0.08] grid grid-cols-1 md:grid-cols-2 gap-4 shadow-sm">
            {/* Sheet Selector */}
            <div>
              <label htmlFor="select-worksheet" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Select Worksheet ({workbook.sheetNames.length} available)
              </label>
              <select
                id="select-worksheet"
                value={workbook.selectedSheet}
                onChange={(e) => onSheetChange(e.target.value)}
                className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none transition-all"
              >
                {workbook.sheetNames.map((sheet) => (
                  <option key={sheet} value={sheet}>
                    {sheet}
                  </option>
                ))}
              </select>
            </div>

            {/* Header Row Selector */}
            <div>
              <label htmlFor="select-header-row" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Detected Header Row
              </label>
              <div className="flex items-center space-x-2">
                <select
                  id="select-header-row"
                  value={workbook.headerRowIndex}
                  onChange={(e) => onHeaderRowChange(parseInt(e.target.value, 10))}
                  className="w-full bg-[#050A15] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-sm text-slate-100 font-medium focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 focus:outline-none transition-all"
                >
                  {Array.from({ length: Math.min(workbook.totalRows, 30) }).map((_, idx) => (
                    <option key={idx} value={idx}>
                      Row {idx + 1} {idx === workbook.headerRowIndex ? '(Auto-Detected Header)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Headers define column names used for Selection Sets and Matrix columns.
              </p>
            </div>
          </div>

          {/* Detected Columns Grid */}
          <div className="bg-[#0A101D]/70 backdrop-blur-xl rounded-2xl border border-white/[0.08] overflow-hidden shadow-sm">
            <div className="px-5 py-3.5 border-b border-white/[0.08] bg-slate-900/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Table className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Detected Excel Columns ({workbook.columns.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Total Sheet Rows: <span className="text-cyan-300">{workbook.totalRows}</span>
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#050A15] text-slate-400 font-medium border-b border-white/[0.08] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 w-16 text-center font-mono">Col</th>
                    <th className="py-2.5 px-4 font-semibold text-slate-300">Header Name</th>
                    <th className="py-2.5 px-3 w-28 text-center">Data Rows</th>
                    <th className="py-2.5 px-4">Sample Values (First Rows)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.05] text-slate-300">
                  {workbook.columns.map((col) => {
                    const isInteresting =
                      col.header.toLowerCase().includes('folder') ||
                      col.header.toLowerCase().includes('clash') ||
                      col.header.toLowerCase().includes('group') ||
                      col.header.toLowerCase().includes('priority') ||
                      col.header.toLowerCase().includes('element') ||
                      col.header.toLowerCase().includes('uniclass');

                    return (
                      <tr
                        key={col.letter}
                        className={`hover:bg-white/[0.04] transition-colors ${
                          isInteresting ? 'bg-cyan-950/20' : ''
                        }`}
                      >
                        <td className="py-2 px-3 text-center font-mono font-bold text-cyan-400 bg-black/20">
                          {col.letter}
                        </td>
                        <td className="py-2 px-4 font-medium text-slate-100 flex items-center space-x-1.5">
                          <span>{col.header}</span>
                          {isInteresting && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" title="Key BIM attribute"></span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400 font-mono">
                          {col.nonEmptyCount}
                        </td>
                        <td className="py-2 px-4 font-mono text-slate-400">
                          {col.sampleValues.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {col.sampleValues.map((val, vIdx) => (
                                <span
                                  key={vIdx}
                                  className="inline-block px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-slate-300 text-[11px]"
                                >
                                  {val}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-600 italic">empty</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Navigation to Next Step */}
          <div className="flex justify-end pt-2">
            <button
              onClick={onNext}
              id="btn-upload-next"
              type="button"
              className="inline-flex items-center px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-sm font-semibold shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all cursor-pointer border border-cyan-300/30"
            >
              Proceed to Column Mapping
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
