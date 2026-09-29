export interface XmlValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates XML string for syntax, schema adherence, and Navisworks specific elements
 */
export function validateNavisworksXmlString(xmlContent: string): XmlValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!xmlContent || !xmlContent.trim()) {
    return {
      isValid: false,
      errors: ['XML content is empty.'],
      warnings: [],
    };
  }

  // 1. Check XML Declaration
  if (!xmlContent.startsWith('<?xml')) {
    errors.push('Missing <?xml ... ?> declaration at start of file.');
  }

  // 2. Parse using browser DOMParser if available, otherwise regex structure checks
  try {
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'application/xml');
      const parserError = doc.querySelector('parsererror');

      if (parserError) {
        errors.push(`XML syntax error: ${parserError.textContent || 'Unknown malformed XML error'}`);
        return { isValid: false, errors, warnings };
      }

      // 3. Check root tag
      const exchange = doc.querySelector('exchange');
      if (!exchange) {
        errors.push('Root element <exchange> is missing.');
      } else {
        const schema = exchange.getAttribute('xsi:noNamespaceSchemaLocation');
        if (!schema || !schema.includes('nw-exchange')) {
          warnings.push('xsi:noNamespaceSchemaLocation does not reference Autodesk nw-exchange schema.');
        }
      }

      // 4. Check batchtest
      const batchtest = doc.querySelector('batchtest');
      if (!batchtest) {
        errors.push('<batchtest> element is missing inside <exchange>.');
      }

      // 5. Check GUID format in selectionsets and viewfolders
      const elementsWithGuid = doc.querySelectorAll('[guid]');
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const seenGuids = new Set<string>();

      elementsWithGuid.forEach((el) => {
        const guid = el.getAttribute('guid');
        if (!guid) {
          errors.push(`Element <${el.tagName}> has an empty guid attribute.`);
        } else if (!guidRegex.test(guid)) {
          warnings.push(`Element <${el.tagName} name="${el.getAttribute('name')}"> has a non-standard GUID format: "${guid}".`);
        } else if (seenGuids.has(guid)) {
          errors.push(`Duplicate GUID detected: "${guid}" used multiple times.`);
        } else {
          seenGuids.add(guid);
        }
      });
    } else {
      // Node.js fallback validation
      if (!xmlContent.includes('<exchange')) {
        errors.push('Root element <exchange> is missing.');
      }
      if (!xmlContent.includes('<batchtest')) {
        errors.push('<batchtest> element is missing inside <exchange>.');
      }
      const guidMatches = xmlContent.match(/guid="([^"]+)"/g) || [];
      const seenGuids = new Set<string>();
      const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      guidMatches.forEach((m) => {
        const val = m.replace('guid="', '').replace('"', '');
        if (!guidRegex.test(val)) {
          warnings.push(`Non-standard GUID format: "${val}".`);
        } else if (seenGuids.has(val)) {
          errors.push(`Duplicate GUID detected: "${val}" used multiple times.`);
        } else {
          seenGuids.add(val);
        }
      });
    }
  } catch (e: any) {
    errors.push(`DOMParser execution error: ${e.message || String(e)}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export interface ParsedNavisworksXmlInfo {
  filename: string;
  batchTestName: string;
  internalName: string;
  units: string;
  viewFolders: string[];
  selectionSetsCount: number;
  clashTestsCount: number;
}

export function parseNavisworksXml(xmlContent: string, filename: string = ''): ParsedNavisworksXmlInfo {
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');

    const batchtest = doc.querySelector('batchtest');
    const batchName = batchtest?.getAttribute('name') || 'Project11';
    const internalName = batchtest?.getAttribute('internal_name') || 'Project11';
    const units = batchtest?.getAttribute('units') || 'm';

    const viewfolders = Array.from(doc.querySelectorAll('viewfolder')).map(
      (vf) => vf.getAttribute('name') || 'Unnamed'
    );

    const selectionSetsCount = doc.querySelectorAll('selectionset').length;
    const clashTestsCount = doc.querySelectorAll('clashtest').length;

    return {
      filename,
      batchTestName: batchName,
      internalName,
      units,
      viewFolders: viewfolders,
      selectionSetsCount,
      clashTestsCount,
    };
  } else {
    // Regex-based parsing for Node.js environments
    const batchMatch = xmlContent.match(/<batchtest\s+name="([^"]+)"\s+internal_name="([^"]+)"\s+units="([^"]+)"/);
    const batchName = batchMatch ? batchMatch[1] : 'Project11';
    const internalName = batchMatch ? batchMatch[2] : 'Project11';
    const units = batchMatch ? batchMatch[3] : 'm';

    const vfMatches = xmlContent.match(/<viewfolder\s+name="([^"]+)"/g) || [];
    const viewFolders = vfMatches.map((m) => m.replace('<viewfolder name="', '').replace('"', ''));

    const selMatches = xmlContent.match(/<selectionset\s+/g) || [];
    const testMatches = xmlContent.match(/<clashtest\s+/g) || [];

    return {
      filename,
      batchTestName: batchName,
      internalName,
      units,
      viewFolders,
      selectionSetsCount: selMatches.length,
      clashTestsCount: testMatches.length,
    };
  }
}

