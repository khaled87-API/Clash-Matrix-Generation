import React from 'react';
import { renderToString } from 'react-dom/server';
import { createSampleBimClashMatrixWorkbook } from './excel/sampleData';
import { parseClashMatrix } from './clashTests/clashMatrixParser';
import { generateSelectionSets } from './selectionSets/selectionSetGenerator';
import { cloneStandard8BimConditions } from './selectionSets/standardConditions';
import { ClashMatrixConfig } from './types/clashTest';
import { SelectionSetConfig } from './types/selectionSet';
import { ClashTestsPreviewStep } from './components/ClashTestsPreviewStep';

console.log('--- TESTING App DATA FLOW STEP 5 & STEP 6 ---');

// 1. Initial State as in App.tsx
const initialSelectionSetConfig: SelectionSetConfig = {
  folderColumnLetter: 'D',
  folderColumnIndex: 3,
  nameParts: [
    { columnLetter: 'E', columnIndex: 4, separator: '-' },
    { columnLetter: 'F', columnIndex: 5, separator: '' },
  ],
  nameSeparator: '-',
  conditions: cloneStandard8BimConditions(4, 5),
};

const initialClashMatrixConfig: ClashMatrixConfig = {
  rowGroupColumnLetter: 'F',
  rowGroupColumnIndex: 5,
  rowPriorityColumnLetter: 'E',
  rowPriorityColumnIndex: 4,
  columnHeadersRowIndex: 13,
  matrixStartColumnLetter: 'I',
  matrixStartColumnIndex: 8,
  matrixStartRowIndex: 16,
  namingFormat: 'group_v_group',
  hardPrefix: 'H',
  clearancePrefix: 'C',
  unit: 'MM',
  delimiter: '-',
  activeProfileId: 'profile_std_mm',
};

const wb = createSampleBimClashMatrixWorkbook();
const currentData = wb.sheetsData[wb.selectedSheet] || [];

// Simulate App.tsx memo 1: selectionSetResult
const selResult = generateSelectionSets(
  currentData,
  initialSelectionSetConfig,
  initialClashMatrixConfig.matrixStartRowIndex,
  initialClashMatrixConfig.rowGroupColumnIndex
);

// Simulate App.tsx memo 2: clashMatrixResult
const matrixResult = parseClashMatrix(
  currentData,
  initialClashMatrixConfig,
  selResult.selectionSets,
  selResult.selectionSetMapByGroup,
  selResult.selectionSetMapByName
);

console.log('[Step 5 Props check]');
console.log('  matrixSummary.validClashTests:', matrixResult.summary.validClashTests);
console.log('  matrixSummary.hardClashes:', matrixResult.summary.hardClashes);
console.log('  matrixSummary.clearanceClashes:', matrixResult.summary.clearanceClashes);
console.log('  matrixSummary.ignoredBlank:', matrixResult.summary.ignoredBlank);
console.log('  matrixSummary.ignoredNA:', matrixResult.summary.ignoredNA);

console.log('[Step 6 Props check]');
console.log('  clashTests passed to Step 6 count:', matrixResult.clashTests.length);
console.log('  matrixSummary passed to Step 6 count:', matrixResult.summary.validClashTests);

// Render Step 6
const step6Html = renderToString(
  <ClashTestsPreviewStep
    clashTests={matrixResult.clashTests}
    matrixSummary={matrixResult.summary}
    viewFolders={selResult.viewFolders}
    onPrev={() => {}}
    onNext={() => {}}
  />
);

console.log('Step 6 HTML total clash tests present:', step6Html.includes('Total Clash Tests: </span>'));
const totalMatch = step6Html.match(/Total Clash Tests:\s*<\/span>\s*<span[^>]*>([^<]+)<\/span>/);
console.log('Step 6 HTML Total Clash Tests text:', totalMatch ? totalMatch[1].trim() : 'NONE');

// Check first known tests in HTML
const knownTests = [
  'HW0010_v_HW0020',
  'HW0010_v_HW0030',
  'HW0010_v_HW0040',
  'HW0020_v_HW0010',
  'HW0020_v_HW0030',
  'HW0030_v_HW0010',
  'HW0030_v_HW0020',
];

for (const t of knownTests) {
  console.log(`  Contains test "${t}":`, step6Html.includes(t));
}
