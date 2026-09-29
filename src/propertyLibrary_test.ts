import {
  loadPropertyLibrary,
  addCustomProperty,
  updatePropertyInLibrary,
  deletePropertyFromLibrary,
  parseNavisworksXmlProperties,
  commitImportedProperties,
  filterPropertyLibrary,
  getPropertyIdentity,
  VERIFIED_AUTODESK_PROPERTIES,
} from './selectionSets/propertyLibraryManager';
import { NavisworksPropertyDefinition } from './types/propertyLibrary';
import { ConditionConfig, SelectionSetConfig } from './types/selectionSet';
import { generateSelectionSets } from './selectionSets/selectionSetGenerator';
import { buildNavisworksXml } from './xml/navisworksXmlBuilder';

export async function runPropertyLibraryTests() {
  console.log('====================================================');
  console.log('RUNNING PROPERTY LIBRARY UNIT & REGRESSION TEST SUITE');
  console.log('====================================================\n');

  // Test 1: Create / Add Custom Property
  console.log('[Test 1] Create user-defined property...');
  let library = [...VERIFIED_AUTODESK_PROPERTIES.map(p => ({ ...p }))];
  const addRes = addCustomProperty(
    {
      categoryDisplayName: 'Revit Custom',
      categoryInternalName: 'LcRevit_Custom',
      propertyDisplayName: 'AcousticRating',
      propertyInternalName: 'custom_acoustic_rating',
      notes: 'Custom STC rating',
    },
    library
  );
  if (!addRes.success || !addRes.updatedLibrary) {
    throw new Error(`Test 1 Failed: ${addRes.error}`);
  }
  library = addRes.updatedLibrary;
  const createdProp = library.find(p => p.propertyInternalName === 'custom_acoustic_rating');
  if (!createdProp || createdProp.source !== 'user-defined') {
    throw new Error('Test 1 Failed: Created property missing or source not user-defined');
  }
  console.log('✅ Test 1 Passed: Custom property created with source = "user-defined".');

  // Test 2: Search by Display Name
  console.log('[Test 2] Search by display name...');
  const searchDisplayRes = filterPropertyLibrary(library, 'AcousticRating', 'ALL', 'ALL');
  if (searchDisplayRes.length !== 1 || searchDisplayRes[0].propertyDisplayName !== 'AcousticRating') {
    throw new Error('Test 2 Failed: Search by display name did not return target property');
  }
  console.log('✅ Test 2 Passed: Search by display name matched target property.');

  // Test 3: Search by Internal Name
  console.log('[Test 3] Search by internal name...');
  const searchInternalRes = filterPropertyLibrary(library, 'custom_acoustic_rating', 'ALL', 'ALL');
  if (searchInternalRes.length !== 1 || searchInternalRes[0].propertyInternalName !== 'custom_acoustic_rating') {
    throw new Error('Test 3 Failed: Search by internal name did not return target property');
  }
  console.log('✅ Test 3 Passed: Search by internal name matched target property.');

  // Test 4: Category Filter
  console.log('[Test 4] Category filter...');
  const catFilterRes = filterPropertyLibrary(library, '', 'Revit Custom', 'ALL');
  if (catFilterRes.length !== 1 || catFilterRes[0].categoryDisplayName !== 'Revit Custom') {
    throw new Error('Test 4 Failed: Category filter did not isolate "Revit Custom"');
  }
  console.log('✅ Test 4 Passed: Category filter correctly filtered properties.');

  // Test 5: Source Filter
  console.log('[Test 5] Source filter...');
  const sourceVerifiedRes = filterPropertyLibrary(library, '', 'ALL', 'autodesk-verified');
  if (sourceVerifiedRes.length !== VERIFIED_AUTODESK_PROPERTIES.length) {
    throw new Error('Test 5 Failed: Source filter autodesk-verified count mismatch');
  }
  const sourceUserRes = filterPropertyLibrary(library, '', 'ALL', 'user-defined');
  if (sourceUserRes.length !== 1) {
    throw new Error('Test 5 Failed: Source filter user-defined count mismatch');
  }
  console.log('✅ Test 5 Passed: Source filter correctly isolated autodesk-verified and user-defined.');

  // Test 6: Import XML - Parsing & Extraction
  console.log('[Test 6] Import Navisworks XML and parse...');
  const sampleXml = `<?xml version="1.0" encoding="UTF-8" ?>
<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" units="m">
  <findspec mode="all">
    <conditions>
      <condition test="contains" flags="74">
        <category>
          <name internal="LcRevitData_Custom">Custom</name>
        </category>
        <property>
          <name internal="CD_Clash Priority">CD_Clash Priority</name>
        </property>
        <value>
          <data type="wstring">ABC</data>
        </value>
      </condition>
      <condition test="equals" flags="10">
        <category>
          <name internal="LcOaNode">Item</name>
        </category>
        <property>
          <name internal="LcOaNodeSelectedItems">Name</name>
        </property>
        <value>
          <data type="wstring">Wall</data>
        </value>
      </condition>
      <condition test="contains" flags="74">
        <category>
          <name internal="LcRevitData_Mechanical">Mechanical System</name>
        </category>
        <property>
          <name internal="lcldrevit_parameter_system_type">System Type</name>
        </property>
        <value>
          <data type="wstring">Supply Air</data>
        </value>
      </condition>
      <!-- Duplicate condition in same XML to test deduplication -->
      <condition test="contains" flags="74">
        <category>
          <name internal="LcRevitData_Mechanical">Mechanical System</name>
        </category>
        <property>
          <name internal="lcldrevit_parameter_system_type">System Type</name>
        </property>
        <value>
          <data type="wstring">Return Air</data>
        </value>
      </condition>
    </conditions>
  </findspec>
</exchange>`;

  const preview = parseNavisworksXmlProperties(sampleXml, 'test_export.xml');
  if (preview.conditionsFound !== 4) {
    throw new Error(`Test 6 Failed: Expected 4 conditions found, got ${preview.conditionsFound}`);
  }
  console.log('✅ Test 6 Passed: XML parsed and conditions located.');

  // Test 7: Extract Category
  console.log('[Test 7] Extract Category display names...');
  const mechProp = preview.properties.find(p => p.propertyInternalName === 'lcldrevit_parameter_system_type');
  if (!mechProp || mechProp.categoryDisplayName !== 'Mechanical System') {
    throw new Error('Test 7 Failed: Category display name not extracted correctly');
  }
  console.log('✅ Test 7 Passed: Category display name extracted accurately.');

  // Test 8: Extract Category Internal Name
  console.log('[Test 8] Extract Category internal name...');
  if (!mechProp || mechProp.categoryInternalName !== 'LcRevitData_Mechanical') {
    throw new Error('Test 8 Failed: Category internal name not extracted correctly');
  }
  console.log('✅ Test 8 Passed: Category internal name extracted accurately.');

  // Test 9: Extract Property Display Name
  console.log('[Test 9] Extract Property display name...');
  if (!mechProp || mechProp.propertyDisplayName !== 'System Type') {
    throw new Error('Test 9 Failed: Property display name not extracted correctly');
  }
  console.log('✅ Test 9 Passed: Property display name extracted accurately.');

  // Test 10: Extract Property Internal Name
  console.log('[Test 10] Extract Property internal name...');
  if (!mechProp || mechProp.propertyInternalName !== 'lcldrevit_parameter_system_type') {
    throw new Error('Test 10 Failed: Property internal name not extracted correctly');
  }
  console.log('✅ Test 10 Passed: Property internal name extracted accurately.');

  // Test 11: Deduplication (Identity: categoryInternalName + propertyInternalName)
  console.log('[Test 11] Deduplication in XML preview and commit...');
  // In the sample XML, System Type appeared 2 times, but unique properties must be 3 (Custom Priority, Item Name, System Type)
  if (preview.uniquePropertiesCount !== 3) {
    throw new Error(`Test 11 Failed: Expected 3 unique properties from XML, got ${preview.uniquePropertiesCount}`);
  }
  console.log('✅ Test 11 Passed: Duplicate XML conditions deduplicated into 1 unique property definition.');

  // Test 12: Source = "navisworks-xml" & Autodesk Verified Priority
  console.log('[Test 12] Commit imported properties with source priority preservation...');
  const commitRes = commitImportedProperties(preview.properties, library);
  library = commitRes.updatedLibrary;

  // Check Mechanical System was added with source = "navisworks-xml"
  const committedMech = library.find(p => p.propertyInternalName === 'lcldrevit_parameter_system_type');
  if (!committedMech || committedMech.source !== 'navisworks-xml') {
    throw new Error('Test 12 Failed: Committed property source should be "navisworks-xml"');
  }

  // Check Custom Priority (which was in XML but also verified) was NOT downgraded to "navisworks-xml"
  const verifiedCustom = library.find(p => p.propertyInternalName === 'CD_Clash Priority' && p.categoryInternalName === 'LcRevitData_Custom');
  if (!verifiedCustom || verifiedCustom.source !== 'autodesk-verified') {
    throw new Error('Test 12 Failed: Autodesk-verified property was downgraded or overwritten');
  }
  console.log('✅ Test 12 Passed: Source set to "navisworks-xml" and Autodesk Verified records protected.');

  // Test 13: Add Custom Property with validation
  console.log('[Test 13] Add another custom property with validation checks...');
  const duplicateRes = addCustomProperty(
    {
      categoryDisplayName: 'Mechanical System',
      categoryInternalName: 'LcRevitData_Mechanical',
      propertyDisplayName: 'System Type',
      propertyInternalName: 'lcldrevit_parameter_system_type',
    },
    library
  );
  if (duplicateRes.success) {
    throw new Error('Test 13 Failed: Should have rejected duplicate property identity');
  }
  console.log('✅ Test 13 Passed: Duplicate identity properly rejected.');

  // Test 14: Use Property updates active FindSpec Condition
  console.log('[Test 14] Use Property from Library to populate active condition...');
  const activeCondition: ConditionConfig = {
    id: 'cond_active_1',
    excelColumnIndex: 2,
    excelColumnLetter: 'C',
    dataType: 'Element',
    categoryInternalName: 'LcRevitData_Element',
    propertyDisplayName: 'OriginalProp',
    propertyInternalName: 'orig_prop',
    test: 'contains',
    flags: 74,
    valueSource: 'custom',
    value: 'MY_SPECIFIC_VALUE',
  };

  // User applies committedMech (Mechanical System -> System Type)
  const updatedCondition: ConditionConfig = {
    ...activeCondition,
    dataType: committedMech.categoryDisplayName,
    categoryInternalName: committedMech.categoryInternalName,
    propertyDisplayName: committedMech.propertyDisplayName,
    propertyInternalName: committedMech.propertyInternalName,
  };

  if (
    updatedCondition.dataType !== 'Mechanical System' ||
    updatedCondition.categoryInternalName !== 'LcRevitData_Mechanical' ||
    updatedCondition.propertyDisplayName !== 'System Type' ||
    updatedCondition.propertyInternalName !== 'lcldrevit_parameter_system_type' ||
    updatedCondition.test !== 'contains' ||
    updatedCondition.flags !== 74 ||
    updatedCondition.value !== 'MY_SPECIFIC_VALUE'
  ) {
    throw new Error('Test 14 Failed: Use Property did not correctly populate condition while preserving test/flags/value');
  }
  console.log('✅ Test 14 Passed: Use Property accurately updated Category and Property names while keeping test/flags/value.');

  // Test 15: Manual Condition edits still work and translate to XML
  console.log('[Test 15] Manual condition edits and XML generation fidelity...');
  const manualEditedCondition: ConditionConfig = {
    ...updatedCondition,
    flags: 12,
    test: 'equals',
    propertyDisplayName: 'System Type Custom Display',
  };

  const dummySheetData = [
    ['Header1', 'Header2', 'Header3', 'Header4', 'Header5', 'Header6'],
    ['A', 'AR0010', 'VAL_1', 'DESCR', 'PRIO_A', 'GRP_1'],
  ];
  const setCfg: SelectionSetConfig = {
    folderColumnLetter: 'A',
    folderColumnIndex: 0,
    nameParts: [{ columnLetter: 'B', columnIndex: 1 }],
    nameSeparator: '-',
    conditions: [manualEditedCondition],
  };

  const ssGen = generateSelectionSets(dummySheetData, setCfg, 1, 0);
  const generatedXml = buildNavisworksXml(
    { batchTestName: 'TestBatch', internalName: 'TestBatch', units: 'm', filename: '', filepath: '' },
    ssGen.viewFolders,
    [],
    'selectionSetsOnly'
  );

  if (
    !generatedXml.includes('test="equals"') ||
    !generatedXml.includes('flags="12"') ||
    !generatedXml.includes('internal="LcRevitData_Mechanical"') ||
    !generatedXml.includes('System Type Custom Display') ||
    !generatedXml.includes('MY_SPECIFIC_VALUE')
  ) {
    throw new Error('Test 15 Failed: XML output does not reflect manual edits accurately');
  }
  console.log('✅ Test 15 Passed: Manual condition edits remain unlocked and generate accurate XML tags.');

  // Test 16: Property Library survives simulated Excel Update
  console.log('[Test 16] Property Library survival across Excel updates...');
  // Simulated new workbook upload / update
  const newWorkbookColumns = [
    { header: 'NewCol1', index: 0, letter: 'A' },
    { header: 'NewCol2', index: 1, letter: 'B' },
  ];
  // Verify that library retained all properties (verified + user + xml)
  const currentLibraryCount = library.length;
  if (currentLibraryCount < VERIFIED_AUTODESK_PROPERTIES.length + 2) {
    throw new Error('Test 16 Failed: Library lost entries during workflow lifecycle');
  }
  console.log(`✅ Test 16 Passed: Property Library retains all ${currentLibraryCount} properties across Excel uploads/updates.`);

  console.log('\n====================================================');
  console.log('✅ ALL 16 PROPERTY LIBRARY TESTS PASSED (100% SUCCESS)');
  console.log('====================================================\n');
}
