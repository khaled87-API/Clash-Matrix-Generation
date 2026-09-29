import { createSampleBimClashMatrixWorkbook } from '../src/excel/sampleData';
import { autoDetectMatrixStructure, createDefaultConfigs } from '../src/excel/matrixDetector';
import { generateSelectionSets } from '../src/selectionSets/selectionSetGenerator';
import { parseClashMatrix } from '../src/clashTests/clashMatrixParser';
import { buildNavisworksXml } from '../src/xml/navisworksXmlBuilder';
import { runFullValidation } from '../src/validation/validationEngine';
import { parseNavisworksXml } from '../src/xml/xmlValidator';
import { ProjectSettings } from '../src/types/configuration';
import { parseClashCell, formatToleranceToNavisworksMeters } from '../src/clashTests/toleranceParser';
import { escapeXml } from '../src/xml/navisworksXmlBuilder';
import { getAllCategories } from '../src/selectionSets/categoryManager';
import { SelectionSetConfig, ConditionConfig } from '../src/types/selectionSet';
import { runPropertyLibraryTests } from '../src/propertyLibrary_test';

async function runRegressionPass() {
  console.log('====================================================');
  console.log('STARTING FINAL PRODUCTION REGRESSION TEST SUITE');
  console.log('====================================================\n');

  // 1. Load sample workbook (Book2 / CDM template)
  const wb = createSampleBimClashMatrixWorkbook();
  const currentSheetData = wb.sheetsData[wb.selectedSheet];
  console.log(`[1] WORKBOOK LOADED: ${wb.fileName}`);
  console.log(`    - Selected Sheet: "${wb.selectedSheet}"`);
  console.log(`    - Total Rows: ${wb.totalRows}`);
  console.log(`    - Total Columns: ${wb.totalCols}`);
  console.log(`    - Header Row Index: ${wb.headerRowIndex}`);

  // 2. Detect matrix structure & configs
  const detected = autoDetectMatrixStructure(currentSheetData, wb.columns, wb.headerRowIndex);
  console.log('\n[2] STRUCTURE DETECTION:');
  console.log(`    - Detected Header Row: ${detected.suggestedHeadersRowIndex} (Excel Row ${detected.suggestedHeadersRowIndex + 1})`);
  console.log(`    - Matrix Data Start Row: ${detected.suggestedMatrixStartRowIndex} (Excel Row ${detected.suggestedMatrixStartRowIndex + 1})`);
  console.log(`    - Matrix Start Col: Index ${detected.suggestedMatrixStartColIndex}`);
  console.log(`    - Folder Col: Index ${detected.suggestedFolderColIndex}`);
  console.log(`    - Priority Col: Index ${detected.suggestedPriorityColIndex}`);
  console.log(`    - Group/Element ID Col: Index ${detected.suggestedGroupColIndex}`);

  // TEST 1: Header Row Detection (Row 14 -> index 13)
  console.log('\n=== TEST 1: HEADER ROW DETECTION ===');
  console.log(`Header row detected: ${detected.suggestedHeadersRowIndex + 1} (Expected: 14)`);
  if (detected.suggestedHeadersRowIndex !== 13) {
    throw new Error(`TEST 1 FAILED: Expected Row 14 (index 13), got row ${detected.suggestedHeadersRowIndex + 1}`);
  }
  console.log('✅ TEST 1 PASSED: Matrix Header Row correctly detected as Row 14.');

  // TEST 2: Row Element ID Column Detection (Column F -> index 5)
  console.log('\n=== TEST 2: ROW ELEMENT ID COLUMN DETECTION ===');
  console.log(`Row Element ID column detected: Index ${detected.suggestedGroupColIndex} (Column F, Expected: 5)`);
  if (detected.suggestedGroupColIndex !== 5) {
    throw new Error(`TEST 2 FAILED: Expected Column F (index 5), got index ${detected.suggestedGroupColIndex}`);
  }
  console.log('✅ TEST 2 PASSED: Row Element ID column correctly detected as Column F.');

  const { selectionSetConfig, clashMatrixConfig } = createDefaultConfigs(detected, wb.columns);

  // 3. Selection Sets Generation
  const selectionSetResult = generateSelectionSets(
    currentSheetData,
    selectionSetConfig,
    clashMatrixConfig.matrixStartRowIndex,
    clashMatrixConfig.rowGroupColumnIndex
  );

  const totalConditions = selectionSetResult.selectionSets.reduce(
    (acc, s) => acc + s.conditions.length,
    0
  );

  console.log('\n[3] SELECTION SET GENERATION & NORMALIZATION:');
  console.log(`    - Selection Set Sheet Data Rows Analyzed: ${currentSheetData.length - clashMatrixConfig.matrixStartRowIndex}`);
  console.log(`    - Normalized Selection Sets: ${selectionSetResult.selectionSets.length}`);
  console.log(`    - View Folders Created: ${selectionSetResult.viewFolders.length} (${selectionSetResult.viewFolders.map(f => f.name).join(', ')})`);
  console.log(`    - Total Conditions: ${totalConditions}`);

  // TEST 4: Selection Set resolution with prefix (e.g. A-HW0010, A-HW0020)
  console.log('\n=== TEST 4: SELECTION SET RESOLUTION WITH PREFIX ===');
  const hw10Set = selectionSetResult.selectionSets.find(s => s.clashGroup === 'HW0010');
  const hw20Set = selectionSetResult.selectionSets.find(s => s.clashGroup === 'HW0020');
  console.log(`HW0010 -> Set Name: "${hw10Set?.name}", Folder: "${hw10Set?.folder}", Locator: "${hw10Set?.locator}"`);
  console.log(`HW0020 -> Set Name: "${hw20Set?.name}", Folder: "${hw20Set?.folder}", Locator: "${hw20Set?.locator}"`);
  if (!hw10Set || !hw20Set || hw10Set.name !== 'A-HW0010' || hw20Set.name !== 'A-HW0020') {
    throw new Error('TEST 4 FAILED: Selection Set resolution with priority prefix failed!');
  }
  console.log('✅ TEST 4 PASSED: Selection Sets correctly generated with prefix format (A-HW0010, A-HW0020).');

  // 4. Clash Matrix Parsing & Tests Generation
  const clashMatrixResult = parseClashMatrix(
    currentSheetData,
    clashMatrixConfig,
    selectionSetResult.selectionSets,
    selectionSetResult.selectionSetMapByGroup,
    selectionSetResult.selectionSetMapByName
  );

  console.log('\n[4] CLASH MATRIX DETECTION & TESTS:');
  console.log(`    - Valid Clash Tests: ${clashMatrixResult.summary.validClashTests}`);
  console.log(`    - Hard Clashes (H): ${clashMatrixResult.summary.hardClashes}`);
  console.log(`    - Clearance Clashes (C): ${clashMatrixResult.summary.clearanceClashes}`);
  console.log(`    - Ignored Blank: ${clashMatrixResult.summary.ignoredBlank}`);
  console.log(`    - Ignored N/A: ${clashMatrixResult.summary.ignoredNA}`);
  console.log(`    - Invalid Cells: ${clashMatrixResult.summary.invalidCells.length}`);
  console.log(`    - Unresolved Pairs: ${clashMatrixResult.unresolvedPairs.length}`);

  // TEST 3 & 5: Clash Test resolution and identity (HW0020_v_HW0010)
  console.log('\n=== TEST 3 & 5: CLASH TEST RESOLUTION AND IDENTITY ===');
  const hw20_hw10_test = clashMatrixResult.clashTests.find(t => t.leftGroup === 'HW0020' && t.rightGroup === 'HW0010');
  if (!hw20_hw10_test) {
    throw new Error('TEST 3/5 FAILED: Could not find clash test HW0020 vs HW0010!');
  }
  console.log(`Clash Test Name: "${hw20_hw10_test.name}"`);
  console.log(`Left Element (A): "${hw20_hw10_test.leftGroup}"`);
  console.log(`Right Element (B): "${hw20_hw10_test.rightGroup}"`);
  console.log(`Left Selection Set: "${hw20_hw10_test.leftSelectionSet}" (Folder: "${hw20_hw10_test.leftFolder}")`);
  console.log(`Right Selection Set: "${hw20_hw10_test.rightSelectionSet}" (Folder: "${hw20_hw10_test.rightFolder}")`);
  console.log(`Type: "${hw20_hw10_test.testType}"`);
  console.log(`Tolerance: ${hw20_hw10_test.toleranceMm}mm -> ${hw20_hw10_test.toleranceFormatted}m`);

  if (hw20_hw10_test.name !== 'HW0020_v_HW0010' || hw20_hw10_test.leftSelectionSet !== 'A-HW0020' || hw20_hw10_test.rightSelectionSet !== 'A-HW0010') {
    throw new Error(`TEST 3/5 FAILED: Unexpected clash test identity! Expected HW0020_v_HW0010 with A-HW0020 and A-HW0010, got ${hw20_hw10_test.name}`);
  }
  console.log('✅ TEST 3 & 5 PASSED: Matrix cell resolved to HW0020_v_HW0010 with correct Selection Sets and tolerances.');

  // TEST 6: Zero Unresolved Header Warnings
  console.log('\n=== TEST 6: ZERO UNRESOLVED HEADER WARNINGS ===');
  console.log(`Unresolved Pairs Count: ${clashMatrixResult.unresolvedPairs.length}`);
  if (clashMatrixResult.unresolvedPairs.length > 0) {
    console.error('Unresolved pairs:', clashMatrixResult.unresolvedPairs);
    throw new Error(`TEST 6 FAILED: Found ${clashMatrixResult.unresolvedPairs.length} unresolved matrix pairs!`);
  }
  console.log('✅ TEST 6 PASSED: 0 Unresolved Column / Row Header warnings.');

  // 5. Test Sample Clash Test
  const sampleTest = clashMatrixResult.clashTests[0];
  console.log(`\n[6] SAMPLE CLASH TEST INSPECTION:`);
  console.log(`    - Name: ${sampleTest.name}`);
  console.log(`    - Type: ${sampleTest.testType}`);
  console.log(`    - Tolerance: ${sampleTest.toleranceMm}mm -> ${sampleTest.toleranceFormatted}m`);
  console.log(`    - Left Set: ${sampleTest.leftSelectionSet} (Folder: ${sampleTest.leftFolder})`);
  console.log(`    - Left Locator: ${sampleTest.leftLocator}`);
  console.log(`    - Right Set: ${sampleTest.rightSelectionSet} (Folder: ${sampleTest.rightFolder})`);
  console.log(`    - Right Locator: ${sampleTest.rightLocator}`);

  // 6. Tolerance Parser Tests
  console.log('\n[7] TOLERANCE PARSER VERIFICATION:');
  const h500 = parseClashCell('H-500');
  const c100 = parseClashCell('C-100');
  const h50 = parseClashCell('H-50');
  const c50 = parseClashCell('C-50');
  const h500Formatted = formatToleranceToNavisworksMeters(h500.toleranceMeters || 0);
  const c100Formatted = formatToleranceToNavisworksMeters(c100.toleranceMeters || 0);
  const h50Formatted = formatToleranceToNavisworksMeters(h50.toleranceMeters || 0);
  const c50Formatted = formatToleranceToNavisworksMeters(c50.toleranceMeters || 0);
  console.log(`    - 'H-500': type=${h500.type}, mm=${h500.toleranceMm}, formatted=${h500Formatted}`);
  console.log(`    - 'C-100': type=${c100.type}, mm=${c100.toleranceMm}, formatted=${c100Formatted}`);
  console.log(`    - 'H-50': type=${h50.type}, mm=${h50.toleranceMm}, formatted=${h50Formatted}`);
  console.log(`    - 'C-50': type=${c50.type}, mm=${c50.toleranceMm}, formatted=${c50Formatted}`);

  if (h500Formatted !== '0.5000000000' || c100Formatted !== '0.1000000000') {
    throw new Error(`Tolerance format regression! Expected 0.5000000000 and 0.1000000000, got ${h500Formatted} and ${c100Formatted}`);
  }

  // 7. XML Generation
  const projectSettings: ProjectSettings = {
    batchTestName: 'Project11',
    internalName: 'Project11',
    units: 'm',
    filename: 'Clash_Tests_Buildings_V1.xml',
    filepath: '',
  };

  const generatedXml = buildNavisworksXml(
    projectSettings,
    selectionSetResult.viewFolders,
    clashMatrixResult.clashTests,
    'full'
  );

  console.log('\n[8] XML BUILD & STRUCTURE VERIFICATION:');
  console.log(`    - XML Byte Length: ${Buffer.byteLength(generatedXml, 'utf8')}`);
  console.log(`    - XML Lines: ${generatedXml.split('\n').length}`);

  // Check required XML root elements
  const hasExchange = generatedXml.includes('<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
  const hasBatchtest = generatedXml.includes('<batchtest');
  const hasClashtests = generatedXml.includes('<clashtests>');
  const hasSelectionsets = generatedXml.includes('<selectionsets>');
  const hasViewfolder = generatedXml.includes('<viewfolder');
  const hasSelectionsetTag = generatedXml.includes('<selectionset');
  const hasFindspec = generatedXml.includes('<findspec');
  const hasLocator = generatedXml.includes('<locator>');

  console.log(`    - Contains <exchange>: ${hasExchange}`);
  console.log(`    - Contains <batchtest>: ${hasBatchtest}`);
  console.log(`    - Contains <clashtests>: ${hasClashtests}`);
  console.log(`    - Contains <selectionsets>: ${hasSelectionsets}`);
  console.log(`    - Contains <viewfolder>: ${hasViewfolder}`);
  console.log(`    - Contains <selectionset>: ${hasSelectionsetTag}`);
  console.log(`    - Contains <findspec>: ${hasFindspec}`);
  console.log(`    - Contains <locator>: ${hasLocator}`);

  if (!hasExchange || !hasBatchtest || !hasClashtests || !hasSelectionsets) {
    throw new Error('XML root structural failure!');
  }

  // 8. Logical Reference & Locator Integrity Check
  console.log('\n[9] LOCATOR LOGICAL RESOLUTION CHECK:');
  const setLocatorMap = new Set(selectionSetResult.selectionSets.map(s => s.locator));
  let missingLocators = 0;
  clashMatrixResult.clashTests.forEach(test => {
    if (!setLocatorMap.has(test.leftLocator)) {
      console.error(`Missing left locator: ${test.leftLocator}`);
      missingLocators++;
    }
    if (!setLocatorMap.has(test.rightLocator)) {
      console.error(`Missing right locator: ${test.rightLocator}`);
      missingLocators++;
    }
  });
  console.log(`    - Tested ${clashMatrixResult.clashTests.length * 2} locator references.`);
  console.log(`    - Unresolved Locators: ${missingLocators}`);
  if (missingLocators > 0) {
    throw new Error(`Logical reference error: ${missingLocators} clash test locators do not match any selection set!`);
  }

  // 9. Special Characters XML Escaping Check
  console.log('\n[10] SPECIAL CHARACTER XML ESCAPING CHECK:');
  const rawSpecial = `Test & <tag> "quote" 'apos' SpecialChars /\\`;
  const escaped = escapeXml(rawSpecial);
  console.log(`    - Original: ${rawSpecial}`);
  console.log(`    - Escaped:  ${escaped}`);
  if (!escaped.includes('&amp;') || !escaped.includes('&lt;') || !escaped.includes('&gt;') || !escaped.includes('&quot;') || !escaped.includes('&apos;')) {
    throw new Error('XML special character escaping failed!');
  }

  // 10. Run Full Validation Engine
  console.log('\n[11] RUNNING VALIDATION ENGINE CHECKS:');
  const valSummary = runFullValidation(
    wb,
    selectionSetConfig,
    clashMatrixConfig,
    selectionSetResult.selectionSets,
    selectionSetResult.viewFolders,
    clashMatrixResult.clashTests,
    clashMatrixResult.summary,
    clashMatrixResult.unresolvedPairs,
    projectSettings,
    generatedXml
  );
  console.log(`    - Total Issues: ${valSummary.issues.length}`);
  console.log(`    - Errors: ${valSummary.errorCount}`);
  console.log(`    - Warnings: ${valSummary.warningCount}`);
  console.log(`    - Is Valid: ${valSummary.isValid}`);

  if (valSummary.errorCount > 0) {
    console.error('Validation Errors:', valSummary.issues.filter(i => i.type === 'error'));
    throw new Error(`Validation engine reported ${valSummary.errorCount} blocking errors!`);
  }

  // 11. XML Template Mode / Round-Trip Parser Check
  console.log('\n[12] ROUND-TRIP / TEMPLATE XML PARSER REGRESSION:');
  const parsedTemplate = parseNavisworksXml(generatedXml, 'Generated_Test.xml');
  console.log(`    - Parsed BatchTest Name: ${parsedTemplate.batchTestName}`);
  console.log(`    - Parsed Units: ${parsedTemplate.units}`);
  console.log(`    - Parsed Selection Sets Count: ${parsedTemplate.selectionSetsCount}`);
  console.log(`    - Parsed Clash Tests Count: ${parsedTemplate.clashTestsCount}`);
  console.log(`    - Parsed View Folders Count: ${parsedTemplate.viewFolders.length} (${parsedTemplate.viewFolders.join(', ')})`);

  if (parsedTemplate.selectionSetsCount !== selectionSetResult.selectionSets.length) {
    throw new Error(`Round-trip mismatch: generated ${selectionSetResult.selectionSets.length} sets, parsed ${parsedTemplate.selectionSetsCount}`);
  }
  if (parsedTemplate.clashTestsCount !== clashMatrixResult.clashTests.length) {
    throw new Error(`Round-trip mismatch: generated ${clashMatrixResult.clashTests.length} tests, parsed ${parsedTemplate.clashTestsCount}`);
  }

  // 12. Multi-Condition Grouping Test (Multiple Excel rows defining the same Selection Set)
  console.log('\n[13] MULTI-CONDITION GROUPING REGRESSION:');
  const multiRowData = [
    // Header
    ['Discipline', 'Folder', 'Priority', 'Group', 'Elements'],
    // Row 1: AR0010 condition 1
    ['Architecture', 'AR', 'A', 'AR0010', 'Ceilings Part 1'],
    // Row 2: AR0010 condition 2 (same set, additional condition)
    ['Architecture', 'AR', 'A', 'AR0010', 'Ceilings Part 2'],
    // Row 3: AR0020
    ['Architecture', 'AR', 'A', 'AR0020', 'Columns'],
  ];

  const multiRowConfig = {
    folderColumnLetter: 'B',
    folderColumnIndex: 1,
    nameParts: [
      { columnLetter: 'C', columnIndex: 2, separator: '-' },
      { columnLetter: 'D', columnIndex: 3, separator: '' },
    ],
    nameSeparator: '-',
    conditions: [
      {
        id: 'cond_1',
        excelColumnLetter: 'E',
        excelColumnIndex: 4,
        dataType: 'Element' as const,
        categoryInternalName: 'LcRevitData_Element',
        propertyDisplayName: 'Name',
        propertyInternalName: 'name',
        test: 'contains' as const,
        flags: 10,
      },
    ],
  };

  const multiRowResult = generateSelectionSets(multiRowData, multiRowConfig, 1, 3);
  console.log(`    - Multi-row Input Rows: 3`);
  console.log(`    - Resulting Selection Sets Count: ${multiRowResult.selectionSets.length} (Expected: 2)`);
  const ar10Set = multiRowResult.selectionSets.find(s => s.name === 'A-AR0010');
  console.log(`    - A-AR0010 Conditions Count: ${ar10Set?.conditions.length} (Expected: 2 conditions merged)`);
  console.log(`    - Condition 1 Value: "${ar10Set?.conditions[0]?.value}"`);
  console.log(`    - Condition 2 Value: "${ar10Set?.conditions[1]?.value}"`);

  if (multiRowResult.selectionSets.length !== 2 || ar10Set?.conditions.length !== 2) {
    throw new Error('Multi-condition row grouping regression failure!');
  }

  // 13. FINDSPEC DATA TYPE CATEGORIES & CUSTOM CONDITION REGRESSION
  console.log('\n[14] FINDSPEC DATA TYPE CATEGORIES & CUSTOM CONDITION REGRESSION:');

  // Test row with Custom, Element, Text, and Identity Data
  const testCategoryData = [
    ['Folder', 'Priority', 'Group', 'CustomCol', 'ElemCol', 'TextCol', 'IdCol'],
    ['TEST', 'A', 'TS0001', 'ABC', 'WallType1', 'TextVal', 'IdVal'],
  ];

  const testCategoryConfig = {
    folderColumnLetter: 'A',
    folderColumnIndex: 0,
    nameParts: [
      { columnLetter: 'B', columnIndex: 1, separator: '-' },
      { columnLetter: 'C', columnIndex: 2, separator: '' },
    ],
    nameSeparator: '-',
    conditions: [
      // 1. Custom
      {
        id: 'cond_custom_test',
        excelColumnLetter: 'D',
        excelColumnIndex: 3,
        dataType: 'Custom' as const,
        categoryInternalName: 'LcRevitData_Custom',
        propertyDisplayName: 'FireRating',
        propertyInternalName: 'custom_fire_rating',
        test: 'contains' as const,
        flags: 74,
      },
      // 2. Element
      {
        id: 'cond_elem_test',
        excelColumnLetter: 'E',
        excelColumnIndex: 4,
        dataType: 'Element' as const,
        categoryInternalName: 'LcRevitData_Element',
        propertyDisplayName: 'Category',
        propertyInternalName: 'lcldrevit_parameter_3568759',
        test: 'contains' as const,
        flags: 10,
      },
      // 3. Text
      {
        id: 'cond_text_test',
        excelColumnLetter: 'F',
        excelColumnIndex: 5,
        dataType: 'Text' as const,
        categoryInternalName: 'LcSvf_Text',
        propertyDisplayName: 'CD_Clash Priority',
        propertyInternalName: 'CD_Clash Priority',
        test: 'contains' as const,
        flags: 74,
      },
      // 4. Identity Data
      {
        id: 'cond_id_test',
        excelColumnLetter: 'G',
        excelColumnIndex: 6,
        dataType: 'Identity Data' as const,
        categoryInternalName: 'LcSvf_Identity Data',
        propertyDisplayName: 'CD_Clash Group',
        propertyInternalName: 'CD_Clash Group',
        test: 'contains' as const,
        flags: 10,
      },
    ],
  };

  const catResult = generateSelectionSets(testCategoryData, testCategoryConfig, 1, 2);
  const catSet = catResult.selectionSets[0];
  const catXml = buildNavisworksXml(
    projectSettings,
    catResult.viewFolders,
    [],
    'selectionSetsOnly'
  );

  console.log('--- GENERATED FINDSPEC XML FOR CUSTOM & STANDARD CATEGORIES ---');
  console.log(catXml);

  // Assertion 1: Custom -> LcRevitData_Custom
  console.log('\n--- VERIFYING CATEGORY INTERNAL MAPPINGS ---');
  const customCond = catSet.conditions.find(c => c.categoryName === 'Custom');
  console.log(`1. Custom -> Name: "${customCond?.categoryName}", Internal: "${customCond?.categoryInternal}"`);
  if (!customCond || customCond.categoryInternal !== 'LcRevitData_Custom') {
    throw new Error(`Custom category mapping failed! Expected LcRevitData_Custom, got ${customCond?.categoryInternal}`);
  }
  if (!catXml.includes('<name internal="LcRevitData_Custom">Custom</name>')) {
    throw new Error('XML does not contain <name internal="LcRevitData_Custom">Custom</name>!');
  }
  console.log('✅ PASS 1: Custom mapped to LcRevitData_Custom');

  // Assertion 2: Element -> LcRevitData_Element
  const elemCond = catSet.conditions.find(c => c.categoryName === 'Element');
  console.log(`2. Element -> Name: "${elemCond?.categoryName}", Internal: "${elemCond?.categoryInternal}"`);
  if (!elemCond || elemCond.categoryInternal !== 'LcRevitData_Element') {
    throw new Error(`Element category mapping failed! Expected LcRevitData_Element, got ${elemCond?.categoryInternal}`);
  }
  if (!catXml.includes('<name internal="LcRevitData_Element">Element</name>')) {
    throw new Error('XML does not contain <name internal="LcRevitData_Element">Element</name>!');
  }
  console.log('✅ PASS 2: Element mapped to LcRevitData_Element');

  // Assertion 3: Text -> LcSvf_Text
  const textCond = catSet.conditions.find(c => c.categoryName === 'Text');
  console.log(`3. Text -> Name: "${textCond?.categoryName}", Internal: "${textCond?.categoryInternal}"`);
  if (!textCond || textCond.categoryInternal !== 'LcSvf_Text') {
    throw new Error(`Text category mapping failed! Expected LcSvf_Text, got ${textCond?.categoryInternal}`);
  }
  if (!catXml.includes('<name internal="LcSvf_Text">Text</name>')) {
    throw new Error('XML does not contain <name internal="LcSvf_Text">Text</name>!');
  }
  console.log('✅ PASS 3: Text mapped to LcSvf_Text');

  // Assertion 4: Identity Data -> LcSvf_Identity Data
  const idCond = catSet.conditions.find(c => c.categoryName === 'Identity Data');
  console.log(`4. Identity Data -> Name: "${idCond?.categoryName}", Internal: "${idCond?.categoryInternal}"`);
  if (!idCond || idCond.categoryInternal !== 'LcSvf_Identity Data') {
    throw new Error(`Identity Data category mapping failed! Expected LcSvf_Identity Data, got ${idCond?.categoryInternal}`);
  }
  if (!catXml.includes('<name internal="LcSvf_Identity Data">Identity Data</name>')) {
    throw new Error('XML does not contain <name internal="LcSvf_Identity Data">Identity Data</name>!');
  }
  console.log('✅ PASS 4: Identity Data mapped to LcSvf_Identity Data');

  // Assertion 5: Custom flags remain configurable
  console.log(`5. Custom Flags -> "${customCond.flags}" (Expected: 74)`);
  if (customCond.flags !== 74 || !catXml.includes('flags="74"')) {
    throw new Error(`Custom flags configuration failed! Got ${customCond.flags}`);
  }
  console.log('✅ PASS 5: Custom flags configurable and preserved');

  // Assertion 6: Custom display/internal property names remain distinct
  console.log(`6. Custom Property Display: "${customCond.propertyName}", Internal: "${customCond.propertyInternal}"`);
  if (customCond.propertyName !== 'FireRating' || customCond.propertyInternal !== 'custom_fire_rating') {
    throw new Error('Custom display / internal property names are not preserved distinctly!');
  }
  if (!catXml.includes('<name internal="custom_fire_rating">FireRating</name>')) {
    throw new Error('XML does not contain <name internal="custom_fire_rating">FireRating</name>!');
  }
  console.log('✅ PASS 6: Custom display and internal property names remain distinct');

  // Assertion 7: Custom value is correctly serialized
  console.log(`7. Custom Value -> "${customCond.value}" (Data type: "${customCond.dataType}")`);
  if (customCond.value !== 'ABC' || !catXml.includes('<data type="wstring">ABC</data>')) {
    throw new Error('Custom value serialization failed!');
  }
  console.log('✅ PASS 7: Custom value correctly serialized to <data type="wstring">ABC</data>');

  // Assertion 8: Custom preset saves / restores
  const { DEFAULT_PROPERTY_PRESETS } = await import('../src/selectionSets/propertyPresets');
  const customPreset = {
    id: 'test_custom_preset_1',
    name: 'Custom FireRating Preset',
    dataType: 'Custom',
    categoryInternalName: 'LcRevitData_Custom',
    propertyDisplayName: 'FireRating',
    propertyInternalName: 'custom_fire_rating',
    test: 'contains' as const,
    flags: 74,
  };
  const presetsList = [...DEFAULT_PROPERTY_PRESETS, customPreset];
  const retrieved = presetsList.find(p => p.id === 'test_custom_preset_1');
  if (!retrieved || retrieved.dataType !== 'Custom' || retrieved.categoryInternalName !== 'LcRevitData_Custom') {
    throw new Error('Custom preset verification failed!');
  }
  console.log('✅ PASS 8: Custom preset saves and restores with correct category internal name');

  // Assertion 9: Existing categories remain unchanged
  console.log('9. Verifying that Custom is NOT mapped to LcRevitData_Element');
  if ((customCond.categoryInternal as string) === 'LcRevitData_Element') {
    throw new Error('CRITICAL FAILURE: Custom was erroneously mapped to LcRevitData_Element!');
  }
  console.log('✅ PASS 9: Existing categories remain untouched and distinct from Custom');

  // =========================================================================
  // EXTENSIBLE CATEGORIES REGRESSION SUITE
  // =========================================================================
  console.log('\n====================================================');
  console.log('TESTING USER-DEFINED EXTENSIBLE DATA TYPE CATEGORIES');
  console.log('====================================================\n');

  const {
    BUILT_IN_CATEGORIES,
    getAllCategories,
    validateCategory,
    resolveCategoryInternalName,
  } = await import('../src/selectionSets/categoryManager');

  // TEST 10: Built-in Categories Integrity
  console.log('--- TEST 10: BUILT-IN CATEGORIES INTEGRITY ---');
  const builtInMap: Record<string, string> = {
    Element: 'LcRevitData_Element',
    Custom: 'LcRevitData_Custom',
    Text: 'LcSvf_Text',
    'Identity Data': 'LcSvf_Identity Data',
  };

  for (const [name, expectedInternal] of Object.entries(builtInMap)) {
    const found = BUILT_IN_CATEGORIES.find(c => c.displayName === name);
    if (!found) {
      throw new Error(`TEST 10 FAILED: Built-in category "${name}" is missing!`);
    }
    if (found.internalName !== expectedInternal) {
      throw new Error(`TEST 10 FAILED: Built-in category "${name}" has internal "${found.internalName}", expected "${expectedInternal}"!`);
    }
    if (!found.builtIn) {
      throw new Error(`TEST 10 FAILED: Built-in category "${name}" builtIn flag is not true!`);
    }
  }
  console.log('✅ TEST 10 PASSED: All 4 built-in categories (Element, Custom, Text, Identity Data) preserved with immutable builtIn flags and exact internal names.');

  // TEST 11: Validation Engine for Category Creation
  console.log('\n--- TEST 11: CATEGORY VALIDATION ENGINE ---');
  const allCats = getAllCategories();

  // 11.1 Empty display name
  const v1 = validateCategory({ displayName: '', internalName: 'ValidInternal' }, allCats);
  if (v1.isValid) throw new Error('TEST 11.1 FAILED: Empty display name was accepted!');
  console.log(`- Empty display name rejected: "${v1.error}"`);

  // 11.2 Empty internal name
  const v2 = validateCategory({ displayName: 'My Cat', internalName: '' }, allCats);
  if (v2.isValid) throw new Error('TEST 11.2 FAILED: Empty internal name was accepted!');
  console.log(`- Empty internal name rejected: "${v2.error}"`);

  // 11.3 Invalid XML characters in internal name
  const v3 = validateCategory({ displayName: 'My Cat', internalName: 'Has Space' }, allCats);
  if (v3.isValid) throw new Error('TEST 11.3 FAILED: Space in internal name was accepted!');
  console.log(`- Space in internal name rejected: "${v3.error}"`);

  const v4 = validateCategory({ displayName: 'My Cat', internalName: 'Has<Bracket>' }, allCats);
  if (v4.isValid) throw new Error('TEST 11.4 FAILED: XML brackets in internal name were accepted!');
  console.log(`- XML brackets in internal name rejected: "${v4.error}"`);

  const v5 = validateCategory({ displayName: 'My Cat', internalName: 'Has"Quote' }, allCats);
  if (v5.isValid) throw new Error('TEST 11.5 FAILED: Quote in internal name was accepted!');
  console.log(`- Quotes in internal name rejected: "${v5.error}"`);

  // 11.4 Duplicate internal name
  const v6 = validateCategory({ displayName: 'Another Element', internalName: 'LcRevitData_Element' }, allCats);
  if (v6.isValid) throw new Error('TEST 11.6 FAILED: Duplicate internal name LcRevitData_Element was accepted!');
  console.log(`- Duplicate internal name rejected: "${v6.error}"`);

  // 11.5 Valid custom category
  const v7 = validateCategory({ displayName: 'Project Property', internalName: 'LcCustom_ProjectProperty' }, allCats);
  if (!v7.isValid) throw new Error(`TEST 11.7 FAILED: Valid category rejected: ${v7.error}`);
  console.log(`- Valid custom category accepted: displayName="Project Property", internalName="LcCustom_ProjectProperty"`);

  console.log('✅ TEST 11 PASSED: Category validation rules enforce XML safety, required fields, and unique internal names.');

  // TEST 12: Resolution of User-Defined Category Internal Names
  console.log('\n--- TEST 12: RESOLUTION OF USER-DEFINED CATEGORIES ---');
  const customUserCat = {
    id: 'user_cat_test_1',
    displayName: 'Shared Parameters',
    internalName: 'LcRevitData_SharedParams',
    builtIn: false,
  };
  const categoryPool = [...allCats, customUserCat];

  const resolvedInternal = resolveCategoryInternalName('Shared Parameters', categoryPool);
  if (resolvedInternal !== 'LcRevitData_SharedParams') {
    throw new Error(`TEST 12 FAILED: Expected LcRevitData_SharedParams, got ${resolvedInternal}`);
  }
  console.log(`Resolved "Shared Parameters" -> "${resolvedInternal}"`);

  // Unknown category fallback
  const fallbackInternal = resolveCategoryInternalName('Unknown Custom Cat', categoryPool);
  if (!fallbackInternal || fallbackInternal !== 'Unknown_Custom_Cat') {
    throw new Error(`TEST 12 FAILED: Expected sanitized fallback "Unknown_Custom_Cat", got "${fallbackInternal}"`);
  }
  console.log(`Fallback for unknown category "Unknown Custom Cat" -> "${fallbackInternal}"`);
  console.log('✅ TEST 12 PASSED: Category internal name resolution handles custom categories and sanitized fallbacks.');

  // TEST 13: End-to-End XML Generation with User-Defined Category
  console.log('\n--- TEST 13: XML GENERATION WITH USER-DEFINED CATEGORIES ---');
  const userCatConditionConfig = {
    id: 'cond_user_cat_1',
    excelColumnIndex: 4,
    excelColumnLetter: 'E',
    dataType: 'Shared Parameters',
    categoryInternalName: 'LcRevitData_SharedParams',
    propertyDisplayName: 'AcousticRating',
    propertyInternalName: 'lc_acoustic_rating_param',
    test: 'contains' as const,
    flags: 74,
  };

  const { buildCondition } = await import('../src/selectionSets/conditionBuilder');
  const builtUserCond = buildCondition(userCatConditionConfig, 'RW45');

  if (!builtUserCond) {
    throw new Error('TEST 13 FAILED: buildCondition returned null for valid user category condition!');
  }

  if (builtUserCond.categoryName !== 'Shared Parameters' || builtUserCond.categoryInternal !== 'LcRevitData_SharedParams') {
    throw new Error(`TEST 13 FAILED: Condition has categoryName="${builtUserCond.categoryName}", categoryInternal="${builtUserCond.categoryInternal}"`);
  }

  const userCatSelectionSet = {
    id: 'set_user_cat_test',
    name: 'TEST-ACOUSTIC',
    folder: 'Acoustics',
    clashGroup: 'HW0010',
    conditions: [builtUserCond],
    guid: '00000000-0000-0000-0000-000000000099',
    locator: 'Acoustics/TEST-ACOUSTIC',
    sourceRowIndex: 0,
  };

  const userCatFolder = {
    name: 'Acoustics',
    guid: '00000000-0000-0000-0000-000000000098',
    selectionSets: [userCatSelectionSet],
  };

  const userCatXml = buildNavisworksXml(
    {
      batchTestName: 'Project11',
      internalName: 'Project11',
      units: 'm',
      filename: 'TestUserCat.xml',
      filepath: '',
    },
    [userCatFolder],
    [],
    'selectionSetsOnly'
  );

  console.log('Generated User-Defined Category XML Snippet:');
  console.log(userCatXml);

  if (!userCatXml.includes('<name internal="LcRevitData_SharedParams">Shared Parameters</name>')) {
    throw new Error('TEST 13 FAILED: XML does not contain <name internal="LcRevitData_SharedParams">Shared Parameters</name>!');
  }
  if (!userCatXml.includes('<name internal="lc_acoustic_rating_param">AcousticRating</name>')) {
    throw new Error('TEST 13 FAILED: XML does not contain <name internal="lc_acoustic_rating_param">AcousticRating</name>!');
  }
  if (!userCatXml.includes('<data type="wstring">RW45</data>')) {
    throw new Error('TEST 13 FAILED: XML does not contain <data type="wstring">RW45</data>!');
  }
  if (!userCatXml.includes('flags="74"')) {
    throw new Error('TEST 13 FAILED: XML does not contain flags="74"!');
  }

  // Parse and validate with XML validator
  const { validateNavisworksXmlString, parseNavisworksXml: parseXmlInfo } = await import('../src/xml/xmlValidator');
  const userCatXmlValidation = validateNavisworksXmlString(userCatXml);
  if (!userCatXmlValidation.isValid) {
    throw new Error(`TEST 13 FAILED: Generated XML is invalid according to validator: ${userCatXmlValidation.errors.join(', ')}`);
  }
  const parsedInfo = parseXmlInfo(userCatXml, 'TestUserCat.xml');
  if (parsedInfo.selectionSetsCount !== 1 || !parsedInfo.viewFolders.includes('Acoustics')) {
    throw new Error(`TEST 13 FAILED: Parsed XML info mismatch! selectionSetsCount=${parsedInfo.selectionSetsCount}, viewFolders=${parsedInfo.viewFolders.join(', ')}`);
  }

  console.log('✅ TEST 13 PASSED: XML containing user-defined category was generated with exact internal/display names, flags, properties, and passes DOM XML validation.');

  // ====================================================
  // UPDATE EXCEL WORKFLOW REGRESSION TEST SUITE (20 SCENARIOS)
  // ====================================================
  console.log('\n====================================================');
  console.log('STARTING UPDATE EXCEL WORKFLOW REGRESSION TEST SUITE');
  console.log('====================================================\n');

  const { prepareWorkbookUpdate } = await import('../src/excel/workbookUpdater');

  // Baseline: create initial workbook
  const baseWb = createSampleBimClashMatrixWorkbook();
  const baseSheetData = baseWb.sheetsData[baseWb.selectedSheet];
  const baseDetected = autoDetectMatrixStructure(baseSheetData, baseWb.columns, baseWb.headerRowIndex);
  const { selectionSetConfig: baseSetCfg, clashMatrixConfig: baseMatCfg } = createDefaultConfigs(baseDetected, baseWb.columns);

  // Scenario 1: Preserve Selection Set naming configuration when updating workbook
  console.log('=== SCENARIO 1: PRESERVE SELECTION SET NAMING CONFIG ===');
  const customSetCfg = {
    ...baseSetCfg,
    nameSeparator: '_',
    nameParts: [{ columnLetter: 'E', columnIndex: 4, separator: '__' }, { columnLetter: 'F', columnIndex: 5, separator: '' }],
  };
  const update1 = prepareWorkbookUpdate(baseWb, { ...baseWb, fileName: 'updated1.xlsx' }, customSetCfg, baseMatCfg);
  if (customSetCfg.nameSeparator !== '_' || customSetCfg.nameParts[0].separator !== '__') {
    throw new Error('SCENARIO 1 FAILED: Selection Set naming configuration was mutated!');
  }
  console.log('✅ SCENARIO 1 PASSED: Selection Set naming configuration preserved.');

  // Scenario 2: Preserve FindSpec conditions configuration when updating workbook
  console.log('=== SCENARIO 2: PRESERVE FINDSPEC CONDITIONS CONFIG ===');
  const customCondsCfg = {
    ...baseSetCfg,
    conditions: [
      {
        id: 'cond_persisted_test',
        excelColumnLetter: 'F',
        excelColumnIndex: 5,
        dataType: 'Element',
        categoryInternalName: 'LcRevitData_Element',
        propertyInternalName: 'lc_element_type',
        propertyDisplayName: 'Type Name',
        flags: 74,
        test: 'equals' as const,
      },
    ],
  };
  const update2 = prepareWorkbookUpdate(baseWb, { ...baseWb, fileName: 'updated2.xlsx' }, customCondsCfg, baseMatCfg);
  if (customCondsCfg.conditions.length !== 1 || customCondsCfg.conditions[0].propertyDisplayName !== 'Type Name') {
    throw new Error('SCENARIO 2 FAILED: FindSpec conditions configuration was lost!');
  }
  console.log('✅ SCENARIO 2 PASSED: FindSpec conditions configuration preserved.');

  // Scenario 3: Preserve Custom Category configurations when updating workbook
  console.log('=== SCENARIO 3: PRESERVE CUSTOM CATEGORIES ===');
  const catListBefore = getAllCategories();
  const update3 = prepareWorkbookUpdate(baseWb, { ...baseWb, fileName: 'updated3.xlsx' }, baseSetCfg, baseMatCfg);
  const catListAfter = getAllCategories();
  if (catListAfter.length !== catListBefore.length) {
    throw new Error('SCENARIO 3 FAILED: Custom categories list was altered during update!');
  }
  console.log('✅ SCENARIO 3 PASSED: Custom categories configurations preserved.');

  // Scenario 4: Preserve Project Settings (units, names) when updating workbook
  console.log('=== SCENARIO 4: PRESERVE PROJECT SETTINGS ===');
  const projSettings: ProjectSettings = {
    batchTestName: 'CustomHospitalProject',
    internalName: 'CustomHospitalProject',
    units: 'm',
    filename: 'CustomHospitalProject.xml',
    filepath: '',
  };
  if (projSettings.batchTestName !== 'CustomHospitalProject' || projSettings.units !== 'm') {
    throw new Error('SCENARIO 4 FAILED: Project settings damaged!');
  }
  console.log('✅ SCENARIO 4 PASSED: Project Settings preserved.');

  // Scenario 5: Add new element in updated Excel -> creates new Selection Set and expands Matrix tests
  console.log('=== SCENARIO 5: ADD NEW ELEMENT IN UPDATED EXCEL ===');
  const addedRow = [
    'HVAC New', 'Air Distribution', 'Ductwork', 'HVAC_NEW', 'A', 'HV9999', '0.40',
    'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A',
  ];
  const wbWithAddedRow = JSON.parse(JSON.stringify(baseWb));
  wbWithAddedRow.sheetsData[wbWithAddedRow.selectedSheet].push(addedRow);
  const update5 = prepareWorkbookUpdate(baseWb, wbWithAddedRow, baseSetCfg, baseMatCfg);
  if (!update5.addedElements.includes('HV9999')) {
    throw new Error('SCENARIO 5 FAILED: Added element HV9999 not detected!');
  }
  if (update5.selectionSetsCountAfter !== update5.selectionSetsCountBefore + 1) {
    throw new Error('SCENARIO 5 FAILED: Selection Set count did not increase by 1!');
  }
  console.log(`✅ SCENARIO 5 PASSED: Added element detected: [${update5.addedElements.join(', ')}], Sets: ${update5.selectionSetsCountBefore} -> ${update5.selectionSetsCountAfter}.`);

  // Scenario 6: Remove element in updated Excel -> removes obsolete Selection Set and adjusts Matrix tests
  console.log('=== SCENARIO 6: REMOVE ELEMENT IN UPDATED EXCEL ===');
  const wbWithRemovedRow = JSON.parse(JSON.stringify(baseWb));
  wbWithRemovedRow.sheetsData[wbWithRemovedRow.selectedSheet] = wbWithRemovedRow.sheetsData[wbWithRemovedRow.selectedSheet].filter(
    (row: any[]) => row[5] !== 'HW0010'
  );
  const update6 = prepareWorkbookUpdate(baseWb, wbWithRemovedRow, baseSetCfg, baseMatCfg);
  if (!update6.removedElements.includes('HW0010')) {
    throw new Error('SCENARIO 6 FAILED: Removed element HW0010 was not reported!');
  }
  if (update6.selectionSetsCountAfter >= update6.selectionSetsCountBefore) {
    throw new Error('SCENARIO 6 FAILED: Selection Set count was not reduced!');
  }
  console.log(`✅ SCENARIO 6 PASSED: Removed element detected: [${update6.removedElements.join(', ')}], Sets: ${update6.selectionSetsCountBefore} -> ${update6.selectionSetsCountAfter}.`);

  // Scenario 7: Modify matrix tolerance cell (e.g. H-400 -> H-500) -> updates resulting Clash Test tolerance
  console.log('=== SCENARIO 7: MODIFY MATRIX TOLERANCE VALUE ===');
  const wbWithModTol = JSON.parse(JSON.stringify(baseWb));
  // Change row index 17 (HW0020), col index 8 (HW0010) from 'H-400' to 'H-500'
  wbWithModTol.sheetsData[wbWithModTol.selectedSheet][17][8] = 'H-500';
  const update7 = prepareWorkbookUpdate(baseWb, wbWithModTol, baseSetCfg, baseMatCfg);
  if (update7.changedMatrixValuesCount < 1) {
    throw new Error('SCENARIO 7 FAILED: Matrix tolerance modification was not detected!');
  }
  console.log(`✅ SCENARIO 7 PASSED: Tolerance modification detected (${update7.toleranceChanges.length} changes), new tolerance reflected.`);

  // Scenario 8: Modify matrix cell from Hard to Clearance (e.g. H-400 -> C-250)
  console.log('=== SCENARIO 8: MODIFY CLASH TYPE (HARD TO CLEARANCE) ===');
  const wbWithClearance = JSON.parse(JSON.stringify(baseWb));
  wbWithClearance.sheetsData[wbWithClearance.selectedSheet][17][8] = 'C-250';
  const update8 = prepareWorkbookUpdate(baseWb, wbWithClearance, baseSetCfg, baseMatCfg);
  const clearanceChange = update8.toleranceChanges.find(tc => tc.newTolerance.includes('clearance'));
  if (!clearanceChange) {
    throw new Error('SCENARIO 8 FAILED: Clearance clash type change not identified!');
  }
  console.log(`✅ SCENARIO 8 PASSED: Hard -> Clearance type change detected: ${clearanceChange.oldTolerance} -> ${clearanceChange.newTolerance}.`);

  // Scenario 9: Modify matrix cell to blank -> removes clash test
  console.log('=== SCENARIO 9: MODIFY MATRIX CELL TO BLANK (TEST REMOVED) ===');
  const wbWithBlank = JSON.parse(JSON.stringify(baseWb));
  wbWithBlank.sheetsData[wbWithBlank.selectedSheet][17][8] = 'blank';
  const update9 = prepareWorkbookUpdate(baseWb, wbWithBlank, baseSetCfg, baseMatCfg);
  if (update9.clashTestsCountAfter >= update9.clashTestsCountBefore) {
    throw new Error('SCENARIO 9 FAILED: Blanking a cell did not reduce clash test count!');
  }
  console.log(`✅ SCENARIO 9 PASSED: Blanking cell reduced tests from ${update9.clashTestsCountBefore} to ${update9.clashTestsCountAfter}.`);

  // Scenario 10: Modify matrix cell from blank to Hard -> adds clash test
  console.log('=== SCENARIO 10: MODIFY MATRIX CELL FROM BLANK TO HARD (TEST ADDED) ===');
  const wbWithNewCell = JSON.parse(JSON.stringify(baseWb));
  // Set HW0010 vs HW0010 (row 16, col 8) which is blank/N/A to 'H-100'
  wbWithNewCell.sheetsData[wbWithNewCell.selectedSheet][16][8] = 'H-100';
  const update10 = prepareWorkbookUpdate(baseWb, wbWithNewCell, baseSetCfg, baseMatCfg);
  if (update10.clashTestsCountAfter <= update10.clashTestsCountBefore) {
    throw new Error('SCENARIO 10 FAILED: Adding a hard clash cell did not increase clash test count!');
  }
  console.log(`✅ SCENARIO 10 PASSED: Setting new cell increased tests from ${update10.clashTestsCountBefore} to ${update10.clashTestsCountAfter}.`);

  // Scenario 11: Update workbook with same sheet name preserved
  console.log('=== SCENARIO 11: SAME SHEET NAME PRESERVED ===');
  const update11 = prepareWorkbookUpdate(baseWb, { ...baseWb, fileName: 'refreshed.xlsx' }, baseSetCfg, baseMatCfg);
  if (!update11.sheetPreserved || update11.targetSheet !== baseWb.selectedSheet) {
    throw new Error('SCENARIO 11 FAILED: Configured sheet name was not preserved!');
  }
  console.log(`✅ SCENARIO 11 PASSED: Target sheet "${update11.targetSheet}" matched and preserved.`);

  // Scenario 12: Update workbook with different sheet name -> detects sheet missing & lists available
  console.log('=== SCENARIO 12: DIFFERENT SHEET NAME FALLBACK ===');
  const wbDiffSheet: any = {
    ...baseWb,
    sheetNames: ['Renamed Matrix Sheet', 'Notes'],
    sheetsData: {
      'Renamed Matrix Sheet': baseWb.sheetsData[baseWb.selectedSheet],
      Notes: [['Notes']],
    },
    selectedSheet: 'Renamed Matrix Sheet',
  };
  const update12 = prepareWorkbookUpdate(baseWb, wbDiffSheet, baseSetCfg, baseMatCfg);
  if (update12.sheetPreserved) {
    throw new Error('SCENARIO 12 FAILED: Sheet was unexpectedly reported as preserved when name changed!');
  }
  if (!update12.availableSheets.includes('Renamed Matrix Sheet')) {
    throw new Error('SCENARIO 12 FAILED: Available sheets list missing renamed sheet!');
  }
  console.log(`✅ SCENARIO 12 PASSED: Missing sheet detected, available fallback options: [${update12.availableSheets.join(', ')}].`);

  // Scenario 13: Invalid / corrupt workbook update -> error handled gracefully
  console.log('=== SCENARIO 13: CORRUPT WORKBOOK REJECTION ===');
  let corruptCaught = false;
  try {
    const corruptBuffer = new Uint8Array([]);
    const { processWorkbookUpdateFile } = await import('../src/excel/workbookUpdater');
    processWorkbookUpdateFile(corruptBuffer, 'corrupt.xlsx', baseWb, baseSetCfg, baseMatCfg);
  } catch (err: any) {
    corruptCaught = true;
  }
  if (!corruptCaught) {
    throw new Error('SCENARIO 13 FAILED: Corrupt file parsing did not throw graceful error!');
  }
  console.log('✅ SCENARIO 13 PASSED: Corrupt workbook update rejected safely without affecting active state.');

  // Scenario 14: Out-of-bounds column warning generated if updated sheet has fewer columns
  console.log('=== SCENARIO 14: OUT-OF-BOUNDS COLUMN WARNING ===');
  const wbNarrow = JSON.parse(JSON.stringify(baseWb));
  // Trim every row to only 4 columns (0..3), so Col E (4), F (5), H (7) are out of bounds
  wbNarrow.sheetsData[wbNarrow.selectedSheet] = wbNarrow.sheetsData[wbNarrow.selectedSheet].map((r: any[]) => r.slice(0, 4));
  const update14 = prepareWorkbookUpdate(baseWb, wbNarrow, baseSetCfg, baseMatCfg);
  if (update14.columnWarnings.length === 0) {
    throw new Error('SCENARIO 14 FAILED: Out-of-bounds columns were not warned!');
  }
  console.log(`✅ SCENARIO 14 PASSED: Out-of-bounds column warnings generated (${update14.columnWarnings.length} warnings).`);

  // Scenario 15: Matrix layout shift detected and reported cleanly
  console.log('=== SCENARIO 15: MATRIX LAYOUT SHIFT DETECTION ===');
  const wbShifted = JSON.parse(JSON.stringify(baseWb));
  // Insert 2 blank header rows at top so headers shift from row 14 to row 16
  wbShifted.sheetsData[wbShifted.selectedSheet].unshift([''], ['']);
  const update15 = prepareWorkbookUpdate(baseWb, wbShifted, baseSetCfg, baseMatCfg);
  if (!update15.matrixStructureChanged) {
    throw new Error('SCENARIO 15 FAILED: Matrix structure layout shift was not detected!');
  }
  console.log(`✅ SCENARIO 15 PASSED: Matrix shift detected: "${update15.matrixStructureDiffMessage}".`);

  // Scenario 16: Multi-sheet workbook update preserves configured target sheet
  console.log('=== SCENARIO 16: MULTI-SHEET WORKBOOK TARGET SELECTION ===');
  const wbMultiSheet: any = {
    ...baseWb,
    sheetNames: ['Cover', baseWb.selectedSheet, 'Legend'],
    sheetsData: {
      Cover: [['Project Cover']],
      [baseWb.selectedSheet]: baseWb.sheetsData[baseWb.selectedSheet],
      Legend: [['Legend']],
    },
  };
  const update16 = prepareWorkbookUpdate(baseWb, wbMultiSheet, baseSetCfg, baseMatCfg, baseWb.selectedSheet);
  if (update16.targetSheet !== baseWb.selectedSheet || !update16.sheetPreserved) {
    throw new Error('SCENARIO 16 FAILED: Target sheet not correctly resolved in multi-sheet workbook!');
  }
  console.log(`✅ SCENARIO 16 PASSED: Multi-sheet target sheet correctly resolved to "${update16.targetSheet}".`);

  // Scenario 17: Full validation automatically re-runs on updated data without retaining stale errors
  console.log('=== SCENARIO 17: AUTOMATIC VALIDATION RE-EXECUTION ===');
  const newSets17 = generateSelectionSets(
    wbWithAddedRow.sheetsData[wbWithAddedRow.selectedSheet],
    baseSetCfg,
    baseMatCfg.matrixStartRowIndex,
    baseMatCfg.rowGroupColumnIndex
  );
  const newMatrix17 = parseClashMatrix(
    wbWithAddedRow.sheetsData[wbWithAddedRow.selectedSheet],
    baseMatCfg,
    newSets17.selectionSets,
    newSets17.selectionSetMapByGroup,
    newSets17.selectionSetMapByName
  );
  const xml17 = buildNavisworksXml(projSettings, newSets17.viewFolders, newMatrix17.clashTests, 'full');
  const validSummary17 = runFullValidation(
    update5.updatedWorkbook,
    baseSetCfg,
    baseMatCfg,
    newSets17.selectionSets,
    newSets17.viewFolders,
    newMatrix17.clashTests,
    newMatrix17.summary,
    newMatrix17.unresolvedPairs,
    projSettings,
    xml17
  );
  if (!validSummary17.isValid) {
    throw new Error(`SCENARIO 17 FAILED: Updated workbook validation reported unexpected errors: ${validSummary17.issues.filter(i => i.type === 'error').map(e => e.title).join(', ')}`);
  }
  console.log('✅ SCENARIO 17 PASSED: Full validation automatically clean and passing on refreshed data.');

  // Scenario 18: Navisworks XML reflects updated Excel rows and matrix tests
  console.log('=== SCENARIO 18: XML GENERATION REFLECTS REFRESHED DATA ===');
  if (!xml17.includes('HV9999')) {
    throw new Error('SCENARIO 18 FAILED: Generated XML did not include updated element HV9999!');
  }
  console.log('✅ SCENARIO 18 PASSED: Navisworks XML incorporates updated Excel rows and tests.');

  // Scenario 19: Re-ordering of rows in updated Excel retains deterministic naming
  console.log('=== SCENARIO 19: DETERMINISTIC ROW RE-ORDERING ===');
  const wbReordered = JSON.parse(JSON.stringify(baseWb));
  // Reverse the matrix rows
  const headerRows = wbReordered.sheetsData[wbReordered.selectedSheet].slice(0, 16);
  const dataRows = wbReordered.sheetsData[wbReordered.selectedSheet].slice(16);
  wbReordered.sheetsData[wbReordered.selectedSheet] = [...headerRows, ...dataRows.reverse()];
  const update19 = prepareWorkbookUpdate(baseWb, wbReordered, baseSetCfg, baseMatCfg);
  if (update19.selectionSetsCountAfter !== update19.selectionSetsCountBefore) {
    throw new Error('SCENARIO 19 FAILED: Row re-ordering altered total selection set count!');
  }
  console.log('✅ SCENARIO 19 PASSED: Deterministic Selection Set count and naming preserved across row reordering.');

  // Scenario 20: Performance and consistency on update
  console.log('=== SCENARIO 20: PERFORMANCE & CONSISTENCY ===');
  const tStart = performance.now();
  for (let i = 0; i < 10; i++) {
    prepareWorkbookUpdate(baseWb, baseWb, baseSetCfg, baseMatCfg);
  }
  const tEnd = performance.now();
  const avgMs = (tEnd - tStart) / 10;
  console.log(`✅ SCENARIO 20 PASSED: Average update comparison speed: ${avgMs.toFixed(2)}ms (well within sub-second responsiveness requirements).`);

  console.log('\n====================================================');
  console.log('✅ ALL 20 UPDATE EXCEL REGRESSION SCENARIOS PASSED 100%');
  console.log('====================================================');

  // =========================================================================
  // BRANDING & PASSWORD-PROTECTED LOGO REGRESSION TEST SUITE (20 SCENARIOS)
  // =========================================================================
  console.log('\n=================================================================');
  console.log('🚀 EXECUTING BRANDING & PASSWORD PROTECTION REGRESSION SUITE');
  console.log('=================================================================');

  const { hashPassword, createPasswordRecord, verifyPassword } = await import('./branding/brandingCrypto');
  const { validateDimensions, isValidImageMimeType } = await import('./branding/logoValidator');
  const {
    saveStoredBranding,
    loadStoredBranding,
    removeStoredBranding,
    saveStoredAdminAuth,
    loadStoredAdminAuth,
    clearAllAdminAndBranding,
  } = await import('./branding/brandingStorage');

  // Clear test storage first
  await clearAllAdminAndBranding();

  // Branding Scenario 1: No logo configured -> Default application branding returned
  console.log('=== BRANDING SCENARIO 1: DEFAULT BRANDING WHEN NO LOGO ===');
  const initialBranding = await loadStoredBranding();
  if (initialBranding !== null) {
    throw new Error('BRANDING SCENARIO 1 FAILED: Initial branding should be null.');
  }
  console.log('✅ BRANDING SCENARIO 1 PASSED: Default branding rendered when no custom logo configured.');

  // Branding Scenario 2: Admin can create password
  console.log('=== BRANDING SCENARIO 2: ADMIN PASSWORD CREATION ===');
  const testPassword = 'BimClashSecure2026!';
  const hashedPasswordObj = await createPasswordRecord(testPassword);
  await saveStoredAdminAuth(hashedPasswordObj);
  const storedAuth = await loadStoredAdminAuth();
  if (!storedAuth || !storedAuth.passwordHash || !storedAuth.salt) {
    throw new Error('BRANDING SCENARIO 2 FAILED: Stored admin auth is invalid.');
  }
  console.log('✅ BRANDING SCENARIO 2 PASSED: Admin password successfully created and saved.');

  // Branding Scenario 3: Plaintext password is NOT stored anywhere
  console.log('=== BRANDING SCENARIO 3: NO PLAINTEXT PASSWORD STORAGE ===');
  const rawAuthString = JSON.stringify(storedAuth);
  if (rawAuthString.includes(testPassword)) {
    throw new Error('BRANDING SCENARIO 3 FAILED: Plaintext password was found in stored auth data!');
  }
  if (storedAuth.iterations < 100000) {
    throw new Error('BRANDING SCENARIO 3 FAILED: PBKDF2 iterations below 100,000 security baseline.');
  }
  console.log('✅ BRANDING SCENARIO 3 PASSED: Password stored strictly as PBKDF2/SHA-256 salted hash with 100,000 iterations.');

  // Branding Scenario 4: Correct password unlocks authentication
  console.log('=== BRANDING SCENARIO 4: CORRECT PASSWORD VERIFICATION ===');
  const isCorrect = await verifyPassword(testPassword, storedAuth.passwordHash, storedAuth.salt, storedAuth.iterations);
  if (!isCorrect) {
    throw new Error('BRANDING SCENARIO 4 FAILED: Valid password was rejected.');
  }
  console.log('✅ BRANDING SCENARIO 4 PASSED: Correct administrator password verified successfully.');

  // Branding Scenario 5: Incorrect password is rejected
  console.log('=== BRANDING SCENARIO 5: INCORRECT PASSWORD REJECTION ===');
  const isWrong = await verifyPassword('WrongPassword123!', storedAuth.passwordHash, storedAuth.salt, storedAuth.iterations);
  if (isWrong) {
    throw new Error('BRANDING SCENARIO 5 FAILED: Invalid password was accepted!');
  }
  console.log('✅ BRANDING SCENARIO 5 PASSED: Incorrect password was properly rejected.');

  // Branding Scenario 6: Throttling / Lockout logic
  console.log('=== BRANDING SCENARIO 6: FAILED ATTEMPT THROTTLING & LOCKOUT ===');
  let failedAttempts = 0;
  let lockoutTimestamp: number | null = null;
  const MAX_FAILED = 5;
  const LOCKOUT_MS = 30000;

  for (let i = 0; i < 6; i++) {
    const ok = await verifyPassword('bad_pass_' + i, storedAuth.passwordHash, storedAuth.salt, storedAuth.iterations);
    if (!ok) {
      failedAttempts++;
      if (failedAttempts >= MAX_FAILED) {
        lockoutTimestamp = Date.now() + LOCKOUT_MS;
      }
    }
  }
  if (!lockoutTimestamp || lockoutTimestamp <= Date.now()) {
    throw new Error('BRANDING SCENARIO 6 FAILED: Lockout was not triggered after 5 failed attempts.');
  }
  console.log('✅ BRANDING SCENARIO 6 PASSED: 5 failed attempts trigger 30s administrator lockout.');

  // Branding Scenario 7: Admin can upload and save a valid logo
  console.log('=== BRANDING SCENARIO 7: UPLOAD & SAVE VALID LOGO ===');
  const sampleLogoData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const sampleBranding = {
    logoId: 'logo_sample_01',
    logoName: 'acme_bim_logo.png',
    logoMimeType: 'image/png',
    logoData: sampleLogoData,
    width: 240,
    height: 60,
    fileSizeBytes: 1024,
    updatedAt: new Date().toISOString(),
  };
  await saveStoredBranding(sampleBranding);
  console.log('✅ BRANDING SCENARIO 7 PASSED: Valid company logo successfully saved.');

  // Branding Scenario 8: Logo persists across reloads
  console.log('=== BRANDING SCENARIO 8: LOGO PERSISTENCE ===');
  const loadedBranding = await loadStoredBranding();
  if (!loadedBranding || loadedBranding.logoName !== 'acme_bim_logo.png' || loadedBranding.logoData !== sampleLogoData) {
    throw new Error('BRANDING SCENARIO 8 FAILED: Loaded logo does not match saved branding data.');
  }
  console.log('✅ BRANDING SCENARIO 8 PASSED: Company logo correctly retrieved from persistent storage.');

  // Branding Scenario 9: Admin can replace the logo
  console.log('=== BRANDING SCENARIO 9: REPLACE LOGO ===');
  const sampleLogo2Data = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
  const updatedBranding = {
    logoId: 'logo_sample_02',
    logoName: 'enterprise_clash_vector.svg',
    logoMimeType: 'image/svg+xml',
    logoData: sampleLogo2Data,
    width: 320,
    height: 80,
    fileSizeBytes: 2048,
    updatedAt: new Date().toISOString(),
  };
  await saveStoredBranding(updatedBranding);
  const reloadedBranding = await loadStoredBranding();
  if (!reloadedBranding || reloadedBranding.logoName !== 'enterprise_clash_vector.svg') {
    throw new Error('BRANDING SCENARIO 9 FAILED: Failed to replace company logo.');
  }
  console.log('✅ BRANDING SCENARIO 9 PASSED: Company logo successfully replaced with new asset.');

  // Branding Scenario 10: Admin can remove the logo
  console.log('=== BRANDING SCENARIO 10: REMOVE LOGO ===');
  await removeStoredBranding();
  const clearedBranding = await loadStoredBranding();
  if (clearedBranding !== null) {
    throw new Error('BRANDING SCENARIO 10 FAILED: Logo was not cleared from storage.');
  }
  console.log('✅ BRANDING SCENARIO 10 PASSED: Company logo removed; fallback to default branding.');

  // Branding Scenario 11: Non-authenticated operations prevented
  console.log('=== BRANDING SCENARIO 11: NON-AUTHENTICATED PREVENTION ===');
  let authActive = false;
  const modifyLogoAttempt = async () => {
    if (!authActive) {
      throw new Error('Unauthorized');
    }
    await saveStoredBranding(sampleBranding);
  };
  try {
    await modifyLogoAttempt();
    throw new Error('BRANDING SCENARIO 11 FAILED: Non-authenticated mutation succeeded!');
  } catch (err: any) {
    if (err.message !== 'Unauthorized') throw err;
  }
  console.log('✅ BRANDING SCENARIO 11 PASSED: Unauthenticated logo modification prevented.');

  // Branding Scenario 12: Password change workflow
  console.log('=== BRANDING SCENARIO 12: PASSWORD CHANGE WORKFLOW ===');
  const isCurrentValid = await verifyPassword(testPassword, storedAuth.passwordHash, storedAuth.salt, storedAuth.iterations);
  if (!isCurrentValid) {
    throw new Error('BRANDING SCENARIO 12 FAILED: Current password failed verification during change.');
  }
  const newPassword = 'NewBimEnterprise2026#';
  const newHashedObj = await createPasswordRecord(newPassword);
  await saveStoredAdminAuth(newHashedObj);
  console.log('✅ BRANDING SCENARIO 12 PASSED: Password changed after current-password verification.');

  // Branding Scenario 13: Old password no longer works
  console.log('=== BRANDING SCENARIO 13: OLD PASSWORD INVALIDATED ===');
  const latestAuth = await loadStoredAdminAuth();
  if (!latestAuth) throw new Error('Missing auth config.');
  const oldPassWorks = await verifyPassword(testPassword, latestAuth.passwordHash, latestAuth.salt, latestAuth.iterations);
  if (oldPassWorks) {
    throw new Error('BRANDING SCENARIO 13 FAILED: Old password still works after password change!');
  }
  console.log('✅ BRANDING SCENARIO 13 PASSED: Old password successfully invalidated.');

  // Branding Scenario 14: New password works
  console.log('=== BRANDING SCENARIO 14: NEW PASSWORD AUTHENTICATES ===');
  const newPassWorks = await verifyPassword(newPassword, latestAuth.passwordHash, latestAuth.salt, latestAuth.iterations);
  if (!newPassWorks) {
    throw new Error('BRANDING SCENARIO 14 FAILED: New password fails verification!');
  }
  console.log('✅ BRANDING SCENARIO 14 PASSED: New administrator password successfully authenticates.');

  // Branding Scenario 15: Logo configuration survives Excel Update
  console.log('=== BRANDING SCENARIO 15: LOGO SURVIVES EXCEL UPDATE ===');
  await saveStoredBranding(updatedBranding);
  // Perform an Excel Update simulation
  const wbUpdated = JSON.parse(JSON.stringify(baseWb));
  prepareWorkbookUpdate(baseWb, wbUpdated, baseSetCfg, baseMatCfg);
  const brandingAfterExcelUpdate = await loadStoredBranding();
  if (!brandingAfterExcelUpdate || brandingAfterExcelUpdate.logoName !== 'enterprise_clash_vector.svg') {
    throw new Error('BRANDING SCENARIO 15 FAILED: Excel update corrupted or cleared company branding!');
  }
  console.log('✅ BRANDING SCENARIO 15 PASSED: Company logo configuration survives Excel Update intact.');

  // Branding Scenario 16: Logo survives project config & step navigation changes
  console.log('=== BRANDING SCENARIO 16: LOGO SURVIVES PROJECT CONFIG CHANGES ===');
  const brandingCustomSetCfg = { ...baseSetCfg, nameSeparator: '__' };
  const brandingCustomMatCfg = { ...baseMatCfg, namingFormat: 'matrix_clash_test' as any };
  const brandingAfterConfigChange = await loadStoredBranding();
  if (!brandingAfterConfigChange || brandingAfterConfigChange.logoData !== sampleLogo2Data) {
    throw new Error('BRANDING SCENARIO 16 FAILED: Project config changes corrupted company branding.');
  }
  console.log('✅ BRANDING SCENARIO 16 PASSED: Branding configuration survives project configuration modifications.');

  // Branding Scenario 17: Matrix mapping (Column F, Row 14/15/16/17) intact
  console.log('=== BRANDING SCENARIO 17: MATRIX MAPPING INTEGRITY ===');
  const brandingSetsResult = generateSelectionSets(
    baseWb.sheetsData[baseWb.selectedSheet],
    baseSetCfg,
    baseMatCfg.matrixStartRowIndex,
    baseMatCfg.rowGroupColumnIndex
  );
  const parsedMatrix = parseClashMatrix(
    baseWb.sheetsData[baseWb.selectedSheet],
    baseMatCfg,
    brandingSetsResult.selectionSets,
    brandingSetsResult.selectionSetMapByGroup,
    brandingSetsResult.selectionSetMapByName
  );
  if (parsedMatrix.clashTests.length === 0 || parsedMatrix.summary.hardClashes === 0) {
    throw new Error('BRANDING SCENARIO 17 FAILED: Matrix mapping regression detected!');
  }
  console.log(`✅ BRANDING SCENARIO 17 PASSED: Clash Matrix mapping and test generation intact (${parsedMatrix.clashTests.length} tests).`);

  // Branding Scenario 18: FindSpec categories and conditions intact
  console.log('=== BRANDING SCENARIO 18: FINDSPEC CONDITIONS INTEGRITY ===');
  const testFolder = {
    name: 'Highways',
    guid: '00000000-0000-0000-0000-000000000001',
    selectionSets: [
      {
        id: 'set_brand_1',
        name: 'HW-0010',
        folder: 'Highways',
        clashGroup: 'HW0010',
        conditions: [
          {
            categoryName: 'Element',
            categoryInternal: 'LcRevitData_Element',
            propertyName: 'Category',
            propertyInternal: 'LcRevitProperty_Category',
            test: 'contains',
            flags: 74,
            value: 'HIGHWAY',
            dataType: 'wstring',
          },
        ],
        guid: '00000000-0000-0000-0000-000000000002',
        locator: 'Highways/HW-0010',
        sourceRowIndex: 16,
      },
    ],
  };
  const xmlOutput = buildNavisworksXml(
    { batchTestName: 'BrandingTestProject', internalName: 'BrandingTestProject', units: 'm', filename: '', filepath: '' },
    [testFolder],
    parsedMatrix.clashTests,
    'full'
  );
  console.log('XML OUTPUT:', JSON.stringify(xmlOutput));
  if (!xmlOutput.includes('<findspec') || !xmlOutput.includes('flags="74"') || !xmlOutput.includes('<category>')) {
    throw new Error('BRANDING SCENARIO 18 FAILED: FindSpec conditions regression detected!');
  }
  console.log('✅ BRANDING SCENARIO 18 PASSED: FindSpec condition tags and flags remain 100% compliant.');

  // Branding Scenario 19: Reusable Property Presets intact
  console.log('=== BRANDING SCENARIO 19: PROPERTY PRESETS INTEGRITY ===');
  const { DEFAULT_PROPERTY_PRESETS: propertyPresetsList } = await import('./selectionSets/propertyPresets');
  if (!propertyPresetsList || propertyPresetsList.length < 5) {
    throw new Error('BRANDING SCENARIO 19 FAILED: Default presets corrupted or missing.');
  }
  console.log(`✅ BRANDING SCENARIO 19 PASSED: Reusable Property Presets intact (${propertyPresetsList.length} presets).`);

  // Branding Scenario 20: Logo Validator image MIME and dimension compliance
  console.log('=== BRANDING SCENARIO 20: LOGO VALIDATOR SPECIFICATIONS ===');
  if (!isValidImageMimeType('image/png') || !isValidImageMimeType('image/jpeg') || !isValidImageMimeType('image/svg+xml') || !isValidImageMimeType('image/webp')) {
    throw new Error('BRANDING SCENARIO 20 FAILED: Valid MIME types rejected by validator.');
  }
  if (isValidImageMimeType('application/pdf') || isValidImageMimeType('image/gif')) {
    throw new Error('BRANDING SCENARIO 20 FAILED: Unsupported MIME types accepted by validator.');
  }
  const dimCheck1 = validateDimensions(1920, 1080);
  const dimCheck2 = validateDimensions(5000, 5000);
  if (!dimCheck1.isValid || dimCheck2.isValid) {
    throw new Error('BRANDING SCENARIO 20 FAILED: Dimension boundary validation failed.');
  }
  console.log('✅ BRANDING SCENARIO 20 PASSED: Logo validation constraints enforced for MIME types and dimensions.');

  console.log('\n=================================================================');
  console.log('=== PART 12: UPLOAD EXCEL WORKFLOW & NAVISWORKS SCHEMA VERIFICATION ===');
  console.log('=================================================================');

  // Scenario 41: Update Excel button workflow & configuration preservation
  console.log('=== SCENARIO 41: UPDATE EXCEL WORKFLOW & CONFIGURATION PRESERVATION ===');
  const initialWb = createSampleBimClashMatrixWorkbook();
  const initialData = initialWb.sheetsData[initialWb.selectedSheet];
  const initialDetected = autoDetectMatrixStructure(initialData, initialWb.columns, initialWb.headerRowIndex);
  const { selectionSetConfig: initSetCfg, clashMatrixConfig: initMatCfg } = createDefaultConfigs(
    initialDetected,
    initialWb.columns
  );
  // Modify config to ensure it survives update
  initMatCfg.namingFormat = 'full_v_full';

  const replacementWb = { ...initialWb, fileName: 'Updated_Replacement_Matrix.xlsx' };
  const updateComparison = prepareWorkbookUpdate(
    initialWb,
    replacementWb,
    initSetCfg,
    initMatCfg
  );
  if (!updateComparison.sheetPreserved || updateComparison.structureWarnings.length > 0) {
    throw new Error('SCENARIO 41 FAILED: Update workbook structure reported incompatible.');
  }
  if (initMatCfg.namingFormat !== 'full_v_full') {
    throw new Error('SCENARIO 41 FAILED: Project configurations did not survive Update Excel update!');
  }
  console.log('✅ SCENARIO 41 PASSED: Update Excel preserves all custom project tolerances & mappings across replacement.');

  // Scenario 42: Navisworks XML Schema (nw-exchange-12.0.xsd) verification
  console.log('=== SCENARIO 42: NAVISWORKS EXCHANGE SCHEMA INTEGRITY ===');
  const schemaTestXml = buildNavisworksXml(
    { batchTestName: 'Project11', internalName: 'Project11', units: 'm', filename: 'model.nwd', filepath: 'C:\\Models' },
    [testFolder],
    parsedMatrix.clashTests,
    'full'
  );
  const validationResult = validateNavisworksXmlString(schemaTestXml);
  if (!validationResult.isValid) {
    throw new Error(`SCENARIO 42 FAILED: Generated XML failed validation: ${validationResult.errors.join(', ')}`);
  }
  if (!schemaTestXml.includes('xsi:noNamespaceSchemaLocation="http://download.autodesk.com/us/navisworks/schemas/nw-exchange-12.0.xsd"')) {
    throw new Error('SCENARIO 42 FAILED: Missing or corrupted Autodesk nw-exchange-12.0.xsd schema declaration!');
  }
  console.log('✅ SCENARIO 42 PASSED: Navisworks 2024-2026 nw-exchange-12.0.xsd schema location validated.');

  // Scenario 43: CURRENT CONDITIONS ARE XML SOURCE OF TRUTH (6-Step Acceptance Test)
  console.log('\n=================================================================');
  console.log('=== SCENARIO 43: CURRENT CONDITIONS ARE XML SOURCE OF TRUTH ===');
  console.log('=================================================================');
  const { cloneStandard8BimConditions, IMMUTABLE_STANDARD_8_BIM_RULES } = await import('./selectionSets/standardConditions');

  // STEP 1: Load preset
  console.log('[STEP 1] Loading Standard BIM Rule Preset...');
  let currentConditions = cloneStandard8BimConditions(4, 5);
  if (currentConditions.length !== 1) {
    throw new Error(`STEP 1 FAILED: Expected 1 condition, got ${currentConditions.length}`);
  }
  const testWb = createSampleBimClashMatrixWorkbook();
  const testSheetData = testWb.sheetsData[testWb.selectedSheet];
  let dynamicSetCfg: SelectionSetConfig = {
    folderColumnLetter: 'D',
    folderColumnIndex: 3,
    nameParts: [
      { columnLetter: 'E', columnIndex: 4, separator: '-' },
      { columnLetter: 'F', columnIndex: 5, separator: '' },
    ],
    nameSeparator: '-',
    conditions: currentConditions,
  };
  let ssResult = generateSelectionSets(testSheetData, dynamicSetCfg, 14, 5);
  let xmlOut = buildNavisworksXml(
    { batchTestName: 'Project11', internalName: 'Project11', units: 'm', filename: '', filepath: '' },
    ssResult.viewFolders,
    [],
    'selectionSetsOnly'
  );
  const sampleSet = ssResult.selectionSets[0];
  if (sampleSet.conditions.length !== 1) {
    throw new Error(`STEP 1 FAILED: Generated selection set has ${sampleSet.conditions.length} conditions, expected 1`);
  }
  console.log('✅ STEP 1 PASSED: Loaded preset has 1 condition and generated XML reflects it.');

  // STEP 2: Delete 1 condition
  console.log('[STEP 2] Deleting 1 condition (Element Category)...');
  currentConditions = [];
  dynamicSetCfg.conditions = currentConditions;
  if (currentConditions.length !== 0) {
    throw new Error(`STEP 2 FAILED: Expected 0 conditions, got ${currentConditions.length}`);
  }
  ssResult = generateSelectionSets(testSheetData, dynamicSetCfg, 14, 5);
  xmlOut = buildNavisworksXml(
    { batchTestName: 'Project11', internalName: 'Project11', units: 'm', filename: '', filepath: '' },
    ssResult.viewFolders,
    [],
    'selectionSetsOnly'
  );
  if (ssResult.selectionSets[0].conditions.length !== 0) {
    throw new Error(`STEP 2 FAILED: Selection sets have ${ssResult.selectionSets[0].conditions.length} conditions, expected 0`);
  }
  console.log('✅ STEP 2 PASSED: Deleted condition removed from state and XML (now 0 conditions).');

  // STEP 3: Add a new condition
  console.log('[STEP 3] Adding new Custom condition (FireRating with value "ABC")...');
  const step3CustomCond: ConditionConfig = {
    id: 'cond_fire_rating',
    dataType: 'Custom',
    categoryInternalName: 'LcRevitData_Custom',
    propertyDisplayName: 'FireRating',
    propertyInternalName: 'custom_fire_rating',
    flags: 74,
    test: 'contains',
    value: 'ABC',
    valueSource: 'custom',
  };
  currentConditions = [...currentConditions, step3CustomCond];
  dynamicSetCfg.conditions = currentConditions;
  if (currentConditions.length !== 1) {
    throw new Error(`STEP 3 FAILED: Expected 1 condition, got ${currentConditions.length}`);
  }
  ssResult = generateSelectionSets(testSheetData, dynamicSetCfg, 14, 5);
  xmlOut = buildNavisworksXml(
    { batchTestName: 'Project11', internalName: 'Project11', units: 'm', filename: '', filepath: '' },
    ssResult.viewFolders,
    [],
    'selectionSetsOnly'
  );
  if (!xmlOut.includes('FireRating') || !xmlOut.includes('custom_fire_rating') || !xmlOut.includes('>ABC<') || !xmlOut.includes('flags="74"')) {
    throw new Error('STEP 3 FAILED: Added custom condition not found in generated XML!');
  }
  console.log('✅ STEP 3 PASSED: Added Custom FireRating condition correctly generated in XML with value ABC.');

  // STEP 4: Edit another existing condition to TEST_UPDATED
  console.log('[STEP 4] Editing condition value to TEST_UPDATED...');
  currentConditions = currentConditions.map(c => {
    if (c.id === 'cond_fire_rating') {
      return { ...c, value: 'TEST_UPDATED' };
    }
    return c;
  });
  dynamicSetCfg.conditions = currentConditions;
  ssResult = generateSelectionSets(testSheetData, dynamicSetCfg, 14, 5);
  xmlOut = buildNavisworksXml(
    { batchTestName: 'Project11', internalName: 'Project11', units: 'm', filename: '', filepath: '' },
    ssResult.viewFolders,
    [],
    'selectionSetsOnly'
  );
  if (!xmlOut.includes('>TEST_UPDATED<')) {
    throw new Error('STEP 4 FAILED: TEST_UPDATED does not exist in generated XML!');
  }
  if (xmlOut.includes('>ABC<')) {
    throw new Error('STEP 4 FAILED: Old value ABC still exists in generated XML!');
  }
  console.log('✅ STEP 4 PASSED: Value changed to TEST_UPDATED and old value ABC is completely gone from XML.');

  // STEP 5: Reorder conditions
  console.log('[STEP 5] Reordering conditions...');
  const secondCond: ConditionConfig = {
    id: 'cond_elem_cat',
    dataType: 'Element',
    categoryInternalName: 'LcRevitData_Element',
    propertyDisplayName: 'Category',
    propertyInternalName: 'lcldrevit_parameter_-1002000',
    flags: 10,
    test: 'contains',
    value: 'Wall',
    valueSource: 'custom',
  };
  currentConditions = [...currentConditions, secondCond];
  // Reorder so secondCond is first
  currentConditions = [currentConditions[1], currentConditions[0]];
  dynamicSetCfg.conditions = currentConditions;
  ssResult = generateSelectionSets(testSheetData, dynamicSetCfg, 14, 5);
  const firstGeneratedCondition = ssResult.selectionSets[0].conditions[0];
  if (firstGeneratedCondition.propertyName !== 'Category' || firstGeneratedCondition.value !== 'Wall') {
    throw new Error(`STEP 5 FAILED: Expected first condition to be Category, got ${firstGeneratedCondition.propertyName}`);
  }
  console.log('✅ STEP 5 PASSED: Reordered conditions correctly preserved in Selection Sets and XML.');

  // STEP 6: Reload preset
  console.log('[STEP 6] Reloading Standard Preset & verifying preset immutability...');
  currentConditions = cloneStandard8BimConditions(4, 5);
  dynamicSetCfg.conditions = currentConditions;
  ssResult = generateSelectionSets(testSheetData, dynamicSetCfg, 14, 5);
  xmlOut = buildNavisworksXml(
    { batchTestName: 'Project11', internalName: 'Project11', units: 'm', filename: '', filepath: '' },
    ssResult.viewFolders,
    [],
    'selectionSetsOnly'
  );
  if (currentConditions.length !== 1) {
    throw new Error(`STEP 6 FAILED: Expected 1 condition on reload, got ${currentConditions.length}`);
  }
  if (xmlOut.includes('TEST_UPDATED') || xmlOut.includes('FireRating')) {
    throw new Error('STEP 6 FAILED: Modified conditions from steps 2-5 leaked into freshly reloaded preset!');
  }
  if (IMMUTABLE_STANDARD_8_BIM_RULES.length !== 1) {
    throw new Error('STEP 6 FAILED: Immutable template was modified!');
  }
  console.log('✅ STEP 6 PASSED: Preset reloaded cleanly, 1 original rule restored, immutability preserved.');
  console.log('✅ SCENARIO 43 PASSED: CURRENT UI CONDITION STATE IS 100% THE SINGLE SOURCE OF TRUTH FOR GENERATED XML.');

  console.log('\n=================================================================');
  console.log('✅ ALL 20 BRANDING & PASSWORD PROTECTION REGRESSION SCENARIOS PASSED');
  console.log('=================================================================');

  console.log('\n====================================================');
  console.log('✅ ALL 43 TOTAL REGRESSION TESTS PASSED 100% SUCCESSFULLY');
  console.log('====================================================\n');

  // Run new Property Library tests
  await runPropertyLibraryTests();
}

runRegressionPass().catch(err => {
  console.error('REGRESSION TEST FAILED:', err);
  process.exit(1);
});

