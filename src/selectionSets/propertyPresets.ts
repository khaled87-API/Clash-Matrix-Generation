import { PropertyPreset, NavisworksDataType } from '../types/selectionSet';

export const DEFAULT_PROPERTY_PRESETS: PropertyPreset[] = [
  {
    id: 'preset_elem_priority',
    name: 'CD_ClashPriority — Element (Revit Parameter 3568759)',
    dataType: 'Element',
    categoryInternalName: 'LcRevitData_Element',
    propertyDisplayName: 'CD_ClashPriority',
    propertyInternalName: 'lcldrevit_parameter_3568759',
    test: 'contains',
    flags: 10,
  },
  {
    id: 'preset_elem_group',
    name: 'CD_ClashGroup — Element (Revit Parameter 3568896)',
    dataType: 'Element',
    categoryInternalName: 'LcRevitData_Element',
    propertyDisplayName: 'CD_ClashGroup',
    propertyInternalName: 'lcldrevit_parameter_3568896',
    test: 'contains',
    flags: 10,
  },
  {
    id: 'preset_custom_priority',
    name: 'CD_Clash Priority — Custom (Flags 74)',
    dataType: 'Custom',
    categoryInternalName: 'LcRevitData_Custom',
    propertyDisplayName: 'CD_Clash Priority',
    propertyInternalName: 'CD_Clash Priority',
    test: 'contains',
    flags: 74,
  },
  {
    id: 'preset_custom_group',
    name: 'CD_Clash Group — Custom (Flags 10)',
    dataType: 'Custom',
    categoryInternalName: 'LcRevitData_Custom',
    propertyDisplayName: 'CD_Clash Group',
    propertyInternalName: 'CD_Clash Group',
    test: 'contains',
    flags: 10,
  },
  {
    id: 'preset_text_priority',
    name: 'CD_Clash Priority — Text (Flags 74)',
    dataType: 'Text',
    categoryInternalName: 'LcSvf_Text',
    propertyDisplayName: 'CD_Clash Priority',
    propertyInternalName: 'CD_Clash Priority',
    test: 'contains',
    flags: 74,
  },
  {
    id: 'preset_text_group',
    name: 'CD_Clash Group — Text (Flags 10)',
    dataType: 'Text',
    categoryInternalName: 'LcSvf_Text',
    propertyDisplayName: 'CD_Clash Group',
    propertyInternalName: 'CD_Clash Group',
    test: 'contains',
    flags: 10,
  },
  {
    id: 'preset_id_priority',
    name: 'CD_Clash Priority — Identity Data (Flags 74)',
    dataType: 'Identity Data',
    categoryInternalName: 'LcSvf_Identity Data',
    propertyDisplayName: 'CD_Clash Priority',
    propertyInternalName: 'CD_Clash Priority',
    test: 'contains',
    flags: 74,
  },
  {
    id: 'preset_id_group',
    name: 'CD_Clash Group — Identity Data (Flags 10)',
    dataType: 'Identity Data',
    categoryInternalName: 'LcSvf_Identity Data',
    propertyDisplayName: 'CD_Clash Group',
    propertyInternalName: 'CD_Clash Group',
    test: 'contains',
    flags: 10,
  },
  {
    id: 'preset_category_name',
    name: 'Category Name — Element',
    dataType: 'Element',
    categoryInternalName: 'LcRevitData_Element',
    propertyDisplayName: 'Category',
    propertyInternalName: 'lcldrevit_parameter_-1002000',
    test: 'contains',
    flags: 10,
  },
  {
    id: 'preset_family_type',
    name: 'Family and Type — Element',
    dataType: 'Element',
    categoryInternalName: 'LcRevitData_Element',
    propertyDisplayName: 'Type Name',
    propertyInternalName: 'lcldrevit_parameter_-1002001',
    test: 'contains',
    flags: 10,
  },
];

export const CATEGORY_INTERNAL_MAPPING: Record<NavisworksDataType, string> = {
  'Element': 'LcRevitData_Element',
  'Custom': 'LcRevitData_Custom',
  'Text': 'LcSvf_Text',
  'Identity Data': 'LcSvf_Identity Data',
};

const STORAGE_KEY = 'navisworks_clash_property_presets_v1';

export function loadSavedPresets(): PropertyPreset[] {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return DEFAULT_PROPERTY_PRESETS;
    const custom = JSON.parse(json);
    if (Array.isArray(custom) && custom.length > 0) {
      return custom;
    }
  } catch (e) {
    console.warn('Failed to load presets from localStorage', e);
  }
  return DEFAULT_PROPERTY_PRESETS;
}

export function saveCustomPresets(presets: PropertyPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch (e) {
    console.warn('Failed to save presets to localStorage', e);
  }
}
