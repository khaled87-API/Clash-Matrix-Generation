import { ParsedWorkbook } from '../types/excel';
import { SelectionSetConfig, SelectionSet, ViewFolder } from '../types/selectionSet';
import { ClashMatrixConfig, ClashTest, ClashMatrixSummary, ParsedClashCell } from '../types/clashTest';
import { ProjectSettings, AppValidationIssue, ValidationSummary, MatrixLayoutVerification } from '../types/configuration';
import { validateNavisworksXmlString } from '../xml/xmlValidator';
import { colIndexToLetter } from '../excel/parser';

export function runFullValidation(
  workbook: ParsedWorkbook | null,
  selectionSetConfig: SelectionSetConfig,
  clashMatrixConfig: ClashMatrixConfig,
  selectionSets: SelectionSet[],
  viewFolders: ViewFolder[],
  clashTests: ClashTest[],
  clashSummary: ClashMatrixSummary | null,
  unresolvedPairs: { row: number; col: number; cellAddress: string; reason: string }[],
  projectSettings: ProjectSettings,
  xmlString?: string
): ValidationSummary {
  const issues: AppValidationIssue[] = [];

  // ================= 1. EXCEL VALIDATION =================
  if (!workbook) {
    issues.push({
      id: 'err_no_workbook',
      type: 'error',
      category: 'excel',
      title: 'No Workbook Uploaded',
      description: 'Please upload a Clash Detection Matrix Excel file (.xlsx or .xls).',
    });
  } else {
    if (!workbook.selectedSheet) {
      issues.push({
        id: 'err_no_sheet',
        type: 'error',
        category: 'excel',
        title: 'No Worksheet Selected',
        description: 'Please select a worksheet from the uploaded workbook.',
      });
    }

    if (workbook.totalRows === 0) {
      issues.push({
        id: 'err_empty_sheet',
        type: 'error',
        category: 'excel',
        title: 'Worksheet is Empty',
        description: `The worksheet "${workbook.selectedSheet}" contains 0 data rows.`,
      });
    }
  }

  // ================= 2. SELECTION SETS VALIDATION =================
  if (selectionSets.length === 0) {
    issues.push({
      id: 'err_no_selection_sets',
      type: 'error',
      category: 'selectionSets',
      title: 'No Selection Sets Generated',
      description: 'Check your Folder and Selection Set column mappings. No valid rows were found.',
    });
  } else {
    const seenNames = new Set<string>();
    const seenGuids = new Set<string>();

    selectionSets.forEach((ss) => {
      if (!ss.folder || ss.folder.trim() === '') {
        issues.push({
          id: `err_empty_folder_${ss.id}`,
          type: 'error',
          category: 'selectionSets',
          title: 'Empty Folder Name',
          description: `Selection set from row ${ss.sourceRowIndex + 1} has an empty Folder.`,
          row: ss.sourceRowIndex + 1,
        });
      }

      if (!ss.name || ss.name.trim() === '') {
        issues.push({
          id: `err_empty_name_${ss.id}`,
          type: 'error',
          category: 'selectionSets',
          title: 'Empty Selection Set Name',
          description: `Selection set on row ${ss.sourceRowIndex + 1} has an empty name.`,
          row: ss.sourceRowIndex + 1,
        });
      }

      if (seenNames.has(ss.name)) {
        issues.push({
          id: `warn_dup_name_${ss.name}`,
          type: 'warning',
          category: 'selectionSets',
          title: 'Duplicate Selection Set Name',
          description: `Selection set name "${ss.name}" appears multiple times in the matrix.`,
        });
      }
      seenNames.add(ss.name);

      if (seenGuids.has(ss.guid)) {
        issues.push({
          id: `err_dup_guid_${ss.guid}`,
          type: 'error',
          category: 'selectionSets',
          title: 'Duplicate Selection Set GUID',
          description: `Duplicate GUID detected: ${ss.guid}`,
        });
      }
      seenGuids.add(ss.guid);

      if (ss.conditions.length === 0) {
        issues.push({
          id: `warn_no_conditions_${ss.id}`,
          type: 'warning',
          category: 'selectionSets',
          title: 'Selection Set Has No Conditions',
          description: `Selection set "${ss.name}" (Row ${ss.sourceRowIndex + 1}) has 0 active search conditions.`,
          row: ss.sourceRowIndex + 1,
        });
      }
    });

    if (viewFolders.length === 0) {
      issues.push({
        id: 'err_no_viewfolders',
        type: 'error',
        category: 'selectionSets',
        title: 'No View Folders Created',
        description: 'Selection sets could not be organized into view folders.',
      });
    }
  }

  // ================= 3. CONDITIONS VALIDATION =================
  if (selectionSetConfig.conditions.length === 0) {
    issues.push({
      id: 'warn_zero_cond_config',
      type: 'warning',
      category: 'conditions',
      title: 'No Condition Rules Configured',
      description: 'You have not added any condition rules. Selection sets in Navisworks will have empty findspecs.',
      suggestedFix: 'Click "Add Condition" in Step 3 or load standard Property Presets.',
    });
  } else {
    selectionSetConfig.conditions.forEach((c, idx) => {
      if (!c.propertyDisplayName || !c.propertyDisplayName.trim()) {
        issues.push({
          id: `err_cond_prop_disp_${c.id}`,
          type: 'error',
          category: 'conditions',
          title: `Condition #${idx + 1}: Missing Property Display Name`,
          description: 'Navisworks requires a display property name for search conditions.',
        });
      }
      if (!c.propertyInternalName || !c.propertyInternalName.trim()) {
        issues.push({
          id: `err_cond_prop_int_${c.id}`,
          type: 'error',
          category: 'conditions',
          title: `Condition #${idx + 1}: Missing Property Internal Name`,
          description: 'Navisworks requires an internal property name (e.g. lcldrevit_parameter_3568759).',
        });
      }
      if (isNaN(c.flags) || c.flags === null || c.flags === undefined) {
        issues.push({
          id: `err_cond_flags_${c.id}`,
          type: 'error',
          category: 'conditions',
          title: `Condition #${idx + 1}: Invalid Flags`,
          description: `Flags value must be a valid number (e.g. 10 or 74). Received: "${c.flags}".`,
        });
      }
    });
  }

  // ================= 4. CLASH MATRIX & CELLS VALIDATION =================
  if (clashSummary && clashSummary.invalidCells.length > 0) {
    clashSummary.invalidCells.forEach((inv) => {
      issues.push({
        id: `err_inv_cell_${inv.cellAddress}`,
        type: 'warning',
        category: 'clashMatrix',
        title: `Invalid Matrix Cell: ${inv.cellAddress}`,
        description: inv.error || `Invalid clash cell value: "${inv.raw}". Expected format: H-<mm> or C-<mm>.`,
        location: inv.cellAddress,
        row: inv.row !== undefined ? inv.row + 1 : undefined,
        col: inv.col !== undefined ? inv.col + 1 : undefined,
        suggestedFix: 'Fix the cell value in Excel (e.g. H-500 or C-100) or replace with N/A / blank.',
      });
    });
  }

  if (unresolvedPairs.length > 0) {
    unresolvedPairs.forEach((unres) => {
      issues.push({
        id: `warn_unres_${unres.cellAddress}`,
        type: 'warning',
        category: 'clashMatrix',
        title: `Unresolved Column Header at ${unres.cellAddress}`,
        description: unres.reason,
        location: unres.cellAddress,
        row: unres.row,
        col: unres.col,
      });
    });
  }

  // ================= 5. CLASH TESTS VALIDATION =================
  if (clashTests.length === 0) {
    if (workbook) {
      issues.push({
        id: 'err_matrix_layout_no_data',
        type: 'error',
        category: 'clashMatrix',
        title: 'Configured matrix layout does not contain valid data.',
        description: `Configured matrix layout does not contain valid data. Configured sheet: "${clashMatrixConfig.sheet || workbook.selectedSheet}", Row ID Column: ${colIndexToLetter(clashMatrixConfig.rowGroupColumnIndex)}, Header Row: ${clashMatrixConfig.columnHeadersRowIndex + 1}, Matrix Start Row: ${clashMatrixConfig.matrixStartRowIndex + 1}, Matrix Start Column: ${colIndexToLetter(clashMatrixConfig.matrixStartColumnIndex)}.`,
        suggestedFix: 'Check your Matrix Layout Configuration in Step 5 to ensure coordinates match your Excel file layout.',
      });
    }

    issues.push({
      id: 'warn_zero_tests',
      type: 'warning',
      category: 'clashTests',
      title: '0 Clash Tests Generated',
      description: 'No valid clash tests were found in the configured matrix intersection area.',
      suggestedFix: 'Verify the Matrix Start Column, Start Row, and Header Row in Step 5.',
    });
  } else {
    const seenTestNames = new Set<string>();

    clashTests.forEach((ct) => {
      if (seenTestNames.has(ct.name)) {
        issues.push({
          id: `warn_dup_test_${ct.name}`,
          type: 'warning',
          category: 'clashTests',
          title: `Duplicate Clash Test Name: "${ct.name}"`,
          description: `Multiple clash tests have the same name "${ct.name}". Navisworks requires unique test names in a batch.`,
        });
      }
      seenTestNames.add(ct.name);

      if (ct.toleranceMm <= 0) {
        issues.push({
          id: `err_zero_tol_${ct.id}`,
          type: 'error',
          category: 'clashTests',
          title: `Invalid Tolerance for ${ct.name}`,
          description: `Clash test tolerance must be greater than 0 mm. Value: ${ct.toleranceMm} mm.`,
          location: ct.cellAddress,
        });
      }

      if (!ct.leftLocator || !ct.leftLocator.startsWith('lcop_selection_set_tree/')) {
        issues.push({
          id: `err_left_loc_${ct.id}`,
          type: 'error',
          category: 'clashTests',
          title: `Invalid Left Locator for ${ct.name}`,
          description: `Left locator does not follow Navisworks path format: "${ct.leftLocator}".`,
        });
      }

      if (!ct.rightLocator || !ct.rightLocator.startsWith('lcop_selection_set_tree/')) {
        issues.push({
          id: `err_right_loc_${ct.id}`,
          type: 'error',
          category: 'clashTests',
          title: `Invalid Right Locator for ${ct.name}`,
          description: `Right locator does not follow Navisworks path format: "${ct.rightLocator}".`,
        });
      }
    });
  }

  // ================= 6. XML SYNTAX & SCHEMA VALIDATION =================
  if (xmlString) {
    const xmlRes = validateNavisworksXmlString(xmlString);
    xmlRes.errors.forEach((err, idx) => {
      issues.push({
        id: `err_xml_${idx}`,
        type: 'error',
        category: 'xml',
        title: 'XML Syntax / Schema Error',
        description: err,
      });
    });
    xmlRes.warnings.forEach((warn, idx) => {
      issues.push({
        id: `warn_xml_${idx}`,
        type: 'warning',
        category: 'xml',
        title: 'XML Notice',
        description: warn,
      });
    });
  }

  // Build Matrix Layout Verification info for Step 7 display
  const sheetName = clashMatrixConfig.sheet || workbook?.selectedSheet || '';
  const rowGroupColLetter = clashMatrixConfig.rowGroupColumnLetter || colIndexToLetter(clashMatrixConfig.rowGroupColumnIndex);
  const matrixStartColLetter = clashMatrixConfig.matrixStartColumnLetter || colIndexToLetter(clashMatrixConfig.matrixStartColumnIndex);

  const sampleResolvedTests = clashTests.slice(0, 5).map((ct) => {
    return {
      rowElementId: ct.leftGroup || ct.leftSelectionSet,
      colElementId: ct.rightGroup || ct.rightSelectionSet,
      matrixValue: `${ct.testType === 'hard' ? (clashMatrixConfig.hardPrefix || 'H') : (clashMatrixConfig.clearancePrefix || 'C')}${clashMatrixConfig.delimiter !== undefined ? clashMatrixConfig.delimiter : '-'}${ct.toleranceMm}${clashMatrixConfig.unit || 'MM'}`,
      clashType: ct.testType,
      tolerance: ct.toleranceFormatted,
      testName: ct.name,
      cellAddress: ct.cellAddress,
    };
  });

  const matrixLayoutVerification: MatrixLayoutVerification = {
    sheet: sheetName,
    rowGroupColumnLetter: rowGroupColLetter,
    rowGroupColumnIndex: clashMatrixConfig.rowGroupColumnIndex,
    columnHeadersRowIndex: clashMatrixConfig.columnHeadersRowIndex,
    matrixStartRowIndex: clashMatrixConfig.matrixStartRowIndex,
    matrixStartColumnLetter: matrixStartColLetter,
    matrixStartColumnIndex: clashMatrixConfig.matrixStartColumnIndex,
    hardPrefix: clashMatrixConfig.hardPrefix || 'H',
    clearancePrefix: clashMatrixConfig.clearancePrefix || 'C',
    unit: clashMatrixConfig.unit || 'MM',
    delimiter: clashMatrixConfig.delimiter !== undefined ? clashMatrixConfig.delimiter : '-',
    sampleResolvedTests,
  };

  // Count totals
  const errorCount = issues.filter((i) => i.type === 'error').length;
  const warningCount = issues.filter((i) => i.type === 'warning').length;
  const infoCount = issues.filter((i) => i.type === 'info').length;

  return {
    isValid: errorCount === 0,
    errorCount,
    warningCount,
    infoCount,
    issues,
    matrixLayoutVerification,
  };
}
