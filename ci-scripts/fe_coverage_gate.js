/**
 * Enforce FE coverage threshold using coverage/coverage-summary.json
 * Usage: node fe_coverage_gate.js 80 coverage/coverage-summary.json
 */
const fs = require('fs');

const threshold = Number(process.argv[2] || 80);
const file = process.argv[3] || 'coverage/coverage-summary.json';

if (!fs.existsSync(file)) {
  console.log('No coverage summary found; skipping gate.');
  process.exit(0);
}

const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const total = data.total || {};
const pct = total.lines?.pct ?? total.statements?.pct ?? 0;

if (pct < threshold) {
  console.error(`Coverage ${pct}% is below threshold ${threshold}%`);
  process.exit(1);
} else {
  console.log(`✅ Coverage ${pct}% >= ${threshold}%`);
}
