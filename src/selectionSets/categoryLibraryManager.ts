import { CategorySource, CategoryXmlImportPreview, NavisworksCategoryDefinition } from '../types/categoryLibrary';

/**
 * Standard Autodesk verified categories present in Navisworks FindSpec schemas.
 */
export const VERIFIED_AUTODESK_CATEGORIES: readonly NavisworksCategoryDefinition[] = Object.freeze([
  {
    id: 'cat_elem',
    displayName: 'Element',
    internalName: 'LcRevitData_Element',
    source: 'autodesk-verified',
    notes: 'Revit Element data and standard system parameters',
  },
  {
    id: 'cat_custom',
    displayName: 'Custom',
    internalName: 'LcRevitData_Custom',
    source: 'autodesk-verified',
    notes: 'Custom shared parameters and project-specific metadata',
  },
  {
    id: 'cat_text',
    displayName: 'Text',
    internalName: 'LcSvf_Text',
    source: 'autodesk-verified',
    notes: 'SVF Text property category',
  },
  {
    id: 'cat_id_data',
    displayName: 'Identity Data',
    internalName: 'LcSvf_Identity Data',
    source: 'autodesk-verified',
    notes: 'SVF Identity Data property category',
  },
  {
    id: 'cat_item',
    displayName: 'Item',
    internalName: 'LcOaNode',
    source: 'autodesk-verified',
    notes: 'Navisworks core Item node category',
  },
]);

export const CATEGORY_LIBRARY_STORAGE_KEY = 'navisworks_category_library_v1';

/**
 * Returns canonical identity key for a category (Primary identity: internalName).
 */
export function getCategoryIdentity(internalName: string): string {
  return internalName.trim().toLowerCase();
}

let memoryCategories: NavisworksCategoryDefinition[] | null = null;

/**
 * Loads the category library from localStorage and merges with verified categories.
 */
export function loadCategoryLibrary(): NavisworksCategoryDefinition[] {
  let storedCategories: NavisworksCategoryDefinition[] = [];
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(CATEGORY_LIBRARY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          storedCategories = parsed;
        }
      }
    } else if (memoryCategories) {
      storedCategories = memoryCategories;
    }
  } catch (e) {
    console.warn('Failed to load Category Library from localStorage', e);
  }

  // Create lookup of verified categories
  const libraryMap = new Map<string, NavisworksCategoryDefinition>();

  // 1. Add Autodesk Verified first
  for (const verified of VERIFIED_AUTODESK_CATEGORIES) {
    const key = getCategoryIdentity(verified.internalName);
    libraryMap.set(key, { ...verified });
  }

  // 2. Merge stored user-defined and imported categories (do not overwrite verified)
  for (const item of storedCategories) {
    if (!item || !item.internalName || !item.displayName) continue;
    const key = getCategoryIdentity(item.internalName);
    if (!libraryMap.has(key)) {
      libraryMap.set(key, {
        ...item,
        source: item.source === 'autodesk-verified' ? 'user-defined' : item.source,
      });
    } else {
      const existing = libraryMap.get(key)!;
      // If existing is not autodesk-verified, user version takes precedence
      if (existing.source !== 'autodesk-verified') {
        libraryMap.set(key, item);
      }
    }
  }

  return Array.from(libraryMap.values());
}

/**
 * Saves category library to localStorage.
 */
export function saveCategoryLibrary(categories: NavisworksCategoryDefinition[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CATEGORY_LIBRARY_STORAGE_KEY, JSON.stringify(categories));
    } else {
      memoryCategories = categories;
    }
  } catch (e) {
    console.warn('Failed to save Category Library to localStorage', e);
  }
}

/**
 * Filters the category library by search query and source.
 */
export function filterCategoryLibrary(
  categories: NavisworksCategoryDefinition[],
  searchQuery: string = '',
  sourceFilter: string = 'ALL'
): NavisworksCategoryDefinition[] {
  const query = searchQuery.trim().toLowerCase();

  return categories.filter((cat) => {
    // Source filter
    if (sourceFilter !== 'ALL' && cat.source !== sourceFilter) {
      return false;
    }

    // Search query matches display name, internal name, or notes
    if (query) {
      const matchDisplay = cat.displayName.toLowerCase().includes(query);
      const matchInternal = cat.internalName.toLowerCase().includes(query);
      const matchNotes = cat.notes ? cat.notes.toLowerCase().includes(query) : false;
      if (!matchDisplay && !matchInternal && !matchNotes) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Adds a new user-defined category to the library.
 */
export function addCustomCategory(
  catData: {
    displayName: string;
    internalName: string;
    notes?: string;
  },
  currentLibrary: NavisworksCategoryDefinition[]
): { success: boolean; error?: string; updatedLibrary?: NavisworksCategoryDefinition[] } {
  const displayName = catData.displayName.trim();
  const internalName = catData.internalName.trim();

  if (!displayName) {
    return { success: false, error: 'Category Display Name is required.' };
  }
  if (!internalName) {
    return { success: false, error: 'Category Internal Name is required.' };
  }

  const key = getCategoryIdentity(internalName);
  const existing = currentLibrary.find((c) => getCategoryIdentity(c.internalName) === key);
  if (existing) {
    return {
      success: false,
      error: `A category with internal name "${internalName}" already exists (${existing.displayName}).`,
    };
  }

  const newCategory: NavisworksCategoryDefinition = {
    id: `cat_user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    displayName,
    internalName,
    source: 'user-defined',
    notes: catData.notes?.trim() || undefined,
    createdDate: Date.now(),
    lastModifiedDate: Date.now(),
  };

  const updated = [newCategory, ...currentLibrary];
  saveCategoryLibrary(updated);
  return { success: true, updatedLibrary: updated };
}

/**
 * Updates an existing user-defined or imported category in the library.
 */
export function updateCategoryInLibrary(
  id: string,
  updates: Partial<NavisworksCategoryDefinition>,
  currentLibrary: NavisworksCategoryDefinition[]
): { success: boolean; error?: string; updatedLibrary: NavisworksCategoryDefinition[] } {
  const index = currentLibrary.findIndex((c) => c.id === id);
  if (index === -1) {
    return { success: false, error: 'Category not found in library.', updatedLibrary: currentLibrary };
  }

  const target = currentLibrary[index];
  if (target.source === 'autodesk-verified') {
    return { success: false, error: 'Autodesk Verified categories cannot be modified.', updatedLibrary: currentLibrary };
  }

  const newInternal = updates.internalName !== undefined ? updates.internalName.trim() : target.internalName;
  const newDisplay = updates.displayName !== undefined ? updates.displayName.trim() : target.displayName;

  if (!newDisplay) {
    return { success: false, error: 'Display Name cannot be empty.', updatedLibrary: currentLibrary };
  }
  if (!newInternal) {
    return { success: false, error: 'Internal Name cannot be empty.', updatedLibrary: currentLibrary };
  }

  // Conflict check
  const key = getCategoryIdentity(newInternal);
  const conflict = currentLibrary.find(
    (c) => c.id !== id && getCategoryIdentity(c.internalName) === key
  );
  if (conflict) {
    return {
      success: false,
      error: `Another category already exists with internal name "${newInternal}".`,
      updatedLibrary: currentLibrary,
    };
  }

  const updatedCat: NavisworksCategoryDefinition = {
    ...target,
    ...updates,
    displayName: newDisplay,
    internalName: newInternal,
    notes: updates.notes !== undefined ? updates.notes.trim() : target.notes,
    lastModifiedDate: Date.now(),
  };

  const updatedList = [...currentLibrary];
  updatedList[index] = updatedCat;
  saveCategoryLibrary(updatedList);
  return { success: true, updatedLibrary: updatedList };
}

/**
 * Deletes a category from the library. Autodesk Verified categories cannot be deleted.
 */
export function deleteCategoryFromLibrary(
  id: string,
  currentLibrary: NavisworksCategoryDefinition[]
): { success: boolean; error?: string; updatedLibrary: NavisworksCategoryDefinition[] } {
  const target = currentLibrary.find((c) => c.id === id);
  if (!target) {
    return { success: false, error: 'Category not found.', updatedLibrary: currentLibrary };
  }
  if (target.source === 'autodesk-verified') {
    return { success: false, error: 'Autodesk Verified categories cannot be deleted.', updatedLibrary: currentLibrary };
  }

  const updated = currentLibrary.filter((c) => c.id !== id);
  saveCategoryLibrary(updated);
  return { success: true, updatedLibrary: updated };
}

/**
 * Parses Navisworks XML string and extracts all unique category definitions.
 * Deduplicates by category internalName.
 */
export function parseNavisworksXmlCategories(
  xmlString: string,
  fileName: string = 'imported.xml'
): CategoryXmlImportPreview {
  let categoriesFound = 0;
  const uniqueCatsMap = new Map<string, NavisworksCategoryDefinition>();

  // Browser-safe DOMParser
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error(parserError.textContent || 'XML Parsing error');
      }

      // Check category nodes everywhere in findspec or conditions
      const catNodes = xmlDoc.getElementsByTagName('category');
      categoriesFound = catNodes.length;

      for (let i = 0; i < catNodes.length; i++) {
        const catNode = catNodes[i];
        const nameNode = catNode.getElementsByTagName('name')[0];
        const categoryDisplayName = nameNode ? (nameNode.textContent || '').trim() : '';
        const categoryInternalName = nameNode ? (nameNode.getAttribute('internal') || '').trim() : '';

        if (categoryInternalName) {
          const key = getCategoryIdentity(categoryInternalName);
          if (!uniqueCatsMap.has(key)) {
            uniqueCatsMap.set(key, {
              id: `cat_xml_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
              displayName: categoryDisplayName || categoryInternalName,
              internalName: categoryInternalName,
              source: 'navisworks-xml',
              sourceFileName: fileName,
              notes: `Imported from ${fileName}`,
              createdDate: Date.now(),
              lastModifiedDate: Date.now(),
            });
          }
        }
      }
    } catch (e) {
      console.warn('DOMParser failed for categories, falling back to regex', e);
    }
  }

  // Regex fallback for non-browser or edge-case test environments
  if (categoriesFound === 0) {
    const catRegex = /<category\b[^>]*>[\s\S]*?<name\s+internal="([^"]*)"[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/category>/gi;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = catRegex.exec(xmlString)) !== null) {
      categoriesFound++;
      idx++;
      const categoryInternalName = match[1].trim();
      const categoryDisplayName = match[2].trim();

      if (categoryInternalName) {
        const key = getCategoryIdentity(categoryInternalName);
        if (!uniqueCatsMap.has(key)) {
          uniqueCatsMap.set(key, {
            id: `cat_xml_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            displayName: categoryDisplayName || categoryInternalName,
            internalName: categoryInternalName,
            source: 'navisworks-xml',
            sourceFileName: fileName,
            notes: `Imported from ${fileName}`,
            createdDate: Date.now(),
            lastModifiedDate: Date.now(),
          });
        }
      }
    }
  }

  const categories = Array.from(uniqueCatsMap.values());
  return {
    fileName,
    categoriesFound,
    uniqueCategoriesCount: categories.length,
    categories,
  };
}

/**
 * Merges imported XML categories into the category library.
 * Preserves Autodesk Verified priority (verified is never downgraded).
 */
export function commitImportedCategories(
  importedCategories: NavisworksCategoryDefinition[],
  currentLibrary: NavisworksCategoryDefinition[]
): {
  addedCount: number;
  skippedCount: number;
  updatedLibrary: NavisworksCategoryDefinition[];
} {
  let addedCount = 0;
  let skippedCount = 0;
  const updated = [...currentLibrary];

  for (const imported of importedCategories) {
    const key = getCategoryIdentity(imported.internalName);
    const existingIndex = updated.findIndex((c) => getCategoryIdentity(c.internalName) === key);

    if (existingIndex === -1) {
      // New category
      updated.push({
        ...imported,
        source: 'navisworks-xml',
      });
      addedCount++;
    } else {
      const existing = updated[existingIndex];
      if (existing.source === 'autodesk-verified') {
        // Do not downgrade or overwrite verified
        skippedCount++;
      } else {
        // Update display name or source if user/xml
        updated[existingIndex] = {
          ...existing,
          displayName: imported.displayName || existing.displayName,
          sourceFileName: imported.sourceFileName || existing.sourceFileName,
          notes: imported.notes || existing.notes,
          lastModifiedDate: Date.now(),
        };
        skippedCount++;
      }
    }
  }

  saveCategoryLibrary(updated);
  return { addedCount, skippedCount, updatedLibrary: updated };
}
