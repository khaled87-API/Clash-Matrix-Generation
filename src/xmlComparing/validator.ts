/**
 * NAVISWORKS XML VALIDATOR
 * =========================
 * Validates that a set of Clash Tests and Selection Sets forms a completely
 * self-contained, valid Autodesk Navisworks Exchange XML package prior to export.
 */

import {
  NavisworksClashTest,
  NavisworksSelectionSet,
  FinalValidationResult,
} from './types';

export function validateFinalXmlStructure(
  testsToExport: NavisworksClashTest[],
  selectionSetsToExport: NavisworksSelectionSet[],
  units: string = 'm',
  baselineSelectionSets: NavisworksSelectionSet[] = []
): FinalValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const unresolvedLocators: string[] = [];
  let baselineResolvedCount = 0;

  // 1. Build lookup of available exported Selection Set locators and names
  const availableLocators = new Set<string>();
  const availableSetNames = new Set<string>();

  for (const s of selectionSetsToExport) {
    if (s.locator) {
      availableLocators.add(s.locator.toLowerCase().trim());
    }
    if (s.name) {
      availableSetNames.add(s.name.toLowerCase().trim());
    }
    availableLocators.add(`lcop_selection_set_tree/${s.name}`.toLowerCase().trim());
    if (s.folderName) {
      availableLocators.add(`lcop_selection_set_tree/${s.folderName}/${s.name}`.toLowerCase().trim());
    }
  }

  // 1b. Build lookup of baseline (OLD XML) Selection Set locators and names
  const baselineLocators = new Set<string>();
  const baselineSetNames = new Set<string>();

  for (const s of baselineSelectionSets) {
    if (s.locator) {
      baselineLocators.add(s.locator.toLowerCase().trim());
    }
    if (s.name) {
      baselineSetNames.add(s.name.toLowerCase().trim());
    }
    baselineLocators.add(`lcop_selection_set_tree/${s.name}`.toLowerCase().trim());
    if (s.folderName) {
      baselineLocators.add(`lcop_selection_set_tree/${s.folderName}/${s.name}`.toLowerCase().trim());
    }
  }

  // Helper to check resolution in exported or baseline sets
  const checkResolution = (locatorStr: string, nameStr: string): 'EXPORTED' | 'BASELINE' | 'UNRESOLVED' => {
    const loc = (locatorStr || '').toLowerCase().trim();
    const name = (nameStr || '').toLowerCase().trim();

    if (!loc && !name) return 'UNRESOLVED';

    const inExported =
      (loc && availableLocators.has(loc)) ||
      (name && availableSetNames.has(name)) ||
      (name && Array.from(availableLocators).some((l) => l.endsWith(`/${name}`)));

    if (inExported) return 'EXPORTED';

    const inBaseline =
      (loc && baselineLocators.has(loc)) ||
      (name && baselineSetNames.has(name)) ||
      (name && Array.from(baselineLocators).some((l) => l.endsWith(`/${name}`)));

    if (inBaseline) return 'BASELINE';

    return 'UNRESOLVED';
  };

  // 2. Validate tests count
  if (testsToExport.length === 0) {
    warnings.push('No clash tests are selected for export in the final XML.');
  }

  // 3. Validate every Clash Test definition
  const testNames = new Set<string>();

  for (const ct of testsToExport) {
    // Name validation
    if (!ct.name || ct.name.trim() === '') {
      errors.push(`Clash test found with missing or blank name (ID: ${ct.id}).`);
    } else {
      if (testNames.has(ct.name)) {
        errors.push(`Duplicate clash test name found in final export list: "${ct.name}".`);
      }
      testNames.add(ct.name);
    }

    // Type validation
    const type = (ct.testType || '').toLowerCase();
    if (!['hard', 'clearance', 'duplicate'].includes(type)) {
      warnings.push(`Test "${ct.name}" has non-standard test type: "${ct.testType}".`);
    }

    // Tolerance validation
    if (isNaN(ct.toleranceMeters) || ct.toleranceMeters < 0) {
      errors.push(`Test "${ct.name}" has invalid tolerance value: "${ct.toleranceFormatted}".`);
    }

    // Left selection locator validation
    const leftLoc = ct.left?.locator || '';
    const leftName = ct.left?.selectionSetName || '';
    if (!leftLoc && !leftName) {
      errors.push(`Test "${ct.name}" is missing a Left Selection Set reference.`);
    } else {
      const res = checkResolution(leftLoc, leftName);
      if (res === 'BASELINE') {
        baselineResolvedCount++;
      } else if (res === 'UNRESOLVED') {
        errors.push(
          `Clash Test "${ct.name}" references "${leftLoc || leftName}" which does not exist in the exported package or baseline Navisworks project.`
        );
        unresolvedLocators.push(leftLoc || leftName);
      }
    }

    // Right selection locator validation
    const rightLoc = ct.right?.locator || '';
    const rightName = ct.right?.selectionSetName || '';
    if (!rightLoc && !rightName) {
      errors.push(`Test "${ct.name}" is missing a Right Selection Set reference.`);
    } else {
      const res = checkResolution(rightLoc, rightName);
      if (res === 'BASELINE') {
        baselineResolvedCount++;
      } else if (res === 'UNRESOLVED') {
        errors.push(
          `Clash Test "${ct.name}" references "${rightLoc || rightName}" which does not exist in the exported package or baseline Navisworks project.`
        );
        unresolvedLocators.push(rightLoc || rightName);
      }
    }
  }

  // 4. Validate Selection Sets & duplicate prevention
  const setKeys = new Set<string>();
  const referencedSetKeys = new Set<string>();

  for (const ct of testsToExport) {
    if (ct.left?.locator) referencedSetKeys.add(ct.left.locator.toLowerCase().trim());
    if (ct.left?.selectionSetName) referencedSetKeys.add(ct.left.selectionSetName.toLowerCase().trim());
    if (ct.right?.locator) referencedSetKeys.add(ct.right.locator.toLowerCase().trim());
    if (ct.right?.selectionSetName) referencedSetKeys.add(ct.right.selectionSetName.toLowerCase().trim());
  }

  for (const s of selectionSetsToExport) {
    if (!s.name || s.name.trim() === '') {
      errors.push('Selection set found with blank or empty name.');
    }

    const key = `${s.folderName || ''}/${s.name}`.toLowerCase();
    if (setKeys.has(key)) {
      errors.push(
        `Duplicate selection set definition found in final XML: "${s.folderName ? s.folderName + '/' : ''}${s.name}".`
      );
    }
    setKeys.add(key);

    const sLoc = (s.locator || '').toLowerCase().trim();
    const sName = (s.name || '').toLowerCase().trim();
    const sFull = `lcop_selection_set_tree/${s.folderName}/${s.name}`.toLowerCase().trim();

    if (!referencedSetKeys.has(sLoc) && !referencedSetKeys.has(sName) && !referencedSetKeys.has(sFull)) {
      warnings.push(`Exported selection set "${s.name}" is orphaned (not referenced by any exported Clash Test).`);
    }

    if (!s.findSpec || !s.findSpec.conditions || s.findSpec.conditions.length === 0) {
      warnings.push(`Selection set "${s.name}" has no FindSpec search conditions.`);
    }
  }

  // Count unique folders
  const folders = new Set<string>();
  for (const s of selectionSetsToExport) {
    folders.add(s.folderName || '(root)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    clashTestsToExportCount: testsToExport.length,
    selectionSetsToExportCount: selectionSetsToExport.length,
    viewFoldersToExportCount: folders.size,
    unresolvedLocators,
    baselineResolvedCount,
  };
}
