import { ColumnSummary } from '../types/excel';
import { ClashMatrixConfig, ClashMatrixColumnHeader } from '../types/clashTest';
import { SelectionSetConfig } from '../types/selectionSet';
import { parseClashCell } from '../clashTests/toleranceParser';
import { colIndexToLetter } from './parser';
import { cloneStandard8BimConditions } from '../selectionSets/standardConditions';

export interface AutoDetectedMatrixInfo {
  suggestedFolderColIndex: number;
  suggestedPriorityColIndex: number;
  suggestedGroupColIndex: number;
  suggestedElementColIndex: number;
  suggestedMatrixStartColIndex: number;
  suggestedMatrixStartRowIndex: number;
  suggestedHeadersRowIndex: number;
  confidenceScore: number;
  matrixColumnHeaders: ClashMatrixColumnHeader[];
}

/**
 * Validates whether a value matches a standard BIM Element ID pattern
 * (e.g. HW0010, AR0020, ST0510, HV1010, WS2010, DN2510, FP3010, EL4010)
 */
export function isElementId(val: any): boolean {
  if (val === undefined || val === null) return false;
  const str = String(val).trim();
  if (!str || str.length < 3 || str.length > 20) return false;
  
  // Exclude classification codes like Pr_35_31_14, Ss_25_10_20
  if (/^(Pr|Ss|EF|En|Ac|SL|PM)_[0-9]{2}_/i.test(str)) {
    return false;
  }

  // Must contain letter prefix + digits, no spaces, commas or general prose
  // e.g. HW0010, HW0020, AR0010, ST0510, BS0010, HW-0010, HW_0010
  if (/^[A-Za-z]{1,5}[-_]?\d{2,7}[A-Za-z0-9_-]*$/.test(str)) {
    return true;
  }
  return false;
}

/**
 * Automatically inspects the sheet data and column summaries to detect BIM Clash Matrix structure
 */
export function autoDetectMatrixStructure(
  data: any[][],
  columns: ColumnSummary[],
  headerRowIndex: number
): AutoDetectedMatrixInfo {
  // 1. Detect matrix intersection bounds:
  // We scan rows to identify true matrix rows (which contain multiple clash cells, e.g. "H-400", "C-100").
  // This avoids falsely latching onto stray words or single legend cells in document title/notes rows.
  const rowClashStats: { rowIndex: number; count: number; minCol: number }[] = [];

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!row || !Array.isArray(row)) continue;

    let clashCount = 0;
    let minCol = -1;

    for (let c = 0; c < row.length; c++) {
      const cellVal = row[c];
      if (cellVal !== undefined && cellVal !== null) {
        const str = String(cellVal).trim();
        const parsed = parseClashCell(str);
        if (parsed.type === 'hard' || parsed.type === 'clearance') {
          clashCount++;
          if (minCol === -1 || c < minCol) {
            minCol = c;
          }
        }
      }
    }

    if (clashCount > 0) {
      rowClashStats.push({ rowIndex: r, count: clashCount, minCol });
    }
  }

  // A true clash matrix contains rows with multiple clash intersections across columns.
  const multiClashRows = rowClashStats.filter((item) => item.count >= 2);
  let firstClashRow = -1;
  let firstClashCol = -1;

  if (multiClashRows.length > 0) {
    firstClashRow = multiClashRows[0].rowIndex;
    firstClashCol = Math.min(...multiClashRows.map((item) => item.minCol));
  } else if (rowClashStats.length > 0) {
    firstClashRow = rowClashStats[0].rowIndex;
    firstClashCol = rowClashStats[0].minCol;
  }

  const suggestedMatrixStartColIndex = firstClashCol !== -1 ? firstClashCol : 8; // Default Column I (index 8)
  const suggestedMatrixStartRowIndex = firstClashRow !== -1 ? firstClashRow : 16; // Default Row 17 (index 16)

  // 2. Detect Column Elements Header Row (highest density of valid Element IDs in matrix columns)
  let bestHeaderRow = -1;
  let bestHeaderScore = -1;

  const maxScanRow = Math.max(0, suggestedMatrixStartRowIndex - 1);
  for (let r = 0; r <= maxScanRow; r++) {
    const row = data[r];
    if (!row || !Array.isArray(row)) continue;

    let elementIdCount = 0;
    let totalNonEmpty = 0;

    for (let c = suggestedMatrixStartColIndex; c < Math.min(row.length, suggestedMatrixStartColIndex + 100); c++) {
      const cellVal = row[c];
      if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
        totalNonEmpty++;
        if (isElementId(cellVal)) {
          elementIdCount++;
        }
      }
    }

    if (elementIdCount > 0) {
      const density = totalNonEmpty > 0 ? elementIdCount / totalNonEmpty : 0;
      const score = elementIdCount * 10 + density * 50;
      if (score > bestHeaderScore) {
        bestHeaderScore = score;
        bestHeaderRow = r;
      }
    }
  }

  const suggestedHeadersRowIndex = bestHeaderRow !== -1 ? bestHeaderRow : headerRowIndex;

  // 3. Detect Row Element ID Column (Column with highest density of valid Element IDs in data rows)
  let bestGroupCol = -1;
  let bestGroupScore = -1;

  for (let c = 0; c < suggestedMatrixStartColIndex; c++) {
    let elementIdCount = 0;
    let totalNonEmpty = 0;
    const colHeader = columns[c]?.header?.toLowerCase().replace(/[\s_-]+/g, '') || '';

    // Check data rows from suggestedMatrixStartRowIndex down
    for (let r = suggestedMatrixStartRowIndex; r < Math.min(data.length, suggestedMatrixStartRowIndex + 200); r++) {
      const row = data[r];
      if (!row || !Array.isArray(row)) continue;
      const cellVal = row[c];
      if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
        totalNonEmpty++;
        if (isElementId(cellVal)) {
          elementIdCount++;
        }
      }
    }

    let keywordBonus = 0;
    if (
      colHeader.includes('clashgroup') ||
      colHeader === 'group' ||
      colHeader.includes('groupcode') ||
      colHeader.includes('groupid') ||
      colHeader.includes('elementid') ||
      colHeader.includes('elementcode') ||
      colHeader === 'code' ||
      colHeader === 'id'
    ) {
      keywordBonus = 30;
    }

    if (elementIdCount > 0 || keywordBonus > 0) {
      const density = totalNonEmpty > 0 ? elementIdCount / totalNonEmpty : 0;
      const score = elementIdCount * 10 + density * 50 + keywordBonus;
      if (score > bestGroupScore) {
        bestGroupScore = score;
        bestGroupCol = c;
      }
    }
  }

  const suggestedGroupColIndex = bestGroupCol !== -1 ? bestGroupCol : (columns.length > 5 ? 5 : 0);

  // 4. Detect Priority Column (Column with single letters A-E or 'priority' keyword)
  let bestPriorityCol = -1;
  let bestPriorityScore = -1;

  for (let c = 0; c < suggestedMatrixStartColIndex; c++) {
    if (c === suggestedGroupColIndex) continue;
    let singleLetterCount = 0;
    let totalNonEmpty = 0;
    const colHeader = columns[c]?.header?.toLowerCase().replace(/[\s_-]+/g, '') || '';

    for (let r = suggestedMatrixStartRowIndex; r < Math.min(data.length, suggestedMatrixStartRowIndex + 100); r++) {
      const row = data[r];
      if (!row) continue;
      const val = row[c];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        totalNonEmpty++;
        const s = String(val).trim();
        if (/^[A-E]$/i.test(s) || /^(P[1-5]|Low|Med|High|Critical)$/i.test(s)) {
          singleLetterCount++;
        }
      }
    }

    let keywordBonus = 0;
    if (colHeader.includes('priority') || colHeader.includes('clashpriority')) {
      keywordBonus = 40;
    }

    if (singleLetterCount > 0 || keywordBonus > 0) {
      const density = totalNonEmpty > 0 ? singleLetterCount / totalNonEmpty : 0;
      const score = singleLetterCount * 10 + density * 50 + keywordBonus;
      if (score > bestPriorityScore) {
        bestPriorityScore = score;
        bestPriorityCol = c;
      }
    }
  }

  const suggestedPriorityColIndex = bestPriorityCol !== -1 ? bestPriorityCol : (columns.length > 4 ? 4 : 1);

  // 5. Detect Folder / Category Column
  let bestFolderCol = -1;
  let bestFolderScore = -1;

  for (let c = 0; c < suggestedMatrixStartColIndex; c++) {
    if (c === suggestedGroupColIndex || c === suggestedPriorityColIndex) continue;
    const colHeader = columns[c]?.header?.toLowerCase().replace(/[\s_-]+/g, '') || '';
    let keywordBonus = 0;
    if (colHeader === 'folder' || colHeader.includes('folder')) {
      keywordBonus = 100;
    } else if (colHeader.includes('discipline') || colHeader.includes('category') || colHeader.includes('group')) {
      keywordBonus = 50;
    }

    let validFolderCount = 0;
    for (let r = suggestedMatrixStartRowIndex; r < Math.min(data.length, suggestedMatrixStartRowIndex + 50); r++) {
      const row = data[r];
      if (!row) continue;
      const val = row[c];
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        const s = String(val).trim();
        if (s.length >= 2 && s.length <= 50 && !isElementId(s)) {
          validFolderCount++;
        }
      }
    }

    const score = validFolderCount * 2 + keywordBonus;
    if (score > bestFolderScore) {
      bestFolderScore = score;
      bestFolderCol = c;
    }
  }

  const suggestedFolderColIndex = bestFolderCol !== -1 ? bestFolderCol : (columns.length > 3 ? 3 : 0);

  // 6. Detect Description / Element Name column (e.g. Column H)
  let bestDescCol = -1;
  let bestDescScore = -1;

  for (let c = 0; c < suggestedMatrixStartColIndex; c++) {
    if (c === suggestedGroupColIndex || c === suggestedPriorityColIndex || c === suggestedFolderColIndex) continue;
    const colHeader = columns[c]?.header?.toLowerCase().replace(/[\s_-]+/g, '') || '';
    let keywordBonus = 0;
    if (colHeader.includes('description') || colHeader.includes('element') || colHeader === 'name') {
      keywordBonus = 50;
    }

    let descCount = 0;
    for (let r = suggestedMatrixStartRowIndex; r < Math.min(data.length, suggestedMatrixStartRowIndex + 50); r++) {
      const row = data[r];
      if (!row) continue;
      const val = row[c];
      if (val !== undefined && val !== null && String(val).trim().length > 3) {
        descCount++;
      }
    }

    const score = descCount * 2 + keywordBonus;
    if (score > bestDescScore) {
      bestDescScore = score;
      bestDescCol = c;
    }
  }

  const suggestedElementColIndex = bestDescCol !== -1 ? bestDescCol : (columns.length > 7 ? 7 : 0);

  // 7. Extract matrix column headers
  const matrixColumnHeaders: ClashMatrixColumnHeader[] = [];
  const headerRow = data[suggestedHeadersRowIndex] || [];
  const descRow = suggestedHeadersRowIndex + 2 < suggestedMatrixStartRowIndex ? data[suggestedHeadersRowIndex + 2] : null;

  for (let c = suggestedMatrixStartColIndex; c < Math.max(columns.length, headerRow.length); c++) {
    const rawH = headerRow[c];
    const headerText =
      rawH !== undefined && rawH !== null && String(rawH).trim() !== ''
        ? String(rawH).trim()
        : `Column ${colIndexToLetter(c)}`;
    const rawDesc = descRow && descRow[c] ? String(descRow[c]).trim() : '';

    matrixColumnHeaders.push({
      columnIndex: c,
      columnLetter: colIndexToLetter(c),
      headerText,
      groupCode: isElementId(headerText) ? headerText : undefined,
      elementName: rawDesc || headerText,
    });
  }

  return {
    suggestedFolderColIndex,
    suggestedPriorityColIndex,
    suggestedGroupColIndex,
    suggestedElementColIndex,
    suggestedMatrixStartColIndex,
    suggestedMatrixStartRowIndex,
    suggestedHeadersRowIndex,
    confidenceScore: firstClashCol !== -1 ? 95 : 60,
    matrixColumnHeaders,
  };
}

export const DEFAULT_CLASH_MATRIX_CONFIG: ClashMatrixConfig = {
  rowGroupColumnLetter: 'F',
  rowGroupColumnIndex: 5,
  rowPriorityColumnLetter: 'E',
  rowPriorityColumnIndex: 4,
  columnHeadersRowIndex: 13, // Row 14
  matrixStartColumnLetter: 'I',
  matrixStartColumnIndex: 8, // Column I
  matrixStartRowIndex: 16, // Row 17
  namingFormat: 'group_v_group',
  hardPrefix: 'H',
  clearancePrefix: 'C',
  unit: 'MM',
  delimiter: '-',
  activeProfileId: 'profile_std_mm',
};

/**
 * Creates default SelectionSetConfig and ClashMatrixConfig from detected info
 */
export function createDefaultConfigs(
  detected: AutoDetectedMatrixInfo,
  columns: ColumnSummary[]
): { selectionSetConfig: SelectionSetConfig; clashMatrixConfig: ClashMatrixConfig } {
  const folderLetter = colIndexToLetter(detected.suggestedFolderColIndex);
  const priorityLetter = colIndexToLetter(detected.suggestedPriorityColIndex);
  const groupLetter = colIndexToLetter(detected.suggestedGroupColIndex);

  const selectionSetConfig: SelectionSetConfig = {
    folderColumnLetter: folderLetter,
    folderColumnIndex: detected.suggestedFolderColIndex,
    nameParts: [
      {
        columnLetter: priorityLetter,
        columnIndex: detected.suggestedPriorityColIndex,
        separator: '-',
      },
      {
        columnLetter: groupLetter,
        columnIndex: detected.suggestedGroupColIndex,
        separator: '',
      },
    ],
    nameSeparator: '-',
    conditions: cloneStandard8BimConditions(
      detected.suggestedPriorityColIndex,
      detected.suggestedGroupColIndex
    ),
  };

  // ClashMatrixConfig MUST default strictly to authoritative standard BIM coordinates F / 14 / 17 / I
  // and MUST NOT silently adopt non-standard auto-detected coordinates like Row 2 / Row 3 / Col E.
  const clashMatrixConfig: ClashMatrixConfig = {
    rowGroupColumnLetter: 'F',
    rowGroupColumnIndex: 5,
    rowPriorityColumnLetter: priorityLetter || 'E',
    rowPriorityColumnIndex: detected.suggestedPriorityColIndex !== undefined ? detected.suggestedPriorityColIndex : 4,
    columnHeadersRowIndex: 13, // Excel Row 14
    matrixStartColumnLetter: 'I',
    matrixStartColumnIndex: 8, // Column I
    matrixStartRowIndex: 16, // Excel Row 17
    namingFormat: 'group_v_group',
    hardPrefix: 'H',
    clearancePrefix: 'C',
    unit: 'MM',
    delimiter: '-',
    activeProfileId: 'profile_std_mm',
  };

  return { selectionSetConfig, clashMatrixConfig };
}
