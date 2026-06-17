/**
 * Deterministic unit tests for the Clarity digest logic (no network, no token).
 *
 * Proves the parser: groups metrics, sums counts across rows, ignores dimension
 * labels, and is robust to whatever field name Clarity uses for each count.
 * It does NOT prove the live API's exact field names (that needs a real token);
 * it proves the parser will not crash and will sum whatever numeric fields return.
 *
 * Run: node scripts/test.js   (or: npm test)
 */

import {
  buildSignalsDigest, sumNumericFields, canonicalDimension, clampDays
} from './utils.js';

let passed = 0;
let failed = 0;

function eq(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${label}\n  expected: ${e}\n  actual:   ${a}`);
  }
}

// --- clampDays: window is 1..3 only ---
eq(clampDays(1), 1, 'clampDays(1)');
eq(clampDays(3), 3, 'clampDays(3)');
eq(clampDays(5), 3, 'clampDays(5) clamps to 3');
eq(clampDays(0), 1, 'clampDays(0) clamps to 1');
eq(clampDays('2'), 2, 'clampDays("2") coerces');
eq(clampDays('x'), 1, 'clampDays(non-numeric) -> 1');

// --- canonicalDimension: case-insensitive, rejects unknown ---
eq(canonicalDimension('url'), 'URL', 'canonicalDimension(url) -> URL');
eq(canonicalDimension('Device'), 'Device', 'canonicalDimension(Device)');
eq(canonicalDimension('banana'), null, 'canonicalDimension(unknown) -> null');

// --- sumNumericFields: sums numeric (incl. numeric strings), ignores labels ---
eq(
  sumNumericFields([
    { URL: '/pricing', count: '10' },   // numeric string
    { URL: '/home', count: 5 }          // number
  ]),
  { count: 15 },
  'sumNumericFields sums numeric strings and numbers, ignores string labels'
);
eq(sumNumericFields([]), {}, 'sumNumericFields([]) -> {}');

// --- buildSignalsDigest: realistic mixed response ---
// Traffic shape mirrors the documented sample; friction-metric field names are
// unknown in the docs, so the mock uses plausible names to prove robustness.
const sample = [
  {
    metricName: 'Traffic',
    information: [
      { totalSessionCount: '100', totalBotSessionCount: '20', distantUserCount: '80', OS: 'Android' },
      { totalSessionCount: '50', totalBotSessionCount: '5', distantUserCount: '45', OS: 'iOS' }
    ]
  },
  {
    metricName: 'Rage Click Count',
    information: [
      { rageClickCount: '7', URL: '/pricing' },
      { rageClickCount: '3', URL: '/checkout' }
    ]
  },
  {
    metricName: 'Dead Click Count',
    information: [ { deadClickCount: '4', URL: '/pricing' } ]
  },
  {
    metricName: 'Scroll Depth',  // present but not a friction metric -> only in metrics_present
    information: [ { averageScrollDepth: 62.5, URL: '/pricing' } ]
  }
];

const digest = buildSignalsDigest(sample, 3, ['URL']);

eq(digest.window_days, 3, 'digest.window_days');
eq(digest.dimensions, ['URL'], 'digest.dimensions');
eq(digest.traffic, { totalSessionCount: 150, totalBotSessionCount: 25, distantUserCount: 125 }, 'digest.traffic summed across rows, OS label ignored');
eq(digest.friction['Rage Click Count'], { rageClickCount: 10 }, 'digest rage clicks summed across pages');
eq(digest.friction['Dead Click Count'], { deadClickCount: 4 }, 'digest dead clicks');
eq(digest.friction['Scroll Depth'], undefined, 'Scroll Depth is not a friction metric');
eq(
  digest.metrics_present,
  ['Traffic', 'Rage Click Count', 'Dead Click Count', 'Scroll Depth'],
  'metrics_present lists every returned metric'
);

// --- buildSignalsDigest: empty / malformed input does not crash ---
eq(buildSignalsDigest([], 1, []).traffic, null, 'empty response -> traffic null');
eq(buildSignalsDigest(null, 1, []).friction, {}, 'null response -> friction {}');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
