import { createSampleBimClashMatrixWorkbook } from './excel/sampleData';
import { generateSelectionSets } from './selectionSets/selectionSetGenerator';
import { parseClashMatrix } from './clashTests/clashMatrixParser';
import { cloneStandard8BimConditions } from './selectionSets/standardConditions';
import { ClashMatrixConfig } from './types/clashTest';
import { SelectionSetConfig } from './types/selectionSet';

console.log('--- RUNNING DATAFLOW TEST ---');

// 1. Initial State from App.tsx:
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

console.log('Workbook rows:', currentData.length);

const selectionSetResult = generateSelectionSets(
  currentData,
  initialSelectionSetConfig,
  initialClashMatrixConfig.matrixStartRowIndex,
  initialClashMatrixConfig.rowGroupColumnIndex
);

console.log('Selection Sets count:', selectionSetResult.selectionSets.length);
console.log('Selection Sets by Group keys:', Array.from(selectionSetResult.selectionSetMapByGroup.keys()));
console.log('Selection Sets by Name keys:', Array.from(selectionSetResult.selectionSetMapByName.keys()));

const clashMatrixResult = parseClashMatrix(
  currentData,
  initialClashMatrixConfig,
  selectionSetResult.selectionSets,
  selectionSetResult.selectionSetMapByGroup,
  selectionSetResult.selectionSetMapByName
);

console.log('Clash tests produced:', clashMatrixResult.clashTests.length);
console.log('Summary valid tests:', clashMatrixResult.summary.validClashTests);
console.log('Summary hard:', clashMatrixResult.summary.hardClashes);
console.log('Summary clearance:', clashMatrixResult.summary.clearanceClashes);
console.log('Unresolved pairs:', clashMatrixResult.unresolvedPairs.length);
if (clashMatrixResult.unresolvedPairs.length > 0) {
  console.log('Sample unresolved:', clashMatrixResult.unresolvedPairs.slice(0, 5));
}
