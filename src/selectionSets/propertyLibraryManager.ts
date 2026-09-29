import { NavisworksPropertyDefinition, XmlImportPreview } from '../types/propertyLibrary';

/**
 * Verified definitions already present and proven in standard Autodesk / Navisworks workflows.
 * Only these verified properties are designated "autodesk-verified".
 */
export const VERIFIED_AUTODESK_PROPERTIES: readonly NavisworksPropertyDefinition[] = Object.freeze([
  {
    id: 'prop_elem_clash_priority',
    categoryDisplayName: 'Element',
    categoryInternalName: 'LcRevitData_Element',
    propertyDisplayName: 'CD_ClashPriority',
    propertyInternalName: 'lcldrevit_parameter_3568759',
    source: 'autodesk-verified',
    dataType: 'Element',
    defaultFlags: 10,
    supportedTests: ['contains', 'equals', 'wildcard'],
    notes: 'Standard Revit Element parameter 3568759 for Clash Priority',
  },
  {
    id: 'prop_elem_clash_group',
    categoryDisplayName: 'Element',
    categoryInternalName: 'LcRevitData_Element',
    propertyDisplayName: 'CD_ClashGroup',
    propertyInternalName: 'lcldrevit_parameter_3568896',
    source: 'autodesk-verified',
    dataType: 'Element',
    defaultFlags: 10,
    supportedTests: ['contains', 'equals', 'wildcard'],
    notes: 'Standard Revit Element parameter 3568896 for Clash Group',
  },
  {
    id: 'prop_custom_clash_priority',
    categoryDisplayName: 'Custom',
    categoryInternalName: 'LcRevitData_Custom',
    propertyDisplayName: 'CD_Clash Priority',
    propertyInternalName: 'CD_Clash Priority',
    source: 'autodesk-verified',
    dataType: 'Custom',
    defaultFlags: 74,
    supportedTests: ['contains', 'equals', 'wildcard'],
    notes: 'Revit Custom parameter for Clash Priority (Flags 74)',
  },
  {
    id: 'prop_custom_clash_group',
    categoryDisplayName: 'Custom',
    categoryInternalName: 'LcRevitData_Custom',
    propertyDisplayName: 'CD_Clash Group',
    propertyInternalName: 'CD_Clash Group',
    source: 'autodesk-verified',
    dataType: 'Custom',
    defaultFlags: 10,
    supportedTests: ['contains', 'equals', 'wildcard'],
    notes: 'Revit Custom parameter for Clash Group (Flags 10)',
  },
  {
    id: 'prop_text_clash_priority',
    categoryDisplayName: 'Text',
    categoryInternalName: 'LcSvf_Text',
    propertyDisplayName: 'CD_Clash Priority',
    propertyInternalName: 'CD_Clash Priority',
    source: 'autodesk-verified',
    dataType: 'Text',
    defaultFlags: 74,
    supportedTests: ['contains', 'equals', 'wildcard'],
    notes: 'SVF/Revit Text tab parameter for Clash Priority',
  },
  {
    id: 'prop_text_clash_group',
    categoryDisplayName: 'Text',
    categoryInternalName: 'LcSvf_Text',
    propertyDisplayName: 'CD_Clash Group',
    propertyInternalName: 'CD_Clash Group',
    source: 'autodesk-verified',
    dataType: 'Text',
    defaultFlags: 10,
    supportedTests: ['contains', 'equals', 'wildcard'],
    notes: 'SVF/Revit Text tab parameter for Clash Group',
  },
  {
    id: 'prop_id_clash_priority',
    categoryDisplayName: 'Identity Data',
    categoryInternalName: 'LcSvf_Identity Data',
    propertyDisplayName: 'CD_Clash Priority',
    propertyInternalName: 'CD_Clash Priority',
    source: 'autodesk-verified',
    dataType: 'Identity Data',
    defaultFlags: 74,
    supportedTests: ['contains', 'equals', 'wildcard'],
    notes: 'Identity Data tab parameter for Clash Priority',
  },
  {
    id: 'prop_id_clash_group',
    categoryDisplayName: 'Identity Data',
    categoryInternalName: 'LcSvf_Identity Data',
    propertyDisplayName: 'CD_Clash Group',
    propertyInternalName: 'CD_Clash Group',
    source: 'autodesk-verified',
    dataType: 'Identity Data',
    defaultFlags: 10,
    supportedTests: ['contains', 'equals', 'wildcard'],
    notes: 'Identity Data tab parameter for Clash Group',
  },
  {
    id: 'prop_elem_category',
    categoryDisplayName: 'Element',
    categoryInternalName: 'LcRevitData_Element',
    propertyDisplayName: 'Category',
    propertyInternalName: 'lcldrevit_parameter_-1002000',
    source: 'autodesk-verified',
    dataType: 'Element',
    defaultFlags: 10,
    supportedTests: ['contains', 'equals', 'wildcard'],
    notes: 'Revit Built-In Parameter for Element Category (-1002000)',
  },
  {
    id: 'prop_elem_type_name',
    categoryDisplayName: 'Element',
    categoryInternalName: 'LcRevitData_Element',
    propertyDisplayName: 'Type Name',
    propertyInternalName: 'lcldrevit_parameter_-1002001',
    source: 'autodesk-verified',
    dataType: 'Element',
    defaultFlags: 10,
    supportedTests: ['contains', 'equals', 'wildcard'],
    notes: 'Revit Built-In Parameter for Type Name (-1002001)',
  },
  {
    id: 'prop_item_name',
    categoryDisplayName: 'Item',
    categoryInternalName: 'LcOaNode',
    propertyDisplayName: 'Name',
    propertyInternalName: 'LcOaNodeSelectedItems',
    source: 'autodesk-verified',
    dataType: 'Item',
    defaultFlags: 10,
    supportedTests: ['contains', 'equals', 'wildcard'],
    notes: 'Navisworks Item tab Name parameter',
  },
]);

const STORAGE_KEY = 'navisworks_property_library_v1';

/**
 * Generates the deterministic identity key for deduplication.
 * Rule: categoryInternalName + '::' + propertyInternalName
 */
export function getPropertyIdentity(
  categoryInternalName: string,
  propertyInternalName: string
): string {
  return `${(categoryInternalName || '').trim()}::${(propertyInternalName || '').trim()}`;
}

/**
 * Loads all saved user-defined and imported properties from local storage,
 * merged with the immutable verified Autodesk properties.
 */
export function loadPropertyLibrary(): NavisworksPropertyDefinition[] {
  let storedProperties: NavisworksPropertyDefinition[] = [];
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          storedProperties = parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to read Property Library from localStorage', e);
  }

  // Deduplicate and merge with verified Autodesk properties.
  // Verified properties always take precedence over imported 'navisworks-xml' or duplicate entries.
  const map = new Map<string, NavisworksPropertyDefinition>();

  // 1. First add all verified Autodesk properties
  for (const verified of VERIFIED_AUTODESK_PROPERTIES) {
    const key = getPropertyIdentity(verified.categoryInternalName, verified.propertyInternalName);
    map.set(key, { ...verified });
  }

  // 2. Add stored user/xml properties
  for (const stored of storedProperties) {
    if (!stored.categoryInternalName || !stored.propertyInternalName) continue;
    const key = getPropertyIdentity(stored.categoryInternalName, stored.propertyInternalName);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, stored);
    } else if (existing.source === 'autodesk-verified') {
      // KEEP autodesk-verified. Do NOT downgrade to navisworks-xml.
      continue;
    } else {
      map.set(key, stored);
    }
  }

  return Array.from(map.values());
}

/**
 * Saves all user-defined and imported properties to local storage.
 */
export function savePropertyLibrary(properties: NavisworksPropertyDefinition[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(properties));
    }
  } catch (e) {
    console.warn('Failed to save Property Library to localStorage', e);
  }
}

/**
 * Adds a new custom user-defined property to the library.
 */
export function addCustomProperty(
  newProp: Omit<NavisworksPropertyDefinition, 'id' | 'source'>,
  currentLibrary: NavisworksPropertyDefinition[]
): { success: boolean; error?: string; updatedLibrary: NavisworksPropertyDefinition[] } {
  const catDisplay = (newProp.categoryDisplayName || '').trim();
  const catInternal = (newProp.categoryInternalName || '').trim();
  const propDisplay = (newProp.propertyDisplayName || '').trim();
  const propInternal = (newProp.propertyInternalName || '').trim();

  if (!catDisplay) return { success: false, error: 'Category Display Name is required.', updatedLibrary: currentLibrary };
  if (!catInternal) return { success: false, error: 'Category Internal Name is required.', updatedLibrary: currentLibrary };
  if (!propDisplay) return { success: false, error: 'Property Display Name is required.', updatedLibrary: currentLibrary };
  if (!propInternal) return { success: false, error: 'Property Internal Name is required.', updatedLibrary: currentLibrary };

  const key = getPropertyIdentity(catInternal, propInternal);
  const existing = currentLibrary.find(
    (p) => getPropertyIdentity(p.categoryInternalName, p.propertyInternalName) === key
  );

  if (existing) {
    if (existing.source === 'autodesk-verified') {
      return {
        success: false,
        error: `Property with internal identity "${catInternal} -> ${propInternal}" already exists as Autodesk Verified.`,
        updatedLibrary: currentLibrary,
      };
    }
    return {
      success: false,
      error: `Property with internal identity "${catInternal} -> ${propInternal}" already exists in the library.`,
      updatedLibrary: currentLibrary,
    };
  }

  const created: NavisworksPropertyDefinition = {
    id: `prop_user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    categoryDisplayName: catDisplay,
    categoryInternalName: catInternal,
    propertyDisplayName: propDisplay,
    propertyInternalName: propInternal,
    source: 'user-defined',
    dataType: newProp.dataType || catDisplay,
    defaultFlags: newProp.defaultFlags !== undefined ? newProp.defaultFlags : 10,
    supportedTests: newProp.supportedTests || ['contains', 'equals', 'wildcard'],
    notes: newProp.notes?.trim() || undefined,
    createdAt: Date.now(),
  };

  const updated = [...currentLibrary, created];
  savePropertyLibrary(updated);
  return { success: true, updatedLibrary: updated };
}

/**
 * Updates an existing user-defined or imported property in the library.
 */
export function updatePropertyInLibrary(
  id: string,
  updates: Partial<NavisworksPropertyDefinition>,
  currentLibrary: NavisworksPropertyDefinition[]
): { success: boolean; error?: string; updatedLibrary: NavisworksPropertyDefinition[] } {
  const index = currentLibrary.findIndex((p) => p.id === id);
  if (index === -1) {
    return { success: false, error: 'Property not found in library.', updatedLibrary: currentLibrary };
  }

  const target = currentLibrary[index];
  if (target.source === 'autodesk-verified') {
    return { success: false, error: 'Autodesk Verified properties cannot be modified.', updatedLibrary: currentLibrary };
  }

  const catInternal = updates.categoryInternalName !== undefined ? updates.categoryInternalName.trim() : target.categoryInternalName;
  const propInternal = updates.propertyInternalName !== undefined ? updates.propertyInternalName.trim() : target.propertyInternalName;

  // Identity conflict check if changing internal names
  const key = getPropertyIdentity(catInternal, propInternal);
  const conflict = currentLibrary.find(
    (p) => p.id !== id && getPropertyIdentity(p.categoryInternalName, p.propertyInternalName) === key
  );
  if (conflict) {
    return {
      success: false,
      error: `Another property already exists with identity "${catInternal} -> ${propInternal}".`,
      updatedLibrary: currentLibrary,
    };
  }

  const updatedProp: NavisworksPropertyDefinition = {
    ...target,
    ...updates,
    categoryDisplayName: updates.categoryDisplayName !== undefined ? updates.categoryDisplayName.trim() : target.categoryDisplayName,
    categoryInternalName: catInternal,
    propertyDisplayName: updates.propertyDisplayName !== undefined ? updates.propertyDisplayName.trim() : target.propertyDisplayName,
    propertyInternalName: propInternal,
    notes: updates.notes !== undefined ? updates.notes.trim() : target.notes,
  };

  const updatedList = [...currentLibrary];
  updatedList[index] = updatedProp;
  savePropertyLibrary(updatedList);
  return { success: true, updatedLibrary: updatedList };
}

/**
 * Deletes a property from the library. Autodesk Verified properties cannot be deleted.
 */
export function deletePropertyFromLibrary(
  id: string,
  currentLibrary: NavisworksPropertyDefinition[]
): { success: boolean; error?: string; updatedLibrary: NavisworksPropertyDefinition[] } {
  const target = currentLibrary.find((p) => p.id === id);
  if (!target) {
    return { success: false, error: 'Property not found.', updatedLibrary: currentLibrary };
  }
  if (target.source === 'autodesk-verified') {
    return { success: false, error: 'Autodesk Verified properties cannot be deleted.', updatedLibrary: currentLibrary };
  }

  const updated = currentLibrary.filter((p) => p.id !== id);
  savePropertyLibrary(updated);
  return { success: true, updatedLibrary: updated };
}

/**
 * Parses Navisworks XML string and extracts all unique property definitions.
 * Deduplicates by categoryInternalName + propertyInternalName.
 */
export function parseNavisworksXmlProperties(
  xmlString: string,
  fileName: string = 'imported.xml'
): XmlImportPreview {
  let conditionsFound = 0;
  const uniquePropsMap = new Map<string, NavisworksPropertyDefinition>();
  const categoriesSet = new Set<string>();

  // Browser-safe DOMParser
  if (typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

      // Check parsererror
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error(parserError.textContent || 'XML Parsing error');
      }

      const conditionNodes = xmlDoc.getElementsByTagName('condition');
      conditionsFound = conditionNodes.length;

      for (let i = 0; i < conditionNodes.length; i++) {
        const condNode = conditionNodes[i];
        const testAttr = condNode.getAttribute('test') || 'contains';
        const flagsAttr = condNode.getAttribute('flags');
        const parsedFlags = flagsAttr ? parseInt(flagsAttr, 10) : 10;

        // Category
        const catNode = condNode.getElementsByTagName('category')[0];
        const catNameNode = catNode ? catNode.getElementsByTagName('name')[0] : null;
        const categoryDisplayName = catNameNode ? (catNameNode.textContent || '').trim() : '';
        const categoryInternalName = catNameNode ? (catNameNode.getAttribute('internal') || '').trim() : '';

        // Property
        const propNode = condNode.getElementsByTagName('property')[0];
        const propNameNode = propNode ? propNode.getElementsByTagName('name')[0] : null;
        const propertyDisplayName = propNameNode ? (propNameNode.textContent || '').trim() : '';
        const propertyInternalName = propNameNode ? (propNameNode.getAttribute('internal') || '').trim() : '';

        // Value data type if present
        const valueNode = condNode.getElementsByTagName('value')[0];
        const dataNode = valueNode ? valueNode.getElementsByTagName('data')[0] : null;
        const valDataType = dataNode ? (dataNode.getAttribute('type') || 'wstring') : 'wstring';

        if (categoryInternalName && propertyInternalName) {
          categoriesSet.add(categoryInternalName);
          const key = getPropertyIdentity(categoryInternalName, propertyInternalName);

          if (!uniquePropsMap.has(key)) {
            uniquePropsMap.set(key, {
              id: `prop_xml_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
              categoryDisplayName: categoryDisplayName || categoryInternalName,
              categoryInternalName,
              propertyDisplayName: propertyDisplayName || propertyInternalName,
              propertyInternalName,
              source: 'navisworks-xml',
              dataType: categoryDisplayName || 'Element',
              defaultFlags: isNaN(parsedFlags) ? 10 : parsedFlags,
              supportedTests: [testAttr],
              sourceFileName: fileName,
              notes: `Imported from ${fileName} (Condition #${i + 1})`,
            });
          }
        }
      }
    } catch (e) {
      console.warn('DOMParser failed, falling back to regex extraction', e);
    }
  }

  // Regex fallback for non-browser or edge-case test environments
  if (conditionsFound === 0) {
    const conditionRegex = /<condition\b([^>]*)>([\s\S]*?)<\/condition>/gi;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = conditionRegex.exec(xmlString)) !== null) {
      conditionsFound++;
      idx++;
      const condAttrs = match[1];
      const condBody = match[2];

      const testMatch = /test="([^"]*)"/i.exec(condAttrs);
      const testAttr = testMatch ? testMatch[1] : 'contains';

      const flagsMatch = /flags="([^"]*)"/i.exec(condAttrs);
      const parsedFlags = flagsMatch ? parseInt(flagsMatch[1], 10) : 10;

      // Extract Category: <category><name internal="LcRevitData_Element">Element</name></category>
      const catMatch = /<category>[\s\S]*?<name\s+internal="([^"]*)"[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/category>/i.exec(condBody);
      const categoryInternalName = catMatch ? catMatch[1].trim() : '';
      const categoryDisplayName = catMatch ? catMatch[2].trim() : '';

      // Extract Property: <property><name internal="lcldrevit_parameter_3568759">CD_ClashPriority</name></property>
      const propMatch = /<property>[\s\S]*?<name\s+internal="([^"]*)"[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/property>/i.exec(condBody);
      const propertyInternalName = propMatch ? propMatch[1].trim() : '';
      const propertyDisplayName = propMatch ? propMatch[2].trim() : '';

      if (categoryInternalName && propertyInternalName) {
        categoriesSet.add(categoryInternalName);
        const key = getPropertyIdentity(categoryInternalName, propertyInternalName);

        if (!uniquePropsMap.has(key)) {
          uniquePropsMap.set(key, {
            id: `prop_xml_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
            categoryDisplayName: categoryDisplayName || categoryInternalName,
            categoryInternalName,
            propertyDisplayName: propertyDisplayName || propertyInternalName,
            propertyInternalName,
            source: 'navisworks-xml',
            dataType: categoryDisplayName || 'Element',
            defaultFlags: isNaN(parsedFlags) ? 10 : parsedFlags,
            supportedTests: [testAttr],
            sourceFileName: fileName,
            notes: `Imported from ${fileName} (Condition #${idx})`,
          });
        }
      }
    }
  }

  const properties = Array.from(uniquePropsMap.values());

  return {
    fileName,
    conditionsFound,
    uniqueCategoriesCount: categoriesSet.size,
    uniquePropertiesCount: properties.length,
    properties,
  };
}

/**
 * Merges imported XML properties into the active library with strict source priority:
 * 1. If property already exists as "autodesk-verified", KEEP autodesk-verified and DO NOT downgrade.
 * 2. If property does not exist, add as "navisworks-xml".
 * 3. Deduplicate by categoryInternalName + propertyInternalName.
 */
export function commitImportedProperties(
  importedProperties: NavisworksPropertyDefinition[],
  currentLibrary: NavisworksPropertyDefinition[]
): { addedCount: number; updatedLibrary: NavisworksPropertyDefinition[] } {
  let addedCount = 0;
  const libraryMap = new Map<string, NavisworksPropertyDefinition>();

  // Populate map with current library
  for (const prop of currentLibrary) {
    const key = getPropertyIdentity(prop.categoryInternalName, prop.propertyInternalName);
    libraryMap.set(key, { ...prop });
  }

  // Iterate over imported properties
  for (const imported of importedProperties) {
    const key = getPropertyIdentity(imported.categoryInternalName, imported.propertyInternalName);
    const existing = libraryMap.get(key);

    if (!existing) {
      // New property!
      libraryMap.set(key, imported);
      addedCount++;
    } else if (existing.source === 'autodesk-verified') {
      // KEEP Autodesk-verified. Never downgrade!
      continue;
    } else if (existing.source === 'user-defined') {
      // Preserve user definition unless explicitly overwritten
      continue;
    } else {
      // Update existing XML import metadata if new source file
      libraryMap.set(key, {
        ...existing,
        sourceFileName: imported.sourceFileName || existing.sourceFileName,
        notes: imported.notes || existing.notes,
      });
    }
  }

  const updatedList = Array.from(libraryMap.values());
  savePropertyLibrary(updatedList);
  return { addedCount, updatedLibrary: updatedList };
}

/**
 * Filters the Property Library by Search Query, Category, and Source.
 */
export function filterPropertyLibrary(
  properties: NavisworksPropertyDefinition[],
  query: string,
  categoryFilter: string,
  sourceFilter: string
): NavisworksPropertyDefinition[] {
  const cleanQuery = (query || '').trim().toLowerCase();

  return properties.filter((p) => {
    // Category Filter
    if (categoryFilter && categoryFilter !== 'ALL') {
      if (
        p.categoryDisplayName !== categoryFilter &&
        p.categoryInternalName !== categoryFilter
      ) {
        return false;
      }
    }

    // Source Filter
    if (sourceFilter && sourceFilter !== 'ALL') {
      if (p.source !== sourceFilter) {
        return false;
      }
    }

    // Search Query (matches display name or internal name of property or category)
    if (cleanQuery) {
      const matchCatDisplay = (p.categoryDisplayName || '').toLowerCase().includes(cleanQuery);
      const matchCatInternal = (p.categoryInternalName || '').toLowerCase().includes(cleanQuery);
      const matchPropDisplay = (p.propertyDisplayName || '').toLowerCase().includes(cleanQuery);
      const matchPropInternal = (p.propertyInternalName || '').toLowerCase().includes(cleanQuery);
      const matchNotes = (p.notes || '').toLowerCase().includes(cleanQuery);

      return matchCatDisplay || matchCatInternal || matchPropDisplay || matchPropInternal || matchNotes;
    }

    return true;
  });
}
