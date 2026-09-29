import { v4 as uuidv4 } from 'uuid';
import {
  ClashMatrixConfig,
  ClashTest,
  ClashMatrixCellEntry,
  ClashMatrixSummary,
  ParsedClashCell,
} from '../types/clashTest';
import { SelectionSet } from '../types/selectionSet';
import { parseClashValue, formatToleranceToNavisworksMeters } from './toleranceParser';
import { formatCellAddress, colIndexToLetter } from '../excel/parser';

export interface ClashMatrixParseResult {
  clashTests: ClashTest[];
  summary: ClashMatrixSummary;
  cellEntries: ClashMatrixCellEntry[];
  matrixGridRowHeaders: { rowIndex: number; group: string; name: string; folder: string }[];
  matrixGridColHeaders: { colIndex: number; letter: string; headerText: string; group: string; name: string; folder: string }[];
  unresolvedPairs: { row: number; col: number; cellAddress: string; reason: string }[];
}

/**
 * Parses the 2D matrix area in the sheet, mapping row and column intersections to Navisworks Clash Tests
 */
export function parseClashMatrix(
  data: any[][],
  config: ClashMatrixConfig,
  selectionSets: SelectionSet[],
  selectionSetMapByGroup: Map<string, SelectionSet>,
  selectionSetMapByName: Map<string, SelectionSet>
): ClashMatrixParseResult {
  // Required runtime debugging: trace actual runtime coordinate values
  console.log('[parseClashMatrix] Active Runtime Configuration:', {
    rowGroupColumnIndex: config.rowGroupColumnIndex,
    columnHeadersRowIndex: config.columnHeadersRowIndex,
    matrixStartRowIndex: config.matrixStartRowIndex,
    matrixStartColumnIndex: config.matrixStartColumnIndex,
  });

  const clashTests: ClashTest[] = [];
  const cellEntries: ClashMatrixCellEntry[] = [];
  const invalidCells: ParsedClashCell[] = [];
  const unresolvedPairs: { row: number; col: number; cellAddress: string; reason: string }[] = [];

  let hardClashes = 0;
  let clearanceClashes = 0;
  let ignoredBlank = 0;
  let ignoredNA = 0;
  let totalMatrixCells = 0;

  const formatOptions = {
    hardPrefix: config.hardPrefix,
    clearancePrefix: config.clearancePrefix,
    unit: config.unit,
    delimiter: config.delimiter,
  };

  // 1. Build map of source row indices to SelectionSets
  const rowToSelectionSetMap = new Map<number, SelectionSet>();
  selectionSets.forEach((ss) => {
    rowToSelectionSetMap.set(ss.sourceRowIndex, ss);
  });

  // Helper to resolve Selection Set by Element ID / Group or Name
  const resolveSelectionSet = (idOrName: string, rowIndex?: number): SelectionSet | undefined => {
    if (!idOrName && rowIndex !== undefined) {
      return rowToSelectionSetMap.get(rowIndex);
    }
    if (!idOrName) return undefined;

    const trimmed = idOrName.trim();
    if (selectionSetMapByGroup.has(trimmed)) {
      return selectionSetMapByGroup.get(trimmed);
    }
    if (selectionSetMapByName.has(trimmed)) {
      return selectionSetMapByName.get(trimmed);
    }

    // Suffix match (e.g. "A-HW0010" matching "HW0010")
    const matched = selectionSets.find(
      (s) =>
        s.clashGroup === trimmed ||
        s.name === trimmed ||
        s.name.endsWith(`-${trimmed}`) ||
        s.name.endsWith(`_${trimmed}`) ||
        s.name === trimmed.replace(/^[A-Z]-/i, '')
    );
    if (matched) return matched;

    if (rowIndex !== undefined && rowToSelectionSetMap.has(rowIndex)) {
      return rowToSelectionSetMap.get(rowIndex);
    }

    return undefined;
  };

  // 2. Identify and resolve Column Selection Sets
  const maxCol = data.reduce((max, r) => Math.max(max, r ? r.length : 0), 0);
  const headerRow = data[config.columnHeadersRowIndex] || [];

  const matrixGridColHeaders: {
    colIndex: number;
    letter: string;
    headerText: string;
    group: string;
    name: string;
    folder: string;
  }[] = [];

  const colToSelectionSetMap = new Map<number, SelectionSet>();

  // Determine selection set for each matrix column
  for (let c = config.matrixStartColumnIndex; c < maxCol; c++) {
    const rawH = headerRow[c];
    const columnElementId = rawH !== undefined && rawH !== null ? String(rawH).trim() : '';
    const colLetter = colIndexToLetter(c);

    let matchedSet: SelectionSet | undefined = undefined;
    if (columnElementId) {
      matchedSet = resolveSelectionSet(columnElementId);
      if (matchedSet) {
        colToSelectionSetMap.set(c, matchedSet);
      }
    }

    matrixGridColHeaders.push({
      colIndex: c,
      letter: colLetter,
      headerText: columnElementId || `Col ${colLetter}`,
      group: columnElementId,
      name: matchedSet ? matchedSet.name : columnElementId,
      folder: matchedSet ? matchedSet.folder : '',
    });
  }

  // 3. Grid Row Headers
  const matrixGridRowHeaders: { rowIndex: number; group: string; name: string; folder: string }[] = [];

  // 4. Iterate over matrix rows and columns
  const seenTestNames = new Set<string>();

  for (let r = config.matrixStartRowIndex; r < data.length; r++) {
    const row = data[r];
    if (!row || !Array.isArray(row)) continue;

    // Check row element identifier directly from active rowGroupColumnIndex
    const rawRowElem = config.rowGroupColumnIndex !== undefined ? row[config.rowGroupColumnIndex] : undefined;
    const rowElementId = rawRowElem !== undefined && rawRowElem !== null ? String(rawRowElem).trim() : '';

    // If configured row ID cell is empty, skip row with no fallbacks
    if (!rowElementId) {
      continue;
    }

    const activeRowId = rowElementId;
    const leftSet = resolveSelectionSet(rowElementId, r);

    matrixGridRowHeaders.push({
      rowIndex: r,
      group: activeRowId,
      name: leftSet ? leftSet.name : activeRowId,
      folder: leftSet ? leftSet.folder : '',
    });

    for (let c = config.matrixStartColumnIndex; c < maxCol; c++) {
      totalMatrixCells++;
      const cellAddress = formatCellAddress(r, c);
      const rawVal = row[c];
      const parsed = parseClashValue(rawVal, formatOptions, cellAddress, r, c);

      const rawColH = headerRow[c];
      const columnElementId = rawColH !== undefined && rawColH !== null ? String(rawColH).trim() : '';
      const activeColId = columnElementId;
      const rightSet = colToSelectionSetMap.get(c);

      const entry: ClashMatrixCellEntry = {
        rowIndex: r,
        colIndex: c,
        cellAddress,
        rowGroup: activeRowId,
        colGroup: activeColId,
        rowSelectionSetName: leftSet ? leftSet.name : activeRowId,
        colSelectionSetName: rightSet ? rightSet.name : activeColId,
        rowFolder: leftSet ? leftSet.folder : '',
        colFolder: rightSet ? rightSet.folder : '',
        parsedCell: parsed,
      };

      if (parsed.ignored) {
        if (parsed.ignoredReason === 'blank') {
          ignoredBlank++;
        } else {
          ignoredNA++;
        }
        cellEntries.push(entry);
        continue;
      }

      if (parsed.error) {
        invalidCells.push(parsed);
        cellEntries.push(entry);
        continue;
      }

      // If the column header cell has no Element ID, skip cell
      if (!activeColId) {
        unresolvedPairs.push({
          row: r + 1,
          col: c + 1,
          cellAddress,
          reason: `Matrix cell ${cellAddress}: Column Header at Row ${config.columnHeadersRowIndex + 1}, Column ${colIndexToLetter(c)} has no Element ID.`,
        });
        cellEntries.push(entry);
        continue;
      }

      // Check if both selection sets are resolved
      if (!leftSet || !rightSet) {
        const missingPart = !leftSet && !rightSet
          ? `both row Element "${activeRowId}" and column Element "${activeColId}"`
          : !leftSet
          ? `row Element "${activeRowId}"`
          : `column Element "${activeColId}"`;

        unresolvedPairs.push({
          row: r + 1,
          col: c + 1,
          cellAddress,
          reason: `Matrix cell ${cellAddress}: Row Element = ${activeRowId}, Column Element = ${activeColId}, Value = ${parsed.raw}. Selection Set for ${missingPart} could not be resolved.`,
        });
      }

      // Valid Clash Test Definition
      const isSelfClash = activeRowId === activeColId || (leftSet && rightSet && (leftSet.id === rightSet.id || (leftSet.name === rightSet.name && leftSet.folder === rightSet.folder)));

      // Clash Test naming format: e.g. "HW0020_v_HW0010" or "EL002_v_EL001"
      let testName = '';
      if (config.namingFormat === 'full_v_full' && leftSet && rightSet) {
        testName = `${leftSet.name}_v_${rightSet.name}`;
      } else {
        testName = `${activeRowId}_v_${activeColId}`;
      }

      const leftFolderName = leftSet ? leftSet.folder : '';
      const rightFolderName = rightSet ? rightSet.folder : '';

      // Ensure uniqueness if duplicate name occurs
      if (seenTestNames.has(testName)) {
        testName = `${testName}_${leftFolderName || 'L'}_${rightFolderName || 'R'}`;
      }
      seenTestNames.add(testName);

      const toleranceMm = parsed.toleranceMm || 500;
      const toleranceMeters = parsed.toleranceMeters || toleranceMm / 1000.0;
      const toleranceFormatted = formatToleranceToNavisworksMeters(toleranceMeters);

      const leftSetName = leftSet ? leftSet.name : activeRowId;
      const leftLocator = leftSet ? leftSet.locator : (leftFolderName ? `lcop_selection_set_tree/${leftFolderName}/${leftSetName}` : `lcop_selection_set_tree/${leftSetName}`);

      const rightSetName = rightSet ? rightSet.name : activeColId;
      const rightLocator = rightSet ? rightSet.locator : (rightFolderName ? `lcop_selection_set_tree/${rightFolderName}/${rightSetName}` : `lcop_selection_set_tree/${rightSetName}`);

      const clashTest: ClashTest = {
        id: `ct_${r}_${c}_${uuidv4().slice(0, 8)}`,
        name: testName,
        testType: parsed.type!,
        status: 'new',
        toleranceMm,
        toleranceMeters,
        toleranceFormatted,
        leftSelectionSet: leftSetName,
        leftFolder: leftFolderName,
        leftLocator,
        leftGroup: activeRowId,
        rightSelectionSet: rightSetName,
        rightFolder: rightFolderName,
        rightLocator,
        rightGroup: activeColId,
        matrixRow: r,
        matrixCol: c,
        cellAddress,
        isSelfClash: !!isSelfClash,
      };

      if (parsed.type === 'hard') {
        hardClashes++;
      } else if (parsed.type === 'clearance') {
        clearanceClashes++;
      }

      entry.clashTest = clashTest;
      clashTests.push(clashTest);
      cellEntries.push(entry);
    }
  }

  const summary: ClashMatrixSummary = {
    totalMatrixCells,
    validClashTests: clashTests.length,
    hardClashes,
    clearanceClashes,
    ignoredBlank,
    ignoredNA,
    invalidCells,
  };

  console.log('[A] parseClashMatrix() output:', {
    count: clashTests.length,
    firstTest: clashTests[0],
    lastTest: clashTests[clashTests.length - 1],
    sampleNames: clashTests.slice(0, 5).map((t) => t.name),
  });

  return {
    clashTests,
    summary,
    cellEntries,
    matrixGridRowHeaders,
    matrixGridColHeaders,
    unresolvedPairs,
  };
}
