#!/usr/bin/env node
/**
 * Environment Consistency Guardrail
 * - Compares keys in env.template against common env files.
 * - Fails if required keys are missing.
 *
 * Usage:
 *   node scripts/env-consistency-check.js
 *   STRICT=1 node scripts/env-consistency-check.js   # also fail on unexpected keys
 *   IGNORE="KEY1,KEY2" node scripts/env-consistency-check.js
 */

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

const toPath = (p) => path.join(repoRoot, p);

function readEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.replace(/^export\s+/, ''))
      .map((l) => l.split('=')[0].trim())
      .filter((k) => !!k);
  } catch (e) {
    return null; // treat as missing file
  }
}

function toSet(arr) {
  return new Set(arr || []);
}

function filterByPrefixes(keys, prefixes) {
  if (!prefixes || prefixes.length === 0) return keys;
  return keys.filter((k) => prefixes.some((p) => k.startsWith(p)));
}

function difference(aSet, bSet) {
  return [...aSet].filter((k) => !bSet.has(k));
}

const IGNORE = new Set(
  (process.env.IGNORE || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);
const STRICT = process.env.STRICT === '1' || process.env.STRICT === 'true';

// Baseline file
const baselinePath = toPath('env.template');
const baselineKeys = readEnvFile(baselinePath);
if (!baselineKeys) {
  console.error(`✖ Baseline file not found: ${baselinePath}`);
  process.exit(2);
}

const baselineSet = new Set(baselineKeys.filter((k) => !IGNORE.has(k)));

// Target files and rules
const targets = [
  { path: '.env', prefixes: null },
  { path: '.env.development', prefixes: null },
  { path: '.env.staging', prefixes: null },
  { path: '.env.production', prefixes: null },
  // Frontend example should only be required to include public/frontend keys to avoid leaking server secrets
  { path: 'frontend/env.example', prefixes: ['NEXT_', 'NEXT_PUBLIC_', 'SUPABASE_', 'NEXTAUTH_'] },
];

let hadErrors = false;

for (const t of targets) {
  const fullPath = toPath(t.path);
  const keys = readEnvFile(fullPath);
  if (!keys) {
    console.warn(`! Skipping missing file: ${t.path}`);
    continue;
  }

  const filteredBaseline = filterByPrefixes([...baselineSet], t.prefixes);
  const expected = toSet(filteredBaseline);
  const actual = toSet(keys.filter((k) => !IGNORE.has(k)));

  const missing = difference(expected, actual);
  const extras = difference(actual, expected);

  if (missing.length) {
    hadErrors = true;
    console.error(`✖ ${t.path}: missing keys`);
    for (const k of missing) console.error(`  - ${k}`);
  } else {
    console.log(`✓ ${t.path}: all required keys present`);
  }

  if (extras.length) {
    const msg = `? ${t.path}: keys not in baseline (OK). Use STRICT=1 to fail.`;
    if (STRICT) {
      hadErrors = true;
      console.error(`✖ ${t.path}: unexpected keys`);
      for (const k of extras) console.error(`  - ${k}`);
    } else {
      console.warn(msg);
      for (const k of extras) console.warn(`  - ${k}`);
    }
  }
}

if (hadErrors) {
  process.exit(1);
} else {
  console.log('✅ Environment consistency check passed');
}

