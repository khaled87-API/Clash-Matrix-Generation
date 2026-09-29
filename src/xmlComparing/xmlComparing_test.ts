/**
 * XML COMPARING COMPREHENSIVE TEST SUITE
 * =====================================
 * Tests schema-aware parsing, semantic Clash Test diffing, logical Selection Set
 * comparison (including GUID independence), difference reporting, validation,
 * TRUE DELTA search set export, and XML building.
 */

import { parseNavisworksXml } from './xmlParser';
import { generateDifferenceReport } from './differenceReport';
import { validateFinalXmlStructure } from './validator';
import {
  buildComparedNavisworksXml,
  determineClashTestsToExport,
  determineSelectionSetsToExport,
  resolveRequiredSelectionSetsWithSummary,
  logDeltaPackageBreakdown,
} from './finalXmlBuilder';
import { SAMPLE_OLD_XML, SAMPLE_NEW_XML } from './sampleXmlData';

console.log('====================================================');
console.log('RUNNING XML COMPARING TEST SUITE');
console.log('====================================================\n');

// --- TEST 1: Parse OLD and NEW XML Documents ---
console.log('--- Test 1: XML Parsing Fidelity ---');
const oldDoc = parseNavisworksXml(SAMPLE_OLD_XML, 'Project_Coordination_v1.xml');
const newDoc = parseNavisworksXml(SAMPLE_NEW_XML, 'Project_Coordination_v2_Updated.xml');

if (!oldDoc.isValid || !newDoc.isValid) {
  throw new Error(`Test 1 Failed: Documents should be valid. Old errs: ${oldDoc.parseErrors.join('; ')}, New errs: ${newDoc.parseErrors.join('; ')}`);
}

if (oldDoc.clashTests.length !== 4) {
  throw new Error(`Test 1 Failed: Expected 4 clash tests in OLD XML, got ${oldDoc.clashTests.length}`);
}
console.log(`✅ PASS: OLD XML parsed 4 clash tests (got ${oldDoc.clashTests.length})`);

if (newDoc.clashTests.length !== 4) {
  throw new Error(`Test 1 Failed: Expected 4 clash tests in NEW XML, got ${newDoc.clashTests.length}`);
}
console.log(`✅ PASS: NEW XML parsed 4 clash tests (got ${newDoc.clashTests.length})`);

if (oldDoc.selectionSets.length !== 4 || newDoc.selectionSets.length !== 4) {
  throw new Error(`Test 1 Failed: Selection set counts mismatch. Old: ${oldDoc.selectionSets.length}, New: ${newDoc.selectionSets.length}`);
}
console.log(`✅ PASS: Selection Sets parsed accurately (Old: ${oldDoc.selectionSets.length}, New: ${newDoc.selectionSets.length})`);

// --- TEST 2: Generate Difference Report ---
console.log('\n--- Test 2: Difference Report Generation ---');
const report = generateDifferenceReport(oldDoc, newDoc);

if (report.summary.clashTests.newCount !== 1) {
  throw new Error(`Test 2 Failed: Expected 1 new clash test, got ${report.summary.clashTests.newCount}`);
}
console.log('✅ PASS: Exactly 1 NEW Clash Test detected');

if (report.summary.clashTests.modifiedCount !== 1) {
  throw new Error(`Test 2 Failed: Expected 1 modified clash test, got ${report.summary.clashTests.modifiedCount}`);
}
console.log('✅ PASS: Exactly 1 MODIFIED Clash Test detected');

if (report.summary.clashTests.removedCount !== 1) {
  throw new Error(`Test 2 Failed: Expected 1 removed clash test, got ${report.summary.clashTests.removedCount}`);
}
console.log('✅ PASS: Exactly 1 REMOVED Clash Test detected');

if (report.summary.clashTests.unchangedCount !== 2) {
  throw new Error(`Test 2 Failed: Expected 2 unchanged clash tests, got ${report.summary.clashTests.unchangedCount}`);
}
console.log('✅ PASS: Exactly 2 UNCHANGED Clash Tests detected');

// --- TEST 3: Semantic Clash Test Property Changes ---
console.log('\n--- Test 3: Clash Test Property Changes Inspection ---');
const modDiff = report.clashTestDiffs.find((d) => d.name === 'HW0010_v_HW0020');
if (!modDiff || modDiff.status !== 'MODIFIED') {
  throw new Error('Test 3 Failed: HW0010_v_HW0020 not marked as MODIFIED');
}

const typeChange = modDiff.changes.find((c) => c.property === 'testType');
if (!typeChange || typeChange.oldValue !== 'Hard' || typeChange.newValue !== 'Clearance') {
  throw new Error(`Test 3 Failed: Clash type change incorrect: ${JSON.stringify(typeChange)}`);
}
console.log('✅ PASS: Clash Type change detected: Hard -> Clearance');

const tolChange = modDiff.changes.find((c) => c.property === 'tolerance');
if (!tolChange || !tolChange.oldValue.includes('0.4000000000') || !tolChange.newValue.includes('0.5000000000')) {
  throw new Error(`Test 3 Failed: Tolerance change incorrect: ${JSON.stringify(tolChange)}`);
}
console.log('✅ PASS: Tolerance change detected: 0.4000000000 m -> 0.5000000000 m');

// --- TEST 4: Selection Set Logical Comparison & GUID Independence ---
console.log('\n--- Test 4: Selection Set Logical Comparison & GUID Independence ---');
const hw10Diff = report.selectionSetDiffs.find((d) => d.name === 'A-HW0010');
if (!hw10Diff) {
  throw new Error('Test 4 Failed: A-HW0010 not found in selectionSetDiffs');
}

if (hw10Diff.status !== 'UNCHANGED') {
  throw new Error(`Test 4 Failed: A-HW0010 has identical conditions, so status must be UNCHANGED, got ${hw10Diff.status}`);
}
if (!hw10Diff.guidChangedOnly) {
  throw new Error('Test 4 Failed: A-HW0010 must flag guidChangedOnly = true');
}
console.log('✅ PASS: Regenerated GUID alone does NOT mark Selection Set as logically modified (marked UNCHANGED with guidChangedOnly: true)');

const dr100Diff = report.selectionSetDiffs.find((d) => d.name === 'A-DR0100');
if (!dr100Diff || dr100Diff.status !== 'NEW') {
  throw new Error('Test 4 Failed: A-DR0100 should be marked NEW');
}
console.log('✅ PASS: Newly introduced Selection Set A-DR0100 marked as NEW');

// --- TEST 5: True Delta Selection Set Export Logic ---
console.log('\n--- Test 5: True Delta Selection Set Export Logic ---');
const deltaConfig = {
  exportScope: 'DELTA_ONLY' as const,
  includeNewTests: true,
  includeModifiedTests: true,
  includeUnchangedTests: false,
  includeRemovedAsResolved: false,
  batchTestMetadataSource: 'NEW' as const,
};

const deltaTests = determineClashTestsToExport(report, deltaConfig);
if (deltaTests.length !== 2) {
  throw new Error(`Test 5 Failed: Expected 2 tests in delta export, got ${deltaTests.length}`);
}
console.log('✅ PASS: Delta export correctly selects only NEW and MODIFIED tests (2 tests)');

const depSummary = resolveRequiredSelectionSetsWithSummary(report, deltaTests, 'DELTA_ONLY');

// 3 Search Sets are REQUIRED by the 2 tests (A-HW0010, A-HW0020, A-DR0100)
if (depSummary.totalRequired !== 3) {
  throw new Error(`Test 5 Failed: Expected totalRequired = 3, got ${depSummary.totalRequired}`);
}
console.log('✅ PASS: Total required search sets = 3 (A-HW0010, A-HW0020, A-DR0100)');

// But ONLY 1 Search Set is physically EXPORTED (A-DR0100 because it is NEW)
if (depSummary.totalExported !== 1) {
  throw new Error(`Test 5 Failed: Expected totalExported = 1, got ${depSummary.totalExported}`);
}
console.log('✅ PASS: Exactly 1 Search Set physically exported (A-DR0100)');

// 2 Search Sets are NOT exported because they already exist in Navisworks project
if (depSummary.totalNotExported !== 2) {
  throw new Error(`Test 5 Failed: Expected totalNotExported = 2, got ${depSummary.totalNotExported}`);
}
console.log('✅ PASS: Exactly 2 referenced Search Sets omitted from export (A-HW0010 GUID_ONLY & A-HW0020 UNCHANGED)');

const deltaSets = determineSelectionSetsToExport(report, deltaTests, deltaConfig);
if (deltaSets.length !== 1 || deltaSets[0].name !== 'A-DR0100') {
  throw new Error(`Test 5 Failed: determineSelectionSetsToExport must return ONLY A-DR0100, got: ${deltaSets.map(s => s.name).join(', ')}`);
}
console.log('✅ PASS: determineSelectionSetsToExport returns ONLY A-DR0100');

// Build final XML and inspect physical contents
const deltaXml = buildComparedNavisworksXml(report, deltaConfig);

if (!deltaXml.includes('name="A-DR0100"')) {
  throw new Error('Test 5 Failed: Delta XML must contain A-DR0100');
}
if (deltaXml.includes('name="A-HW0010"')) {
  throw new Error('Test 5 Failed: Delta XML must NOT contain unchanged/guid-only A-HW0010');
}
if (deltaXml.includes('name="A-HW0020"')) {
  throw new Error('Test 5 Failed: Delta XML must NOT contain unchanged A-HW0020');
}
if (deltaXml.includes('name="A-ST0510"')) {
  throw new Error('Test 5 Failed: Delta XML must NOT contain unreferenced A-ST0510');
}
if (deltaXml.includes('name="OLD999"')) {
  throw new Error('Test 5 Failed: Delta XML must NOT contain removed OLD999');
}
// Viewfolder rule: Drainage must exist, Highways & Structures must NOT exist
if (!deltaXml.includes('<viewfolder name="Drainage"')) {
  throw new Error('Test 5 Failed: Viewfolder Drainage must be created for A-DR0100');
}
if (deltaXml.includes('<viewfolder name="Highways"')) {
  throw new Error('Test 5 Failed: Viewfolder Highways must NOT be created when it contains 0 exported sets');
}
if (deltaXml.includes('<viewfolder name="Structures"')) {
  throw new Error('Test 5 Failed: Viewfolder Structures must NOT be created when it contains 0 exported sets');
}
console.log('✅ PASS: Delta XML physically contains ONLY A-DR0100 and ONLY the Drainage viewfolder');

// --- TEST 6: Acceptance Test 1 - Exact User Brief Scenario ---
console.log('\n--- Test 6: Acceptance Test 1 (Exact User Scenario) ---');
/*
Scenario:
OLD: A-HW0010, A-HW0020, A-ST0510, A-ST0520
NEW: A-HW0010, A-HW0020, A-ST0510, A-ST0520, A-DR0100 (in AR folder)
Delta Clash Test: HW0010_v_DR0100 (Left: A-HW0010, Right: A-DR0100)
Expected Delta XML:
Clash Tests: HW0010_v_DR0100
Search Sets: A-DR0100 ONLY
Expected NOT to appear: A-HW0010, A-HW0020, A-ST0510, A-ST0520
Output contains only the necessary AR viewfolder containing A-DR0100.
*/
const ACCEPTANCE_OLD_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" units="m">
  <batchtest name="Batch1" units="m">
    <clashtests>
      <clashtest name="HW0010_v_HW0020" test_type="hard" status="new" tolerance="0.0100000000">
        <linkage mode="none"/>
        <left><clashselection><locator>lcop_selection_set_tree/Highways/A-HW0010</locator></clashselection></left>
        <right><clashselection><locator>lcop_selection_set_tree/Highways/A-HW0020</locator></clashselection></right>
      </clashtest>
    </clashtests>
    <selectionsets>
      <viewfolder name="Highways" guid="10000000-0000-0000-0000-000000000001">
        <selectionset name="A-HW0010" guid="10000000-0000-0000-0000-000000000010">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="Cat">Category</name></category><property><name internal="Prop">Prop</name></property><value><data type="wstring">Val1</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
        <selectionset name="A-HW0020" guid="10000000-0000-0000-0000-000000000020">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="Cat">Category</name></category><property><name internal="Prop">Prop</name></property><value><data type="wstring">Val2</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
      </viewfolder>
      <viewfolder name="Structures" guid="20000000-0000-0000-0000-000000000001">
        <selectionset name="A-ST0510" guid="20000000-0000-0000-0000-000000000510">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="Cat">Category</name></category><property><name internal="Prop">Prop</name></property><value><data type="wstring">Val3</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
        <selectionset name="A-ST0520" guid="20000000-0000-0000-0000-000000000520">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="Cat">Category</name></category><property><name internal="Prop">Prop</name></property><value><data type="wstring">Val4</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
      </viewfolder>
    </selectionsets>
  </batchtest>
</exchange>`;

const ACCEPTANCE_NEW_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" units="m">
  <batchtest name="Batch1" units="m">
    <clashtests>
      <!-- Existing unchanged test -->
      <clashtest name="HW0010_v_HW0020" test_type="hard" status="new" tolerance="0.0100000000">
        <linkage mode="none"/>
        <left><clashselection><locator>lcop_selection_set_tree/Highways/A-HW0010</locator></clashselection></left>
        <right><clashselection><locator>lcop_selection_set_tree/Highways/A-HW0020</locator></clashselection></right>
      </clashtest>
      <!-- NEW clash test referencing existing A-HW0010 and new A-DR0100 -->
      <clashtest name="HW0010_v_DR0100" test_type="hard" status="new" tolerance="0.0500000000">
        <linkage mode="none"/>
        <left><clashselection><locator>lcop_selection_set_tree/Highways/A-HW0010</locator></clashselection></left>
        <right><clashselection><locator>lcop_selection_set_tree/AR/A-DR0100</locator></clashselection></right>
      </clashtest>
    </clashtests>
    <selectionsets>
      <viewfolder name="Highways" guid="10000000-0000-0000-0000-000000000001">
        <selectionset name="A-HW0010" guid="10000000-0000-0000-0000-000000000010">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="Cat">Category</name></category><property><name internal="Prop">Prop</name></property><value><data type="wstring">Val1</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
        <selectionset name="A-HW0020" guid="10000000-0000-0000-0000-000000000020">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="Cat">Category</name></category><property><name internal="Prop">Prop</name></property><value><data type="wstring">Val2</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
      </viewfolder>
      <viewfolder name="Structures" guid="20000000-0000-0000-0000-000000000001">
        <selectionset name="A-ST0510" guid="20000000-0000-0000-0000-000000000510">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="Cat">Category</name></category><property><name internal="Prop">Prop</name></property><value><data type="wstring">Val3</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
        <selectionset name="A-ST0520" guid="20000000-0000-0000-0000-000000000520">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="Cat">Category</name></category><property><name internal="Prop">Prop</name></property><value><data type="wstring">Val4</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
      </viewfolder>
      <viewfolder name="AR" guid="30000000-0000-0000-0000-000000000001">
        <selectionset name="A-DR0100" guid="30000000-0000-0000-0000-000000000100">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="Cat">Category</name></category><property><name internal="Prop">Prop</name></property><value><data type="wstring">Drainage</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
      </viewfolder>
    </selectionsets>
  </batchtest>
</exchange>`;

const accOldDoc = parseNavisworksXml(ACCEPTANCE_OLD_XML, 'acc_old.xml');
const accNewDoc = parseNavisworksXml(ACCEPTANCE_NEW_XML, 'acc_new.xml');
const accReport = generateDifferenceReport(accOldDoc, accNewDoc);

const accDeltaTests = determineClashTestsToExport(accReport, deltaConfig);
if (accDeltaTests.length !== 1 || accDeltaTests[0].name !== 'HW0010_v_DR0100') {
  throw new Error(`Test 6 Failed: Expected 1 delta clash test HW0010_v_DR0100, got: ${accDeltaTests.map(t => t.name).join(', ')}`);
}
console.log('✅ PASS: Exactly 1 delta clash test selected: HW0010_v_DR0100');

const accSummary = resolveRequiredSelectionSetsWithSummary(accReport, accDeltaTests, 'DELTA_ONLY');
if (accSummary.totalRequired !== 2) {
  throw new Error(`Test 6 Failed: Expected totalRequired = 2, got ${accSummary.totalRequired}`);
}
if (accSummary.totalExported !== 1) {
  throw new Error(`Test 6 Failed: Expected totalExported = 1 (A-DR0100), got ${accSummary.totalExported}`);
}
if (accSummary.existingCount !== 1) {
  throw new Error(`Test 6 Failed: Expected existingCount = 1 (A-HW0010), got ${accSummary.existingCount}`);
}
if (accSummary.newCount !== 1) {
  throw new Error(`Test 6 Failed: Expected newCount = 1 (A-DR0100), got ${accSummary.newCount}`);
}

const accXml = buildComparedNavisworksXml(accReport, deltaConfig);

// 1. Clash test HW0010_v_DR0100 is exported
if (!accXml.includes('name="HW0010_v_DR0100"')) {
  throw new Error('Test 6 Failed: Missing HW0010_v_DR0100 in XML');
}

// 2. Search Set A-DR0100 ONLY is exported
if (!accXml.includes('name="A-DR0100"')) {
  throw new Error('Test 6 Failed: Missing A-DR0100 in XML');
}

// 3. Expected NOT to appear: A-HW0010, A-HW0020, A-ST0510, A-ST0520
if (accXml.includes('name="A-HW0010"')) {
  throw new Error('Test 6 Failed: A-HW0010 MUST NOT appear in delta XML');
}
if (accXml.includes('name="A-HW0020"')) {
  throw new Error('Test 6 Failed: A-HW0020 MUST NOT appear in delta XML');
}
if (accXml.includes('name="A-ST0510"')) {
  throw new Error('Test 6 Failed: A-ST0510 MUST NOT appear in delta XML');
}
if (accXml.includes('name="A-ST0520"')) {
  throw new Error('Test 6 Failed: A-ST0520 MUST NOT appear in delta XML');
}

// 4. Viewfolder AR is present, Highways and Structures viewfolders MUST NOT appear
if (!accXml.includes('<viewfolder name="AR"')) {
  throw new Error('Test 6 Failed: Viewfolder AR must be present');
}
if (accXml.includes('<viewfolder name="Highways"')) {
  throw new Error('Test 6 Failed: Viewfolder Highways MUST NOT appear');
}
if (accXml.includes('<viewfolder name="Structures"')) {
  throw new Error('Test 6 Failed: Viewfolder Structures MUST NOT appear');
}

// 5. Validator must NOT fail on missing A-HW0010 because it exists in baseline
const accValidation = validateFinalXmlStructure(
  accDeltaTests,
  determineSelectionSetsToExport(accReport, accDeltaTests, deltaConfig),
  'm',
  accReport.oldDoc.selectionSets
);
if (!accValidation.isValid || accValidation.errors.length > 0) {
  throw new Error(`Test 6 Failed: Validation failed: ${accValidation.errors.join('; ')}`);
}
console.log('✅ PASS: Acceptance Test 1 100% SUCCESS: Only A-DR0100 and AR viewfolder exported; A-HW0010/20 & A-ST0510/20 completely absent');

// --- TEST 7: Acceptance Test 2 - MODIFIED Search Set Export ---
console.log('\n--- Test 7: Acceptance Test 2 (MODIFIED Search Set) ---');
/*
Scenario:
OLD: A-HW0010 with CD_ClashGroup = HW0010
NEW: A-HW0010 with CD_ClashGroup = HW0010 AND CD_ClashPriority = B
Exported test references A-HW0010.
Expected:
A-HW0010 NEW definition is exported.
OLD definition is NOT exported.
Unrelated search sets are NOT exported.
*/
const MOD_OLD_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" units="m">
  <batchtest name="BatchMod" units="m">
    <clashtests>
      <clashtest name="HW0010_Check" test_type="hard" status="new" tolerance="0.0100000000">
        <linkage mode="none"/>
        <left><clashselection><locator>lcop_selection_set_tree/Highways/A-HW0010</locator></clashselection></left>
        <right><clashselection><locator>lcop_selection_set_tree/Highways/A-HW0020</locator></clashselection></right>
      </clashtest>
    </clashtests>
    <selectionsets>
      <viewfolder name="Highways" guid="10000000-0000-0000-0000-000000000001">
        <selectionset name="A-HW0010" guid="10000000-0000-0000-0000-000000000010">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="CD">CustomData</name></category><property><name internal="CD_ClashGroup">CD_ClashGroup</name></property><value><data type="wstring">HW0010</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
        <selectionset name="A-HW0020" guid="10000000-0000-0000-0000-000000000020">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="CD">CustomData</name></category><property><name internal="CD_ClashGroup">CD_ClashGroup</name></property><value><data type="wstring">HW0020</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
      </viewfolder>
    </selectionsets>
  </batchtest>
</exchange>`;

const MOD_NEW_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" units="m">
  <batchtest name="BatchMod" units="m">
    <clashtests>
      <!-- Test modified in tolerance -->
      <clashtest name="HW0010_Check" test_type="hard" status="new" tolerance="0.0200000000">
        <linkage mode="none"/>
        <left><clashselection><locator>lcop_selection_set_tree/Highways/A-HW0010</locator></clashselection></left>
        <right><clashselection><locator>lcop_selection_set_tree/Highways/A-HW0020</locator></clashselection></right>
      </clashtest>
    </clashtests>
    <selectionsets>
      <viewfolder name="Highways" guid="10000000-0000-0000-0000-000000000001">
        <!-- A-HW0010 modified with second condition CD_ClashPriority = B -->
        <selectionset name="A-HW0010" guid="10000000-0000-0000-0000-000000000010">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="CD">CustomData</name></category><property><name internal="CD_ClashGroup">CD_ClashGroup</name></property><value><data type="wstring">HW0010</data></value></condition><condition test="equals" flags="10"><category><name internal="CD">CustomData</name></category><property><name internal="CD_ClashPriority">CD_ClashPriority</name></property><value><data type="wstring">B</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
        <selectionset name="A-HW0020" guid="10000000-0000-0000-0000-000000000020">
          <findspec mode="all"><conditions><condition test="equals" flags="10"><category><name internal="CD">CustomData</name></category><property><name internal="CD_ClashGroup">CD_ClashGroup</name></property><value><data type="wstring">HW0020</data></value></condition></conditions><locator>/</locator></findspec>
        </selectionset>
      </viewfolder>
    </selectionsets>
  </batchtest>
</exchange>`;

const modOldDoc = parseNavisworksXml(MOD_OLD_XML, 'mod_old.xml');
const modNewDoc = parseNavisworksXml(MOD_NEW_XML, 'mod_new.xml');
const modReport = generateDifferenceReport(modOldDoc, modNewDoc);

const modExportTests = determineClashTestsToExport(modReport, deltaConfig);
const modExportSummary = resolveRequiredSelectionSetsWithSummary(modReport, modExportTests, 'DELTA_ONLY');

if (modExportSummary.modifiedCount !== 1) {
  throw new Error(`Test 7 Failed: Expected 1 MODIFIED search set, got ${modExportSummary.modifiedCount}`);
}
if (modExportSummary.existingCount !== 1) {
  throw new Error(`Test 7 Failed: Expected 1 EXISTING search set, got ${modExportSummary.existingCount}`);
}
if (modExportSummary.totalExported !== 1) {
  throw new Error(`Test 7 Failed: Expected totalExported = 1, got ${modExportSummary.totalExported}`);
}

const modXml = buildComparedNavisworksXml(modReport, deltaConfig);

// A-HW0010 NEW definition must be in XML
if (!modXml.includes('name="A-HW0010"')) {
  throw new Error('Test 7 Failed: Missing A-HW0010 in output XML');
}
if (!modXml.includes('CD_ClashPriority') || !modXml.includes('B</data>')) {
  throw new Error('Test 7 Failed: A-HW0010 must contain NEW condition CD_ClashPriority = B');
}
// Unchanged A-HW0020 must NOT be in XML
if (modXml.includes('name="A-HW0020"')) {
  throw new Error('Test 7 Failed: Unchanged A-HW0020 must NOT be in output XML');
}
console.log('✅ PASS: Acceptance Test 2 100% SUCCESS: MODIFIED search set exported with new definition; unchanged set omitted');

// --- TEST 8: Acceptance Test 3 - GUID-Only Change Handling ---
console.log('\n--- Test 8: Acceptance Test 3 (GUID-Only Change) ---');
/*
Scenario:
OLD: A-HW0010 with GUID = OLD_GUID
NEW: A-HW0010 with GUID = NEW_GUID
Same logical FindSpec.
Expected:
Classification = GUID_ONLY
Search Set is NOT exported in Delta Only mode.
*/
const guid10 = report.selectionSetDiffs.find((s) => s.name === 'A-HW0010');
if (!guid10 || guid10.status !== 'UNCHANGED' || !guid10.guidChangedOnly) {
  throw new Error('Test 8 Failed: A-HW0010 should be UNCHANGED with guidChangedOnly = true');
}
const guidClassification = depSummary.requiredSets.find((s) => s.name === 'A-HW0010');
if (!guidClassification || guidClassification.status !== 'GUID_ONLY') {
  throw new Error(`Test 8 Failed: A-HW0010 status should be GUID_ONLY, got ${guidClassification?.status}`);
}
if (guidClassification.isExported) {
  throw new Error('Test 8 Failed: A-HW0010 must NOT be exported in Delta Only mode');
}
console.log('✅ PASS: Acceptance Test 3 100% SUCCESS: GUID-only change correctly classified as GUID_ONLY and omitted from export');

// --- TEST 9: Navisworks XML Validation & Output Fidelity ---
console.log('\n--- Test 9: Navisworks XML Validation & Output Fidelity ---');
const val = validateFinalXmlStructure(deltaTests, deltaSets, 'm', report.oldDoc.selectionSets);
if (!val.isValid || val.errors.length > 0) {
  throw new Error(`Test 9 Failed: Validation failed: ${val.errors.join('; ')}`);
}
console.log('✅ PASS: Final XML structure passed all strict validation rules (0 errors)');
console.log(`✅ PASS: ${val.baselineResolvedCount || 0} references resolved against existing Navisworks baseline`);

// --- TEST 10: Final Debug Package Breakdown Log ---
console.log('\n--- Test 10: Final Debug Package Breakdown Log ---');
logDeltaPackageBreakdown(report, deltaConfig);

console.log('====================================================');
console.log('ALL XML COMPARING TESTS PASSED: 10/10 SECTIONS CLEAN!');
console.log('====================================================\n');
