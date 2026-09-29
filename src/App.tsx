import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { StepProgress } from './components/StepProgress';
import { UploadStep } from './components/UploadStep';
import { ColumnMappingStep } from './components/ColumnMappingStep';
import { SelectionSetsStep } from './components/SelectionSetsStep';
import { ConditionsStep } from './components/ConditionsStep';
import { ClashMatrixStep } from './components/ClashMatrixStep';
import { ClashTestsPreviewStep } from './components/ClashTestsPreviewStep';
import { ValidationStep } from './components/ValidationStep';
import { ExportStep } from './components/ExportStep';
import { PresetsModal } from './components/PresetsModal';
import { XmlTemplateModal } from './components/XmlTemplateModal';
import { UpdateWorkbookModal } from './components/UpdateWorkbookModal';
import { UpdateSummaryModal } from './components/UpdateSummaryModal';
import { UpdateErrorModal } from './components/UpdateErrorModal';
import { BrandingProvider } from './branding/BrandingContext';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { CheckCircle2, X, Grid, GitCompare } from 'lucide-react';
import { XmlComparingTab } from './components/xmlComparing/XmlComparingTab';
import { UserGuideSection } from './components/UserGuideSection';

import { ParsedWorkbook } from './types/excel';
import { SelectionSetConfig, SelectionSet, ViewFolder } from './types/selectionSet';
import { ClashMatrixConfig } from './types/clashTest';
import { ProjectSettings, ExportMode } from './types/configuration';

import { parseExcelBuffer, analyzeColumns, colIndexToLetter } from './excel/parser';
import { cloneStandard8BimConditions } from './selectionSets/standardConditions';
import { createSampleBimClashMatrixWorkbook } from './excel/sampleData';
import { generateSelectionSets } from './selectionSets/selectionSetGenerator';
import { parseClashMatrix } from './clashTests/clashMatrixParser';
import { buildNavisworksXml } from './xml/navisworksXmlBuilder';
import { runFullValidation } from './validation/validationEngine';
import {
  processWorkbookUpdateFile,
  prepareWorkbookUpdate,
  WorkbookUpdateComparison,
} from './excel/workbookUpdater';

type AppTab = 'clash-matrix' | 'xml-comparing';

function AppContent() {
  const { theme, isDark } = useTheme();

  // Top-Level Application Feature Tab
  const [activeTab, setActiveTab] = useState<AppTab>('clash-matrix');

  // Step State (Inside Tab 1: Clash Matrix XML Generation)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Modals
  const [isPresetsOpen, setIsPresetsOpen] = useState<boolean>(false);
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);

  // Update Excel Workflow State & Modals
  const updateFileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [pendingComparison, setPendingComparison] = useState<WorkbookUpdateComparison | null>(null);
  const [isUpdateConfirmOpen, setIsUpdateConfirmOpen] = useState<boolean>(false);
  const [isUpdateSummaryOpen, setIsUpdateSummaryOpen] = useState<boolean>(false);
  const [updateErrorMessage, setUpdateErrorMessage] = useState<string | null>(null);
  const [isUpdateErrorOpen, setIsUpdateErrorOpen] = useState<boolean>(false);
  const [updateToast, setUpdateToast] = useState<{
    message: string;
    details?: { added: number; removed: number; changed: number; rows: number };
  } | null>(null);

  // Auto-dismiss update notification toast after 6 seconds
  useEffect(() => {
    if (updateToast) {
      const timer = setTimeout(() => {
        setUpdateToast(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [updateToast]);

  // Workbook State
  const [workbook, setWorkbook] = useState<ParsedWorkbook | null>(null);

  // Project Settings
  const [projectSettings, setProjectSettings] = useState<ProjectSettings>({
    batchTestName: 'Project11',
    internalName: 'Project11',
    units: 'm',
    filename: '',
    filepath: '',
  });

  const [exportMode, setExportMode] = useState<ExportMode>('full');

  // Selection Set Configuration
  const [selectionSetConfig, setSelectionSetConfig] = useState<SelectionSetConfig>({
    folderColumnLetter: 'D',
    folderColumnIndex: 3,
    nameParts: [
      { columnLetter: 'E', columnIndex: 4, separator: '-' },
      { columnLetter: 'F', columnIndex: 5, separator: '' },
    ],
    nameSeparator: '-',
    conditions: [],
  });

  // Clash Matrix Configuration
  const [clashMatrixConfig, setClashMatrixConfig] = useState<ClashMatrixConfig>({
    rowGroupColumnLetter: 'F',
    rowGroupColumnIndex: 5,
    rowPriorityColumnLetter: 'E',
    rowPriorityColumnIndex: 4,
    columnHeadersRowIndex: 13,
    matrixStartColumnLetter: 'I',
    matrixStartColumnIndex: 8,
    matrixStartRowIndex: 16,
    namingFormat: 'group_v_group',
    hardPrefix: 'H',
    clearancePrefix: 'C',
    unit: 'MM',
    delimiter: '-',
    activeProfileId: 'profile_std_mm',
  });

  // Helper to load workbook and initialize default configs (Initial load only)
  const loadWorkbookAndInit = useCallback((wb: ParsedWorkbook) => {
    setWorkbook(wb);

    // Initialize Selection Sets with standard 8 BIM conditions if not configured
    setSelectionSetConfig((prev) => {
      if (prev.conditions && prev.conditions.length > 0) {
        return prev;
      }
      return {
        ...prev,
        folderColumnLetter: prev.folderColumnLetter || 'D',
        folderColumnIndex: prev.folderColumnIndex !== undefined ? prev.folderColumnIndex : 3,
        nameParts: prev.nameParts && prev.nameParts.length > 0 ? prev.nameParts : [
          { columnLetter: 'E', columnIndex: 4, separator: '-' },
          { columnLetter: 'F', columnIndex: 5, separator: '' },
        ],
        nameSeparator: prev.nameSeparator || '-',
        conditions: cloneStandard8BimConditions(4, 5),
      };
    });

    // The Clash Matrix configuration is 100% USER-CONFIGURED and AUTHORITATIVE.
    // Default initial configuration: F (index 5) / Row 14 (index 13) / Row 17 (index 16) / Column I (index 8).
    // NEVER run auto-detection and NEVER overwrite user-configured coordinates when loading a workbook.
    setClashMatrixConfig((prev) => {
      return {
        ...prev,
        rowGroupColumnLetter: prev.rowGroupColumnLetter || 'F',
        rowGroupColumnIndex: prev.rowGroupColumnIndex !== undefined ? prev.rowGroupColumnIndex : 5,
        rowPriorityColumnLetter: prev.rowPriorityColumnLetter || 'E',
        rowPriorityColumnIndex: prev.rowPriorityColumnIndex !== undefined ? prev.rowPriorityColumnIndex : 4,
        columnHeadersRowIndex: prev.columnHeadersRowIndex !== undefined ? prev.columnHeadersRowIndex : 13,
        matrixStartColumnLetter: prev.matrixStartColumnLetter || 'I',
        matrixStartColumnIndex: prev.matrixStartColumnIndex !== undefined ? prev.matrixStartColumnIndex : 8,
        matrixStartRowIndex: prev.matrixStartRowIndex !== undefined ? prev.matrixStartRowIndex : 16,
        namingFormat: prev.namingFormat || 'group_v_group',
        hardPrefix: prev.hardPrefix || 'H',
        clearancePrefix: prev.clearancePrefix || 'C',
        unit: prev.unit || 'MM',
        delimiter: prev.delimiter !== undefined ? prev.delimiter : '-',
        activeProfileId: prev.activeProfileId || 'profile_std_mm',
      };
    });
  }, []);

  // Handle User File Upload (Step 1 / Initial)
  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const wb = parseExcelBuffer(buffer, file.name);
          loadWorkbookAndInit(wb);
        } catch (err: any) {
          setUpdateErrorMessage(`Failed to parse Excel file: ${err.message || String(err)}`);
          setIsUpdateErrorOpen(true);
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [loadWorkbookAndInit]
  );

  // Trigger Update Excel File Picker
  const handleTriggerUpdateExcel = useCallback(() => {
    if (updateFileInputRef.current) {
      updateFileInputRef.current.value = '';
      updateFileInputRef.current.click();
    }
  }, []);

  // Unified Handle Update Excel File Selected (Supports direct header picker & modal workflows)
  const handleUpdateFileSelected = useCallback(
    (file: File) => {
      setIsUpdating(true);

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const buffer = evt.target?.result as ArrayBuffer;

          // If no workbook is loaded yet, load as initial workbook
          if (!workbook) {
            const wb = parseExcelBuffer(buffer, file.name);
            loadWorkbookAndInit(wb);
            setIsUpdating(false);
            setUpdateToast({
              message: `Workbook "${file.name}" loaded successfully (${wb.totalRows} rows).`,
            });
            return;
          }

          // If workbook is already configured, execute existing update comparison workflow
          const comparison = processWorkbookUpdateFile(
            buffer,
            file.name,
            workbook,
            selectionSetConfig,
            clashMatrixConfig
          );

          // 1. Update the workbook data layer ONLY
          setWorkbook(comparison.updatedWorkbook);

          // 2. Preserve all existing Project Configurations:
          // selectionSetConfig, FindSpec conditions, custom categories, clashMatrixConfig, presets, etc.

          // 3. Keep comparison state ready if user wants to review details
          setPendingComparison(comparison);

          // 4. Show clear, concise confirmation toast with metrics
          setUpdateToast({
            message: `Excel workbook updated successfully.`,
            details: {
              rows: comparison.totalRowsAfter,
              added: comparison.addedElements.length,
              removed: comparison.removedElements.length,
              changed: comparison.changedMatrixValuesCount,
            },
          });

          setIsUpdating(false);
        } catch (err: any) {
          setIsUpdating(false);
          setUpdateErrorMessage(
            `Excel Update Failed: ${err.message || String(err)}. Your current project state remains untouched.`
          );
          setIsUpdateErrorOpen(true);
        }
      };
      reader.onerror = () => {
        setIsUpdating(false);
        setUpdateErrorMessage(
          'Excel Update Failed: Unable to read the selected file. Your current project state remains untouched.'
        );
        setIsUpdateErrorOpen(true);
      };
      reader.readAsArrayBuffer(file);
    },
    [workbook, selectionSetConfig, clashMatrixConfig, loadWorkbookAndInit]
  );

  // Handle Update Excel File Selected from hidden input
  const handleUpdateFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      handleUpdateFileSelected(files[0]);
    },
    [handleUpdateFileSelected]
  );

  // Confirm and Apply Workbook Update (Preserving Project Configurations)
  const handleConfirmWorkbookUpdate = useCallback(
    (_adoptDetectedStructure?: boolean, selectedSheet?: string) => {
      if (!pendingComparison || !workbook) return;

      let finalComparison = pendingComparison;
      if (selectedSheet && selectedSheet !== pendingComparison.targetSheet) {
        finalComparison = prepareWorkbookUpdate(
          workbook,
          pendingComparison.updatedWorkbook,
          selectionSetConfig,
          clashMatrixConfig,
          selectedSheet
        );
      }

      // 1. Update workbook data layer ONLY
      setWorkbook(finalComparison.updatedWorkbook);

      // 2. Active clashMatrixConfig coordinates remain 100% authoritative and strictly preserved!
      // NEVER auto-detect, reset, or overwrite clashMatrixConfig after Update Excel.

      // 3. Keep all selectionSetConfig, FindSpec conditions, custom categories, projectSettings intact!

      // 4. Update comparison state and open summary report
      setPendingComparison(finalComparison);
      setIsUpdateConfirmOpen(false);
      setIsUpdateSummaryOpen(true);
    },
    [pendingComparison, workbook, selectionSetConfig, clashMatrixConfig]
  );

  // Handle Sample Matrix Loading
  const handleLoadSample = useCallback(() => {
    const sampleWb = createSampleBimClashMatrixWorkbook();
    loadWorkbookAndInit(sampleWb);
    setCurrentStep(1);
  }, [loadWorkbookAndInit]);

  // Handle Sheet Change
  const handleSheetChange = useCallback(
    (sheetName: string) => {
      if (!workbook) return;
      const sheetData = workbook.sheetsData[sheetName] || [];
      const cols = analyzeColumns(sheetData, workbook.headerRowIndex);
      const updatedWb: ParsedWorkbook = {
        ...workbook,
        selectedSheet: sheetName,
        columns: cols,
        totalRows: sheetData.length,
        totalCols: cols.length,
      };
      setWorkbook(updatedWb);
      setClashMatrixConfig((prev) => ({
        ...prev,
        sheet: sheetName,
      }));
    },
    [workbook]
  );

  // Handle Header Row Index Change
  const handleHeaderRowChange = useCallback(
    (headerRowIndex: number) => {
      if (!workbook) return;
      const sheetData = workbook.sheetsData[workbook.selectedSheet] || [];
      const cols = analyzeColumns(sheetData, headerRowIndex);
      const updatedWb: ParsedWorkbook = {
        ...workbook,
        headerRowIndex,
        columns: cols,
      };
      setWorkbook(updatedWb);
    },
    [workbook]
  );

  // Reset Project (Project and Excel only, Branding and Admin Auth remain untouched)
  const handleReset = useCallback(() => {
    setWorkbook(null);
    setCurrentStep(1);
  }, []);

  // 1. Compute Selection Sets and View Folders
  const selectionSetResult = useMemo(() => {
    if (!workbook) {
      return {
        selectionSets: [],
        viewFolders: [],
        selectionSetMapByGroup: new Map<string, SelectionSet>(),
        selectionSetMapByName: new Map<string, SelectionSet>(),
        errors: [],
      };
    }
    const currentData = workbook.sheetsData[workbook.selectedSheet] || [];
    return generateSelectionSets(
      currentData,
      selectionSetConfig,
      clashMatrixConfig.matrixStartRowIndex,
      clashMatrixConfig.rowGroupColumnIndex
    );
  }, [workbook, selectionSetConfig, clashMatrixConfig.matrixStartRowIndex, clashMatrixConfig.rowGroupColumnIndex]);

  // 2. Compute Clash Matrix & Clash Tests
  const clashMatrixResult = useMemo(() => {
    if (!workbook) {
      return {
        clashTests: [],
        summary: {
          totalMatrixCells: 0,
          validClashTests: 0,
          hardClashes: 0,
          clearanceClashes: 0,
          ignoredBlank: 0,
          ignoredNA: 0,
          invalidCells: [],
        },
        cellEntries: [],
        matrixGridRowHeaders: [],
        matrixGridColHeaders: [],
        unresolvedPairs: [],
      };
    }
    const currentData = workbook.sheetsData[workbook.selectedSheet] || [];
    const res = parseClashMatrix(
      currentData,
      clashMatrixConfig,
      selectionSetResult.selectionSets,
      selectionSetResult.selectionSetMapByGroup,
      selectionSetResult.selectionSetMapByName
    );
    console.log('[B] App.tsx stores parser result:', {
      count: res.clashTests.length,
      firstTestName: res.clashTests[0]?.name,
    });
    return res;
  }, [workbook, clashMatrixConfig, selectionSetResult]);

  // 3. Compute XML Content
  const generatedXmlString = useMemo(() => {
    return buildNavisworksXml(
      projectSettings,
      selectionSetResult.viewFolders,
      clashMatrixResult.clashTests,
      exportMode
    );
  }, [projectSettings, selectionSetResult.viewFolders, clashMatrixResult.clashTests, exportMode]);

  // 4. Compute Full Project Validation
  const validationSummary = useMemo(() => {
    return runFullValidation(
      workbook,
      selectionSetConfig,
      clashMatrixConfig,
      selectionSetResult.selectionSets,
      selectionSetResult.viewFolders,
      clashMatrixResult.clashTests,
      clashMatrixResult.summary,
      clashMatrixResult.unresolvedPairs,
      projectSettings,
      generatedXmlString
    );
  }, [
    workbook,
    selectionSetConfig,
    clashMatrixConfig,
    selectionSetResult,
    clashMatrixResult,
    projectSettings,
    generatedXmlString,
  ]);

  return (
    <div
      data-theme-root
      className={`min-h-screen ${
        isDark ? 'bg-[#030712] text-slate-100' : 'bg-[#F4F7FA] text-[#17324D]'
      } flex flex-col font-sans selection:bg-[#0798D1] selection:text-white relative overflow-x-hidden transition-colors duration-150`}
    >
      {/* Atmospheric Background Lights & Cyber Grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className={`absolute -top-[15%] -left-[10%] w-[55%] h-[55%] rounded-full ${
            isDark ? 'bg-cyan-500/[0.07]' : 'bg-[#0798D1]/[0.05]'
          } blur-[140px]`}
        />
        <div
          className={`absolute top-[35%] -right-[10%] w-[50%] h-[50%] rounded-full ${
            isDark ? 'bg-indigo-500/[0.06]' : 'bg-[#24438C]/[0.04]'
          } blur-[140px]`}
        />
        <div
          className={`absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] rounded-full ${
            isDark ? 'bg-blue-600/[0.05]' : 'bg-[#173875]/[0.03]'
          } blur-[140px]`}
        />
        <div className={`absolute inset-0 cyber-grid ${isDark ? 'opacity-30' : 'opacity-15'}`} />
      </div>

      {/* Hidden File Input for Update Excel */}
      <input
        type="file"
        ref={updateFileInputRef}
        onChange={handleUpdateFileInputChange}
        accept=".xlsx, .xls"
        className="hidden"
        id="file-input-update-excel"
      />

      {/* App Header */}
      <Header
        onLoadSample={handleLoadSample}
        onUpdateExcel={handleTriggerUpdateExcel}
        onUpdateFileSelected={handleUpdateFileSelected}
        isUpdating={isUpdating}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onOpenTemplate={() => setIsTemplateOpen(true)}
        onReset={handleReset}
        hasData={!!workbook}
        currentWorkbookName={workbook?.fileName}
      />

      {/* Success / Notification Toast */}
      {updateToast && (
        <aside
          role="status"
          aria-live="polite"
          id="toast-update-notification"
          className="fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-2xl bg-[#090F1E]/95 border border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.35)] backdrop-blur-xl flex items-start gap-3.5 animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-semibold text-emerald-200 text-sm leading-tight">
              {updateToast.message}
            </div>
            {updateToast.details && (
              <div className="mt-2 text-slate-300 flex flex-wrap gap-x-3.5 gap-y-1 font-mono text-[11px] bg-slate-900/60 p-2 rounded-lg border border-white/[0.06]">
                <span>
                  Total Rows: <strong className="text-emerald-300">{updateToast.details.rows}</strong>
                </span>
                <span>
                  Added: <strong className="text-cyan-300">+{updateToast.details.added}</strong>
                </span>
                <span>
                  Removed: <strong className="text-rose-300">-{updateToast.details.removed}</strong>
                </span>
                <span>
                  Matrix Changes: <strong className="text-amber-300">{updateToast.details.changed}</strong>
                </span>
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1.5">
              All column mappings, naming rules, FindSpec conditions, and project presets remain active.
            </p>
          </div>
          <button
            onClick={() => setUpdateToast(null)}
            type="button"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </aside>
      )}

      {/* Top-Level Feature Tabs: Tab 1 = Clash Matrix XML Generation [FROZEN], Tab 2 = XML Comparing [FUTURE] */}
      <div
        className={`border-b ${
          isDark ? 'border-white/[0.08] bg-[#060C1A]/95' : 'border-[#D9E2EC] bg-white/95'
        } backdrop-blur-md px-4 sm:px-6 lg:px-8`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <nav className="flex items-center space-x-1 sm:space-x-2" aria-label="Application Features">
            {/* TAB 1: Clash Matrix XML Generation */}
            <button
              type="button"
              id="tab-clash-matrix"
              onClick={() => setActiveTab('clash-matrix')}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'clash-matrix'
                  ? isDark
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                    : 'border-[#24438C] text-[#24438C] bg-[#F0F6FC]'
                  : isDark
                  ? 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  : 'border-transparent text-[#5B6B7A] hover:text-[#17324D] hover:border-[#D9E2EC]'
              }`}
            >
              <Grid className={`w-4 h-4 ${isDark ? 'text-cyan-400' : 'text-[#24438C]'}`} />
              <span>Clash Matrix XML Generation</span>
            </button>

            {/* TAB 2: XML Comparing */}
            <button
              type="button"
              id="tab-xml-comparing"
              onClick={() => setActiveTab('xml-comparing')}
              className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-semibold text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'xml-comparing'
                  ? isDark
                    ? 'border-indigo-400 text-indigo-300 bg-indigo-950/20'
                    : 'border-[#0798D1] text-[#0798D1] bg-[#F0F6FC]'
                  : isDark
                  ? 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  : 'border-transparent text-[#5B6B7A] hover:text-[#17324D] hover:border-[#D9E2EC]'
              }`}
            >
              <GitCompare className={`w-4 h-4 ${isDark ? 'text-indigo-400' : 'text-[#0798D1]'}`} />
              <span>XML Comparing</span>
            </button>
          </nav>

          {/* Baseline Checkpoint Badge */}
          <div
            className={`hidden md:flex items-center text-[11px] font-mono ${
              isDark ? 'text-slate-400' : 'text-[#5B6B7A]'
            } gap-1.5 py-2`}
          >
            <span className={isDark ? 'text-slate-500' : 'text-[#7A8B9C]'}>Baseline:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded border ${
                isDark
                  ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              }`}
            >
              CLASH_MATRIX_XML_GENERATION_V1
            </span>
          </div>
        </div>
      </div>

      {/* Feature Content Switching */}
      {activeTab === 'clash-matrix' ? (
        <>
          {/* Stepper Navigation */}
          <StepProgress
            currentStep={currentStep}
            onSelectStep={setCurrentStep}
            validationSummary={validationSummary}
            isWorkbookLoaded={!!workbook}
          />

          {/* Main Wizard Content Area */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
            {currentStep === 1 && (
              <UploadStep
                workbook={workbook}
                onFileUpload={handleFileUpload}
                onSheetChange={handleSheetChange}
                onHeaderRowChange={handleHeaderRowChange}
                onLoadSample={handleLoadSample}
                onNext={() => setCurrentStep(2)}
              />
            )}

            {currentStep === 2 && workbook && (
              <ColumnMappingStep
                workbook={workbook}
                selectionSetConfig={selectionSetConfig}
                clashMatrixConfig={clashMatrixConfig}
                onUpdateSelectionSetConfig={setSelectionSetConfig}
                onUpdateClashMatrixConfig={setClashMatrixConfig}
                onPrev={() => setCurrentStep(1)}
                onNext={() => setCurrentStep(3)}
              />
            )}

            {currentStep === 3 && (
              <SelectionSetsStep
                viewFolders={selectionSetResult.viewFolders}
                selectionSets={selectionSetResult.selectionSets}
                onPrev={() => setCurrentStep(2)}
                onNext={() => setCurrentStep(4)}
              />
            )}

            {currentStep === 4 && workbook && (
              <ConditionsStep
                workbook={workbook}
                selectionSetConfig={selectionSetConfig}
                onUpdateConditions={(conds) =>
                  setSelectionSetConfig((prev) => ({ ...prev, conditions: conds }))
                }
                onPrev={() => setCurrentStep(3)}
                onNext={() => setCurrentStep(5)}
              />
            )}

            {currentStep === 5 && workbook && (
              <ClashMatrixStep
                workbook={workbook}
                clashMatrixConfig={clashMatrixConfig}
                matrixSummary={clashMatrixResult.summary}
                matrixCellEntries={clashMatrixResult.cellEntries}
                matrixGridRowHeaders={clashMatrixResult.matrixGridRowHeaders}
                matrixGridColHeaders={clashMatrixResult.matrixGridColHeaders}
                selectionSets={selectionSetResult.selectionSets}
                onUpdateClashMatrixConfig={setClashMatrixConfig}
                onSheetChange={handleSheetChange}
                onPrev={() => setCurrentStep(4)}
                onNext={() => setCurrentStep(6)}
              />
            )}

            {currentStep === 6 && (
              <ClashTestsPreviewStep
                clashTests={clashMatrixResult.clashTests}
                matrixSummary={clashMatrixResult.summary}
                viewFolders={selectionSetResult.viewFolders}
                onPrev={() => setCurrentStep(5)}
                onNext={() => setCurrentStep(7)}
              />
            )}

            {currentStep === 7 && (
              <ValidationStep
                validationSummary={validationSummary}
                onNavigateToStep={(step) => setCurrentStep(step)}
                onPrev={() => setCurrentStep(6)}
                onNext={() => setCurrentStep(8)}
              />
            )}

            {currentStep === 8 && (
              <ExportStep
                projectSettings={projectSettings}
                viewFolders={selectionSetResult.viewFolders}
                clashTests={clashMatrixResult.clashTests}
                exportMode={exportMode}
                onUpdateProjectSettings={(updates) =>
                  setProjectSettings((prev) => ({ ...prev, ...updates }))
                }
                onUpdateExportMode={setExportMode}
                onPrev={() => setCurrentStep(7)}
              />
            )}

            {/* Interactive User Guide & BIM Standards Reference */}
            <UserGuideSection
              activeTab="matrix"
              hardPrefix={clashMatrixConfig.hardPrefix}
              clearancePrefix={clashMatrixConfig.clearancePrefix}
              unit={clashMatrixConfig.unit}
            />
          </main>
        </>
      ) : (
        <div className="flex-1 flex flex-col">
          <XmlComparingTab />
          <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <UserGuideSection
              activeTab="comparing"
              hardPrefix={clashMatrixConfig.hardPrefix}
              clearancePrefix={clashMatrixConfig.clearancePrefix}
              unit={clashMatrixConfig.unit}
            />
          </div>
        </div>
      )}

      {/* Telemetry Status Footer */}
      <footer
        className={`border-t ${
          isDark ? 'border-white/[0.06] bg-[#070D1B]/90 text-slate-400' : 'border-[#D9E2EC] bg-white/95 text-[#5B6B7A]'
        } backdrop-blur-md px-4 py-2.5 relative z-10 text-xs`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-3 font-mono text-[11px]">
            <span className={`flex items-center ${isDark ? 'text-slate-400' : 'text-[#5B6B7A]'}`}>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isDark ? 'bg-cyan-400' : 'bg-[#0798D1]'
                } animate-pulse mr-1.5`}
              ></span>
              {workbook ? `Active: ${workbook.fileName} [${workbook.selectedSheet}]` : 'Awaiting Matrix Upload'}
            </span>
            {workbook && (
              <>
                <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>|</span>
                <span className={isDark ? 'text-cyan-300' : 'text-[#0798D1] font-medium'}>
                  {selectionSetResult.selectionSets.length} Sets
                </span>
                <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>|</span>
                <span className={isDark ? 'text-emerald-300' : 'text-emerald-600 font-medium'}>
                  {clashMatrixResult.clashTests.length} Tests
                </span>
                <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>|</span>
                <span className={isDark ? 'text-slate-300' : 'text-[#17324D]'}>
                  Units: {projectSettings.units}
                </span>
              </>
            )}
          </div>

          <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-[#5B6B7A]'} flex items-center space-x-2`}>
            <span>Autodesk Navisworks Clash Detective XML Standard</span>
            <span
              className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${
                isDark
                  ? 'bg-white/[0.05] border-white/[0.08] text-slate-300'
                  : 'bg-[#F4F7FA] border-[#D9E2EC] text-[#17324D]'
              }`}
            >
              v2024–2026
            </span>
          </div>
        </div>
      </footer>

      {/* Property Presets Modal */}
      <PresetsModal isOpen={isPresetsOpen} onClose={() => setIsPresetsOpen(false)} />

      {/* XML Template Modal */}
      <XmlTemplateModal
        isOpen={isTemplateOpen}
        onClose={() => setIsTemplateOpen(false)}
        onApplyTemplateSettings={(settings) => {
          setProjectSettings((prev) => ({
            ...prev,
            batchTestName: settings.batchTestName,
            internalName: settings.batchTestName,
            units: settings.units as any,
          }));
        }}
      />

      {/* Update Excel Confirmation Modal */}
      <UpdateWorkbookModal
        isOpen={isUpdateConfirmOpen}
        comparison={pendingComparison}
        onConfirm={handleConfirmWorkbookUpdate}
        onCancel={() => setIsUpdateConfirmOpen(false)}
      />

      {/* Update Excel Change Summary Modal */}
      <UpdateSummaryModal
        isOpen={isUpdateSummaryOpen}
        comparison={pendingComparison}
        onClose={() => setIsUpdateSummaryOpen(false)}
      />

      {/* Update Excel Error Modal */}
      <UpdateErrorModal
        isOpen={isUpdateErrorOpen}
        errorMessage={updateErrorMessage}
        onClose={() => setIsUpdateErrorOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <BrandingProvider>
        <AppContent />
      </BrandingProvider>
    </ThemeProvider>
  );
}

export default App;
