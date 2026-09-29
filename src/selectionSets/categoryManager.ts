import { DataTypeCategory } from '../types/selectionSet';
import { loadCategoryLibrary } from './categoryLibraryManager';

export const BUILT_IN_CATEGORIES: DataTypeCategory[] = [
  {
    id: 'builtin_element',
    displayName: 'Element',
    internalName: 'LcRevitData_Element',
    builtIn: true,
    description: 'Revit Element data and standard system parameters',
  },
  {
    id: 'builtin_custom',
    displayName: 'Custom',
    internalName: 'LcRevitData_Custom',
    builtIn: true,
    description: 'Custom shared parameters and project-specific metadata',
  },
  {
    id: 'builtin_text',
    displayName: 'Text',
    internalName: 'LcSvf_Text',
    builtIn: true,
    description: 'SVF Text property category',
  },
  {
    id: 'builtin_identity_data',
    displayName: 'Identity Data',
    internalName: 'LcSvf_Identity Data',
    builtIn: true,
    description: 'SVF Identity Data property category',
  },
  {
    id: 'builtin_item',
    displayName: 'Item',
    internalName: 'LcOaNode',
    builtIn: true,
    description: 'Navisworks core Item node category',
  },
];

export const CATEGORY_STORAGE_KEY = 'navisworks_custom_datatype_categories_v1';

/**
 * Load user-defined categories from localStorage
 */
export function loadUserCategories(): DataTypeCategory[] {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (c) =>
          c &&
          typeof c.displayName === 'string' &&
          typeof c.internalName === 'string' &&
          !c.builtIn
      );
    }
  } catch (err) {
    console.warn('Failed to read custom categories from localStorage', err);
  }
  return [];
}

/**
 * Persist user-defined categories to localStorage
 */
export function saveUserCategories(categories: DataTypeCategory[]): void {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  try {
    const userOnly = categories.filter((c) => !c.builtIn);
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(userOnly));
  } catch (err) {
    console.warn('Failed to save custom categories to localStorage', err);
  }
}

/**
 * Get all available categories (Autodesk verified + all user-defined / XML imported categories)
 * Single unified source of truth linked to CategoryLibraryManager.
 */
export function getAllCategories(userCategoriesOverride?: DataTypeCategory[]): DataTypeCategory[] {
  if (userCategoriesOverride && userCategoriesOverride.length > 0) {
    return [...BUILT_IN_CATEGORIES, ...userCategoriesOverride];
  }

  // Load from Category Library single source of truth
  const libCats = loadCategoryLibrary();
  const result: DataTypeCategory[] = libCats.map((c) => ({
    id: c.id,
    displayName: c.displayName,
    internalName: c.internalName,
    builtIn: c.source === 'autodesk-verified',
    description: c.notes,
  }));

  // Ensure legacy custom storage categories are also merged if any exist
  const legacyUser = loadUserCategories();
  for (const leg of legacyUser) {
    if (!result.some((r) => r.internalName.toLowerCase() === leg.internalName.toLowerCase())) {
      result.push(leg);
    }
  }

  return result;
}

/**
 * Resolve internal category name given display name or id
 */
export function resolveCategoryInternalName(
  categoryNameOrId?: string,
  categoriesList?: DataTypeCategory[]
): string {
  if (!categoryNameOrId) {
    return 'LcRevitData_Element';
  }
  const list = categoriesList || getAllCategories();
  const found = list.find(
    (c) =>
      c.displayName === categoryNameOrId ||
      c.id === categoryNameOrId ||
      c.internalName === categoryNameOrId
  );
  if (found) {
    return found.internalName;
  }
  // Fallback for standard built-ins if passed directly
  switch (categoryNameOrId) {
    case 'Element':
      return 'LcRevitData_Element';
    case 'Custom':
      return 'LcRevitData_Custom';
    case 'Text':
      return 'LcSvf_Text';
    case 'Identity Data':
      return 'LcSvf_Identity Data';
    case 'Item':
      return 'LcOaNode';
    default:
      return String(categoryNameOrId).replace(/\s+/g, '_');
  }
}


/**
 * Validate category display name and internal name
 */
export function validateCategory(
  category: { displayName: string; internalName: string },
  existingCategories: DataTypeCategory[],
  editingId?: string
): { isValid: boolean; error?: string } {
  const dispName = (category.displayName || '').trim();
  const intName = (category.internalName || '').trim();

  if (!dispName) {
    return { isValid: false, error: 'Category Display Name cannot be empty.' };
  }

  if (!intName) {
    return { isValid: false, error: 'Category Internal Name cannot be empty.' };
  }

  // Check for invalid XML attribute characters (no spaces, quotes, <>&)
  const xmlAttrRegex = /^[a-zA-Z0-9_\-.:/]+$/;
  if (!xmlAttrRegex.test(intName)) {
    return {
      isValid: false,
      error:
        'Category Internal Name must be a valid XML identifier without spaces, quotes, or special characters (<, >, &, ", \'). Allowed: letters, numbers, underscores, hyphens, dots, and colons.',
    };
  }

  // Check for duplicate Display Name
  const dispConflict = existingCategories.find(
    (c) => c.id !== editingId && c.displayName.toLowerCase() === dispName.toLowerCase()
  );
  if (dispConflict) {
    return {
      isValid: false,
      error: `A category with display name "${dispName}" already exists.`,
    };
  }

  // Check for duplicate Internal Name
  const intConflict = existingCategories.find(
    (c) => c.id !== editingId && c.internalName.toLowerCase() === intName.toLowerCase()
  );
  if (intConflict) {
    return {
      isValid: false,
      error: `A category with internal name "${intName}" already exists (${intConflict.displayName}).`,
    };
  }

  return { isValid: true };
}
