import * as XLSX from 'xlsx';
import { ParsedWorkbook, ColumnSummary } from '../types/excel';

/**
 * Converts a 0-indexed column index to Excel column letter (e.g. 0 -> 'A', 25 -> 'Z', 26 -> 'AA')
 */
export function colIndexToLetter(colIndex: number): string {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Converts an Excel column letter to 0-indexed column number (e.g. 'A' -> 0, 'Z' -> 25, 'AA' -> 26)
 */
export function letterToColIndex(letter: string): number {
  const clean = letter.toUpperCase().trim();
  let index = 0;
  for (let i = 0; i < clean.length; i++) {
    index = index * 26 + (clean.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * Formats row and col index to Excel cell address (e.g. row 16, col 9 -> "J17")
 */
export function formatCellAddress(row: number, col: number): string {
  return `${colIndexToLetter(col)}${row + 1}`;
}

/**
 * Parses an uploaded ArrayBuffer or Uint8Array into a structured ParsedWorkbook
 */
export function parseExcelBuffer(buffer: ArrayBuffer | Uint8Array, fileName: string): ParsedWorkbook {
  if (!buffer || buffer.byteLength === 0) {
    throw new Error('The uploaded file is empty or corrupted (0 bytes).');
  }

  const workbook = XLSX.read(buffer, {
    type: 'array',
    cellDates: false,
    cellText: false,
    raw: true,
  });

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error('The uploaded Excel workbook contains no worksheets.');
  }

  const sheetsData: Record<string, any[][]> = {};

  for (const sheetName of sheetNames) {
    const ws = workbook.Sheets[sheetName];
    // Convert to 2D array with blank cells preserved
    const data: any[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: '',
      blankrows: true,
      raw: true,
    });
    sheetsData[sheetName] = data;
  }

  const initialSheet = sheetNames[0];
  const initialData = sheetsData[initialSheet] || [];

  // Analyze columns for the initial sheet
  const headerRowIndex = detectDefaultHeaderRow(initialData);
  const columns = analyzeColumns(initialData, headerRowIndex);

  const totalRows = initialData.length;
  const totalCols = initialData.reduce((max, row) => Math.max(max, row ? row.length : 0), 0);

  if (totalRows === 0 && totalCols === 0) {
    throw new Error('The uploaded file is empty or corrupted and contains no readable rows or columns.');
  }

  return {
    fileName,
    sheetNames,
    selectedSheet: initialSheet,
    sheetsData,
    columns,
    headerRowIndex,
    totalRows,
    totalCols,
  };
}

/**
 * Analyzes column summaries based on the detected or specified header row
 */
export function analyzeColumns(data: any[][], headerRowIndex: number): ColumnSummary[] {
  if (!data || data.length === 0) return [];

  const maxCols = data.reduce((max, row) => Math.max(max, row ? row.length : 0), 0);
  const headerRow = data[headerRowIndex] || [];
  const summaries: ColumnSummary[] = [];

  for (let c = 0; c < maxCols; c++) {
    const letter = colIndexToLetter(c);
    const rawHeader = headerRow[c];
    const headerText = rawHeader !== undefined && rawHeader !== null ? String(rawHeader).trim() : `Column ${letter}`;

    // Sample values from non-header rows below header
    const sampleValues: string[] = [];
    let nonEmptyCount = 0;

    for (let r = headerRowIndex + 1; r < Math.min(data.length, headerRowIndex + 200); r++) {
      const row = data[r];
      if (row && row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') {
        nonEmptyCount++;
        if (sampleValues.length < 4) {
          sampleValues.push(String(row[c]).trim());
        }
      }
    }

    summaries.push({
      index: c,
      letter,
      header: headerText || `Column ${letter}`,
      sampleValues,
      nonEmptyCount,
    });
  }

  return summaries;
}

/**
 * Heuristically identifies the most probable header row
 */
export function detectDefaultHeaderRow(data: any[][]): number {
  if (!data || data.length === 0) return 0;

  // Scan the first 30 rows
  let bestRow = 0;
  let bestScore = -1;

  for (let r = 0; r < Math.min(data.length, 30); r++) {
    const row = data[r];
    if (!row || !Array.isArray(row)) continue;

    let textCells = 0;
    let keywordScore = 0;

    for (const cell of row) {
      if (cell !== undefined && cell !== null && String(cell).trim().length > 0) {
        const text = String(cell).toLowerCase().trim();
        textCells++;

        if (
          text.includes('folder') ||
          text.includes('clash') ||
          text.includes('priority') ||
          text.includes('group') ||
          text.includes('discipline') ||
          text.includes('element') ||
          text.includes('uniclass') ||
          text.includes('category')
        ) {
          keywordScore += 5;
        }
      }
    }

    const totalScore = textCells + keywordScore;
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestRow = r;
    }
  }

  return bestRow;
}
