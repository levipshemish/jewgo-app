#!/usr/bin/env node
/**
 * Environment Consistency Guardrail
 * - Compares keys in root .env (master) against common env/example files.
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

function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);
    const keys = [];
    const map = {};
    for (const raw of lines) {
      const l = raw.trim();
      if (!l || l.startsWith('#')) continue;
      const cleaned = l.replace(/^export\s+/, '');
      const eqIdx = cleaned.indexOf('=');
      if (eqIdx === -1) {
        const k = cleaned.trim();
        if (k) {
          keys.push(k);
          map[k] = '';
        }
      } else {
        const k = cleaned.slice(0, eqIdx).trim();
        const v = cleaned.slice(eqIdx + 1).trim();
        if (k) {
          keys.push(k);
          map[k] = v;
        }
      }
    }
    return { keys, map };
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
// Baseline: root .env is the source of truth
const baselinePath = toPath('.env');
const baseline = parseEnvFile(baselinePath);
if (!baseline) {
  console.error(`✖ Baseline file not found: ${baselinePath}`);
  process.exit(2);
}

const baselineSet = new Set(baseline.keys.filter((k) => !IGNORE.has(k)));

// Target files and rules
const targets = [
  { path: '.env', prefixes: null, example: false },
  { path: '.env.development', prefixes: null, example: false },
  { path: '.env.staging', prefixes: null, example: false },
  { path: '.env.production', prefixes: null, example: false },
  // Example files (must not contain real values)
  { path: 'env.template', prefixes: null, example: true },
  // Frontend example should only be required to include public/frontend keys to avoid leaking server secrets
  { path: 'frontend/env.example', prefixes: ['NEXT_', 'NEXT_PUBLIC_', 'SUPABASE_', 'NEXTAUTH_'], example: true },
  { path: 'frontend/netlify.env.example', prefixes: ['NEXT_', 'NEXT_PUBLIC_', 'SUPABASE_', 'NEXTAUTH_'], example: true },
];

// Helper: detect placeholder-ish values (not real secrets)
function looksLikePlaceholder(val) {
  if (!val) return true; // empty is acceptable for examples
  const v = String(val).trim();
  // Strip quotes if present
  const unquoted = v.replace(/^['"]|['"]$/g, '');
  const re = /(changeme|example|sample|placeholder|your[_-]|REPLACE_ME|TBD|dummy|xxx|<.*>)/i;
  return re.test(unquoted);
}

let hadErrors = false;

for (const t of targets) {
  const fullPath = toPath(t.path);
  const parsed = parseEnvFile(fullPath);
  if (!parsed) {
    console.warn(`! Skipping missing file: ${t.path}`);
    continue;
  }

  const filteredBaseline = filterByPrefixes([...baselineSet], t.prefixes);
  const expected = toSet(filteredBaseline);
  const actualKeys = parsed.keys.filter((k) => !IGNORE.has(k));
  const actual = toSet(actualKeys);

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

  // Additional rule: example files must not contain real values
  if (t.example) {
    const baselineMap = baseline.map;
    const exampleMap = parsed.map;
    const offenders = [];
    for (const k of Object.keys(exampleMap)) {
      if (IGNORE.has(k)) continue;
      const v = exampleMap[k];
      const baseV = baselineMap[k];
      // If example value equals the baseline real value and is non-empty, flag
      if (baseV && v && v === baseV) {
        offenders.push(`${k} (matches .env value)`);
        continue;
      }
      // If value looks non-placeholder and is non-empty, flag
      if (v && !looksLikePlaceholder(v)) {
        // Allow obviously safe localhost URLs
        const isLocalhost = /localhost|127\.0\.0\.1/.test(v);
        if (!isLocalhost) {
          offenders.push(`${k}`);
        }
      }
    }
    if (offenders.length) {
      hadErrors = true;
      console.error(`✖ ${t.path}: example file contains real-looking values`);
      for (const o of offenders) console.error(`  - ${o}`);
      console.error('  Hint: leave values empty or use placeholders like CHANGEME, <VALUE>, your_value');
    } else {
      console.log(`✓ ${t.path}: no real values detected in example file`);
    }
  }
}

if (hadErrors) {
  process.exit(1);
} else {
  console.log('✅ Environment consistency check passed');
}
