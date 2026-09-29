import { parseClashMatrix } from './clashTests/clashMatrixParser';
import { parseClashValue, formatToleranceToNavisworksMeters } from './clashTests/toleranceParser';
import { buildNavisworksXml } from './xml/navisworksXmlBuilder';
import { runFullValidation } from './validation/validationEngine';
import { prepareWorkbookUpdate } from './excel/workbookUpdater';
import { ClashMatrixConfig, ClashTest } from './types/clashTest';
import { SelectionSetConfig, SelectionSet, ViewFolder } from './types/selectionSet';
import { ParsedWorkbook } from './types/excel';
import { ProjectSettings } from './types/configuration';

export async function runArbitraryLayoutAcceptanceTests() {
  console.log('====================================================');
  console.log('RUNNING ARBITRARY-LAYOUT ACCEPTANCE TEST SUITE');
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

  const dummyProjectSettings: ProjectSettings = {
    batchTestName: 'ArbitraryLayoutBatch',
    internalName: 'ArbitraryLayoutBatch',
    units: 'm',
    filename: 'arbitrary.nwc',
    filepath: 'arbitrary.nwc',
  };

  // =========================================================================
  // TEST SUITE 1: REAL ACCEPTANCE TEST (Requirement 15)
  // Layout: Column C / Header Row 7 / Start Row 10 / Start Col E
  // HR-1 and CR-0.5 with Unit = M, Delimiter = -
  // =========================================================================
  console.log('--- TEST 1: Real Acceptance Test (C / 7 / 10 / E with HR/CR/M/-) ---');

  // Build 2D grid of at least 12 rows and 8 columns
  // 0-indexed: Row 6 is Row 7; Row 9 is Row 10; Row 10 is Row 11
  // Col 2 is Col C; Col 4 is Col E; Col 5 is Col F
  const gridAcceptance: any[][] = Array.from({ length: 15 }, () => Array(8).fill(''));

  // Column headers at Row 7 (index 6):
  gridAcceptance[6][4] = 'EL001'; // E7 = EL001
  gridAcceptance[6][5] = 'EL002'; // F7 = EL002

  // Row IDs at Column C (index 2):
  gridAcceptance[9][2] = 'EL001';  // C10 = EL001
  gridAcceptance[10][2] = 'EL002'; // C11 = EL002

  // Matrix values at Row 11 (index 10):
  gridAcceptance[10][4] = 'HR-1';   // E11 = HR-1
  gridAcceptance[10][5] = 'CR-0.5'; // F11 = CR-0.5

  const configAcceptance: ClashMatrixConfig = {
    sheet: 'CustomMatrixSheet',
    rowGroupColumnIndex: 2, // Column C
    rowGroupColumnLetter: 'C',
    columnHeadersRowIndex: 6, // Row 7
    matrixStartRowIndex: 9, // Row 10
    matrixStartColumnIndex: 4, // Column E
    matrixStartColumnLetter: 'E',
    namingFormat: 'group_v_group',
    hardPrefix: 'HR',
    clearancePrefix: 'CR',
    unit: 'M',
    delimiter: '-',
  };

  const selSetMapEmpty = new Map<string, SelectionSet>();
  const resultAcceptance = parseClashMatrix(
    gridAcceptance,
    configAcceptance,
    [],
    selSetMapEmpty,
    selSetMapEmpty
  );

  assert(resultAcceptance.clashTests.length === 2, `Acceptance layout produced exactly 2 clash tests (got ${resultAcceptance.clashTests.length})`);

  // First test: EL002_v_EL001
  const test1 = resultAcceptance.clashTests.find((t) => t.name === 'EL002_v_EL001');
  assert(!!test1, 'Found test "EL002_v_EL001"');
  assert(test1!.testType === 'hard', `EL002_v_EL001 testType is "hard" (got "${test1!.testType}")`);
  assert(test1!.toleranceFormatted === '1.0000000000', `EL002_v_EL001 tolerance is "1.0000000000" (got "${test1!.toleranceFormatted}")`);
  assert(test1!.toleranceMeters === 1.0, `EL002_v_EL001 tolerance in meters is 1.0 (got ${test1!.toleranceMeters})`);
  assert(test1!.leftGroup === 'EL002', `EL002_v_EL001 leftGroup is "EL002" (got "${test1!.leftGroup}")`);
  assert(test1!.rightGroup === 'EL001', `EL002_v_EL001 rightGroup is "EL001" (got "${test1!.rightGroup}")`);

  // Second test: EL002_v_EL002
  const test2 = resultAcceptance.clashTests.find((t) => t.name === 'EL002_v_EL002');
  assert(!!test2, 'Found test "EL002_v_EL002"');
  assert(test2!.testType === 'clearance', `EL002_v_EL002 testType is "clearance" (got "${test2!.testType}")`);
  assert(test2!.toleranceFormatted === '0.5000000000', `EL002_v_EL002 tolerance is "0.5000000000" (got "${test2!.toleranceFormatted}")`);
  assert(test2!.toleranceMeters === 0.5, `EL002_v_EL002 tolerance in meters is 0.5 (got ${test2!.toleranceMeters})`);
  assert(test2!.leftGroup === 'EL002', `EL002_v_EL002 leftGroup is "EL002" (got "${test2!.leftGroup}")`);
  assert(test2!.rightGroup === 'EL002', `EL002_v_EL002 rightGroup is "EL002" (got "${test2!.rightGroup}")`);

  // Verify Navisworks XML output
  const viewFoldersAcceptance: ViewFolder[] = [];
  const xmlAcceptance = buildNavisworksXml(
    dummyProjectSettings,
    viewFoldersAcceptance,
    resultAcceptance.clashTests,
    'clashTestsOnly'
  );

  assert(
    xmlAcceptance.includes('name="EL002_v_EL001"') &&
    xmlAcceptance.includes('test_type="hard"') &&
    xmlAcceptance.includes('tolerance="1.0000000000"'),
    'Navisworks XML contains exact <clashtest name="EL002_v_EL001" test_type="hard" tolerance="1.0000000000">'
  );

  assert(
    xmlAcceptance.includes('name="EL002_v_EL002"') &&
    xmlAcceptance.includes('test_type="clearance"') &&
    xmlAcceptance.includes('tolerance="0.5000000000"'),
    'Navisworks XML contains exact <clashtest name="EL002_v_EL002" test_type="clearance" tolerance="0.5000000000">'
  );

  // =========================================================================
  // TEST SUITE 2: THREE COMPLETELY DIFFERENT EXCEL LAYOUTS (Requirement 13)
  // Layout A: F / 14 / 17 / I with H / C / MM / -
  // Layout B: C / 7 / 10 / E with HR / CR / M / -
  // Layout C: B / 5 / 8 / G with HC / CL / CM / _
  // =========================================================================
  console.log('\n--- TEST 2: Layout A (F / 14 / 17 / I with H/C/MM/-) ---');

  const gridA: any[][] = Array.from({ length: 22 }, () => Array(15).fill(''));
  // Col I is col 8, Row 14 is row 13
  gridA[13][8] = 'STR01';
  gridA[13][9] = 'MEP01';
  // Col F is col 5, Row 17 is row 16
  gridA[16][5] = 'ARC01';
  gridA[17][5] = 'ARC02';
  // Matrix intersections:
  gridA[16][8] = 'H-400';
  gridA[16][9] = 'C-100';
  gridA[17][8] = 'C-200';
  gridA[17][9] = 'H-500';

  const configA: ClashMatrixConfig = {
    sheet: 'LayoutASheet',
    rowGroupColumnIndex: 5, // F
    rowGroupColumnLetter: 'F',
    columnHeadersRowIndex: 13, // 14
    matrixStartRowIndex: 16, // 17
    matrixStartColumnIndex: 8, // I
    matrixStartColumnLetter: 'I',
    namingFormat: 'group_v_group',
    hardPrefix: 'H',
    clearancePrefix: 'C',
    unit: 'MM',
    delimiter: '-',
  };

  const resultA = parseClashMatrix(gridA, configA, [], selSetMapEmpty, selSetMapEmpty);
  assert(resultA.clashTests.length === 4, `Layout A produced 4 clash tests (got ${resultA.clashTests.length})`);
  const tA1 = resultA.clashTests.find((t) => t.name === 'ARC01_v_STR01');
  assert(!!tA1 && tA1.testType === 'hard' && tA1.toleranceFormatted === '0.4000000000', 'Layout A: ARC01_v_STR01 is hard 0.4000000000');
  const tA2 = resultA.clashTests.find((t) => t.name === 'ARC01_v_MEP01');
  assert(!!tA2 && tA2.testType === 'clearance' && tA2.toleranceFormatted === '0.1000000000', 'Layout A: ARC01_v_MEP01 is clearance 0.1000000000');

  const xmlA = buildNavisworksXml(dummyProjectSettings, [], resultA.clashTests, 'clashTestsOnly');
  assert(xmlA.includes('tolerance="0.4000000000"') && xmlA.includes('test_type="hard"'), 'Layout A XML verified');

  console.log('\n--- TEST 3: Layout B (C / 7 / 10 / E with HR/CR/M/-) ---');

  const gridB: any[][] = Array.from({ length: 15 }, () => Array(10).fill(''));
  // Col E is col 4, Row 7 is row 6
  gridB[6][4] = 'CIVIL01';
  gridB[6][5] = 'DRAIN01';
  // Col C is col 2, Row 10 is row 9
  gridB[9][2] = 'ROAD01';
  gridB[10][2] = 'ROAD02';
  // Matrix intersections:
  gridB[9][4] = 'HR-1.5';
  gridB[9][5] = 'CR-0.75';
  gridB[10][4] = 'CR-0.25';
  gridB[10][5] = 'HR-2';

  const configB: ClashMatrixConfig = {
    sheet: 'LayoutBSheet',
    rowGroupColumnIndex: 2, // C
    rowGroupColumnLetter: 'C',
    columnHeadersRowIndex: 6, // 7
    matrixStartRowIndex: 9, // 10
    matrixStartColumnIndex: 4, // E
    matrixStartColumnLetter: 'E',
    namingFormat: 'group_v_group',
    hardPrefix: 'HR',
    clearancePrefix: 'CR',
    unit: 'M',
    delimiter: '-',
  };

  const resultB = parseClashMatrix(gridB, configB, [], selSetMapEmpty, selSetMapEmpty);
  assert(resultB.clashTests.length === 4, `Layout B produced 4 clash tests (got ${resultB.clashTests.length})`);
  const tB1 = resultB.clashTests.find((t) => t.name === 'ROAD01_v_CIVIL01');
  assert(!!tB1 && tB1.testType === 'hard' && tB1.toleranceFormatted === '1.5000000000', 'Layout B: ROAD01_v_CIVIL01 is hard 1.5000000000');
  const tB2 = resultB.clashTests.find((t) => t.name === 'ROAD01_v_DRAIN01');
  assert(!!tB2 && tB2.testType === 'clearance' && tB2.toleranceFormatted === '0.7500000000', 'Layout B: ROAD01_v_DRAIN01 is clearance 0.7500000000');

  const xmlB = buildNavisworksXml(dummyProjectSettings, [], resultB.clashTests, 'clashTestsOnly');
  assert(xmlB.includes('tolerance="1.5000000000"') && xmlB.includes('tolerance="0.7500000000"'), 'Layout B XML verified');

  console.log('\n--- TEST 4: Layout C (B / 5 / 8 / G with HC/CL/CM/_) ---');

  const gridC: any[][] = Array.from({ length: 15 }, () => Array(12).fill(''));
  // Col G is col 6, Row 5 is row 4
  gridC[4][6] = 'HVAC01';
  gridC[4][7] = 'PLUMB01';
  // Col B is col 1, Row 8 is row 7
  gridC[7][1] = 'ELEC01';
  gridC[8][1] = 'ELEC02';
  // Matrix intersections with underscore delimiter and CM unit:
  gridC[7][6] = 'HC_40'; // 40 cm -> 0.4 m
  gridC[7][7] = 'CL_10'; // 10 cm -> 0.1 m
  gridC[8][6] = 'CL_15'; // 15 cm -> 0.15 m
  gridC[8][7] = 'HC_50'; // 50 cm -> 0.5 m

  const configC: ClashMatrixConfig = {
    sheet: 'LayoutCSheet',
    rowGroupColumnIndex: 1, // B
    rowGroupColumnLetter: 'B',
    columnHeadersRowIndex: 4, // 5
    matrixStartRowIndex: 7, // 8
    matrixStartColumnIndex: 6, // G
    matrixStartColumnLetter: 'G',
    namingFormat: 'group_v_group',
    hardPrefix: 'HC',
    clearancePrefix: 'CL',
    unit: 'CM',
    delimiter: '_',
  };

  const resultC = parseClashMatrix(gridC, configC, [], selSetMapEmpty, selSetMapEmpty);
  assert(resultC.clashTests.length === 4, `Layout C produced 4 clash tests (got ${resultC.clashTests.length})`);
  const tC1 = resultC.clashTests.find((t) => t.name === 'ELEC01_v_HVAC01');
  assert(!!tC1 && tC1.testType === 'hard' && tC1.toleranceFormatted === '0.4000000000', 'Layout C: ELEC01_v_HVAC01 is hard 0.4000000000');
  const tC2 = resultC.clashTests.find((t) => t.name === 'ELEC01_v_PLUMB01');
  assert(!!tC2 && tC2.testType === 'clearance' && tC2.toleranceFormatted === '0.1000000000', 'Layout C: ELEC01_v_PLUMB01 is clearance 0.1000000000');
  const tC3 = resultC.clashTests.find((t) => t.name === 'ELEC02_v_HVAC01');
  assert(!!tC3 && tC3.testType === 'clearance' && tC3.toleranceFormatted === '0.1500000000', 'Layout C: ELEC02_v_HVAC01 is clearance 0.1500000000');

  const xmlC = buildNavisworksXml(dummyProjectSettings, [], resultC.clashTests, 'clashTestsOnly');
  assert(xmlC.includes('test_type="hard"') && xmlC.includes('tolerance="0.4000000000"'), 'Layout C XML verified');
  assert(xmlC.includes('test_type="clearance"') && xmlC.includes('tolerance="0.1000000000"'), 'Layout C XML verified 2');

  // =========================================================================
  // TEST SUITE 3: SINGLE PARSER AUTHORITATIVE BEHAVIOR (Requirement 6)
  // =========================================================================
  console.log('\n--- TEST 5: Single parseClashValue() Authority & No Cross-Pollution ---');

  // Format 1: H / C / MM / -
  const p1 = parseClashValue('H-400', { hardPrefix: 'H', clearancePrefix: 'C', unit: 'MM', delimiter: '-' });
  assert(p1.type === 'hard' && p1.toleranceMeters === 0.4, 'Single parser: H-400 -> 0.4 m');

  // Format 2: HR / CR / M / -
  const p2 = parseClashValue('HR-1', { hardPrefix: 'HR', clearancePrefix: 'CR', unit: 'M', delimiter: '-' });
  assert(p2.type === 'hard' && p2.toleranceMeters === 1.0, 'Single parser: HR-1 -> 1.0 m');

  // Format 3: HC / CL / CM / _
  const p3 = parseClashValue('CL_10', { hardPrefix: 'HC', clearancePrefix: 'CL', unit: 'CM', delimiter: '_' });
  assert(p3.type === 'clearance' && p3.toleranceMeters === 0.1, 'Single parser: CL_10 -> 0.1 m');

  // Strict format enforcement: 'H-400' must NOT parse as valid when format is HR/CR/M/-
  const pInvalidPrefix = parseClashValue('H-400', { hardPrefix: 'HR', clearancePrefix: 'CR', unit: 'M', delimiter: '-' });
  assert(!!pInvalidPrefix.error, 'Strictness: H-400 is rejected when active prefix is HR/CR');

  // Strict delimiter enforcement: 'HC-40' must NOT parse as valid when delimiter is '_'
  const pInvalidDelim = parseClashValue('HC-40', { hardPrefix: 'HC', clearancePrefix: 'CL', unit: 'CM', delimiter: '_' });
  assert(!!pInvalidDelim.error, 'Strictness: HC-40 is rejected when active delimiter is "_"');

  // =========================================================================
  // TEST SUITE 4: NO AUTO-DETECTION & EXPLICIT VALIDATION ERROR (Requirement 3)
  // =========================================================================
  console.log('\n--- TEST 6: No Auto-Detection & Explicit Validation Error ---');

  // If workbook has no data at configured coordinates (e.g. coordinates point to empty rows/cols):
  const emptyGrid: any[][] = Array.from({ length: 20 }, () => Array(10).fill(''));
  const dummyWb: ParsedWorkbook = {
    fileName: 'test_empty.xlsx',
    sheetNames: ['Sheet1'],
    selectedSheet: 'Sheet1',
    sheetsData: { Sheet1: emptyGrid },
    columns: [],
    headerRowIndex: 0,
    totalRows: 20,
    totalCols: 10,
  };

  const validationResult = runFullValidation(
    dummyWb,
    { folderColumnLetter: 'A', folderColumnIndex: 0, nameParts: [], nameSeparator: '-', conditions: [] },
    configAcceptance,
    [],
    [],
    [],
    null,
    [],
    dummyProjectSettings
  );

  const noDataIssue = validationResult.issues.find(
    (i) => i.title === 'Configured matrix layout does not contain valid data.'
  );
  assert(!!noDataIssue, 'Validation reports exact error: "Configured matrix layout does not contain valid data."');
  assert(noDataIssue!.type === 'error', 'Error type is "error"');

  // Verify Matrix Layout Verification is populated in validation result (Requirement 11)
  assert(!!validationResult.matrixLayoutVerification, 'Validation contains matrixLayoutVerification object');
  assert(validationResult.matrixLayoutVerification!.sheet === 'CustomMatrixSheet', 'Verification contains configured sheet');
  assert(validationResult.matrixLayoutVerification!.rowGroupColumnLetter === 'C', 'Verification contains row ID column C');
  assert(validationResult.matrixLayoutVerification!.columnHeadersRowIndex === 6, 'Verification contains header row index 6');
  assert(validationResult.matrixLayoutVerification!.matrixStartRowIndex === 9, 'Verification contains matrix start row index 9');
  assert(validationResult.matrixLayoutVerification!.matrixStartColumnLetter === 'E', 'Verification contains matrix start col E');

  // =========================================================================
  // TEST SUITE 5: PRESERVING ACTIVE CONFIG ON UPDATE EXCEL (Requirement 9)
  // =========================================================================
  console.log('\n--- TEST 7: Preserve Active Config on Update Excel ---');

  const oldWb: ParsedWorkbook = {
    fileName: 'old.xlsx',
    sheetNames: ['CustomMatrixSheet'],
    selectedSheet: 'CustomMatrixSheet',
    sheetsData: { CustomMatrixSheet: gridAcceptance },
    columns: [],
    headerRowIndex: 6,
    totalRows: 15,
    totalCols: 8,
  };

  // Create an updated workbook with an additional row
  const gridUpdated = JSON.parse(JSON.stringify(gridAcceptance));
  gridUpdated.push(Array(8).fill(''));
  gridUpdated[11][2] = 'EL003';
  gridUpdated[11][4] = 'HR-2';

  const newWb: ParsedWorkbook = {
    fileName: 'new.xlsx',
    sheetNames: ['CustomMatrixSheet'],
    selectedSheet: 'CustomMatrixSheet',
    sheetsData: { CustomMatrixSheet: gridUpdated },
    columns: [],
    headerRowIndex: 6,
    totalRows: 16,
    totalCols: 8,
  };

  const updateResult = prepareWorkbookUpdate(
    oldWb,
    newWb,
    { folderColumnLetter: 'A', folderColumnIndex: 0, nameParts: [], nameSeparator: '-', conditions: [] },
    configAcceptance
  );

  // Active matrix configuration must be 100% preserved
  assert(configAcceptance.rowGroupColumnIndex === 2, 'Row group column index preserved');
  assert(configAcceptance.columnHeadersRowIndex === 6, 'Header row index preserved');
  assert(configAcceptance.matrixStartRowIndex === 9, 'Matrix start row index preserved');
  assert(configAcceptance.matrixStartColumnIndex === 4, 'Matrix start column index preserved');
  assert(configAcceptance.hardPrefix === 'HR', 'Hard prefix preserved');
  assert(configAcceptance.unit === 'M', 'Unit M preserved');

  console.log('\n====================================================');
  console.log(`ALL ARBITRARY-LAYOUT TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('====================================================\n');
}

// Execute tests if run via CLI
runArbitraryLayoutAcceptanceTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
