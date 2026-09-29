/**
 * XML COMPARING DOMAIN TYPES
 * ==========================
 * Fully isolated types for comparing two Autodesk Navisworks Exchange XML files.
 * This module is completely decoupled from Tab 1 (Clash Matrix XML Generation).
 */

export interface NavisworksCondition {
  test: string; // 'equals', 'contains', 'wildcard', etc.
  flags: number; // e.g. 74 or 10
  category: {
    displayName: string;
    internalName: string;
  };
  property: {
    displayName: string;
    internalName: string;
  };
  value: {
    dataType: string; // 'wstring', 'name', 'float', etc.
    value: string;
  };
}

export interface NavisworksFindSpec {
  mode: string; // 'all', 'some', 'manual'
  disjoint: string; // '0', '1'
  locator: string; // '/'
  conditions: NavisworksCondition[];
}

export interface NavisworksSelectionSet {
  name: string;
  folderName: string;
  guid: string;
  locator: string; // e.g. "lcop_selection_set_tree/HW/A-HW0010"
  findSpec: NavisworksFindSpec;
  rawXmlSnippet?: string;
}

export interface NavisworksViewFolder {
  name: string;
  guid: string;
  selectionSets: NavisworksSelectionSet[];
}

export interface SelectionTarget {
  folder: string;
  selectionSetName: string;
  locator: string;
}

export interface NavisworksClashTest {
  id: string;
  name: string;
  testType: string; // 'hard', 'clearance', etc.
  status: string; // 'new', 'active', 'reviewed', 'approved', 'resolved'
  toleranceMeters: number;
  toleranceFormatted: string; // 10 decimal places e.g. "0.4000000000"
  mergeComposites: string;
  left: SelectionTarget;
  right: SelectionTarget;
  rawXmlSnippet?: string;
}

export interface NavisworksParsedDocument {
  fileName: string;
  fileSizeBytes: number;
  units: string;
  batchTestName: string;
  internalName: string;
  filepath?: string;
  clashTests: NavisworksClashTest[];
  selectionSets: NavisworksSelectionSet[];
  viewFolders: NavisworksViewFolder[];
  rawXml: string;
  parseErrors: string[];
  isValid: boolean;
}

// ==========================================
// Comparison & Diff Types
// ==========================================

export type DiffStatus = 'NEW' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

export interface ClashTestPropertyChange {
  property:
    | 'testType'
    | 'tolerance'
    | 'leftFolder'
    | 'leftSetName'
    | 'leftLocator'
    | 'rightFolder'
    | 'rightSetName'
    | 'rightLocator'
    | 'status';
  label: string;
  oldValue: string;
  newValue: string;
  isSignificant: boolean;
}

export interface ClashTestDiff {
  name: string;
  status: DiffStatus;
  oldTest?: NavisworksClashTest;
  newTest?: NavisworksClashTest;
  changes: ClashTestPropertyChange[];
}

export interface ConditionChange {
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';
  index: number;
  categoryChanged?: { old: string; new: string };
  propertyChanged?: { old: string; new: string };
  operatorChanged?: { old: string; new: string };
  valueChanged?: { old: string; new: string };
  flagsChanged?: { old: number; new: number };
}

export interface SelectionSetDiff {
  name: string;
  folderName: string;
  locator: string;
  status: DiffStatus;
  oldSet?: NavisworksSelectionSet;
  newSet?: NavisworksSelectionSet;
  guidChangedOnly: boolean;
  oldGuid?: string;
  newGuid?: string;
  conditionChanges: ConditionChange[];
}

export interface ComparisonSummary {
  clashTests: {
    totalOld: number;
    totalNew: number;
    newCount: number;
    modifiedCount: number;
    removedCount: number;
    unchangedCount: number;
  };
  selectionSets: {
    totalOld: number;
    totalNew: number;
    newCount: number;
    modifiedCount: number;
    removedCount: number;
    unchangedCount: number;
  };
}

export interface ComparisonAmbiguity {
  duplicateClashTestNamesOld: string[];
  duplicateClashTestNamesNew: string[];
  duplicateSelectionSetNamesOld: string[];
  duplicateSelectionSetNamesNew: string[];
}

export interface CompleteDiffReport {
  timestamp: string;
  oldDoc: NavisworksParsedDocument;
  newDoc: NavisworksParsedDocument;
  summary: ComparisonSummary;
  clashTestDiffs: ClashTestDiff[];
  selectionSetDiffs: SelectionSetDiff[];
  ambiguities: ComparisonAmbiguity;
}

// ==========================================
// Final Result & Export Types
// ==========================================

export type ExportScopeMode = 'DELTA_ONLY' | 'FULL_MERGED' | 'NEW_ONLY' | 'MODIFIED_ONLY';

export type SearchSetDependencyStatus = 'NEW' | 'EXISTING' | 'MODIFIED' | 'GUID_ONLY';

export interface RequiredSelectionSetInfo {
  set: NavisworksSelectionSet;
  status: SearchSetDependencyStatus;
  isExported: boolean;
  exportReason: string;
  usedByClashTests: string[];
  folderName: string;
  name: string;
  locator: string;
}

export interface SearchSetDependencySummary {
  totalRequired: number;       // Total search sets required by exported clash tests
  totalExported: number;       // Search sets physically bundled into the output XML (NEW + MODIFIED)
  totalNotExported: number;    // Search sets required by clash tests but omitted (already in Navisworks)
  newCount: number;            // Required and NEW (Exported)
  modifiedCount: number;       // Required and MODIFIED (Exported)
  existingCount: number;       // Required and UNCHANGED/EXISTING (NOT Exported)
  guidOnlyCount: number;       // Required and GUID_ONLY (NOT Exported)
  unusedCount: number;         // In XML files but not referenced by exported Clash Tests (NOT Exported)
  requiredSets: RequiredSelectionSetInfo[];
  exportedSets: RequiredSelectionSetInfo[];
  notExportedSets: RequiredSelectionSetInfo[];
  unusedSets: NavisworksSelectionSet[];
}

export interface FinalResultConfig {
  exportScope: ExportScopeMode;
  includeNewTests: boolean;
  includeModifiedTests: boolean;
  includeUnchangedTests: boolean;
  includeRemovedAsResolved: boolean;
  batchTestMetadataSource: 'NEW' | 'OLD';
}

export interface FinalValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  clashTestsToExportCount: number;
  selectionSetsToExportCount: number;
  viewFoldersToExportCount: number;
  unresolvedLocators: string[];
  baselineResolvedCount?: number;
}
