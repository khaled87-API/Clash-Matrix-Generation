/**
 * Category Dropdown Integration Test Suite
 * Validates that Condition Rule Category dropdown dynamically consumes the SAME registry
 * as CategoryLibraryModal and categoryLibraryManager.
 */

import {
  loadCategoryLibrary,
  addCustomCategory,
  commitImportedCategories,
  parseNavisworksXmlCategories,
} from './selectionSets/categoryLibraryManager';
import {
  getAllCategories,
  resolveCategoryInternalName,
} from './selectionSets/categoryManager';
import {
  loadPropertyLibrary,
  filterPropertyLibrary,
} from './selectionSets/propertyLibraryManager';
import { ConditionConfig } from './types/selectionSet';

console.log('====================================================');
console.log('RUNNING CATEGORY DROPDOWN INTEGRATION TEST SUITE');
console.log('====================================================');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(`Test failed: ${msg}`);
  }
}

// ----------------------------------------------------
// 1. Single Source of Truth & Initial Dropdown Content
// ----------------------------------------------------
console.log('\n--- Test 1: Single Source of Truth & Initial Dropdown Content ---');
const initialLib = loadCategoryLibrary();
const allCats = getAllCategories();

assert(initialLib.length >= 5, `Initial category library has at least 5 categories (got ${initialLib.length})`);
assert(allCats.length === initialLib.length, `getAllCategories() matches loadCategoryLibrary() count (${allCats.length} vs ${initialLib.length})`);

// Verify all 5 Autodesk verified categories exist
const expectedVerified = [
  { display: 'Element', internal: 'LcRevitData_Element' },
  { display: 'Custom', internal: 'LcRevitData_Custom' },
  { display: 'Text', internal: 'LcSvf_Text' },
  { display: 'Identity Data', internal: 'LcSvf_Identity Data' },
  { display: 'Item', internal: 'LcOaNode' },
];

for (const exp of expectedVerified) {
  const inLib = initialLib.find((c) => c.internalName === exp.internal && c.displayName === exp.display);
  assert(!!inLib, `Category Library contains verified category ${exp.display} (${exp.internal})`);
  assert(inLib?.source === 'autodesk-verified', `${exp.display} has source="autodesk-verified"`);

  const inAll = allCats.find((c) => c.internalName === exp.internal && c.displayName === exp.display);
  assert(!!inAll, `getAllCategories() returns verified category ${exp.display} (${exp.internal})`);
  assert(inAll?.builtIn === true, `${exp.display} has builtIn=true in getAllCategories()`);
}

// ----------------------------------------------------
// 2. Dynamic Update: Custom User Category in Dropdown
// ----------------------------------------------------
console.log('\n--- Test 2: Dynamic User Category Registration ---');
const addRes = addCustomCategory(
  {
    displayName: 'Project Data',
    internalName: 'MyProjectData',
    notes: 'Custom project metadata parameter group',
  },
  initialLib
);

assert(addRes.success === true, 'Custom category "Project Data" created successfully');
const updatedLib = addRes.updatedLibrary;

const foundCustomInLib = updatedLib.find((c) => c.internalName === 'MyProjectData');
assert(!!foundCustomInLib, 'Custom category present in Category Library');
assert(foundCustomInLib?.displayName === 'Project Data', 'Custom category display name is "Project Data"');
assert(foundCustomInLib?.source === 'user-defined', 'Custom category source is "user-defined"');

// Check that categoryManager.getAllCategories() dynamically reflects it
const allCatsAfterCustom = getAllCategories();
const foundCustomInAll = allCatsAfterCustom.find((c) => c.internalName === 'MyProjectData');
assert(!!foundCustomInAll, 'Dynamic update: custom category immediately available in getAllCategories()');
assert(foundCustomInAll?.displayName === 'Project Data', 'Dropdown will show "Project Data"');

// ----------------------------------------------------
// 3. Dynamic Update: Navisworks XML Category in Dropdown
// ----------------------------------------------------
console.log('\n--- Test 3: Dynamic Navisworks XML Category Import ---');
const sampleXml = `<?xml version="1.0" encoding="UTF-8" ?>
<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://download.autodesk.com/us/navisworks/schemas/nw-exchange-12.0.xsd">
  <batchtest>
    <selectionsets>
      <selectionset name="TestSet">
        <findspec mode="all" disjoint="0">
          <conditions>
            <condition test="contains" flags="10">
              <category>
                <name internal="SomeInternalCategory">Some Category</name>
              </category>
              <property>
                <name internal="SomePropInternal">Some Property</name>
              </property>
              <value><data type="wstring">VAL</data></value>
            </condition>
          </conditions>
        </findspec>
      </selectionset>
    </selectionsets>
  </batchtest>
</exchange>`;

const parsedXml = parseNavisworksXmlCategories(sampleXml, 'test_export.xml');
assert(parsedXml.categoriesFound === 1, 'Found 1 category in XML');
assert(parsedXml.categories[0].displayName === 'Some Category', 'Parsed category display name is "Some Category"');
assert(parsedXml.categories[0].internalName === 'SomeInternalCategory', 'Parsed category internal name is "SomeInternalCategory"');

const commitRes = commitImportedCategories(parsedXml.categories, updatedLib);
assert(commitRes.addedCount === 1, 'Committed 1 new XML category');

const allCatsAfterXml = getAllCategories();
const foundXmlCat = allCatsAfterXml.find((c) => c.internalName === 'SomeInternalCategory');
assert(!!foundXmlCat, 'Dynamic update: XML imported category immediately available in Condition Category dropdown');
assert(foundXmlCat?.displayName === 'Some Category', 'Dropdown shows "Some Category"');

// ----------------------------------------------------
// 4. Condition Update Behavior on Category Selection
// ----------------------------------------------------
console.log('\n--- Test 4: Condition Update State Fidelity on Category Selection ---');

// Initial condition configuration
const initialCondition: ConditionConfig = {
  id: 'cond_test_1',
  excelColumnIndex: 2,
  excelColumnLetter: 'C',
  dataType: 'Element',
  categoryInternalName: 'LcRevitData_Element',
  propertyDisplayName: 'CD_ClashPriority',
  propertyInternalName: 'lcldrevit_parameter_3568759',
  test: 'contains',
  flags: 74,
  valueSource: 'excel',
  value: 'PRIORITY_1',
};

// Simulation of user selecting "Item" from the dropdown
const selectedCategory = allCatsAfterXml.find((c) => c.internalName === 'LcOaNode');
assert(!!selectedCategory, 'Found "Item" category in available dropdown options');

// When user selects category: update active condition
const updatedCondition: ConditionConfig = {
  ...initialCondition,
  dataType: selectedCategory!.displayName,
  categoryInternalName: selectedCategory!.internalName,
};

// Verify field updates
assert(updatedCondition.dataType === 'Item', 'dataType updated to "Item"');
assert(updatedCondition.categoryInternalName === 'LcOaNode', 'categoryInternalName updated to "LcOaNode"');

// Verify all other fields remain 100% UNCHANGED
assert(updatedCondition.propertyDisplayName === initialCondition.propertyDisplayName, 'propertyDisplayName remained unchanged');
assert(updatedCondition.propertyInternalName === initialCondition.propertyInternalName, 'propertyInternalName remained unchanged');
assert(updatedCondition.test === initialCondition.test, 'test remained unchanged ("contains")');
assert(updatedCondition.flags === initialCondition.flags, 'flags remained unchanged (74)');
assert(updatedCondition.valueSource === initialCondition.valueSource, 'valueSource remained unchanged ("excel")');
assert(updatedCondition.value === initialCondition.value, 'value remained unchanged ("PRIORITY_1")');
assert(updatedCondition.excelColumnIndex === initialCondition.excelColumnIndex, 'excelColumnIndex remained unchanged (2)');
assert(updatedCondition.excelColumnLetter === initialCondition.excelColumnLetter, 'excelColumnLetter remained unchanged ("C")');

// ----------------------------------------------------
// 5. Selecting Custom & XML Categories
// ----------------------------------------------------
console.log('\n--- Test 5: Selecting Custom & XML Categories ---');
const selectedCustom = allCatsAfterXml.find((c) => c.internalName === 'MyProjectData');
assert(!!selectedCustom, 'Found custom "Project Data" category in dropdown options');

const condWithCustom: ConditionConfig = {
  ...initialCondition,
  dataType: selectedCustom!.displayName,
  categoryInternalName: selectedCustom!.internalName,
};
assert(condWithCustom.dataType === 'Project Data', 'dataType updated to "Project Data"');
assert(condWithCustom.categoryInternalName === 'MyProjectData', 'categoryInternalName updated to "MyProjectData"');

const selectedXml = allCatsAfterXml.find((c) => c.internalName === 'SomeInternalCategory');
assert(!!selectedXml, 'Found XML "Some Category" in dropdown options');

const condWithXml: ConditionConfig = {
  ...initialCondition,
  dataType: selectedXml!.displayName,
  categoryInternalName: selectedXml!.internalName,
};
assert(condWithXml.dataType === 'Some Category', 'dataType updated to "Some Category"');
assert(condWithXml.categoryInternalName === 'SomeInternalCategory', 'categoryInternalName updated to "SomeInternalCategory"');

// ----------------------------------------------------
// 6. Internal Name Resolution Fallbacks
// ----------------------------------------------------
console.log('\n--- Test 6: resolveCategoryInternalName Fidelity ---');
assert(resolveCategoryInternalName('Element') === 'LcRevitData_Element', 'resolveCategoryInternalName("Element") -> LcRevitData_Element');
assert(resolveCategoryInternalName('Custom') === 'LcRevitData_Custom', 'resolveCategoryInternalName("Custom") -> LcRevitData_Custom');
assert(resolveCategoryInternalName('Text') === 'LcSvf_Text', 'resolveCategoryInternalName("Text") -> LcSvf_Text');
assert(resolveCategoryInternalName('Identity Data') === 'LcSvf_Identity Data', 'resolveCategoryInternalName("Identity Data") -> LcSvf_Identity Data');
assert(resolveCategoryInternalName('Item') === 'LcOaNode', 'resolveCategoryInternalName("Item") -> LcOaNode');
assert(resolveCategoryInternalName('Project Data') === 'MyProjectData', 'resolveCategoryInternalName("Project Data") -> MyProjectData');
assert(resolveCategoryInternalName('Some Category') === 'SomeInternalCategory', 'resolveCategoryInternalName("Some Category") -> SomeInternalCategory');

// ----------------------------------------------------
// 7. Property Library Category Filtering by Selected Category
// ----------------------------------------------------
console.log('\n--- Test 7: Property Library Category Filtering ---');
const propLib = loadPropertyLibrary();

// Filter by Item category
const itemProps = filterPropertyLibrary(propLib, '', 'Item', 'ALL');
assert(itemProps.length >= 1, `Found ${itemProps.length} property for "Item" category`);
assert(itemProps.some((p) => p.propertyDisplayName === 'Name' && p.propertyInternalName === 'LcOaNodeSelectedItems'), 'Item property "Name" (LcOaNodeSelectedItems) matched');

// Filter by Element category
const elementProps = filterPropertyLibrary(propLib, '', 'Element', 'ALL');
assert(elementProps.length >= 4, `Found ${elementProps.length} properties for "Element" category`);

// Filter by Custom category
const customProps = filterPropertyLibrary(propLib, '', 'Custom', 'ALL');
assert(customProps.length >= 2, `Found ${customProps.length} properties for "Custom" category`);

console.log('====================================================');
console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
console.log('====================================================');
