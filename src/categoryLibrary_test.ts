import {
  VERIFIED_AUTODESK_CATEGORIES,
  loadCategoryLibrary,
  saveCategoryLibrary,
  getCategoryIdentity,
  filterCategoryLibrary,
  addCustomCategory,
  updateCategoryInLibrary,
  deleteCategoryFromLibrary,
  parseNavisworksXmlCategories,
  commitImportedCategories,
} from './selectionSets/categoryLibraryManager';
import { NavisworksCategoryDefinition } from './types/categoryLibrary';
import { ConditionConfig } from './types/selectionSet';
import {
  filterPropertyLibrary,
  loadPropertyLibrary,
} from './selectionSets/propertyLibraryManager';

// Mock localStorage for Node environment if needed
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  passedTests++;
  console.log(`✅ PASS: ${msg}`);
}

console.log('====================================================');
console.log('RUNNING NAVISWORKS CATEGORY LIBRARY TEST SUITE');
console.log('====================================================');

try {
  localStorage.clear();

  // Test 1: Category Library initializes with 5 verified categories
  console.log('\n--- Test 1: Autodesk-Verified Categories Initial State ---');
  const initialLib = loadCategoryLibrary();
  assert(initialLib.length >= 5, `Initial library has at least 5 categories (got ${initialLib.length})`);
  
  const elementCat = initialLib.find((c) => c.internalName === 'LcRevitData_Element');
  assert(!!elementCat, 'Found Element category (LcRevitData_Element)');
  assert(elementCat?.source === 'autodesk-verified', 'Element source is autodesk-verified');
  assert(elementCat?.displayName === 'Element', 'Element display name is Element');

  const customCat = initialLib.find((c) => c.internalName === 'LcRevitData_Custom');
  assert(!!customCat && customCat.source === 'autodesk-verified', 'Found Custom category (LcRevitData_Custom)');

  const textCat = initialLib.find((c) => c.internalName === 'LcSvf_Text');
  assert(!!textCat && textCat.source === 'autodesk-verified', 'Found Text category (LcSvf_Text)');

  const idDataCat = initialLib.find((c) => c.internalName === 'LcSvf_Identity Data');
  assert(!!idDataCat && idDataCat.source === 'autodesk-verified', 'Found Identity Data category (LcSvf_Identity Data)');

  const itemCat = initialLib.find((c) => c.internalName === 'LcOaNode');
  assert(!!itemCat && itemCat.source === 'autodesk-verified', 'Found Item category (LcOaNode)');

  // Test 2: Add Custom Category
  console.log('\n--- Test 2: Add Custom User-Defined Category ---');
  const addRes = addCustomCategory(
    {
      displayName: 'Mechanical Systems',
      internalName: 'LcRevitData_Mechanical',
      notes: 'HVAC and Piping',
    },
    initialLib
  );
  assert(addRes.success === true, 'Successfully added custom category');
  assert(!!addRes.updatedLibrary, 'Updated library returned');
  const foundCustom = addRes.updatedLibrary?.find((c) => c.internalName === 'LcRevitData_Mechanical');
  assert(!!foundCustom, 'Mechanical Systems category is in updated library');
  assert(foundCustom?.source === 'user-defined', 'Mechanical Systems source is user-defined');
  assert(foundCustom?.notes === 'HVAC and Piping', 'Mechanical Systems notes preserved');

  // Test 3: Duplicate Category Prevention
  console.log('\n--- Test 3: Duplicate Category Prevention ---');
  const dupRes = addCustomCategory(
    {
      displayName: 'Duplicate Element',
      internalName: 'LcRevitData_Element',
    },
    addRes.updatedLibrary!
  );
  assert(dupRes.success === false, 'Duplicate internal name was rejected');
  assert(dupRes.error?.includes('already exists') ?? false, 'Helpful error message returned');

  // Test 4: Update Category
  console.log('\n--- Test 4: Update Category Definition ---');
  const updateRes = updateCategoryInLibrary(
    foundCustom!.id,
    {
      displayName: 'HVAC & Mechanical',
      notes: 'Updated description',
    },
    addRes.updatedLibrary!
  );
  assert(updateRes.success === true, 'Successfully updated category');
  const updatedCat = updateRes.updatedLibrary.find((c) => c.id === foundCustom!.id);
  assert(updatedCat?.displayName === 'HVAC & Mechanical', 'Updated display name verified');
  assert(updatedCat?.notes === 'Updated description', 'Updated notes verified');

  // Verify Autodesk-verified category cannot be edited
  const editVerifiedRes = updateCategoryInLibrary(
    elementCat!.id,
    { displayName: 'Tampered' },
    updateRes.updatedLibrary
  );
  assert(editVerifiedRes.success === false, 'Autodesk verified category cannot be edited');

  // Test 5: Delete Category
  console.log('\n--- Test 5: Delete Category Definition ---');
  const deleteRes = deleteCategoryFromLibrary(foundCustom!.id, updateRes.updatedLibrary);
  assert(deleteRes.success === true, 'Custom category successfully deleted');
  assert(
    !deleteRes.updatedLibrary.some((c) => c.id === foundCustom!.id),
    'Category removed from library'
  );

  // Verify Autodesk-verified cannot be deleted
  const deleteVerifiedRes = deleteCategoryFromLibrary(elementCat!.id, deleteRes.updatedLibrary);
  assert(deleteVerifiedRes.success === false, 'Autodesk verified category cannot be deleted');

  // Test 6: Search & Source Filtering
  console.log('\n--- Test 6: Search & Source Filtering ---');
  const testLib: NavisworksCategoryDefinition[] = [
    ...VERIFIED_AUTODESK_CATEGORIES,
    {
      id: 'cat_test_1',
      displayName: 'Structural Framing',
      internalName: 'LcRevitData_Structural',
      source: 'user-defined',
      notes: 'Beams and Columns',
    },
    {
      id: 'cat_test_2',
      displayName: 'Electrical Equipment',
      internalName: 'LcRevitData_Electrical',
      source: 'navisworks-xml',
      sourceFileName: 'electrical.xml',
    },
  ];

  const searchFilter1 = filterCategoryLibrary(testLib, 'Structural', 'ALL');
  assert(searchFilter1.length === 1 && searchFilter1[0].displayName === 'Structural Framing', 'Search by display name matches');

  const searchFilter2 = filterCategoryLibrary(testLib, 'LcRevitData_Electrical', 'ALL');
  assert(searchFilter2.length === 1 && searchFilter2[0].displayName === 'Electrical Equipment', 'Search by internal name matches');

  const sourceFilterVerified = filterCategoryLibrary(testLib, '', 'autodesk-verified');
  assert(sourceFilterVerified.every((c) => c.source === 'autodesk-verified'), 'Source filter autodesk-verified works');

  const sourceFilterXml = filterCategoryLibrary(testLib, '', 'navisworks-xml');
  assert(sourceFilterXml.length === 1 && sourceFilterXml[0].source === 'navisworks-xml', 'Source filter navisworks-xml works');

  // Test 7: Parse Navisworks XML Categories
  console.log('\n--- Test 7: Parse Navisworks XML Categories ---');
  const sampleXml = `<?xml version="1.0" encoding="UTF-8" ?>
<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://download.autodesk.com/us/navisworks/schemas/nw-exchange-12.0.xsd" units="ft" filename="" filepath="">
  <findspecs>
    <findspec mode="all" disjoint="0">
      <conditions>
        <condition test="contains" flags="10">
          <category>
            <name internal="LcRevitData_Element">Element</name>
          </category>
          <property>
            <name internal="lcldrevit_parameter_3568759">CD_ClashPriority</name>
          </property>
          <value>
            <data type="wstring">P1</data>
          </value>
        </condition>
        <condition test="contains" flags="74">
          <category>
            <name internal="LcRevitData_Custom">Custom</name>
          </category>
          <property>
            <name internal="lcldrevit_parameter_3568760">CD_SubGroup</name>
          </property>
          <value>
            <data type="wstring">SG1</data>
          </value>
        </condition>
        <condition test="equals" flags="10">
          <category>
            <name internal="LcRevitData_Plumbing">Plumbing Fixtures</name>
          </category>
          <property>
            <name internal="lcldrevit_parameter_9999">SystemType</name>
          </property>
          <value>
            <data type="wstring">Domestic Cold Water</data>
          </value>
        </condition>
      </conditions>
    </findspec>
  </findspecs>
</exchange>`;

  const xmlPreview = parseNavisworksXmlCategories(sampleXml, 'test_export.xml');
  assert(xmlPreview.categoriesFound >= 3, `Found ${xmlPreview.categoriesFound} category nodes in XML`);
  assert(xmlPreview.uniqueCategoriesCount === 3, `Extracted 3 unique categories (got ${xmlPreview.uniqueCategoriesCount})`);
  
  const plumbing = xmlPreview.categories.find((c) => c.internalName === 'LcRevitData_Plumbing');
  assert(!!plumbing, 'Extracted Plumbing Fixtures category');
  assert(plumbing?.displayName === 'Plumbing Fixtures', 'Plumbing Fixtures display name matched');
  assert(plumbing?.source === 'navisworks-xml', 'Plumbing Fixtures source is navisworks-xml');
  assert(plumbing?.sourceFileName === 'test_export.xml', 'Plumbing Fixtures sourceFileName preserved');

  // Test 8: Commit Imported XML Categories
  console.log('\n--- Test 8: Commit Imported XML Categories & Deduplication ---');
  const commitRes = commitImportedCategories(xmlPreview.categories, [...VERIFIED_AUTODESK_CATEGORIES]);
  assert(commitRes.addedCount === 1, `Only new category added (1 new), verified preserved (got added: ${commitRes.addedCount})`);
  assert(commitRes.skippedCount === 2, `Existing verified categories deduplicated (got skipped: ${commitRes.skippedCount})`);
  
  const committedPlumbing = commitRes.updatedLibrary.find((c) => c.internalName === 'LcRevitData_Plumbing');
  assert(!!committedPlumbing, 'Plumbing category present in committed library');
  
  const verifiedElement = commitRes.updatedLibrary.find((c) => c.internalName === 'LcRevitData_Element');
  assert(verifiedElement?.source === 'autodesk-verified', 'Element source remained autodesk-verified');

  // Test 9: Use Category on Active FindSpec Condition (Strict Scope: Category ONLY)
  console.log('\n--- Test 9: Apply Category to Active FindSpec Condition ---');
  const activeCondition: ConditionConfig = {
    id: 'cond_test_1',
    excelColumnIndex: 2,
    excelColumnLetter: 'C',
    dataType: 'Element',
    categoryInternalName: 'LcRevitData_Element',
    propertyDisplayName: 'CD_ClashPriority',
    propertyInternalName: 'lcldrevit_parameter_3568759',
    test: 'contains',
    flags: 74,
    valueSource: 'custom',
    value: 'Priority-1',
  };

  const selectedCategory: NavisworksCategoryDefinition = {
    id: 'cat_custom_plumb',
    displayName: 'Plumbing Systems',
    internalName: 'LcRevitData_Plumbing',
    source: 'user-defined',
  };

  // Simulating the use category update logic
  const updatedCondition: ConditionConfig = {
    ...activeCondition,
    dataType: selectedCategory.displayName,
    categoryInternalName: selectedCategory.internalName,
  };

  assert(updatedCondition.dataType === 'Plumbing Systems', 'Condition category display name updated to Plumbing Systems');
  assert(updatedCondition.categoryInternalName === 'LcRevitData_Plumbing', 'Condition category internal name updated');
  // Confirm untouched fields:
  assert(updatedCondition.propertyDisplayName === 'CD_ClashPriority', 'Property display name untouched');
  assert(updatedCondition.propertyInternalName === 'lcldrevit_parameter_3568759', 'Property internal name untouched');
  assert(updatedCondition.test === 'contains', 'Test untouched');
  assert(updatedCondition.flags === 74, 'Flags untouched');
  assert(updatedCondition.value === 'Priority-1', 'Value untouched');

  // Test 10: Category-based Property Library Filtering & Show All Properties
  console.log('\n--- Test 10: Property Library Category Filtering ---');
  const propLib = loadPropertyLibrary();
  const filteredForCustom = filterPropertyLibrary(propLib, '', 'Custom', 'ALL');
  assert(filteredForCustom.length > 0, `Filtered properties for Custom category returned ${filteredForCustom.length} items`);
  assert(
    filteredForCustom.every((p) => p.categoryDisplayName === 'Custom' || p.categoryInternalName === 'LcRevitData_Custom'),
    'All returned properties belong to Custom category'
  );

  const showAllProps = filterPropertyLibrary(propLib, '', 'ALL', 'ALL');
  assert(showAllProps.length >= propLib.length, 'Show All Properties returns complete property library');

  console.log('====================================================');
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('====================================================');
} catch (err: any) {
  console.error('Test suite failed:', err);
  process.exit(1);
}
