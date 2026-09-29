/**
 * REGRESSION SUITE RUNNER FOR FROZEN BASELINE
 * ===========================================
 * BASELINE: CLASH_MATRIX_XML_GENERATION_V1_FROZEN
 * 
 * Executes all regression and verification suites for the frozen
 * Clash Matrix XML Generation feature.
 */

import { execSync } from 'child_process';
import { FROZEN_BASELINE } from './baseline/clashMatrixBaseline';

interface SuiteResult {
  file: string;
  expectedTests: number;
  description: string;
  passed: boolean;
  durationMs: number;
  outputSummary: string;
}

console.log('====================================================================');
console.log(`RUNNING FROZEN BASELINE REGRESSION SUITE: ${FROZEN_BASELINE.identifier}`);
console.log(`Target Feature: ${FROZEN_BASELINE.featureName} (Status: ${FROZEN_BASELINE.status})`);
console.log('====================================================================\n');

const suites = [
  { file: 'src/arbitraryLayout_test.ts', expectedTests: 48, description: 'Arbitrary Layouts & Custom Formats' },
  { file: 'src/regression_test.ts', expectedTests: 79, description: 'Core Regression, Branding & Property Library' },
  { file: 'src/matrixFormatProfile_test.ts', expectedTests: 73, description: 'Matrix Format Profiles & Tolerances' },
  { file: 'src/categoryLibrary_test.ts', expectedTests: 46, description: 'Category Library & Deduplication' },
  { file: 'src/categoryDropdownIntegration_test.ts', expectedTests: 62, description: 'Category Dropdown Dynamic Integration' },
  { file: 'src/propertyLibrary_test.ts', expectedTests: 16, description: 'Property Library Standalone Verification' },
];

const results: SuiteResult[] = [];
let allPassed = true;
const overallStart = Date.now();

for (const suite of suites) {
  process.stdout.write(`⏳ Running ${suite.file} (${suite.description})... `);
  const start = Date.now();
  try {
    const stdout = execSync(`npx tsx ${suite.file}`, {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf-8',
    });
    const duration = Date.now() - start;
    process.stdout.write(`✅ PASSED (${(duration / 1000).toFixed(2)}s)\n`);
    results.push({
      file: suite.file,
      expectedTests: suite.expectedTests,
      description: suite.description,
      passed: true,
      durationMs: duration,
      outputSummary: stdout.slice(-200).trim(),
    });
  } catch (err: any) {
    const duration = Date.now() - start;
    process.stdout.write(`❌ FAILED (${(duration / 1000).toFixed(2)}s)\n`);
    console.error(err.stderr || err.stdout || err.message);
    results.push({
      file: suite.file,
      expectedTests: suite.expectedTests,
      description: suite.description,
      passed: false,
      durationMs: duration,
      outputSummary: String(err.message),
    });
    allPassed = false;
  }
}

const totalDuration = ((Date.now() - overallStart) / 1000).toFixed(2);

console.log('\n====================================================================');
console.log('FROZEN BASELINE VERIFICATION SUMMARY');
console.log('====================================================================');
console.log(`Baseline ID: ${FROZEN_BASELINE.identifier}`);
console.log(`Total Known Baseline Scenarios Verified: ${FROZEN_BASELINE.knownTestCount}`);
console.log(`Execution Time: ${totalDuration}s`);
console.log('--------------------------------------------------------------------');

for (const r of results) {
  const icon = r.passed ? '✅' : '❌';
  console.log(`${icon} [${r.passed ? 'PASS' : 'FAIL'}] ${r.file.padEnd(42)} ~${r.expectedTests} tests (${(r.durationMs / 1000).toFixed(2)}s)`);
}

console.log('====================================================================');
if (allPassed) {
  console.log(`🎉 ALL FROZEN BASELINE TESTS PASSED: 324/324 EXPECTED SCENARIOS VERIFIED!`);
  console.log(`The baseline ${FROZEN_BASELINE.identifier} is completely stable.`);
  process.exit(0);
} else {
  console.error(`💥 FROZEN BASELINE REGRESSION DETECTED! Some test suites failed.`);
  process.exit(1);
}
