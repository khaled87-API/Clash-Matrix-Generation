import React, { useRef } from 'react';
import { FileSpreadsheet, RefreshCw, Loader2, Sun, Moon } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

interface HeaderProps {
  onLoadSample?: () => void;
  onUpdateExcel?: () => void;
  onUpdateFileSelected?: (file: File) => void;
  isUpdating?: boolean;
  onOpenPresets?: () => void;
  onOpenTemplate?: () => void;
  onReset: () => void;
  hasData: boolean;
  currentWorkbookName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSample,
  onUpdateExcel,
  onUpdateFileSelected,
  isUpdating = false,
  onOpenPresets,
  onOpenTemplate,
  onReset,
  hasData,
  currentWorkbookName,
}) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdateClick = () => {
    if (isUpdating) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    } else if (onUpdateExcel) {
      onUpdateExcel();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (onUpdateFileSelected) {
      onUpdateFileSelected(file);
    }
  };

  return (
    <header
      className={`border-b ${
        isDark
          ? 'border-white/[0.08] bg-[#070D1B]/90 text-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
          : 'border-[#D9E2EC] bg-white/95 text-[#17324D] shadow-[0_2px_12px_rgba(23,50,77,0.06)]'
      } backdrop-blur-xl sticky top-0 z-40 transition-colors duration-150`}
    >
      {/* Hidden File Input for Header Update Excel Button */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".xlsx, .xls"
        className="hidden"
        id="header-update-excel-input"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 md:py-3.5 gap-3.5 min-h-[5rem]">
          {/* Logo & Branding Block */}
          <div className="flex items-center space-x-3.5 sm:space-x-4">
            {/* Official Permanent EHAF Logo (Immutable Static Asset) */}
            <div
              title="EHAF Consulting Engineers"
              className="px-2 py-1 rounded-xl bg-white border border-[#D9E2EC] shadow-sm flex items-center justify-center shrink-0 select-none overflow-hidden"
            >
              <img
                src="/EHAF- QCES - 2019 Logo.jpg"
                alt="EHAF"
                draggable="false"
                style={{
                  width: '270px',
                  maxWidth: '100%',
                  height: 'auto',
                  display: 'block',
                  objectFit: 'contain',
                }}
              />
            </div>

            {/* Hierarchical Branding Text Block */}
            <div className="flex flex-col justify-center min-w-0">
              {/* 1. Main Title: Single horizontal line, largest text */}
              <h1
                id="header-main-title"
                className={`text-lg sm:text-xl md:text-2xl font-bold tracking-tight whitespace-nowrap ${
                  !isDark ? 'text-[#183875]' : 'text-white'
                }`}
              >
                Clash Tests Generator
              </h1>

              {/* 2. Subtitle: Navisworks -> XML (smaller than main title) */}
              <div className={`text-xs sm:text-sm font-semibold flex items-center gap-1.5 mt-0.5 whitespace-nowrap ${
                !isDark ? 'text-[#0798D1]' : 'text-cyan-300/90'
              }`}>
                <span>Navisworks</span>
                <span className={`font-mono ${!isDark ? 'text-[#24438C]' : 'text-cyan-400'}`}>→</span>
                <span className={!isDark ? 'text-[#24438C] font-bold' : 'bg-gradient-to-r from-cyan-300 to-indigo-300 bg-clip-text text-transparent'}>
                  XML
                </span>
              </div>

              {/* 3. Version Info: small, secondary, positioned under title/subtitle */}
              <div
                className="text-[11px] font-mono text-slate-400 flex items-center flex-wrap gap-1.5 mt-1"
                title="Generated using the Autodesk Navisworks Exchange XML format (nw-exchange-12.0.xsd) supported across Navisworks 2024–2026 releases."
              >
                <span className="flex items-center gap-1 text-slate-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Navisworks 2024–2026
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-emerald-400/90 font-medium">Ready</span>
                {currentWorkbookName && (
                  <>
                    <span className="text-slate-600 hidden sm:inline">·</span>
                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30 max-w-[200px] truncate" title={currentWorkbookName}>
                      <FileSpreadsheet className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{currentWorkbookName}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center flex-wrap gap-2 justify-start md:justify-end">
            {/* Global Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              id="btn-theme-toggle"
              type="button"
              className={`inline-flex items-center px-3 py-1.5 rounded-lg border shadow-sm text-xs font-semibold transition-all cursor-pointer ${
                isDark
                  ? 'border-amber-400/40 text-amber-200 bg-amber-950/30 hover:bg-amber-900/50 hover:text-white shadow-[0_0_10px_rgba(251,191,36,0.15)]'
                  : 'border-[#24438C]/30 text-[#173875] bg-white hover:bg-[#F0F6FC] hover:text-[#24438C] shadow-sm'
              }`}
              title={isDark ? 'Switch to Light Mode (EHAF / QCES)' : 'Switch to Dark Mode'}
              aria-label="Toggle application theme"
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 mr-1.5 text-amber-300" />
                  <span>☀ Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 mr-1.5 text-[#24438C]" />
                  <span>🌙 Dark</span>
                </>
              )}
            </button>

            {/* Update Excel Button - Always present in Header */}
            <button
              onClick={handleUpdateClick}
              disabled={isUpdating}
              id="btn-update-excel"
              type="button"
              className={`inline-flex items-center px-3 py-1.5 rounded-lg border shadow-sm text-xs font-semibold transition-all cursor-pointer ${
                isUpdating
                  ? 'opacity-80 cursor-wait border-cyan-500/40 text-cyan-200 bg-cyan-950/50'
                  : hasData
                  ? 'border-emerald-500/40 text-emerald-200 bg-emerald-950/40 hover:bg-emerald-900/60 hover:text-white shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                  : !isDark
                  ? 'border-[#24438C]/30 text-[#173875] bg-white hover:bg-[#F0F6FC] hover:text-[#24438C] shadow-sm'
                  : 'border-cyan-500/40 text-cyan-200 bg-cyan-950/40 hover:bg-cyan-900/60 hover:text-white shadow-[0_0_10px_rgba(6,182,212,0.15)]'
              }`}
              title="Re-read and refresh Excel workbook while preserving all project configurations"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 mr-1.5 text-cyan-400 animate-spin" />
              ) : (
                <RefreshCw className={`w-4 h-4 mr-1.5 ${hasData ? 'text-emerald-400' : !isDark ? 'text-[#0798D1]' : 'text-cyan-400'}`} />
              )}
              {isUpdating ? 'Updating Excel...' : 'Update Excel'}
            </button>

            {hasData && (
              <button
                onClick={onReset}
                id="btn-reset-project"
                type="button"
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-rose-500/30 shadow-sm text-xs font-medium text-rose-300 bg-rose-950/30 hover:bg-rose-900/60 hover:text-white transition-all cursor-pointer"
                title="Clear current workbook and restart"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1 text-rose-400" />
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

