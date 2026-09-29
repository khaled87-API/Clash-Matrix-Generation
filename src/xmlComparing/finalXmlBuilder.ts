/**
 * FINAL RESULT NAVISWORKS XML BUILDER
 * ===================================
 * Generates valid, schema-compliant Autodesk Navisworks Exchange XML
 * from comparison results.
 * 
 * Complies with nw-exchange-12.0.xsd and preserves 10-decimal tolerance precision.
 */

import {
  CompleteDiffReport,
  FinalResultConfig,
  NavisworksClashTest,
  NavisworksSelectionSet,
  NavisworksViewFolder,
  SelectionTarget,
  SearchSetDependencyStatus,
  RequiredSelectionSetInfo,
  SearchSetDependencySummary,
  ExportScopeMode,
} from './types';
import { compareSelectionSetPair } from './selectionSetComparator';

/**
 * Escapes unsafe XML characters
 */
function escapeXml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates deterministic fallback GUID if none is provided
 */
function generateFallbackGuid(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `00000000-0000-4000-8000-${hex.padStart(12, '0')}`;
}

/**
 * Normalizes string for case-insensitive comparison, converting backslashes to forward slashes
 */
function normalize(str: string): string {
  return (str || '').replace(/\\/g, '/').trim().toLowerCase();
}

/**
 * Resolves a Clash Test selection target (Left or Right) to a concrete Selection Set.
 * Inspects newDoc selection sets first (with updated condition definitions),
 * then falls back to oldDoc selection sets.
 */
export function resolveSelectionSetForTarget(
  target: SelectionTarget,
  newSets: NavisworksSelectionSet[],
  oldSets: NavisworksSelectionSet[]
): NavisworksSelectionSet | null {
  if (!target) return null;

  const targetLoc = normalize(target.locator);
  const targetName = normalize(target.selectionSetName);
  const targetFolder = normalize(target.folder);

  const isMatch = (s: NavisworksSelectionSet): boolean => {
    const sLoc = normalize(s.locator);
    const sName = normalize(s.name);
    const sFolder = normalize(s.folderName);

    // 1. Exact locator match (e.g. lcop_selection_set_tree/Highways/A-HW0010)
    if (targetLoc && sLoc && targetLoc === sLoc) return true;

    // 2. Folder and set name match
    if (targetName && targetFolder && sName === targetName && sFolder === targetFolder) return true;

    // 3. Locator ends with /folder/name
    if (targetFolder && targetName && sLoc.endsWith(`/${targetFolder}/${targetName}`)) return true;

    // 4. Target locator ends with /folder/name
    if (sFolder && sName && targetLoc.endsWith(`/${sFolder}/${sName}`)) return true;

    // 5. Locator ends with /name
    if (targetName && sLoc.endsWith(`/${targetName}`)) return true;

    // 6. Target locator ends with /name
    if (sName && targetLoc.endsWith(`/${sName}`)) return true;

    // 7. Name match when folder is empty or matches root
    if (targetName && sName === targetName && (!targetFolder || !sFolder)) return true;

    // 8. Plain name match if unique
    if (targetName && sName === targetName) return true;

    return false;
  };

  // 1. Check NEW sets first (preferred for latest FindSpec rules)
  const fromNew = newSets.find(isMatch);
  if (fromNew) return fromNew;

  // 2. Fallback to OLD sets if unchanged or removed in newDoc
  const fromOld = oldSets.find(isMatch);
  if (fromOld) return fromOld;

  return null;
}

/**
 * Classifies a required Search Set into NEW, EXISTING, MODIFIED, or GUID_ONLY
 * based on the semantic comparison result.
 * Considers folder, name, locator, and FindSpec condition changes independently of GUID.
 */
export function classifyRequiredSelectionSet(
  set: NavisworksSelectionSet,
  report: CompleteDiffReport
): SearchSetDependencyStatus {
  const normName = normalize(set.name);
  const normFolder = normalize(set.folderName);
  const normLoc = normalize(set.locator);

  // 1. Search in selectionSetDiffs by locator, or folder+name, or name
  const diff =
    report.selectionSetDiffs.find((d) => {
      if (normLoc && d.locator && normalize(d.locator) === normLoc) return true;
      const sameName = normalize(d.name) === normName;
      const sameFolder = normalize(d.folderName) === normFolder;
      return sameName && sameFolder;
    }) ||
    report.selectionSetDiffs.find(
      (d) =>
        normalize(d.name) === normName &&
        (normalize(d.folderName) === normFolder || !normFolder || !d.folderName)
    ) ||
    report.selectionSetDiffs.find((d) => normalize(d.name) === normName);

  if (diff) {
    if (diff.status === 'NEW') {
      return 'NEW';
    }
    if (diff.status === 'MODIFIED') {
      return 'MODIFIED';
    }
    if (diff.status === 'UNCHANGED') {
      if (diff.guidChangedOnly) {
        return 'GUID_ONLY';
      }
      return 'EXISTING';
    }
  }

  // 2. Direct comparison with oldDoc selectionSets
  const oldSet = report.oldDoc.selectionSets.find((s) => {
    if (normLoc && s.locator && normalize(s.locator) === normLoc) return true;
    const sameName = normalize(s.name) === normName;
    const sameFolder = normalize(s.folderName) === normFolder;
    return sameName && sameFolder;
  }) || report.oldDoc.selectionSets.find((s) => normalize(s.name) === normName);

  if (!oldSet) {
    return 'NEW';
  }

  // Perform logical comparison against oldSet
  const pairDiff = compareSelectionSetPair(oldSet, set);
  if (pairDiff.status === 'MODIFIED') {
    return 'MODIFIED';
  }
  if (pairDiff.guidChangedOnly) {
    return 'GUID_ONLY';
  }

  return 'EXISTING';
}

/**
 * DEPENDENCY RESOLVER:
 * Inspects all exported Clash Tests, extracts their Left and Right Selection Set
 * references, and collects ONLY the Search Sets required by those tests.
 * Computes exact dependency counts (NEW, EXISTING, MODIFIED, GUID_ONLY, UNUSED).
 * Enforces that in DELTA_ONLY mode, only NEW and MODIFIED sets are marked isExported: true.
 */
export function resolveRequiredSelectionSetsWithSummary(
  report: CompleteDiffReport,
  testsToExport: NavisworksClashTest[],
  exportScope: ExportScopeMode = 'DELTA_ONLY'
): SearchSetDependencySummary {
  const requiredMap = new Map<
    string,
    {
      set: NavisworksSelectionSet;
      usedBy: Set<string>;
    }
  >();

  // Process Left & Right references for each exported Clash Test
  for (const ct of testsToExport) {
    const targets: SelectionTarget[] = [ct.left, ct.right].filter(Boolean);

    for (const target of targets) {
      const resolved = resolveSelectionSetForTarget(
        target,
        report.newDoc.selectionSets,
        report.oldDoc.selectionSets
      );

      if (resolved) {
        const canonicalKey = `${resolved.folderName || ''}/${resolved.name}`.toLowerCase();
        if (!requiredMap.has(canonicalKey)) {
          requiredMap.set(canonicalKey, {
            set: resolved,
            usedBy: new Set<string>(),
          });
        }
        requiredMap.get(canonicalKey)!.usedBy.add(ct.name);
      }
    }
  }

  // Build classified requiredSets list
  const requiredSets: RequiredSelectionSetInfo[] = [];
  let newCount = 0;
  let existingCount = 0;
  let modifiedCount = 0;
  let guidOnlyCount = 0;

  for (const { set, usedBy } of requiredMap.values()) {
    const status = classifyRequiredSelectionSet(set, report);

    if (status === 'NEW') newCount++;
    else if (status === 'MODIFIED') modifiedCount++;
    else if (status === 'GUID_ONLY') guidOnlyCount++;
    else existingCount++;

    let isExported = false;
    let exportReason = '';

    if (exportScope === 'FULL_MERGED') {
      isExported = true;
      exportReason = 'Included in Full Merged replacement package';
    } else if (exportScope === 'NEW_ONLY') {
      if (status === 'NEW') {
        isExported = true;
        exportReason = 'Exported (New Search Set)';
      } else {
        isExported = false;
        exportReason =
          status === 'EXISTING'
            ? 'Omitted (Already exists in Navisworks project)'
            : status === 'GUID_ONLY'
            ? 'Omitted (GUID regenerated only, definition unchanged)'
            : 'Omitted (Not in New-only export scope)';
      }
    } else if (exportScope === 'MODIFIED_ONLY') {
      if (status === 'MODIFIED') {
        isExported = true;
        exportReason = 'Exported (Modified FindSpec definition)';
      } else {
        isExported = false;
        exportReason =
          status === 'EXISTING'
            ? 'Omitted (Already exists in Navisworks project)'
            : status === 'GUID_ONLY'
            ? 'Omitted (GUID regenerated only, definition unchanged)'
            : 'Omitted (Not in Modified-only export scope)';
      }
    } else {
      // Default: DELTA_ONLY
      if (status === 'NEW') {
        isExported = true;
        exportReason = 'Exported (New Search Set not in OLD XML)';
      } else if (status === 'MODIFIED') {
        isExported = true;
        exportReason = 'Exported (Logical FindSpec conditions modified)';
      } else if (status === 'GUID_ONLY') {
        isExported = false;
        exportReason = 'Omitted (Identical FindSpec, only GUID regenerated)';
      } else {
        // EXISTING / UNCHANGED
        isExported = false;
        exportReason = 'Omitted (Already exists unchanged in Navisworks project)';
      }
    }

    requiredSets.push({
      set,
      status,
      isExported,
      exportReason,
      usedByClashTests: Array.from(usedBy).sort(),
      folderName: set.folderName || '',
      name: set.name,
      locator: set.locator,
    });
  }

  // Sort required sets by folder then name
  requiredSets.sort((a, b) => {
    const fComp = a.folderName.localeCompare(b.folderName);
    if (fComp !== 0) return fComp;
    return a.name.localeCompare(b.name);
  });

  // Calculate UNUSED Search Sets (present in NEW XML or OLD XML but not required by exported tests)
  const exportedKeys = new Set(requiredMap.keys());
  const unusedSets: NavisworksSelectionSet[] = [];
  const seenUnusedKeys = new Set<string>();

  // Check NEW XML selection sets
  for (const s of report.newDoc.selectionSets) {
    const key = `${s.folderName || ''}/${s.name}`.toLowerCase();
    if (!exportedKeys.has(key) && !seenUnusedKeys.has(key)) {
      seenUnusedKeys.add(key);
      unusedSets.push(s);
    }
  }

  // Check OLD XML selection sets for any unused
  for (const s of report.oldDoc.selectionSets) {
    const key = `${s.folderName || ''}/${s.name}`.toLowerCase();
    if (!exportedKeys.has(key) && !seenUnusedKeys.has(key)) {
      seenUnusedKeys.add(key);
      unusedSets.push(s);
    }
  }

  const exportedSets = requiredSets.filter((r) => r.isExported);
  const notExportedSets = requiredSets.filter((r) => !r.isExported);

  return {
    totalRequired: requiredSets.length,
    totalExported: exportedSets.length,
    totalNotExported: notExportedSets.length,
    newCount,
    modifiedCount,
    existingCount,
    guidOnlyCount,
    unusedCount: unusedSets.length,
    requiredSets,
    exportedSets,
    notExportedSets,
    unusedSets,
  };
}

/**
 * Resolves the clash tests that should be exported based on user configuration
 */
export function determineClashTestsToExport(
  report: CompleteDiffReport,
  config: FinalResultConfig
): NavisworksClashTest[] {
  const result: NavisworksClashTest[] = [];

  for (const diff of report.clashTestDiffs) {
    if (diff.status === 'NEW' && config.includeNewTests && diff.newTest) {
      result.push(diff.newTest);
    } else if (diff.status === 'MODIFIED' && config.includeModifiedTests && diff.newTest) {
      result.push(diff.newTest);
    } else if (diff.status === 'UNCHANGED' && config.includeUnchangedTests) {
      const test = diff.newTest || diff.oldTest;
      if (test) result.push(test);
    } else if (diff.status === 'REMOVED' && config.includeRemovedAsResolved && diff.oldTest) {
      // Export removed test marked as resolved if user opted in
      result.push({
        ...diff.oldTest,
        status: 'resolved',
      });
    }
  }

  return result;
}

/**
 * Resolves ONLY the Selection Sets that must be physically exported in the XML.
 * In DELTA_ONLY mode: contains strictly NEW and MODIFIED sets that are required by the exported tests.
 * UNCHANGED and GUID_ONLY sets are NEVER exported.
 */
export function determineSelectionSetsToExport(
  report: CompleteDiffReport,
  testsToExport: NavisworksClashTest[],
  config?: FinalResultConfig
): NavisworksSelectionSet[] {
  const scope = config?.exportScope || 'DELTA_ONLY';
  const dependencySummary = resolveRequiredSelectionSetsWithSummary(report, testsToExport, scope);
  return dependencySummary.exportedSets.map((r) => r.set);
}

/**
 * Groups selection sets into clean view folders.
 * A viewfolder is ONLY created if it contains at least one exported Search Set.
 */
export function groupSelectionSetsIntoFolders(
  selectionSets: NavisworksSelectionSet[],
  referenceFolders: NavisworksViewFolder[]
): NavisworksViewFolder[] {
  const folderGuidMap = new Map<string, string>();
  for (const rf of referenceFolders) {
    if (rf.name && rf.guid) {
      folderGuidMap.set(rf.name.toLowerCase().trim(), rf.guid);
    }
  }

  const grouped = new Map<string, { folderName: string; sets: NavisworksSelectionSet[] }>();

  for (const s of selectionSets) {
    const rawFolder = s.folderName || 'Default';
    const key = rawFolder.toLowerCase().trim();
    if (!grouped.has(key)) {
      grouped.set(key, { folderName: rawFolder, sets: [] });
    }
    grouped.get(key)!.sets.push(s);
  }

  const result: NavisworksViewFolder[] = [];

  for (const { folderName, sets } of grouped.values()) {
    if (sets.length === 0) continue; // View folder rule: only created if it contains at least 1 set
    const key = folderName.toLowerCase().trim();
    const guid = folderGuidMap.get(key) || generateFallbackGuid(folderName);
    result.push({
      name: folderName,
      guid,
      selectionSets: sets,
    });
  }

  return result;
}

/**
 * Builds the complete, formatted Navisworks Exchange XML string.
 * Strictly adheres to the true delta selection sets export rule.
 */
export function buildComparedNavisworksXml(
  report: CompleteDiffReport,
  config: FinalResultConfig
): string {
  const testsToExport = determineClashTestsToExport(report, config);
  const setsToExport = determineSelectionSetsToExport(report, testsToExport, config);
  const viewFolders = groupSelectionSetsIntoFolders(setsToExport, [
    ...report.newDoc.viewFolders,
    ...report.oldDoc.viewFolders,
  ]);

  const targetDoc = config.batchTestMetadataSource === 'OLD' ? report.oldDoc : report.newDoc;
  const units = targetDoc.units || 'm';
  const batchName = targetDoc.batchTestName || 'ClashBatch';
  const internalName = targetDoc.internalName || batchName;

  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8" ?>');
  lines.push(
    `<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://download.autodesk.com/us/navisworks/schemas/nw-exchange-12.0.xsd" units="${escapeXml(
      units
    )}" filename="" filepath="">`
  );

  lines.push(
    `  <batchtest name="${escapeXml(batchName)}" internal_name="${escapeXml(internalName)}" units="${escapeXml(units)}">`
  );

  // 1. Clash Tests Section
  lines.push('    <clashtests>');

  for (const ct of testsToExport) {
    lines.push(
      `      <clashtest name="${escapeXml(ct.name)}" test_type="${escapeXml(ct.testType)}" status="${escapeXml(
        ct.status
      )}" tolerance="${ct.toleranceFormatted}" merge_composites="${escapeXml(ct.mergeComposites || '0')}">`
    );
    lines.push('        <linkage mode="none"/>');
    lines.push('        <left>');
    lines.push('          <clashselection selfintersect="0" primtypes="1">');
    lines.push(`            <locator>${escapeXml(ct.left.locator)}</locator>`);
    lines.push('          </clashselection>');
    lines.push('        </left>');
    lines.push('        <right>');
    lines.push('          <clashselection selfintersect="0" primtypes="1">');
    lines.push(`            <locator>${escapeXml(ct.right.locator)}</locator>`);
    lines.push('          </clashselection>');
    lines.push('        </right>');
    lines.push('        <rules/>');
    lines.push('      </clashtest>');
  }

  lines.push('    </clashtests>');

  // 2. Selection Sets Section (Created purely from exportedSets, never copied in bulk)
  lines.push('    <selectionsets>');

  for (const folder of viewFolders) {
    lines.push(`      <viewfolder name="${escapeXml(folder.name)}" guid="${escapeXml(folder.guid)}">`);

    for (const set of folder.selectionSets) {
      const guid = set.guid || generateFallbackGuid(`${folder.name}/${set.name}`);
      lines.push(`        <selectionset name="${escapeXml(set.name)}" guid="${escapeXml(guid)}">`);
      lines.push('          <findspec mode="all" disjoint="0">');
      lines.push('            <conditions>');

      for (const cond of set.findSpec?.conditions || []) {
        lines.push(`              <condition test="${escapeXml(cond.test)}" flags="${cond.flags}">`);
        lines.push('                <category>');
        lines.push(
          `                  <name internal="${escapeXml(cond.category.internalName)}">${escapeXml(
            cond.category.displayName
          )}</name>`
        );
        lines.push('                </category>');
        lines.push('                <property>');
        lines.push(
          `                  <name internal="${escapeXml(cond.property.internalName)}">${escapeXml(
            cond.property.displayName
          )}</name>`
        );
        lines.push('                </property>');
        lines.push('                <value>');
        lines.push(
          `                  <data type="${escapeXml(cond.value.dataType)}">${escapeXml(cond.value.value)}</data>`
        );
        lines.push('                </value>');
        lines.push('              </condition>');
      }

      lines.push('            </conditions>');
      lines.push('            <locator>/</locator>');
      lines.push('          </findspec>');
      lines.push('        </selectionset>');
    }

    lines.push('      </viewfolder>');
  }

  lines.push('    </selectionsets>');
  lines.push('  </batchtest>');
  lines.push('</exchange>');

  return lines.join('\n');
}

/**
 * Formats and returns exact debug breakdown of the Delta Package contents
 */
export interface DeltaPackageDebugBreakdown {
  exportedClashTests: string[];
  exportedSearchSets: string[];
  referencedExistingSearchSets: string[];
  excludedUnchangedSearchSets: string[];
  excludedGuidOnlySearchSets: string[];
  excludedUnreferencedSearchSets: string[];
}

export function getDeltaPackageDebugBreakdown(
  report: CompleteDiffReport,
  config: FinalResultConfig
): DeltaPackageDebugBreakdown {
  const testsToExport = determineClashTestsToExport(report, config);
  const summary = resolveRequiredSelectionSetsWithSummary(report, testsToExport, config.exportScope);

  const exportedClashTests = testsToExport.map((t) => t.name);
  const exportedSearchSets = summary.exportedSets.map(
    (s) => `${s.folderName ? s.folderName + '/' : ''}${s.name} [${s.status}]`
  );
  const referencedExistingSearchSets = summary.notExportedSets.map(
    (s) => `${s.folderName ? s.folderName + '/' : ''}${s.name} [${s.status}]`
  );
  const excludedUnchangedSearchSets = summary.requiredSets
    .filter((s) => s.status === 'EXISTING')
    .map((s) => `${s.folderName ? s.folderName + '/' : ''}${s.name}`);
  const excludedGuidOnlySearchSets = summary.requiredSets
    .filter((s) => s.status === 'GUID_ONLY')
    .map((s) => `${s.folderName ? s.folderName + '/' : ''}${s.name}`);
  const excludedUnreferencedSearchSets = summary.unusedSets.map(
    (s) => `${s.folderName ? s.folderName + '/' : ''}${s.name}`
  );

  return {
    exportedClashTests,
    exportedSearchSets,
    referencedExistingSearchSets,
    excludedUnchangedSearchSets,
    excludedGuidOnlySearchSets,
    excludedUnreferencedSearchSets,
  };
}

export function logDeltaPackageBreakdown(
  report: CompleteDiffReport,
  config: FinalResultConfig
): string {
  const b = getDeltaPackageDebugBreakdown(report, config);
  const lines = [
    '====================================================',
    'DELTA PACKAGE CONTENTS BREAKDOWN',
    '====================================================',
    `Exported Clash Tests (${b.exportedClashTests.length}):`,
    b.exportedClashTests.length ? b.exportedClashTests.map((t) => `  - ${t}`).join('\n') : '  (none)',
    '',
    `Exported Search Sets (${b.exportedSearchSets.length}) [NEW or MODIFIED only]:`,
    b.exportedSearchSets.length ? b.exportedSearchSets.map((s) => `  - ${s}`).join('\n') : '  (none)',
    '',
    `Referenced Existing Search Sets (${b.referencedExistingSearchSets.length}) [Required by tests, omitted from export]:`,
    b.referencedExistingSearchSets.length ? b.referencedExistingSearchSets.map((s) => `  - ${s}`).join('\n') : '  (none)',
    '',
    `Excluded Unchanged Search Sets (${b.excludedUnchangedSearchSets.length}):`,
    b.excludedUnchangedSearchSets.length ? b.excludedUnchangedSearchSets.map((s) => `  - ${s}`).join('\n') : '  (none)',
    '',
    `Excluded GUID-only Search Sets (${b.excludedGuidOnlySearchSets.length}):`,
    b.excludedGuidOnlySearchSets.length ? b.excludedGuidOnlySearchSets.map((s) => `  - ${s}`).join('\n') : '  (none)',
    '',
    `Excluded Unreferenced Search Sets (${b.excludedUnreferencedSearchSets.length}):`,
    b.excludedUnreferencedSearchSets.length ? b.excludedUnreferencedSearchSets.map((s) => `  - ${s}`).join('\n') : '  (none)',
    '====================================================',
  ];
  const output = lines.join('\n');
  console.log(output);
  return output;
}

