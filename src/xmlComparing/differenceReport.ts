/**
 * DIFFERENCE REPORT GENERATOR
 * ===========================
 * Orchestrates comparison of two Navisworks XML documents and compiles
 * a comprehensive, structured difference report.
 */

import {
  NavisworksParsedDocument,
  CompleteDiffReport,
  ComparisonSummary,
} from './types';
import { compareClashTestLists } from './clashTestComparator';
import { compareSelectionSetLists } from './selectionSetComparator';

/**
 * Builds the complete difference report from two parsed Navisworks documents.
 */
export function generateDifferenceReport(
  oldDoc: NavisworksParsedDocument,
  newDoc: NavisworksParsedDocument
): CompleteDiffReport {
  // 1. Compare Clash Tests
  const {
    diffs: clashTestDiffs,
    duplicateOldNames: duplicateClashOld,
    duplicateNewNames: duplicateClashNew,
  } = compareClashTestLists(oldDoc.clashTests, newDoc.clashTests);

  // 2. Compare Selection Sets
  const {
    diffs: selectionSetDiffs,
    duplicateOldNames: duplicateSelOld,
    duplicateNewNames: duplicateSelNew,
  } = compareSelectionSetLists(oldDoc.selectionSets, newDoc.selectionSets);

  // 3. Tally Clash Test Summary
  let newCtCount = 0;
  let modCtCount = 0;
  let remCtCount = 0;
  let unchCtCount = 0;

  for (const diff of clashTestDiffs) {
    if (diff.status === 'NEW') newCtCount++;
    else if (diff.status === 'MODIFIED') modCtCount++;
    else if (diff.status === 'REMOVED') remCtCount++;
    else if (diff.status === 'UNCHANGED') unchCtCount++;
  }

  // 4. Tally Selection Set Summary
  let newSsCount = 0;
  let modSsCount = 0;
  let remSsCount = 0;
  let unchSsCount = 0;

  for (const diff of selectionSetDiffs) {
    if (diff.status === 'NEW') newSsCount++;
    else if (diff.status === 'MODIFIED') modSsCount++;
    else if (diff.status === 'REMOVED') remSsCount++;
    else if (diff.status === 'UNCHANGED') unchSsCount++;
  }

  const summary: ComparisonSummary = {
    clashTests: {
      totalOld: oldDoc.clashTests.length,
      totalNew: newDoc.clashTests.length,
      newCount: newCtCount,
      modifiedCount: modCtCount,
      removedCount: remCtCount,
      unchangedCount: unchCtCount,
    },
    selectionSets: {
      totalOld: oldDoc.selectionSets.length,
      totalNew: newDoc.selectionSets.length,
      newCount: newSsCount,
      modifiedCount: modSsCount,
      removedCount: remSsCount,
      unchangedCount: unchSsCount,
    },
  };

  return {
    timestamp: new Date().toISOString(),
    oldDoc,
    newDoc,
    summary,
    clashTestDiffs,
    selectionSetDiffs,
    ambiguities: {
      duplicateClashTestNamesOld: duplicateClashOld,
      duplicateClashTestNamesNew: duplicateClashNew,
      duplicateSelectionSetNamesOld: duplicateSelOld,
      duplicateSelectionSetNamesNew: duplicateSelNew,
    },
  };
}
