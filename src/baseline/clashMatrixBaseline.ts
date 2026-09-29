/**
 * FROZEN BASELINE DEFINITION
 * ==========================
 * BASELINE IDENTIFIER: CLASH_MATRIX_XML_GENERATION_V1_FROZEN
 * 
 * This file serves as the official checkpoint and contract for the frozen
 * "Clash Matrix XML Generation" feature baseline.
 * 
 * CORE CONTRACT:
 * 1. Arbitrary Excel Matrix Layouts: User configuration is authoritative. No auto-detection or silent recovery.
 * 2. Clash Value Format: Configurable prefixes (H, C, HR, CR), delimiters (-, _, etc.), units (MM, CM, M, IN, FT).
 * 3. 10-Decimal-Place Tolerance: Navisworks tolerance in meters formatted to exactly 10 decimal places.
 * 4. Parser Fidelity: Matrix row ID from configured row group column; Selection Sets are downstream resolution data only.
 * 5. Test Name Generation: Generated test names (e.g., HW0010_v_HW0020) and type/tolerance mappings.
 * 6. Autodesk Navisworks Exchange XML: nw-exchange-12.0.xsd compliant XML generation.
 * 7. Selection Set Generation: Revit Element/Custom/Text/Identity Data/Item logic with condition tree.
 * 8. Validation: Explicit validation error reporting without auto-correction or coordinate replacement.
 * 9. Update Excel Workflow: Preserves active user configuration completely across workbook replacements.
 * 10. Future Isolation: All future features (including "XML Comparing") MUST be isolated and MUST NOT
 *     alter this frozen baseline.
 */

export const FROZEN_BASELINE = {
  identifier: 'CLASH_MATRIX_XML_GENERATION_V1_FROZEN',
  featureName: 'Clash Matrix XML Generation',
  version: '1.0.0-frozen',
  status: 'FROZEN' as const,
  frozenDate: '2026-09-27',
  knownTestCount: 324,
  testSuites: [
    { file: 'src/arbitraryLayout_test.ts', tests: 48, description: 'Custom Excel layouts A-E, coordinates & tolerance' },
    { file: 'src/regression_test.ts', tests: 43, description: 'Core functional & end-to-end regression scenarios' },
    { file: 'src/branding/branding_scenarios', tests: 20, description: 'Branding & password protection scenarios' },
    { file: 'src/matrixFormatProfile_test.ts', tests: 73, description: 'Clash format profiles & unit conversions' },
    { file: 'src/categoryLibrary_test.ts', tests: 46, description: 'Navisworks category library & condition linking' },
    { file: 'src/categoryDropdownIntegration_test.ts', tests: 62, description: 'Category dropdown integration & dynamic updates' },
    { file: 'src/propertyLibrary_test.ts', tests: 16, description: 'Property library & Revit condition bindings' }
  ],
  isolationRules: [
    'Future features MUST NOT modify the behavior of Clash Matrix XML Generation.',
    'Any future functionality (e.g., XML Comparing) must be implemented as an isolated module/tab/service.',
    'Existing parser, tolerance calculation, XML builder, and selection set generator remain immutable.',
    'Test suite must pass 324/324 before and after any new feature is developed.'
  ]
} as const;

export type FrozenBaseline = typeof FROZEN_BASELINE;
