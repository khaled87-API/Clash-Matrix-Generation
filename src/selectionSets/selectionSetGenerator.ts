import { v4 as uuidv4 } from 'uuid';
import { SelectionSetConfig, SelectionSet, ViewFolder } from '../types/selectionSet';
import { buildCondition } from './conditionBuilder';

export interface SelectionSetGenerationResult {
  selectionSets: SelectionSet[];
  viewFolders: ViewFolder[];
  selectionSetMapByGroup: Map<string, SelectionSet>; // e.g. "AR0010" -> SelectionSet
  selectionSetMapByName: Map<string, SelectionSet>; // e.g. "A-AR0010" -> SelectionSet
  errors: { row: number; reason: string }[];
}

/**
 * Generates Selection Sets and View Folders from Excel rows based on SelectionSetConfig
 */
export function generateSelectionSets(
  data: any[][],
  config: SelectionSetConfig,
  startRowIndex: number = 0,
  rowGroupColumnIndex?: number
): SelectionSetGenerationResult {
  const selectionSets: SelectionSet[] = [];
  const folderMap = new Map<string, { guid: string; items: SelectionSet[] }>();
  const selectionSetMapByGroup = new Map<string, SelectionSet>();
  const selectionSetMapByName = new Map<string, SelectionSet>();
  const errors: { row: number; reason: string }[] = [];

  const seenSetNames = new Set<string>();

  for (let r = startRowIndex; r < data.length; r++) {
    const row = data[r];
    if (!row || !Array.isArray(row)) continue;

    // Check if the entire row is completely empty
    const isEntireRowEmpty = row.every((c) => c === undefined || c === null || String(c).trim() === '');
    if (isEntireRowEmpty) continue;

    // 1. Extract Folder name
    const rawFolder = row[config.folderColumnIndex];
    const folder = rawFolder !== undefined && rawFolder !== null ? String(rawFolder).trim() : '';

    // 2. Extract Selection Set name parts
    const namePartsStrings: string[] = [];
    let hasValidPart = false;

    config.nameParts.forEach((part) => {
      const cellVal = row[part.columnIndex];
      const partStr = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : '';
      if (partStr) {
        hasValidPart = true;
        namePartsStrings.push(partStr);
      }
    });

    if (!hasValidPart && !folder) {
      // Probably an empty or matrix spacer row, ignore quietly
      continue;
    }

    if (!folder) {
      errors.push({
        row: r + 1,
        reason: `Row ${r + 1} has selection set data but the Folder column (${config.folderColumnLetter}) is empty.`,
      });
      continue;
    }

    if (namePartsStrings.length === 0) {
      errors.push({
        row: r + 1,
        reason: `Row ${r + 1} could not generate a Selection Set Name because configured name columns are empty.`,
      });
      continue;
    }

    // Build Selection Set Name (e.g. "A-AR0010" or "AR0010")
    const setName = namePartsStrings.join(config.nameSeparator || '-');

    // 3. Build conditions for this row strictly matching config.conditions
    const rowConditions = config.conditions
      .map((condConfig) => {
        let cellVal = '';
        if (
          condConfig.excelColumnIndex !== undefined &&
          condConfig.excelColumnIndex !== null &&
          condConfig.excelColumnIndex >= 0 &&
          row[condConfig.excelColumnIndex] !== undefined
        ) {
          cellVal = row[condConfig.excelColumnIndex];
        }
        const valStr = cellVal !== undefined && cellVal !== null ? String(cellVal).trim() : '';
        return buildCondition(condConfig, valStr);
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    // Extract group code (e.g. "AR0010") from group column or name parts
    let groupCode = '';
    if (rowGroupColumnIndex !== undefined && row[rowGroupColumnIndex]) {
      groupCode = String(row[rowGroupColumnIndex]).trim();
    }
    if (!groupCode) {
      groupCode = namePartsStrings[namePartsStrings.length - 1] || setName;
    }

    // Extract priority code if present (e.g. "A")
    let clashPriority = '';
    if (namePartsStrings.length > 1) {
      clashPriority = namePartsStrings[0];
    }

    const locator = `lcop_selection_set_tree/${folder}/${setName}`;
    const setKey = `${folder}/${setName}`;

    // Check if Selection Set already exists (Multi-Condition rows in Excel)
    const existingSet = selectionSetMapByName.get(setName);
    if (existingSet && existingSet.folder === folder) {
      // Append conditions from this row to the existing Selection Set
      existingSet.conditions.push(...rowConditions);
      continue;
    }

    const guid = uuidv4();
    const setItem: SelectionSet = {
      id: `ss_${r}_${guid.slice(0, 8)}`,
      guid,
      name: setName,
      folder,
      clashPriority,
      clashGroup: groupCode,
      sourceRowIndex: r,
      conditions: [...rowConditions],
      locator,
    };

    selectionSets.push(setItem);
    selectionSetMapByName.set(setName, setItem);
    if (groupCode) {
      selectionSetMapByGroup.set(groupCode, setItem);
    }

    // Add to ViewFolder bucket
    if (!folderMap.has(folder)) {
      folderMap.set(folder, {
        guid: uuidv4(),
        items: [],
      });
    }
    folderMap.get(folder)!.items.push(setItem);
  }

  // Convert folderMap to ViewFolder list
  const viewFolders: ViewFolder[] = Array.from(folderMap.entries()).map(([name, data]) => ({
    name,
    guid: data.guid,
    selectionSets: data.items,
  }));

  return {
    selectionSets,
    viewFolders,
    selectionSetMapByGroup,
    selectionSetMapByName,
    errors,
  };
}
