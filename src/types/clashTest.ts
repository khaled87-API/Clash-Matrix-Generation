export type ClashTestType = 'hard' | 'clearance';
export type MatrixToleranceUnit = 'MM' | 'CM' | 'M' | 'IN' | 'FT';

export interface MatrixFormatProfile {
  id: string;
  name: string;
  hardPrefix: string;
  clearancePrefix: string;
  unit: MatrixToleranceUnit;
  delimiter: string;
  isBuiltIn?: boolean;
  notes?: string;
}

export interface ParsedClashCell {
  raw: string;
  type?: ClashTestType;
  toleranceRaw?: number;
  toleranceUnit?: MatrixToleranceUnit;
  toleranceMm?: number;
  toleranceMeters?: number;
  ignored?: boolean;
  ignoredReason?: 'blank' | 'n/a' | 'whitespace';
  error?: string;
  cellAddress?: string; // e.g. "J24"
  row?: number;
  col?: number;
}

export interface ClashMatrixColumnHeader {
  columnIndex: number;
  columnLetter: string;
  headerText: string;
  groupCode?: string; // If matched with a selection set group
  elementName?: string;
}

export interface ClashMatrixConfig {
  sheet?: string;
  rowGroupColumnLetter: string;
  rowGroupColumnIndex: number;
  rowPriorityColumnLetter?: string;
  rowPriorityColumnIndex?: number;
  columnHeadersRowIndex: number; // Row containing the column element/group names (0-indexed)
  matrixStartColumnLetter: string;
  matrixStartColumnIndex: number;
  matrixStartRowIndex: number; // Row where data matrix begins (0-indexed)
  namingFormat: 'group_v_group' | 'full_v_full' | 'element_v_element';
  // Configurable Format & Profile Settings:
  hardPrefix?: string; // Default: 'H'
  clearancePrefix?: string; // Default: 'C'
  unit?: MatrixToleranceUnit; // Default: 'MM'
  delimiter?: string; // Default: '-'
  activeProfileId?: string;
}

export interface ClashTest {
  id: string;
  name: string; // e.g. "AR0020_v_AR0010"
  testType: ClashTestType;
  status: string; // "new"
  toleranceMm: number;
  toleranceMeters: number; // e.g. 0.1000000000
  toleranceFormatted: string; // 10 decimal places string
  leftSelectionSet: string; // Full Selection set name, e.g. "A-AR0020"
  leftFolder: string; // e.g. "AR"
  leftLocator: string; // "lcop_selection_set_tree/AR/A-AR0020"
  leftGroup: string; // "AR0020"
  rightSelectionSet: string; // e.g. "A-AR0010"
  rightFolder: string; // e.g. "AR"
  rightLocator: string; // "lcop_selection_set_tree/AR/A-AR0010"
  rightGroup: string; // "AR0010"
  matrixRow: number;
  matrixCol: number;
  cellAddress: string;
  isSelfClash: boolean;
}

export interface ClashMatrixCellEntry {
  rowIndex: number;
  colIndex: number;
  cellAddress: string;
  rowGroup: string;
  colGroup: string;
  rowSelectionSetName: string;
  colSelectionSetName: string;
  rowFolder: string;
  colFolder: string;
  parsedCell: ParsedClashCell;
  clashTest?: ClashTest;
}

export interface ClashMatrixSummary {
  totalMatrixCells: number;
  validClashTests: number;
  hardClashes: number;
  clearanceClashes: number;
  ignoredBlank: number;
  ignoredNA: number;
  invalidCells: ParsedClashCell[];
}
