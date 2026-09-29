import { ParsedClashCell, ClashTestType, MatrixToleranceUnit } from '../types/clashTest';

/**
 * Options for configuring clash value parsing
 */
export interface ParseClashValueOptions {
  hardPrefix?: string; // e.g. 'H', 'HR' (default: 'H')
  clearancePrefix?: string; // e.g. 'C', 'CR' (default: 'C')
  unit?: MatrixToleranceUnit; // 'MM' | 'CM' | 'M' | 'IN' | 'FT' (default: 'MM')
  delimiter?: string; // e.g. '-', '_', '', ' ' (default: '-')
}

/**
 * Formats a meter tolerance number to exactly 10 decimal places as expected by Autodesk Navisworks XML
 * e.g., 0.5 -> "0.5000000000", 0.1 -> "0.1000000000", 1 -> "1.0000000000"
 */
export function formatToleranceToNavisworksMeters(meters: number): string {
  if (isNaN(meters) || meters < 0) return '0.0000000000';
  return meters.toFixed(10);
}

/**
 * Converts a numeric value in a specified BIM unit to meters
 */
export function convertUnitToMeters(value: number, unit: MatrixToleranceUnit): number {
  if (isNaN(value) || value < 0) return 0;
  switch (unit) {
    case 'MM':
      return value * 0.001;
    case 'CM':
      return value * 0.01;
    case 'M':
      return value * 1.0;
    case 'IN':
      return value * 0.0254;
    case 'FT':
      return value * 0.3048;
    default:
      return value * 0.001;
  }
}

/**
 * Converts a numeric value in a specified BIM unit to millimeters (for display compatibility)
 */
export function convertUnitToMm(value: number, unit: MatrixToleranceUnit): number {
  if (isNaN(value) || value < 0) return 0;
  switch (unit) {
    case 'MM':
      return value;
    case 'CM':
      return value * 10.0;
    case 'M':
      return value * 1000.0;
    case 'IN':
      return value * 25.4;
    case 'FT':
      return value * 304.8;
    default:
      return value;
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parses a Clash Matrix cell value (e.g. "H-500", "C-100", "HR-1", "CR-0.5", "n/a", "blank")
 * Single source of truth for parsing clash matrix definitions with configurable profiles.
 */
export function parseClashValue(
  rawVal: any,
  options?: ParseClashValueOptions,
  cellAddress?: string,
  row?: number,
  col?: number
): ParsedClashCell {
  if (rawVal === undefined || rawVal === null) {
    return { raw: '', ignored: true, ignoredReason: 'blank', cellAddress, row, col };
  }

  const str = String(rawVal).trim();
  const lower = str.toLowerCase();

  // 1. Check for blank / empty / whitespace
  if (str === '') {
    return { raw: str, ignored: true, ignoredReason: 'blank', cellAddress, row, col };
  }

  // 2. Check for N/A, blank, dash or ignored keywords
  if (
    lower === 'n/a' ||
    lower === 'na' ||
    lower === 'n / a' ||
    lower === 'blank' ||
    lower === '-' ||
    lower === '--' ||
    lower === 'none' ||
    lower === 'null' ||
    lower === 'nil'
  ) {
    return { raw: str, ignored: true, ignoredReason: 'n/a', cellAddress, row, col };
  }

  const hardPrefix = (options?.hardPrefix || 'H').trim();
  const clearancePrefix = (options?.clearancePrefix || 'C').trim();
  const unit: MatrixToleranceUnit = options?.unit || 'MM';
  const delimiter = options?.delimiter !== undefined ? options.delimiter : '-';

  // Build regular expression dynamically matching the configured prefix and delimiter
  // e.g. prefix: "HR" or "CR", delimiter: "-", unit: "M"
  const hEsc = escapeRegex(hardPrefix);
  const cEsc = escapeRegex(clearancePrefix);
  const dEsc = delimiter !== '' ? escapeRegex(delimiter) : '';

  // Match pattern: ^(Prefix)\s*(delimiter)\s*(number)\s*(unit suffix)?$
  let patternStr: string;
  if (delimiter === '-') {
    patternStr = `^(${hEsc}|${cEsc})\\s*[-–—]\\s*(\\d+(?:\\.\\d+)?)\\s*(?:${escapeRegex(unit)}|mm|cm|m|in|ft)?$`;
  } else if (delimiter === '') {
    patternStr = `^(${hEsc}|${cEsc})\\s*(\\d+(?:\\.\\d+)?)\\s*(?:${escapeRegex(unit)}|mm|cm|m|in|ft)?$`;
  } else if (delimiter === ' ') {
    patternStr = `^(${hEsc}|${cEsc})\\s+(\\d+(?:\\.\\d+)?)\\s*(?:${escapeRegex(unit)}|mm|cm|m|in|ft)?$`;
  } else {
    patternStr = `^(${hEsc}|${cEsc})\\s*${dEsc}\\s*(\\d+(?:\\.\\d+)?)\\s*(?:${escapeRegex(unit)}|mm|cm|m|in|ft)?$`;
  }

  const regex = new RegExp(patternStr, 'i');
  const match = str.match(regex);

  if (match) {
    const prefixMatched = match[1];
    const numStr = match[2];
    const numVal = parseFloat(numStr);

    if (isNaN(numVal) || numVal < 0) {
      return {
        raw: str,
        error: `Tolerance value must be a positive number: "${str}"`,
        cellAddress,
        row,
        col,
      };
    }

    const isHard = prefixMatched.toUpperCase() === hardPrefix.toUpperCase();
    const isClearance = prefixMatched.toUpperCase() === clearancePrefix.toUpperCase();

    if (!isHard && !isClearance) {
      return {
        raw: str,
        error: `Unrecognized clash prefix in "${str}". Expected "${hardPrefix}" (Hard) or "${clearancePrefix}" (Clearance).`,
        cellAddress,
        row,
        col,
      };
    }

    const type: ClashTestType = isHard ? 'hard' : 'clearance';
    const toleranceMeters = convertUnitToMeters(numVal, unit);
    const toleranceMm = convertUnitToMm(numVal, unit);

    return {
      raw: str,
      type,
      toleranceRaw: numVal,
      toleranceUnit: unit,
      toleranceMm,
      toleranceMeters,
      cellAddress,
      row,
      col,
    };
  }

  // 4. Return clear error explaining expected format
  const sampleNum = unit === 'M' ? '1' : unit === 'CM' ? '10' : unit === 'IN' ? '4' : unit === 'FT' ? '0.5' : '100';
  const sampleDelim = delimiter !== '' ? delimiter : '';
  return {
    raw: str,
    error: `Invalid clash definition: "${str}". Expected format is ${hardPrefix}${sampleDelim}${sampleNum} (Hard) or ${clearancePrefix}${sampleDelim}${sampleNum} (Clearance) with unit "${unit}".`,
    cellAddress,
    row,
    col,
  };
}

/**
 * Backward compatibility wrapper delegating to parseClashValue
 */
export function parseClashCell(
  rawVal: any,
  cellAddress?: string,
  row?: number,
  col?: number,
  options?: ParseClashValueOptions
): ParsedClashCell {
  return parseClashValue(rawVal, options, cellAddress, row, col);
}
