import { SelectionSetConfig } from './selectionSet';
import { ClashMatrixConfig } from './clashTest';

export interface ProjectSettings {
  batchTestName: string;
  internalName: string;
  units: 'm' | 'mm' | 'ft' | 'in';
  filename: string;
  filepath: string;
}

export interface AppValidationIssue {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: 'excel' | 'selectionSets' | 'conditions' | 'clashMatrix' | 'clashTests' | 'xml';
  title: string;
  description: string;
  location?: string;
  row?: number;
  col?: number;
  suggestedFix?: string;
}

export interface MatrixLayoutVerification {
  sheet: string;
  rowGroupColumnLetter: string;
  rowGroupColumnIndex: number;
  columnHeadersRowIndex: number;
  matrixStartRowIndex: number;
  matrixStartColumnLetter: string;
  matrixStartColumnIndex: number;
  hardPrefix: string;
  clearancePrefix: string;
  unit: string;
  delimiter: string;
  sampleResolvedTests: {
    rowElementId: string;
    colElementId: string;
    matrixValue: string;
    clashType: string;
    tolerance: string;
    testName: string;
    cellAddress: string;
  }[];
}

export interface ValidationSummary {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: AppValidationIssue[];
  matrixLayoutVerification?: MatrixLayoutVerification;
}

export type ExportMode = 'full' | 'selectionSetsOnly' | 'clashTestsOnly';

export interface AppState {
  currentStep: number;
  projectSettings: ProjectSettings;
  selectionSetConfig: SelectionSetConfig;
  clashMatrixConfig: ClashMatrixConfig;
  exportMode: ExportMode;
  templateXmlContent?: string;
}
