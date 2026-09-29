/**
 * SELECTION SET COMPARATOR
 * ========================
 * Compares Navisworks Selection Sets (Search Sets) and their FindSpec condition trees.
 * Critical Rule: Evaluates logical definitions independently from GUIDs.
 * A set is NOT marked as logically modified solely because its GUID regenerated.
 */

import {
  NavisworksSelectionSet,
  NavisworksCondition,
  SelectionSetDiff,
  ConditionChange,
} from './types';

/**
 * Creates canonical hash/key for a condition to allow order-independent matching
 */
function getConditionSignature(c: NavisworksCondition): string {
  const cat = (c.category.internalName || c.category.displayName).toLowerCase().trim();
  const prop = (c.property.internalName || c.property.displayName).toLowerCase().trim();
  const test = c.test.toLowerCase().trim();
  const val = c.value.value.trim();
  const type = c.value.dataType.toLowerCase().trim();
  return `${cat}::${prop}::${test}::${val}::${type}`;
}

/**
 * Compares two conditions in detail
 */
function compareSingleCondition(
  oldC: NavisworksCondition,
  newC: NavisworksCondition,
  index: number
): ConditionChange {
  const catChanged =
    oldC.category.displayName !== newC.category.displayName ||
    oldC.category.internalName !== newC.category.internalName;

  const propChanged =
    oldC.property.displayName !== newC.property.displayName ||
    oldC.property.internalName !== newC.property.internalName;

  const opChanged = oldC.test.toLowerCase() !== newC.test.toLowerCase();
  const valChanged =
    oldC.value.value !== newC.value.value ||
    oldC.value.dataType !== newC.value.dataType;

  const flagsChanged = oldC.flags !== newC.flags;

  const isModified = catChanged || propChanged || opChanged || valChanged || flagsChanged;

  return {
    changeType: isModified ? 'MODIFIED' : 'UNCHANGED',
    index,
    categoryChanged: catChanged
      ? { old: oldC.category.displayName, new: newC.category.displayName }
      : undefined,
    propertyChanged: propChanged
      ? { old: oldC.property.displayName, new: newC.property.displayName }
      : undefined,
    operatorChanged: opChanged ? { old: oldC.test, new: newC.test } : undefined,
    valueChanged: valChanged
      ? { old: oldC.value.value, new: newC.value.value }
      : undefined,
    flagsChanged: flagsChanged ? { old: oldC.flags, new: newC.flags } : undefined,
  };
}

/**
 * Compares two Selection Sets logically
 */
export function compareSelectionSetPair(
  oldSet: NavisworksSelectionSet,
  newSet: NavisworksSelectionSet
): SelectionSetDiff {
  const conditionChanges: ConditionChange[] = [];

  const oldConds = oldSet.findSpec?.conditions || [];
  const newConds = newSet.findSpec?.conditions || [];

  // Match conditions by signature or position
  const maxLen = Math.max(oldConds.length, newConds.length);
  let hasLogicalConditionDiff = false;

  for (let i = 0; i < maxLen; i++) {
    const o = oldConds[i];
    const n = newConds[i];

    if (o && !n) {
      conditionChanges.push({
        changeType: 'REMOVED',
        index: i,
        propertyChanged: { old: o.property.displayName || o.property.internalName, new: '(removed)' },
      });
      hasLogicalConditionDiff = true;
    } else if (!o && n) {
      conditionChanges.push({
        changeType: 'ADDED',
        index: i,
        propertyChanged: { old: '(none)', new: n.property.displayName || n.property.internalName },
      });
      hasLogicalConditionDiff = true;
    } else if (o && n) {
      const diff = compareSingleCondition(o, n, i);
      conditionChanges.push(diff);
      if (diff.changeType === 'MODIFIED') {
        hasLogicalConditionDiff = true;
      }
    }
  }

  // Check folder differences
  const folderChanged = oldSet.folderName !== newSet.folderName;

  // Check GUID change separately
  const guidChanged = (oldSet.guid || '').toLowerCase() !== (newSet.guid || '').toLowerCase();

  // Logical modification occurs ONLY if conditions or folder changed
  const isLogicallyModified = hasLogicalConditionDiff || folderChanged;

  return {
    name: oldSet.name,
    folderName: newSet.folderName || oldSet.folderName,
    locator: newSet.locator || oldSet.locator,
    status: isLogicallyModified ? 'MODIFIED' : 'UNCHANGED',
    oldSet,
    newSet,
    guidChangedOnly: !isLogicallyModified && guidChanged,
    oldGuid: oldSet.guid,
    newGuid: newSet.guid,
    conditionChanges,
  };
}

/**
 * Compares entire lists of Selection Sets
 */
export function compareSelectionSetLists(
  oldSets: NavisworksSelectionSet[],
  newSets: NavisworksSelectionSet[]
): {
  diffs: SelectionSetDiff[];
  duplicateOldNames: string[];
  duplicateNewNames: string[];
} {
  const oldMap = new Map<string, NavisworksSelectionSet>();
  const duplicateOldNames: string[] = [];

  for (const s of oldSets) {
    const key = `${s.folderName}/${s.name}`;
    if (oldMap.has(key)) {
      duplicateOldNames.push(key);
    } else {
      oldMap.set(key, s);
    }
  }

  const newMap = new Map<string, NavisworksSelectionSet>();
  const duplicateNewNames: string[] = [];

  for (const s of newSets) {
    const key = `${s.folderName}/${s.name}`;
    if (newMap.has(key)) {
      duplicateNewNames.push(key);
    } else {
      newMap.set(key, s);
    }
  }

  const diffs: SelectionSetDiff[] = [];
  const processedNewKeys = new Set<string>();

  for (const [key, oldSet] of oldMap.entries()) {
    let newSet = newMap.get(key);

    // Fallback: match by name alone if folder was reorganized
    if (!newSet) {
      for (const [nKey, nSet] of newMap.entries()) {
        if (!processedNewKeys.has(nKey) && nSet.name === oldSet.name) {
          newSet = nSet;
          break;
        }
      }
    }

    if (!newSet) {
      diffs.push({
        name: oldSet.name,
        folderName: oldSet.folderName,
        locator: oldSet.locator,
        status: 'REMOVED',
        oldSet,
        guidChangedOnly: false,
        conditionChanges: [],
      });
    } else {
      processedNewKeys.add(`${newSet.folderName}/${newSet.name}`);
      diffs.push(compareSelectionSetPair(oldSet, newSet));
    }
  }

  for (const [key, newSet] of newMap.entries()) {
    if (!processedNewKeys.has(key)) {
      diffs.push({
        name: newSet.name,
        folderName: newSet.folderName,
        locator: newSet.locator,
        status: 'NEW',
        newSet,
        guidChangedOnly: false,
        conditionChanges: [],
      });
    }
  }

  return {
    diffs,
    duplicateOldNames,
    duplicateNewNames,
  };
}
