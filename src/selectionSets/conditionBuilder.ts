import { ConditionConfig, SelectionSetCondition } from '../types/selectionSet';
import { resolveCategoryInternalName } from './categoryManager';

/**
 * Builds a concrete SelectionSetCondition from a ConditionConfig and the actual cell value
 */
export function buildCondition(
  config: ConditionConfig,
  cellValue?: string
): SelectionSetCondition | null {
  // Determine concrete value:
  // 1. If explicit config.value is provided (or valueSource === 'custom'), use it.
  // 2. Otherwise use the passed cellValue from Excel.
  let cleanVal = '';
  if (config.value !== undefined && config.value !== null && String(config.value).trim() !== '') {
    cleanVal = String(config.value).trim();
  } else if (cellValue !== undefined && cellValue !== null) {
    cleanVal = String(cellValue).trim();
  }

  if (!cleanVal) return null;

  const categoryInternal =
    config.categoryInternalName || resolveCategoryInternalName(config.dataType);

  return {
    categoryName: config.dataType,
    categoryInternal,
    propertyName: config.propertyDisplayName,
    propertyInternal: config.propertyInternalName,
    test: config.test || 'contains',
    flags: config.flags !== undefined ? config.flags : 10,
    value: cleanVal,
    dataType: 'wstring',
  };
}

