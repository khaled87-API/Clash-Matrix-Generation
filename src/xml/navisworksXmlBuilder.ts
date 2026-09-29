import { ProjectSettings, ExportMode } from '../types/configuration';
import { ViewFolder, SelectionSet } from '../types/selectionSet';
import { ClashTest } from '../types/clashTest';

/**
 * Escapes XML special characters
 */
export function escapeXml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds standard Autodesk Navisworks Clash Detective Exchange XML
 */
export function buildNavisworksXml(
  projectSettings: ProjectSettings,
  viewFolders: ViewFolder[],
  clashTests: ClashTest[],
  mode: ExportMode = 'full'
): string {
  const lines: string[] = [];

  lines.push('<?xml version="1.0" encoding="UTF-8" ?>');
  lines.push(
    `<exchange xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://download.autodesk.com/us/navisworks/schemas/nw-exchange-12.0.xsd" units="${escapeXml(
      projectSettings.units || 'm'
    )}" filename="${escapeXml(projectSettings.filename || '')}" filepath="${escapeXml(
      projectSettings.filepath || ''
    )}">`
  );

  lines.push(
    `  <batchtest name="${escapeXml(projectSettings.batchTestName || 'Project11')}" internal_name="${escapeXml(
      projectSettings.internalName || 'Project11'
    )}" units="${escapeXml(projectSettings.units || 'm')}">`
  );

  // 1. Clash Tests section
  if (mode === 'full' || mode === 'clashTestsOnly') {
    lines.push('    <clashtests>');

    clashTests.forEach((ct) => {
      lines.push(
        `      <clashtest name="${escapeXml(ct.name)}" test_type="${escapeXml(ct.testType)}" status="${escapeXml(
          ct.status || 'new'
        )}" tolerance="${ct.toleranceFormatted}" merge_composites="0">`
      );
      lines.push('        <linkage mode="none"/>');
      lines.push('        <left>');
      lines.push('          <clashselection selfintersect="0" primtypes="1">');
      lines.push(`            <locator>${escapeXml(ct.leftLocator)}</locator>`);
      lines.push('          </clashselection>');
      lines.push('        </left>');
      lines.push('        <right>');
      lines.push('          <clashselection selfintersect="0" primtypes="1">');
      lines.push(`            <locator>${escapeXml(ct.rightLocator)}</locator>`);
      lines.push('          </clashselection>');
      lines.push('        </right>');
      lines.push('        <rules/>');
      lines.push('      </clashtest>');
    });

    lines.push('    </clashtests>');
  }

  // 2. Selection Sets section (organized by View Folders)
  if (mode === 'full' || mode === 'selectionSetsOnly') {
    lines.push('    <selectionsets>');

    viewFolders.forEach((folder) => {
      lines.push(`      <viewfolder name="${escapeXml(folder.name)}" guid="${escapeXml(folder.guid)}">`);

      folder.selectionSets.forEach((set) => {
        lines.push(`        <selectionset name="${escapeXml(set.name)}" guid="${escapeXml(set.guid)}">`);
        lines.push('          <findspec mode="all" disjoint="0">');
        lines.push('            <conditions>');

        set.conditions.forEach((cond) => {
          lines.push(`              <condition test="${escapeXml(cond.test)}" flags="${cond.flags}">`);
          lines.push('                <category>');
          lines.push(`                  <name internal="${escapeXml(cond.categoryInternal)}">${escapeXml(cond.categoryName)}</name>`);
          lines.push('                </category>');
          lines.push('                <property>');
          lines.push(`                  <name internal="${escapeXml(cond.propertyInternal)}">${escapeXml(cond.propertyName)}</name>`);
          lines.push('                </property>');
          lines.push('                <value>');
          lines.push(`                  <data type="${escapeXml(cond.dataType)}">${escapeXml(cond.value)}</data>`);
          lines.push('                </value>');
          lines.push('              </condition>');
        });

        lines.push('            </conditions>');
        lines.push('            <locator>/</locator>');
        lines.push('          </findspec>');
        lines.push('        </selectionset>');
      });

      lines.push('      </viewfolder>');
    });

    lines.push('    </selectionsets>');
  }

  lines.push('  </batchtest>');
  lines.push('</exchange>');

  return lines.join('\n');
}
