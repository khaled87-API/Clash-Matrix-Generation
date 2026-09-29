import { ParsedWorkbook, ColumnSummary } from '../types/excel';
import { SelectionSetConfig, SelectionSet } from '../types/selectionSet';
import { ClashMatrixConfig, ClashTest } from '../types/clashTest';
import { analyzeColumns, colIndexToLetter, parseExcelBuffer } from './parser';
import { autoDetectMatrixStructure } from './matrixDetector';
import { generateSelectionSets } from '../selectionSets/selectionSetGenerator';
import { parseClashMatrix } from '../clashTests/clashMatrixParser';

export interface ToleranceChange {
  testName: string;
  leftGroup: string;
  rightGroup: string;
  oldTolerance: string;
  newTolerance: string;
}

export interface WorkbookUpdateComparison {
  previousFileName: string;
  newFileName: string;
  targetSheet: string;
  sheetPreserved: boolean;
  availableSheets: string[];
  totalRowsBefore: number;
  totalRowsAfter: number;
  elementsBefore: string[];
  elementsAfter: string[];
  addedElements: string[];
  removedElements: string[];
  unchangedElements: string[];
  selectionSetsCountBefore: number;
  selectionSetsCountAfter: number;
  clashTestsCountBefore: number;
  clashTestsCountAfter: number;
  changedMatrixValuesCount: number;
  toleranceChanges: ToleranceChange[];
  columnWarnings: string[];
  structureWarnings: string[];
  matrixStructureChanged: boolean;
  matrixStructureDiffMessage?: string;
  updatedWorkbook: ParsedWorkbook;
}

/**
 * Validates and compares an updated Excel workbook against the current project configuration and data
 */
export function prepareWorkbookUpdate(
  currentWb: ParsedWorkbook,
  newWb: ParsedWorkbook,
  selectionSetConfig: SelectionSetConfig,
  clashMatrixConfig: ClashMatrixConfig,
  forcedSheetName?: string
): WorkbookUpdateComparison {
  // 1. Resolve Target Sheet
  const availableSheets = newWb.sheetNames;
  let targetSheet = forcedSheetName || currentWb.selectedSheet;
  let sheetPreserved = true;

  if (!availableSheets.includes(targetSheet)) {
    sheetPreserved = false;
    targetSheet = availableSheets[0] || '';
  }

  // 2. Prepare the updated ParsedWorkbook for the target sheet
  const newSheetData = newWb.sheetsData[targetSheet] || [];
  const headerRow =
    currentWb.headerRowIndex < newSheetData.length
      ? currentWb.headerRowIndex
      : Math.min(newSheetData.length - 1, 0);

  const columns = analyzeColumns(newSheetData, headerRow);
  const totalRows = newSheetData.length;
  const totalCols = columns.length;

  const resolvedUpdatedWb: ParsedWorkbook = {
    ...newWb,
    selectedSheet: targetSheet,
    headerRowIndex: headerRow,
    columns,
    totalRows,
    totalCols,
  };

  // 3. Check Column Mappings
  const columnWarnings: string[] = [];
  const maxColIndex = columns.length - 1;

  if (selectionSetConfig.folderColumnIndex > maxColIndex) {
    columnWarnings.push(
      `Folder column (${selectionSetConfig.folderColumnLetter}) is out of bounds in the updated sheet (max column: ${colIndexToLetter(maxColIndex)}).`
    );
  }

  for (const part of selectionSetConfig.nameParts) {
    if (part.columnIndex > maxColIndex) {
      columnWarnings.push(
        `Selection Set naming column (${part.columnLetter}) is out of bounds in the updated sheet.`
      );
    }
  }

  for (const cond of selectionSetConfig.conditions) {
    if (cond.excelColumnIndex > maxColIndex) {
      columnWarnings.push(
        `FindSpec Condition source column (${cond.excelColumnLetter} - ${cond.propertyDisplayName}) is out of bounds in the updated sheet.`
      );
    }
  }

  if (clashMatrixConfig.rowGroupColumnIndex > maxColIndex) {
    columnWarnings.push(
      `Matrix Element ID column (${clashMatrixConfig.rowGroupColumnLetter}) is out of bounds in the updated sheet.`
    );
  }

  if (clashMatrixConfig.rowPriorityColumnIndex > maxColIndex) {
    columnWarnings.push(
      `Matrix Priority column (${clashMatrixConfig.rowPriorityColumnLetter}) is out of bounds in the updated sheet.`
    );
  }

  if (clashMatrixConfig.matrixStartColumnIndex > maxColIndex) {
    columnWarnings.push(
      `Matrix start column (${clashMatrixConfig.matrixStartColumnLetter}) is out of bounds in the updated sheet.`
    );
  }

  // 4. Matrix Structure Comparison
  const structureWarnings: string[] = [];
  let matrixStructureChanged = false;
  let matrixStructureDiffMessage: string | undefined;

  const detected = autoDetectMatrixStructure(newSheetData, columns, headerRow);
  if (
    detected.suggestedGroupColIndex !== clashMatrixConfig.rowGroupColumnIndex ||
    detected.suggestedHeadersRowIndex !== clashMatrixConfig.columnHeadersRowIndex ||
    detected.suggestedMatrixStartColIndex !== clashMatrixConfig.matrixStartColumnIndex
  ) {
    const prevGroupLetter = colIndexToLetter(clashMatrixConfig.rowGroupColumnIndex);
    const prevStartColLetter = colIndexToLetter(clashMatrixConfig.matrixStartColumnIndex);
    const detGroupLetter = colIndexToLetter(detected.suggestedGroupColIndex);
    const detStartColLetter = colIndexToLetter(detected.suggestedMatrixStartColIndex);

    matrixStructureChanged = true;
    matrixStructureDiffMessage = `Matrix structure change detected: Previous: Col ${prevGroupLetter} / Row ${clashMatrixConfig.columnHeadersRowIndex + 1} / Start Col ${prevStartColLetter}. Detected: Col ${detGroupLetter} / Row ${detected.suggestedHeadersRowIndex + 1} / Start Col ${detStartColLetter}.`;
    structureWarnings.push(matrixStructureDiffMessage);
  }

  if (clashMatrixConfig.columnHeadersRowIndex >= newSheetData.length) {
    structureWarnings.push(
      `Configured Column Headers Row (Row ${clashMatrixConfig.columnHeadersRowIndex + 1}) exceeds updated sheet row count (${newSheetData.length}).`
    );
  }
  if (clashMatrixConfig.matrixStartRowIndex >= newSheetData.length) {
    structureWarnings.push(
      `Configured Matrix Start Row (Row ${clashMatrixConfig.matrixStartRowIndex + 1}) exceeds updated sheet row count (${newSheetData.length}).`
    );
  }

  // 5. Generate Selection Sets and Clash Tests for Old vs New
  const oldData = currentWb.sheetsData[currentWb.selectedSheet] || [];
  const oldSetsResult = generateSelectionSets(
    oldData,
    selectionSetConfig,
    clashMatrixConfig.matrixStartRowIndex,
    clashMatrixConfig.rowGroupColumnIndex
  );

  const oldMatrixResult = parseClashMatrix(
    oldData,
    clashMatrixConfig,
    oldSetsResult.selectionSets,
    oldSetsResult.selectionSetMapByGroup,
    oldSetsResult.selectionSetMapByName
  );

  const newSetsResult = generateSelectionSets(
    newSheetData,
    selectionSetConfig,
    clashMatrixConfig.matrixStartRowIndex,
    clashMatrixConfig.rowGroupColumnIndex
  );

  const newMatrixResult = parseClashMatrix(
    newSheetData,
    clashMatrixConfig,
    newSetsResult.selectionSets,
    newSetsResult.selectionSetMapByGroup,
    newSetsResult.selectionSetMapByName
  );

  // 6. Compute Elements Diff
  const elementsBefore = Array.from(
    new Set(oldSetsResult.selectionSets.map((s) => s.clashGroup).filter(Boolean))
  ).sort();

  const elementsAfter = Array.from(
    new Set(newSetsResult.selectionSets.map((s) => s.clashGroup).filter(Boolean))
  ).sort();

  const addedElements = elementsAfter.filter((el) => !elementsBefore.includes(el));
  const removedElements = elementsBefore.filter((el) => !elementsAfter.includes(el));
  const unchangedElements = elementsAfter.filter((el) => elementsBefore.includes(el));

  // 7. Compute Clash Tests and Tolerance Diff
  const oldTestsMap = new Map<string, ClashTest>();
  for (const t of oldMatrixResult.clashTests) {
    oldTestsMap.set(t.name, t);
  }

  const toleranceChanges: ToleranceChange[] = [];
  let changedMatrixValuesCount = 0;

  for (const newTest of newMatrixResult.clashTests) {
    const oldTest = oldTestsMap.get(newTest.name);
    if (oldTest) {
      if (oldTest.toleranceMeters !== newTest.toleranceMeters || oldTest.testType !== newTest.testType) {
        changedMatrixValuesCount++;
        toleranceChanges.push({
          testName: newTest.name,
          leftGroup: newTest.leftGroup,
          rightGroup: newTest.rightGroup,
          oldTolerance: `${oldTest.testType} ${oldTest.toleranceMeters}m`,
          newTolerance: `${newTest.testType} ${newTest.toleranceMeters}m`,
        });
      }
    }
  }

  return {
    previousFileName: currentWb.fileName,
    newFileName: newWb.fileName,
    targetSheet,
    sheetPreserved,
    availableSheets,
    totalRowsBefore: currentWb.totalRows,
    totalRowsAfter: totalRows,
    elementsBefore,
    elementsAfter,
    addedElements,
    removedElements,
    unchangedElements,
    selectionSetsCountBefore: oldSetsResult.selectionSets.length,
    selectionSetsCountAfter: newSetsResult.selectionSets.length,
    clashTestsCountBefore: oldMatrixResult.clashTests.length,
    clashTestsCountAfter: newMatrixResult.clashTests.length,
    changedMatrixValuesCount,
    toleranceChanges,
    columnWarnings,
    structureWarnings,
    matrixStructureChanged,
    matrixStructureDiffMessage,
    updatedWorkbook: resolvedUpdatedWb,
  };
}

/**
 * Parses buffer and prepares update comparison safely
 */
export function processWorkbookUpdateFile(
  buffer: ArrayBuffer | Uint8Array,
  fileName: string,
  currentWb: ParsedWorkbook,
  selectionSetConfig: SelectionSetConfig,
  clashMatrixConfig: ClashMatrixConfig
): WorkbookUpdateComparison {
  const newParsedWb = parseExcelBuffer(buffer, fileName);
  return prepareWorkbookUpdate(currentWb, newParsedWb, selectionSetConfig, clashMatrixConfig);
}
