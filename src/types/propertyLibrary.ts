export type PropertySource = 'autodesk-verified' | 'navisworks-xml' | 'user-defined';

export interface NavisworksPropertyDefinition {
  id: string;
  categoryDisplayName: string;
  categoryInternalName: string;
  propertyDisplayName: string;
  propertyInternalName: string;
  source: PropertySource;
  dataType?: string;
  defaultFlags?: number;
  supportedTests?: string[];
  notes?: string;
  sourceFileName?: string;
  createdAt?: number;
}

export interface XmlImportPreview {
  fileName: string;
  conditionsFound: number;
  uniqueCategoriesCount: number;
  uniquePropertiesCount: number;
  properties: NavisworksPropertyDefinition[];
}
