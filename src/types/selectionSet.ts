export type BuiltInNavisworksDataType = 'Element' | 'Custom' | 'Text' | 'Identity Data';

export type NavisworksDataType = BuiltInNavisworksDataType | string;

export interface DataTypeCategory {
  id: string;
  displayName: string;
  internalName: string;
  builtIn: boolean;
  description?: string;
}

export interface PropertyPreset {
  id: string;
  name: string;
  dataType: NavisworksDataType;
  categoryInternalName: string;
  propertyDisplayName: string;
  propertyInternalName: string;
  test: 'contains' | 'equals' | 'wildcard';
  flags: number;
}

export interface ConditionConfig {
  id: string;
  excelColumnLetter?: string; // e.g. "E"
  excelColumnIndex?: number; // 0-indexed column index
  valueSource?: 'excel' | 'custom'; // 'excel' reads dynamically from Excel column, 'custom' uses static value
  value?: string; // explicit custom value or override (e.g. "ABC", "TEST_UPDATED")
  dataType: NavisworksDataType;
  categoryInternalName: string;
  propertyDisplayName: string;
  propertyInternalName: string;
  test: 'contains' | 'equals' | 'wildcard' | string;
  flags: number;
}

export interface SelectionSetConfig {
  folderColumnLetter: string;
  folderColumnIndex: number;
  nameParts: {
    columnLetter: string;
    columnIndex: number;
    separator?: string;
  }[];
  nameSeparator: string;
  conditions: ConditionConfig[];
}

export interface SelectionSetCondition {
  categoryName: string;
  categoryInternal: string;
  propertyName: string;
  propertyInternal: string;
  test: string;
  flags: number;
  value: string;
  dataType: string;
}

export interface SelectionSet {
  id: string;
  guid: string;
  name: string; // e.g. "A-AR0010"
  folder: string; // e.g. "AR"
  clashPriority?: string; // e.g. "A"
  clashGroup: string; // e.g. "AR0010"
  elementName?: string; // e.g. "Ceilings"
  sourceRowIndex: number; // Excel 0-indexed row
  conditions: SelectionSetCondition[];
  locator: string; // e.g. "lcop_selection_set_tree/AR/A-AR0010"
}

export interface ViewFolder {
  name: string;
  guid: string;
  selectionSets: SelectionSet[];
}
