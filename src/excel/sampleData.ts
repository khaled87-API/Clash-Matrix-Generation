import * as XLSX from 'xlsx';
import { ParsedWorkbook } from '../types/excel';
import { parseExcelBuffer } from './parser';

export function createSampleBimClashMatrixWorkbook(): ParsedWorkbook {
  const rows: any[][] = [];

  // Rows 0-12: Title, Project Info, Notes, Legend
  rows.push(['BIM CLASH DETECTION MATRIX — HIGHWAYS & INFRASTRUCTURE']); // Row 1
  rows.push(['Project: Major Highway & Bridge Infrastructure Scheme']); // Row 2
  rows.push(['Version: V2.1 | Standard: PAS 1192 / ISO 19650 | Navisworks Clash Detective Exchange']); // Row 3
  rows.push([]); // Row 4
  rows.push(['Document Ref: CDM-HW-001 | Revision: P04']); // Row 5
  rows.push(['Tolerances: H = Hard Clash, C = Clearance Clash (values in mm)']); // Row 6
  rows.push([]); // Row 7
  rows.push(['Matrix Legend & Conventions:']); // Row 8
  rows.push(['H-500: Hard clash with 500mm tolerance', 'C-100: Clearance clash with 100mm tolerance', 'n/a: Not applicable / ignored']); // Row 9
  rows.push(['H-400: Hard clash with 400mm tolerance', 'H-100: Hard clash with 100mm tolerance', 'C-50: Clearance clash with 50mm tolerance']); // Row 10
  rows.push([]); // Row 11
  rows.push(['Note: Column F contains Row Element IDs. Row 14 contains Column Element IDs.']); // Row 12
  rows.push([]); // Row 13

  // Highway & Infrastructure elements
  const elements = [
    { folder: 'Highways', discipline: 'HW', priority: 'A', group: 'HW0010', uniclass: 'Pr_35_31_14', desc: 'Masts and poles' },
    { folder: 'Highways', discipline: 'HW', priority: 'A', group: 'HW0020', uniclass: 'Pr_20_85_14', desc: 'Pavement Structure' },
    { folder: 'Highways', discipline: 'HW', priority: 'A', group: 'HW0030', uniclass: 'Pr_25_30_16', desc: 'Kerbs and edging' },
    { folder: 'Highways', discipline: 'HW', priority: 'B', group: 'HW0040', uniclass: 'Pr_30_59_24', desc: 'Footway Structure' },
    { folder: 'Highways', discipline: 'HW', priority: 'B', group: 'HW0050', uniclass: 'Pr_30_59_98', desc: 'Safety Barriers' },
    { folder: 'Bridge - Structures', discipline: 'ST', priority: 'A', group: 'ST0510', uniclass: 'Pr_20_85_15', desc: 'Abutments & Piers' },
    { folder: 'Bridge - Structures', discipline: 'ST', priority: 'A', group: 'ST0520', uniclass: 'Pr_20_85_32', desc: 'Bridge Deck Girders' },
    { folder: 'Bridge - Structures', discipline: 'ST', priority: 'A', group: 'ST0530', uniclass: 'Pr_20_29_31', desc: 'Piled Foundations' },
    { folder: 'Drainage', discipline: 'DR', priority: 'A', group: 'DR2010', uniclass: 'Pr_65_52_63', desc: 'Carrier Drains' },
    { folder: 'Drainage', discipline: 'DR', priority: 'A', group: 'DR2020', uniclass: 'Pr_65_54_95', desc: 'Manholes & Gullies' },
    { folder: 'Lighting & Comms', discipline: 'EL', priority: 'A', group: 'EL4010', uniclass: 'Pr_65_70_12', desc: 'Lighting Columns' },
    { folder: 'Lighting & Comms', discipline: 'EL', priority: 'B', group: 'EL4020', uniclass: 'Pr_65_70_15', desc: 'Ducting Networks' },
  ];

  // Metadata Columns (A to H, indices 0 to 7):
  // Col A (0): Project / Blank
  // Col B (1): Stage
  // Col C (2): Category / Group (e.g. "Highways", "Bridge - Structures")
  // Col D (3): Discipline / Code (e.g. "HW", "ST")
  // Col E (4): Priority (e.g. "A", "B")
  // Col F (5): ACTUAL ELEMENT ID (e.g. "HW0010", "HW0020", "HW0030", "ST0510")
  // Col G (6): Classification / Uniclass
  // Col H (7): Description (e.g. "Masts and poles", "Pavement Structure")
  // Col I+ (8+): Matrix columns

  // Row 14 (Index 13): Column Element IDs in columns I+ (e.g. HW0010, HW0020, HW0030, ST0510...)
  const row14ElementIds = [
    '', '', '', '', '', 'CD_Clash Group', '', 'Element ID',
    ...elements.map((e) => e.group),
  ];
  rows.push(row14ElementIds); // Row index 13 -> Excel Row 14

  // Row 15 (Index 14): Discipline Codes
  const row15Codes = [
    '', '', '', '', '', 'CD_Discipline', '', 'Discipline',
    ...elements.map((e) => e.discipline),
  ];
  rows.push(row15Codes); // Row index 14 -> Excel Row 15

  // Row 16 (Index 15): Element Descriptions
  const row16Descriptions = [
    'Stage', 'Discipline', 'Category / Group', 'Discipline Code', 'Priority', 'Element ID', 'Uniclass Code', 'Element Description',
    ...elements.map((e) => e.desc),
  ];
  rows.push(row16Descriptions); // Row index 15 -> Excel Row 16

  // Clash Rules Matrix definition
  const clashMatrixRules: Record<string, Record<string, string>> = {
    HW0010: { HW0010: 'blank', HW0020: 'H-400', HW0030: 'C-100', HW0040: 'C-100', ST0510: 'H-500', ST0520: 'H-500', DR2010: 'C-100', EL4010: 'H-200' },
    HW0020: { HW0010: 'H-400', HW0020: 'blank', HW0030: 'H-100', HW0040: 'H-100', ST0510: 'H-500', ST0520: 'H-500', DR2010: 'H-500', DR2020: 'H-500', EL4010: 'H-500' },
    HW0030: { HW0010: 'C-100', HW0020: 'H-100', HW0030: 'blank', HW0040: 'H-100', ST0510: 'H-500', DR2020: 'H-300', EL4010: 'C-100' },
    HW0040: { HW0010: 'C-100', HW0020: 'H-100', HW0030: 'H-100', HW0040: 'blank', ST0510: 'H-500', DR2010: 'H-300', EL4010: 'C-100' },
    HW0050: { HW0010: 'C-100', HW0020: 'H-500', HW0030: 'C-100', HW0050: 'blank', ST0510: 'H-500', ST0520: 'H-500', EL4010: 'C-100' },
    ST0510: { HW0010: 'H-500', HW0020: 'H-500', HW0030: 'H-500', HW0040: 'H-500', HW0050: 'H-500', ST0510: 'blank', ST0520: 'blank', DR2010: 'H-500', EL4010: 'H-500' },
    ST0520: { HW0010: 'H-500', HW0020: 'H-500', HW0050: 'H-500', ST0510: 'blank', ST0520: 'blank', ST0530: 'blank', DR2010: 'H-500', EL4010: 'H-500' },
    ST0530: { ST0510: 'blank', ST0520: 'blank', ST0530: 'blank', DR2010: 'H-500', DR2020: 'H-500', EL4020: 'H-500' },
    DR2010: { HW0010: 'C-100', HW0020: 'H-500', HW0040: 'H-300', ST0510: 'H-500', ST0520: 'H-500', ST0530: 'H-500', DR2010: 'blank', DR2020: 'C-50', EL4020: 'C-100' },
    DR2020: { HW0020: 'H-500', HW0030: 'H-300', ST0530: 'H-500', DR2010: 'C-50', DR2020: 'blank', EL4020: 'C-100' },
    EL4010: { HW0010: 'H-200', HW0020: 'H-500', HW0030: 'C-100', HW0040: 'C-100', HW0050: 'C-100', ST0510: 'H-500', ST0520: 'H-500', EL4010: 'blank' },
    EL4020: { ST0530: 'H-500', DR2010: 'C-100', DR2020: 'C-100', EL4010: 'blank', EL4020: 'blank' },
  };

  // Row 17+ (Index 16+): Matrix data rows
  elements.forEach((rowElem) => {
    const rowMeta = [
      'Stage 4', // Col A
      rowElem.discipline, // Col B
      rowElem.folder, // Category / Group (Col C) e.g. "Highways"
      rowElem.discipline, // Folder / Discipline (Col D) e.g. "HW"
      rowElem.priority, // CD_Clash Priority (Col E) e.g. "A"
      rowElem.group, // CD_Clash Group / ELEMENT ID (Col F) e.g. "HW0010"
      rowElem.uniclass, // Uniclass (Col G)
      rowElem.desc, // Description (Col H) e.g. "Masts and poles"
    ];

    const matrixValues = elements.map((colElem) => {
      const rowRules = clashMatrixRules[rowElem.group];
      if (rowRules && rowRules[colElem.group]) {
        return rowRules[colElem.group];
      }
      return 'n/a';
    });

    rows.push([...rowMeta, ...matrixValues]);
  });

  // Convert to XLSX workbook buffer and parse
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CDM_Highways_Matrix');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return parseExcelBuffer(wbout, 'Book2.xlsx');
}
