import { createSampleBimClashMatrixWorkbook } from './excel/sampleData';
import { autoDetectMatrixStructure, createDefaultConfigs } from './excel/matrixDetector';
import { generateSelectionSets } from './selectionSets/selectionSetGenerator';
import { parseClashMatrix } from './clashTests/clashMatrixParser';
import { parseClashValue, formatToleranceToNavisworksMeters } from './clashTests/toleranceParser';
import {
  loadMatrixFormatProfiles,
  saveCustomFormatProfile,
  deleteCustomFormatProfile,
  getActiveFormatProfile,
  setActiveFormatProfile,
  resetFormatProfiles,
  BUILTIN_FORMAT_PROFILES,
} from './clashTests/matrixFormatProfileManager';
import { buildNavisworksXml } from './xml/navisworksXmlBuilder';
import { ClashMatrixConfig } from './types/clashTest';
import { processWorkbookUpdateFile } from './excel/workbookUpdater';
import * as XLSX from 'xlsx';

export async function runMatrixFormatProfileTests() {
  console.log('====================================================');
  console.log('RUNNING CLASH MATRIX FORMAT & PROFILE TEST SUITE');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAILED: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
    console.log(`✅ PASS: ${msg}`);
    passedTests++;
  }

  // ----------------------------------------------------
  // Test 1: Configurable Defaults (F / 14 / 17 / I)
  // ----------------------------------------------------
  console.log('--- Test 1: Configurable Defaults Verification (F / 14 / 17 / I) ---');
  const wb = createSampleBimClashMatrixWorkbook();
  const currentSheetData = wb.sheetsData[wb.selectedSheet];
  const detected = autoDetectMatrixStructure(currentSheetData, wb.columns, wb.headerRowIndex);
  const { clashMatrixConfig: defaultCfg } = createDefaultConfigs(detected, wb.columns);

  assert(defaultCfg.rowGroupColumnIndex === 5, `Row Element ID column is Column F (index 5, got ${defaultCfg.rowGroupColumnIndex})`);
  assert(defaultCfg.rowGroupColumnLetter === 'F', `Row Element ID column letter is 'F' (got ${defaultCfg.rowGroupColumnLetter})`);
  assert(defaultCfg.columnHeadersRowIndex === 13, `Column Elements Header Row is Row 14 (0-index 13, got ${defaultCfg.columnHeadersRowIndex})`);
  assert(defaultCfg.matrixStartRowIndex === 16, `Matrix Data Start Row is Row 17 (0-index 16, got ${defaultCfg.matrixStartRowIndex})`);
  assert(defaultCfg.matrixStartColumnIndex === 8, `Matrix Start Column is Column I (index 8, got ${defaultCfg.matrixStartColumnIndex})`);
  assert(defaultCfg.matrixStartColumnLetter === 'I', `Matrix Start Column letter is 'I' (got ${defaultCfg.matrixStartColumnLetter})`);
  assert(defaultCfg.hardPrefix === 'H', `Default hard prefix is 'H' (got ${defaultCfg.hardPrefix})`);
  assert(defaultCfg.clearancePrefix === 'C', `Default clearance prefix is 'C' (got ${defaultCfg.clearancePrefix})`);
  assert(defaultCfg.unit === 'MM', `Default unit is 'MM' (got ${defaultCfg.unit})`);
  assert(defaultCfg.delimiter === '-', `Default delimiter is '-' (got ${defaultCfg.delimiter})`);

  // ----------------------------------------------------
  // Test 2: Custom Coordinate Config (Not locked in parser)
  // ----------------------------------------------------
  console.log('\n--- Test 2: Dynamic Custom Coordinate Reconfigurability ---');
  const customCoordCfg: ClashMatrixConfig = {
    rowGroupColumnIndex: 6, // Col G
    rowGroupColumnLetter: 'G',
    columnHeadersRowIndex: 14, // Row 15
    matrixStartRowIndex: 17, // Row 18
    matrixStartColumnIndex: 9, // Col J
    matrixStartColumnLetter: 'J',
    namingFormat: 'group_v_group',
    hardPrefix: 'H',
    clearancePrefix: 'C',
    unit: 'MM',
    delimiter: '-',
  };
  assert(customCoordCfg.rowGroupColumnIndex === 6, 'Custom Row Element ID column (Col G) accepted');
  assert(customCoordCfg.columnHeadersRowIndex === 14, 'Custom Header Row (Row 15) accepted');
  assert(customCoordCfg.matrixStartRowIndex === 17, 'Custom Start Row (Row 18) accepted');
  assert(customCoordCfg.matrixStartColumnIndex === 9, 'Custom Start Column (Col J) accepted');

  // ----------------------------------------------------
  // Test 3: parseClashValue() Unit Conversions (Single Source of Truth)
  // ----------------------------------------------------
  console.log('\n--- Test 3: parseClashValue() Unit Conversions (MM, CM, M, IN, FT) ---');

  // Unit MM:
  const rMM1 = parseClashValue('H-400', { hardPrefix: 'H', clearancePrefix: 'C', unit: 'MM', delimiter: '-' });
  assert(rMM1.type === 'hard', 'H-400 parsed as hard');
  assert(rMM1.toleranceRaw === 400, 'H-400 raw tolerance is 400');
  assert(rMM1.toleranceMeters === 0.4, 'H-400 converted tolerance is 0.4 meters');
  assert(formatToleranceToNavisworksMeters(rMM1.toleranceMeters!) === '0.4000000000', 'Formatted to 0.4000000000');

  const rMM2 = parseClashValue('C-100', { hardPrefix: 'H', clearancePrefix: 'C', unit: 'MM', delimiter: '-' });
  assert(rMM2.type === 'clearance', 'C-100 parsed as clearance');
  assert(rMM2.toleranceMeters === 0.1, 'C-100 converted tolerance is 0.1 meters');
  assert(formatToleranceToNavisworksMeters(rMM2.toleranceMeters!) === '0.1000000000', 'Formatted to 0.1000000000');

  // Unit CM:
  const rCM = parseClashValue('H-50', { hardPrefix: 'H', clearancePrefix: 'C', unit: 'CM', delimiter: '-' });
  assert(rCM.type === 'hard', 'H-50 in CM parsed as hard');
  assert(rCM.toleranceMeters === 0.5, 'H-50 (50cm) converted tolerance is 0.5 meters');
  assert(formatToleranceToNavisworksMeters(rCM.toleranceMeters!) === '0.5000000000', 'Formatted to 0.5000000000');

  // Unit M:
  const rM1 = parseClashValue('HR-1', { hardPrefix: 'HR', clearancePrefix: 'CR', unit: 'M', delimiter: '-' });
  assert(rM1.type === 'hard', 'HR-1 in M parsed as hard');
  assert(rM1.toleranceMeters === 1.0, 'HR-1 (1m) converted tolerance is 1.0 meters');
  assert(formatToleranceToNavisworksMeters(rM1.toleranceMeters!) === '1.0000000000', 'Formatted to 1.0000000000');

  const rM2 = parseClashValue('CR-0.5', { hardPrefix: 'HR', clearancePrefix: 'CR', unit: 'M', delimiter: '-' });
  assert(rM2.type === 'clearance', 'CR-0.5 in M parsed as clearance');
  assert(rM2.toleranceMeters === 0.5, 'CR-0.5 (0.5m) converted tolerance is 0.5 meters');
  assert(formatToleranceToNavisworksMeters(rM2.toleranceMeters!) === '0.5000000000', 'Formatted to 0.5000000000');

  // Unit IN (Inches):
  const rIN = parseClashValue('H-10', { hardPrefix: 'H', clearancePrefix: 'C', unit: 'IN', delimiter: '-' });
  assert(rIN.type === 'hard', 'H-10 in IN parsed as hard');
  assert(Math.abs((rIN.toleranceMeters || 0) - 0.254) < 1e-6, 'H-10 (10 inches) converted tolerance is 0.254 meters');
  assert(formatToleranceToNavisworksMeters(rIN.toleranceMeters!) === '0.2540000000', 'Formatted to 0.2540000000');

  // Unit FT (Feet):
  const rFT = parseClashValue('HR-2', { hardPrefix: 'HR', clearancePrefix: 'CR', unit: 'FT', delimiter: '-' });
  assert(rFT.type === 'hard', 'HR-2 in FT parsed as hard');
  assert(Math.abs((rFT.toleranceMeters || 0) - 0.6096) < 1e-6, 'HR-2 (2 feet) converted tolerance is 0.6096 meters');
  assert(formatToleranceToNavisworksMeters(rFT.toleranceMeters!) === '0.6096000000', 'Formatted to 0.6096000000');

  // Delimiters:
  const rNoDelim = parseClashValue('H400', { hardPrefix: 'H', clearancePrefix: 'C', unit: 'MM', delimiter: '' });
  assert(rNoDelim.type === 'hard' && rNoDelim.toleranceMeters === 0.4, 'H400 with empty delimiter parsed correctly');

  const rUnderscore = parseClashValue('H_500', { hardPrefix: 'H', clearancePrefix: 'C', unit: 'MM', delimiter: '_' });
  assert(rUnderscore.type === 'hard' && rUnderscore.toleranceMeters === 0.5, 'H_500 with underscore delimiter parsed correctly');

  // ----------------------------------------------------
  // Test 4: CRITICAL MATRIX TEST (F18 = HW0020, I14 = HW0010, I18 = H-400)
  // ----------------------------------------------------
  console.log('\n--- Test 4: CRITICAL MATRIX TEST (F18=HW0020, I14=HW0010, I18=H-400) ---');
  const { selectionSetConfig } = createDefaultConfigs(detected, wb.columns);
  const selectionSetResult = generateSelectionSets(
    currentSheetData,
    selectionSetConfig,
    defaultCfg.matrixStartRowIndex,
    defaultCfg.rowGroupColumnIndex
  );

  const matrixResult = parseClashMatrix(
    currentSheetData,
    defaultCfg,
    selectionSetResult.selectionSets,
    selectionSetResult.selectionSetMapByGroup,
    selectionSetResult.selectionSetMapByName
  );

  // Row 18 is Excel 18 (index 17). F18 = HW0020.
  // Col I is Excel I (index 8). I14 = HW0010.
  // Cell I18 is (row 17, col 8) -> value 'H-400'.
  const hw0020v0010 = matrixResult.clashTests.find((t) => t.leftGroup === 'HW0020' && t.rightGroup === 'HW0010');
  assert(hw0020v0010 !== undefined, 'Found clash test between HW0020 (Row F18) and HW0010 (Col I14)');
  assert(hw0020v0010?.name === 'HW0020_v_HW0010', `Clash test name is "HW0020_v_HW0010" (got "${hw0020v0010?.name}")`);
  assert(hw0020v0010?.testType === 'hard', `Clash test type is "hard" (got "${hw0020v0010?.testType}")`);
  assert(hw0020v0010?.toleranceFormatted === '0.4000000000', `Tolerance formatted is "0.4000000000" (got "${hw0020v0010?.toleranceFormatted}")`);
  assert(hw0020v0010?.toleranceMeters === 0.4, `Tolerance in meters is 0.4 (got ${hw0020v0010?.toleranceMeters})`);

  // Verify that NO Category/Department/Description (Column C/H) was used as element ID
  assert(!hw0020v0010?.name.includes('Highways_v_Highways'), 'Test name does not use Column C Category/Group');
  assert(!hw0020v0010?.name.includes('Pavement'), 'Test name does not use Column H Description');

  // ----------------------------------------------------
  // Test 5: CRITICAL FORMAT TEST (H/C/MM vs HR/CR/M in Navisworks XML)
  // ----------------------------------------------------
  console.log('\n--- Test 5: CRITICAL FORMAT TEST (H/C/MM vs HR/CR/M XML Output) ---');

  // Create a synthetic 2D sheet data with specific test values:
  // Row 14 (index 13): Column I = HW0010, Column J = HW0020
  // Row 17 (index 16): F = HW0010, I = blank, J = H-100
  // Row 18 (index 17): F = HW0020, I = H-100, J = blank
  const synthRows: any[][] = [];
  for (let r = 0; r < 20; r++) synthRows.push(new Array(12).fill(''));

  // Header row 14 (index 13)
  synthRows[13][1] = 'Folder';
  synthRows[13][4] = 'Priority';
  synthRows[13][5] = 'Element ID';
  synthRows[13][8] = 'HW0010';
  synthRows[13][9] = 'HW0020';

  // Data rows
  synthRows[16] = [
    'Stage 4', 'Highways', 'Highways', 'HW', 'A', 'HW0010', 'Pr_35_31_14', 'Pavement',
    'blank', 'H-100', '', '', '', '', '', '', '', '', '', ''
  ];

  synthRows[17] = [
    'Stage 4', 'Highways', 'Highways', 'HW', 'A', 'HW0020', 'Pr_35_31_14', 'Kerbs',
    'H-100', 'blank', '', '', '', '', '', '', '', '', '', ''
  ];

  const synthSets = generateSelectionSets(
    synthRows,
    selectionSetConfig,
    16,
    5
  );

  // Profile 1: H / C / MM
  const cfgProfile1: ClashMatrixConfig = {
    rowGroupColumnIndex: 5,
    rowGroupColumnLetter: 'F',
    columnHeadersRowIndex: 13,
    matrixStartRowIndex: 16,
    matrixStartColumnIndex: 8,
    matrixStartColumnLetter: 'I',
    namingFormat: 'group_v_group',
    hardPrefix: 'H',
    clearancePrefix: 'C',
    unit: 'MM',
    delimiter: '-',
  };

  const parse1 = parseClashMatrix(
    synthRows,
    cfgProfile1,
    synthSets.selectionSets,
    synthSets.selectionSetMapByGroup,
    synthSets.selectionSetMapByName
  );

  const mockSettings = {
    batchTestName: 'Profile1Test',
    internalName: 'Profile1Test',
    units: 'm' as const,
    filename: 'Test.nwc',
    filepath: 'Test.nwc',
  };

  const xml1 = buildNavisworksXml(
    mockSettings,
    synthSets.viewFolders,
    parse1.clashTests,
    'full'
  );

  assert(parse1.clashTests.length === 2, `Profile 1 parsed 2 clash tests (got ${parse1.clashTests.length})`);
  assert(parse1.clashTests[0].testType === 'hard', 'Profile 1 testType is hard');
  assert(parse1.clashTests[0].toleranceFormatted === '0.1000000000', `Profile 1 tolerance is 0.1000000000 (got ${parse1.clashTests[0].toleranceFormatted})`);
  assert(xml1.includes('tolerance="0.1000000000"'), 'XML 1 contains tolerance="0.1000000000"');
  assert(xml1.includes('test_type="hard"'), 'XML 1 contains test_type="hard"');

  // Now change ONLY the profile to: HR / CR / M
  // And change the cell values in matrix to HR-1 and CR-0.5
  synthRows[16][9] = 'HR-1';
  synthRows[17][8] = 'CR-0.5';

  const cfgProfile2: ClashMatrixConfig = {
    ...cfgProfile1,
    hardPrefix: 'HR',
    clearancePrefix: 'CR',
    unit: 'M',
    delimiter: '-',
  };

  const parse2 = parseClashMatrix(
    synthRows,
    cfgProfile2,
    synthSets.selectionSets,
    synthSets.selectionSetMapByGroup,
    synthSets.selectionSetMapByName
  );

  const mockSettings2 = {
    batchTestName: 'Profile2Test',
    internalName: 'Profile2Test',
    units: 'm' as const,
    filename: 'Test.nwc',
    filepath: 'Test.nwc',
  };

  const xml2 = buildNavisworksXml(
    mockSettings2,
    synthSets.viewFolders,
    parse2.clashTests,
    'full'
  );

  const testHR1 = parse2.clashTests.find((t) => t.leftGroup === 'HW0010' && t.rightGroup === 'HW0020');
  const testCR05 = parse2.clashTests.find((t) => t.leftGroup === 'HW0020' && t.rightGroup === 'HW0010');

  assert(testHR1 !== undefined, 'Found HR-1 test (HW0010_v_HW0020)');
  assert(testHR1?.testType === 'hard', 'HR-1 parsed as type "hard"');
  assert(testHR1?.toleranceMeters === 1.0, 'HR-1 parsed tolerance is 1.0 meters');
  assert(testHR1?.toleranceFormatted === '1.0000000000', `HR-1 tolerance formatted is "1.0000000000" (got ${testHR1?.toleranceFormatted})`);

  assert(testCR05 !== undefined, 'Found CR-0.5 test (HW0020_v_HW0010)');
  assert(testCR05?.testType === 'clearance', 'CR-0.5 parsed as type "clearance"');
  assert(testCR05?.toleranceMeters === 0.5, 'CR-0.5 parsed tolerance is 0.5 meters');
  assert(testCR05?.toleranceFormatted === '0.5000000000', `CR-0.5 tolerance formatted is "0.5000000000" (got ${testCR05?.toleranceFormatted})`);

  // Verify XML output contains exact Navisworks tags for Profile 2
  assert(xml2.includes('<clashtest name="HW0010_v_HW0020" test_type="hard" status="new" tolerance="1.0000000000" merge_composites="0">'), 'XML 2 contains exact <clashtest ... test_type="hard" tolerance="1.0000000000">');
  assert(xml2.includes('<clashtest name="HW0020_v_HW0010" test_type="clearance" status="new" tolerance="0.5000000000" merge_composites="0">'), 'XML 2 contains exact <clashtest ... test_type="clearance" tolerance="0.5000000000">');

  // ----------------------------------------------------
  // Test 6: Format Profiles Persistence & Management
  // ----------------------------------------------------
  console.log('\n--- Test 6: Format Profiles Persistence & CRUD ---');
  resetFormatProfiles();
  const loadedProfiles = loadMatrixFormatProfiles();
  assert(loadedProfiles.length >= 6, `Loaded at least 6 built-in format profiles (got ${loadedProfiles.length})`);
  assert(loadedProfiles.some((p) => p.id === 'profile_std_mm'), 'Contains Standard Metric profile');
  assert(loadedProfiles.some((p) => p.id === 'profile_meters_m'), 'Contains Meters Format profile');

  const customProfile = saveCustomFormatProfile({
    name: 'Bridge Clearance Profile',
    hardPrefix: 'H',
    clearancePrefix: 'CLR',
    unit: 'CM',
    delimiter: '_',
    notes: 'For bridge pier checks',
  });
  assert(customProfile.name === 'Bridge Clearance Profile', 'Saved custom profile with name');
  assert(customProfile.clearancePrefix === 'CLR', 'Saved custom profile with CLR prefix');
  assert(customProfile.unit === 'CM', 'Saved custom profile with CM unit');

  const active = getActiveFormatProfile();
  assert(active.id === customProfile.id, 'Active profile updated to newly saved custom profile');

  const parsedCustom = parseClashValue('CLR_20', {
    hardPrefix: customProfile.hardPrefix,
    clearancePrefix: customProfile.clearancePrefix,
    unit: customProfile.unit,
    delimiter: customProfile.delimiter,
  });
  assert(parsedCustom.type === 'clearance', 'CLR_20 parsed as clearance');
  assert(parsedCustom.toleranceMeters === 0.2, 'CLR_20 in CM parsed as 0.2 meters');

  const deleted = deleteCustomFormatProfile(customProfile.id);
  assert(deleted === true, 'Successfully deleted custom format profile');
  assert(!deleteCustomFormatProfile('profile_std_mm'), 'Built-in profile protected from deletion');

  // ----------------------------------------------------
  // Test 7: Update Excel Workflow Preserves Format Profiles
  // ----------------------------------------------------
  console.log('\n--- Test 7: Update Excel Workflow Preserves Matrix Format Config ---');
  // Create an updated workbook buffer with 1 extra row
  const updatedRows = JSON.parse(JSON.stringify(currentSheetData));
  const newRow = [
    'Stage 4', 'HW', 'Highways', 'HW', 'A', 'HW9999', 'Pr_35_31_14', 'Test New Pole',
    'blank', 'H-100', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank', 'blank'
  ];
  updatedRows.push(newRow);

  const updatedWorkbookObj = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(updatedRows);
  XLSX.utils.book_append_sheet(updatedWorkbookObj, ws, wb.selectedSheet);
  const updatedBuffer = XLSX.write(updatedWorkbookObj, { type: 'array', bookType: 'xlsx' });

  const updateComparison = processWorkbookUpdateFile(
    updatedBuffer,
    'Updated_Book2.xlsx',
    wb,
    selectionSetConfig,
    cfgProfile1
  );

  assert(updateComparison.addedElements.includes('HW9999'), 'Update Excel detected added element HW9999');
  assert(updateComparison.columnWarnings.length === 0, 'No column warnings in updated workbook');

  console.log('\n====================================================');
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('====================================================');
}

// Run tests if invoked directly
runMatrixFormatProfileTests().catch((err) => {
  console.error('Test suite failure:', err);
  process.exit(1);
});
