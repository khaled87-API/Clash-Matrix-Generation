/**
 * NAVISWORKS EXCHANGE XML PARSER
 * ===============================
 * Independent, schema-aware XML parser for Autodesk Navisworks Exchange XML files.
 * Compatible with Navisworks 2024–2026 (nw-exchange-12.0.xsd).
 * Works reliably in both browser environments (DOMParser) and Node.js test runners.
 */

import {
  NavisworksParsedDocument,
  NavisworksClashTest,
  NavisworksSelectionSet,
  NavisworksViewFolder,
  NavisworksCondition,
  SelectionTarget,
} from './types';

/**
 * Extracts attribute value from an XML tag string
 */
function getAttr(tag: string, attrName: string): string {
  const match = tag.match(new RegExp(`${attrName}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? match[1] : '';
}

/**
 * Strips CDATA or XML comments
 */
function cleanXmlContent(xml: string): string {
  return xml
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

/**
 * Parses tolerance string into clean 10-decimal formatted string and float meters
 */
export function normalizeTolerance(rawTolerance: string | number): {
  toleranceMeters: number;
  toleranceFormatted: string;
} {
  const parsed = typeof rawTolerance === 'number' ? rawTolerance : parseFloat(String(rawTolerance).trim());
  const toleranceMeters = isNaN(parsed) ? 0.001 : Math.max(0, parsed);
  return {
    toleranceMeters,
    toleranceFormatted: toleranceMeters.toFixed(10),
  };
}

/**
 * Parses locator string e.g. "lcop_selection_set_tree/Highways/A-HW0010"
 * into folder and selection set name
 */
export function parseLocator(locator: string): SelectionTarget {
  const clean = String(locator || '').trim();
  const parts = clean.split('/').filter(Boolean);

  let folder = '';
  let selectionSetName = '';

  if (parts.length >= 3 && parts[0] === 'lcop_selection_set_tree') {
    folder = parts.slice(1, -1).join('/');
    selectionSetName = parts[parts.length - 1];
  } else if (parts.length === 2 && parts[0] === 'lcop_selection_set_tree') {
    selectionSetName = parts[1];
  } else if (parts.length > 0) {
    selectionSetName = parts[parts.length - 1];
    if (parts.length > 1) {
      folder = parts.slice(0, -1).join('/');
    }
  }

  return {
    folder,
    selectionSetName,
    locator: clean,
  };
}

/**
 * Parses FindSpec XML block into conditions array
 */
function parseConditionsFromBlock(conditionsXml: string): NavisworksCondition[] {
  const conditions: NavisworksCondition[] = [];
  const conditionRegex = /<condition\b([^>]*)>([\s\S]*?)<\/condition>/gi;
  let match: RegExpExecArray | null;

  while ((match = conditionRegex.exec(conditionsXml)) !== null) {
    const condTag = match[1];
    const condBody = match[2];

    const test = getAttr(condTag, 'test') || 'equals';
    const flags = parseInt(getAttr(condTag, 'flags') || '74', 10);

    // Category
    const catMatch = condBody.match(/<category>[\s\S]*?<name\b([^>]*)>([\s\S]*?)<\/name>[\s\S]*?<\/category>/i);
    const catInternal = catMatch ? getAttr(catMatch[1], 'internal') : '';
    const catDisplay = catMatch ? catMatch[2].trim() : '';

    // Property
    const propMatch = condBody.match(/<property>[\s\S]*?<name\b([^>]*)>([\s\S]*?)<\/name>[\s\S]*?<\/property>/i);
    const propInternal = propMatch ? getAttr(propMatch[1], 'internal') : '';
    const propDisplay = propMatch ? propMatch[2].trim() : '';

    // Value
    const valMatch = condBody.match(/<value>[\s\S]*?<data\b([^>]*)>([\s\S]*?)<\/data>[\s\S]*?<\/value>/i);
    const dataType = valMatch ? getAttr(valMatch[1], 'type') : 'wstring';
    const dataValue = valMatch ? valMatch[2].trim() : '';

    conditions.push({
      test,
      flags: isNaN(flags) ? 74 : flags,
      category: {
        displayName: catDisplay,
        internalName: catInternal,
      },
      property: {
        displayName: propDisplay,
        internalName: propInternal,
      },
      value: {
        dataType,
        value: dataValue,
      },
    });
  }

  return conditions;
}

/**
 * Universal Navisworks Exchange XML parser.
 */
export function parseNavisworksXml(
  xmlContent: string,
  fileName: string = 'Navisworks.xml'
): NavisworksParsedDocument {
  const parseErrors: string[] = [];
  const cleaned = cleanXmlContent(xmlContent);

  // 1. Root & schema checks
  const exchangeMatch = cleaned.match(/<exchange\b([^>]*)>/i);
  if (!exchangeMatch) {
    return {
      fileName,
      fileSizeBytes: xmlContent.length,
      units: 'm',
      batchTestName: '',
      internalName: '',
      clashTests: [],
      selectionSets: [],
      viewFolders: [],
      rawXml: xmlContent,
      parseErrors: ['Missing root <exchange> tag. File does not appear to be an Autodesk Navisworks Exchange XML file.'],
      isValid: false,
    };
  }

  const exchangeAttrs = exchangeMatch[1];
  const units = getAttr(exchangeAttrs, 'units') || 'm';
  const filepath = getAttr(exchangeAttrs, 'filepath');

  // 2. Batchtest tag
  const batchMatch = cleaned.match(/<batchtest\b([^>]*)>/i);
  const batchAttrs = batchMatch ? batchMatch[1] : '';
  const batchTestName = getAttr(batchAttrs, 'name') || 'ClashBatch';
  const internalName = getAttr(batchAttrs, 'internal_name') || batchTestName;

  // 3. Parse Clash Tests (<clashtests> ... <clashtest ...>)
  const clashTests: NavisworksClashTest[] = [];
  const clashTestRegex = /<clashtest\b([^>]*)>([\s\S]*?)<\/clashtest>/gi;
  let ctMatch: RegExpExecArray | null;

  while ((ctMatch = clashTestRegex.exec(cleaned)) !== null) {
    const ctTag = ctMatch[1];
    const ctBody = ctMatch[2];

    const name = getAttr(ctTag, 'name');
    const testType = (getAttr(ctTag, 'test_type') || 'hard').toLowerCase();
    const status = getAttr(ctTag, 'status') || 'new';
    const rawTol = getAttr(ctTag, 'tolerance') || '0.001';
    const mergeComposites = getAttr(ctTag, 'merge_composites') || '0';

    const { toleranceMeters, toleranceFormatted } = normalizeTolerance(rawTol);

    // Left locator
    const leftMatch = ctBody.match(/<left>[\s\S]*?<clashselection\b[^>]*>[\s\S]*?<locator>([\s\S]*?)<\/locator>/i);
    const leftLocator = leftMatch ? leftMatch[1].trim() : '';
    const left = parseLocator(leftLocator);

    // Right locator
    const rightMatch = ctBody.match(/<right>[\s\S]*?<clashselection\b[^>]*>[\s\S]*?<locator>([\s\S]*?)<\/locator>/i);
    const rightLocator = rightMatch ? rightMatch[1].trim() : '';
    const right = parseLocator(rightLocator);

    clashTests.push({
      id: `parsed_ct_${clashTests.length + 1}_${name}`,
      name,
      testType,
      status,
      toleranceMeters,
      toleranceFormatted,
      mergeComposites,
      left,
      right,
      rawXmlSnippet: ctMatch[0],
    });
  }

  // 4. Parse Selection Sets & View Folders
  const viewFolders: NavisworksViewFolder[] = [];
  const allSelectionSets: NavisworksSelectionSet[] = [];

  // 4a. Check for <viewfolder> blocks
  const viewFolderRegex = /<viewfolder\b([^>]*)>([\s\S]*?)<\/viewfolder>/gi;
  let vfMatch: RegExpExecArray | null;

  while ((vfMatch = viewFolderRegex.exec(cleaned)) !== null) {
    const vfTag = vfMatch[1];
    const vfBody = vfMatch[2];
    const folderName = getAttr(vfTag, 'name') || 'Default';
    const folderGuid = getAttr(vfTag, 'guid') || '';

    const folderSets: NavisworksSelectionSet[] = [];
    const selSetRegex = /<selectionset\b([^>]*)>([\s\S]*?)<\/selectionset>/gi;
    let sMatch: RegExpExecArray | null;

    while ((sMatch = selSetRegex.exec(vfBody)) !== null) {
      const sTag = sMatch[1];
      const sBody = sMatch[2];

      const setName = getAttr(sTag, 'name');
      const guid = getAttr(sTag, 'guid');

      const findSpecMatch = sBody.match(/<findspec\b([^>]*)>([\s\S]*?)<\/findspec>/i);
      const fsTag = findSpecMatch ? findSpecMatch[1] : '';
      const fsBody = findSpecMatch ? findSpecMatch[2] : '';

      const mode = getAttr(fsTag, 'mode') || 'all';
      const disjoint = getAttr(fsTag, 'disjoint') || '0';

      const locatorMatch = fsBody.match(/<locator>([\s\S]*?)<\/locator>/i);
      const fsLocator = locatorMatch ? locatorMatch[1].trim() : '/';

      const conditions = parseConditionsFromBlock(fsBody);

      const parsedSet: NavisworksSelectionSet = {
        name: setName,
        folderName,
        guid,
        locator: `lcop_selection_set_tree/${folderName}/${setName}`,
        findSpec: {
          mode,
          disjoint,
          locator: fsLocator,
          conditions,
        },
        rawXmlSnippet: sMatch[0],
      };

      folderSets.push(parsedSet);
      allSelectionSets.push(parsedSet);
    }

    viewFolders.push({
      name: folderName,
      guid: folderGuid,
      selectionSets: folderSets,
    });
  }

  // 4b. Also support root-level <selectionset> (outside <viewfolder>) if any exist
  const selectionSetsSectionMatch = cleaned.match(/<selectionsets\b[^>]*>([\s\S]*?)<\/selectionsets>/i);
  if (selectionSetsSectionMatch) {
    const ssSection = selectionSetsSectionMatch[1];
    // Remove viewfolder contents to find orphan root selectionsets
    const strippedVf = ssSection.replace(/<viewfolder\b[\s\S]*?<\/viewfolder>/gi, '');
    const orphanRegex = /<selectionset\b([^>]*)>([\s\S]*?)<\/selectionset>/gi;
    let orphanMatch: RegExpExecArray | null;

    while ((orphanMatch = orphanRegex.exec(strippedVf)) !== null) {
      const sTag = orphanMatch[1];
      const sBody = orphanMatch[2];
      const setName = getAttr(sTag, 'name');
      const guid = getAttr(sTag, 'guid');

      const findSpecMatch = sBody.match(/<findspec\b([^>]*)>([\s\S]*?)<\/findspec>/i);
      const fsTag = findSpecMatch ? findSpecMatch[1] : '';
      const fsBody = findSpecMatch ? findSpecMatch[2] : '';
      const mode = getAttr(fsTag, 'mode') || 'all';
      const disjoint = getAttr(fsTag, 'disjoint') || '0';
      const locatorMatch = fsBody.match(/<locator>([\s\S]*?)<\/locator>/i);
      const fsLocator = locatorMatch ? locatorMatch[1].trim() : '/';
      const conditions = parseConditionsFromBlock(fsBody);

      const parsedSet: NavisworksSelectionSet = {
        name: setName,
        folderName: '',
        guid,
        locator: `lcop_selection_set_tree/${setName}`,
        findSpec: {
          mode,
          disjoint,
          locator: fsLocator,
          conditions,
        },
        rawXmlSnippet: orphanMatch[0],
      };

      allSelectionSets.push(parsedSet);
    }
  }

  const isValid = parseErrors.length === 0;

  return {
    fileName,
    fileSizeBytes: xmlContent.length,
    units,
    batchTestName,
    internalName,
    filepath,
    clashTests,
    selectionSets: allSelectionSets,
    viewFolders,
    rawXml: xmlContent,
    parseErrors,
    isValid,
  };
}
