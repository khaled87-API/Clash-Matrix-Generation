import { ConditionConfig } from '../types/selectionSet';
import { colIndexToLetter } from '../excel/parser';

/**
 * Immutable Preset Template for the Standard BIM Navisworks FindSpec Condition Rule.
 * Contains EXACTLY ONE condition:
 * Category: Element (LcRevitData_Element)
 * Property: Category (lcldrevit_parameter_-1002000)
 * Flags: 10 (AND)
 * 
 * This array is frozen to ensure it cannot be mutated at runtime.
 */
export const IMMUTABLE_STANDARD_BIM_RULES: readonly Omit<ConditionConfig, 'id'>[] = Object.freeze([
  {
    valueSource: 'excel',
    excelColumnLetter: 'E',
    excelColumnIndex: 4,
    dataType: 'Element',
    categoryInternalName: 'LcRevitData_Element',
    propertyDisplayName: 'Category',
    propertyInternalName: 'lcldrevit_parameter_-1002000',
    test: 'contains',
    flags: 10,
  },
]);

/**
 * Backward compatibility alias for legacy imports
 */
export const IMMUTABLE_STANDARD_8_BIM_RULES = IMMUTABLE_STANDARD_BIM_RULES;

/**
 * Creates a fresh, deep-cloned copy of the standard BIM condition, mapped to the provided column index.
 * Contains exactly 1 condition: Category = Element, Property = Category.
 * Any subsequent mutations to this cloned array or its objects will never affect IMMUTABLE_STANDARD_BIM_RULES.
 */
export function cloneStandardBimConditions(
  colIndex: number = 4,
  _groupColIndex?: number
): ConditionConfig[] {
  const colLetter = colIndexToLetter(colIndex);

  return IMMUTABLE_STANDARD_BIM_RULES.map((rule, idx) => ({
    id: `cond_std_${idx}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    valueSource: rule.valueSource || 'excel',
    excelColumnLetter: colLetter,
    excelColumnIndex: colIndex,
    dataType: rule.dataType,
    categoryInternalName: rule.categoryInternalName,
    propertyDisplayName: rule.propertyDisplayName,
    propertyInternalName: rule.propertyInternalName,
    test: rule.test,
    flags: rule.flags,
  }));
}

/**
 * Legacy alias for cloneStandardBimConditions
 */
export const cloneStandard8BimConditions = cloneStandardBimConditions;
