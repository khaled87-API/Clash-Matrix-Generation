/**
 * CLASH TEST COMPARATOR
 * =====================
 * Compares two sets of Navisworks Clash Tests by canonical name.
 * Generates detailed property-level change diffs.
 */

import {
  NavisworksClashTest,
  ClashTestDiff,
  ClashTestPropertyChange,
} from './types';

/**
 * Numeric tolerance equality check with small epsilon (1e-9 meters)
 */
function areTolerancesEqual(t1: number, t2: number): boolean {
  return Math.abs(t1 - t2) < 1e-9;
}

/**
 * Normalizes test type string for comparison ('hard' vs 'Hard')
 */
function normalizeType(type: string): string {
  return String(type || '').trim().toLowerCase();
}

/**
 * Compares a single pair of Clash Tests (old vs new) with identical names.
 */
export function compareClashTestPair(
  oldTest: NavisworksClashTest,
  newTest: NavisworksClashTest
): ClashTestDiff {
  const changes: ClashTestPropertyChange[] = [];

  // 1. Clash Type
  const oldTypeNorm = normalizeType(oldTest.testType);
  const newTypeNorm = normalizeType(newTest.testType);
  if (oldTypeNorm !== newTypeNorm) {
    changes.push({
      property: 'testType',
      label: 'Clash Type',
      oldValue: oldTest.testType.charAt(0).toUpperCase() + oldTest.testType.slice(1),
      newValue: newTest.testType.charAt(0).toUpperCase() + newTest.testType.slice(1),
      isSignificant: true,
    });
  }

  // 2. Tolerance (numeric floating-point comparison in meters)
  if (!areTolerancesEqual(oldTest.toleranceMeters, newTest.toleranceMeters)) {
    changes.push({
      property: 'tolerance',
      label: 'Tolerance',
      oldValue: `${oldTest.toleranceFormatted} m`,
      newValue: `${newTest.toleranceFormatted} m`,
      isSignificant: true,
    });
  }

  // 3. Left Selection Set
  if (oldTest.left.selectionSetName !== newTest.left.selectionSetName) {
    changes.push({
      property: 'leftSetName',
      label: 'Left Selection Set Name',
      oldValue: oldTest.left.selectionSetName || '(none)',
      newValue: newTest.left.selectionSetName || '(none)',
      isSignificant: true,
    });
  }

  if (oldTest.left.folder !== newTest.left.folder) {
    changes.push({
      property: 'leftFolder',
      label: 'Left Folder',
      oldValue: oldTest.left.folder || '(root)',
      newValue: newTest.left.folder || '(root)',
      isSignificant: true,
    });
  }

  if (oldTest.left.locator !== newTest.left.locator) {
    changes.push({
      property: 'leftLocator',
      label: 'Left Locator',
      oldValue: oldTest.left.locator || '(none)',
      newValue: newTest.left.locator || '(none)',
      isSignificant: false,
    });
  }

  // 4. Right Selection Set
  if (oldTest.right.selectionSetName !== newTest.right.selectionSetName) {
    changes.push({
      property: 'rightSetName',
      label: 'Right Selection Set Name',
      oldValue: oldTest.right.selectionSetName || '(none)',
      newValue: newTest.right.selectionSetName || '(none)',
      isSignificant: true,
    });
  }

  if (oldTest.right.folder !== newTest.right.folder) {
    changes.push({
      property: 'rightFolder',
      label: 'Right Folder',
      oldValue: oldTest.right.folder || '(root)',
      newValue: newTest.right.folder || '(root)',
      isSignificant: true,
    });
  }

  if (oldTest.right.locator !== newTest.right.locator) {
    changes.push({
      property: 'rightLocator',
      label: 'Right Locator',
      oldValue: oldTest.right.locator || '(none)',
      newValue: newTest.right.locator || '(none)',
      isSignificant: false,
    });
  }

  // 5. Status
  if (oldTest.status.toLowerCase() !== newTest.status.toLowerCase()) {
    changes.push({
      property: 'status',
      label: 'Status',
      oldValue: oldTest.status,
      newValue: newTest.status,
      isSignificant: false,
    });
  }

  const isModified = changes.length > 0;

  return {
    name: oldTest.name,
    status: isModified ? 'MODIFIED' : 'UNCHANGED',
    oldTest,
    newTest,
    changes,
  };
}

/**
 * Compares an entire list of old Clash Tests against new Clash Tests.
 */
export function compareClashTestLists(
  oldTests: NavisworksClashTest[],
  newTests: NavisworksClashTest[]
): {
  diffs: ClashTestDiff[];
  duplicateOldNames: string[];
  duplicateNewNames: string[];
} {
  const oldMap = new Map<string, NavisworksClashTest>();
  const duplicateOldNames: string[] = [];

  for (const t of oldTests) {
    if (oldMap.has(t.name)) {
      duplicateOldNames.push(t.name);
    } else {
      oldMap.set(t.name, t);
    }
  }

  const newMap = new Map<string, NavisworksClashTest>();
  const duplicateNewNames: string[] = [];

  for (const t of newTests) {
    if (newMap.has(t.name)) {
      duplicateNewNames.push(t.name);
    } else {
      newMap.set(t.name, t);
    }
  }

  const diffs: ClashTestDiff[] = [];
  const processedNewNames = new Set<string>();

  // Process all tests present in OLD
  for (const [name, oldTest] of oldMap.entries()) {
    const newTest = newMap.get(name);
    if (!newTest) {
      // Exists in OLD but not in NEW -> REMOVED
      diffs.push({
        name,
        status: 'REMOVED',
        oldTest,
        changes: [],
      });
    } else {
      // Exists in BOTH -> compare
      processedNewNames.add(name);
      diffs.push(compareClashTestPair(oldTest, newTest));
    }
  }

  // Process tests that only exist in NEW -> NEW
  for (const [name, newTest] of newMap.entries()) {
    if (!processedNewNames.has(name)) {
      diffs.push({
        name,
        status: 'NEW',
        newTest,
        changes: [],
      });
    }
  }

  return {
    diffs,
    duplicateOldNames,
    duplicateNewNames,
  };
}
