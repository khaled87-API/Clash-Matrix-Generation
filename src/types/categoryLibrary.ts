export type CategorySource = 'autodesk-verified' | 'navisworks-xml' | 'user-defined';

export interface NavisworksCategoryDefinition {
  id: string;
  displayName: string;
  internalName: string;
  source: CategorySource;
  notes?: string;
  sourceFileName?: string;
  createdDate?: number;
  lastModifiedDate?: number;
}

export interface CategoryXmlImportPreview {
  fileName: string;
  categoriesFound: number;
  uniqueCategoriesCount: number;
  categories: NavisworksCategoryDefinition[];
}
