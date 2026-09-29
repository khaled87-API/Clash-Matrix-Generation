export type CellAddress = {
  row: number; // 0-indexed
  col: number; // 0-indexed
  colLetter: string; // 'A', 'B', etc.
};

export interface ColumnSummary {
  index: number; // 0-indexed column index
  letter: string; // 'A', 'B', 'C', etc.
  header: string; // Text in the detected header row
  sampleValues: string[]; // First few non-empty values
  nonEmptyCount: number;
}

export interface SheetInfo {
  name: string;
  rowCount: number;
  colCount: number;
  rangeA1: string;
}

export interface ParsedWorkbook {
  fileName: string;
  sheetNames: string[];
  selectedSheet: string;
  sheetsData: Record<string, any[][]>; // Raw 2D array [row][col]
  columns: ColumnSummary[];
  headerRowIndex: number; // 0-indexed row number of header
  totalRows: number;
  totalCols: number;
}
