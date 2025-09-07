/**
 * Safely parse Google reviews that may be stored as a Python-like string
 * (single quotes, True/False/None) or valid JSON/object.
 *
 * Handles apostrophes inside review text like "wasn't" without corrupting JSON.
 */
export function parseGoogleReviews(value: unknown): any | null {
  if (!value) return null;

  // If already an object/array, return as-is
  if (typeof value === 'object') return value as any;

  if (typeof value !== 'string') return null;

  // Fast path: try plain JSON
  try {
    return JSON.parse(value);
  } catch {}

  // Convert Python-ish dict string to valid JSON using a small state machine
  const src = value;

  // Replace Python booleans/None with JSON equivalents outside strings later as a post-process
  // We'll first normalize quotes safely.
  let out = '';
  let inString: false | 'single' | 'double' = false;
  let escaped = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (inString === 'single') {
      if (escaped) {
        // Preserve escape as-is
        out += ch;
        escaped = false;
      } else if (ch === '\\') {
        out += ch;
        escaped = true;
      } else if (ch === "'") {
        // Close single-quoted string with a double quote in JSON
        out += '"';
        inString = false;
      } else if (ch === '"') {
        // Escape double quotes inside content to keep JSON valid
        out += '\\"';
      } else {
        out += ch;
      }
      continue;
    }

    if (inString === 'double') {
      if (escaped) {
        out += ch;
        escaped = false;
      } else if (ch === '\\') {
        out += ch;
        escaped = true;
      } else if (ch === '"') {
        out += ch;
        inString = false;
      } else {
        out += ch;
      }
      continue;
    }

    // Not in a string
    if (ch === "'") {
      // Open a JSON string with double quote
      out += '"';
      inString = 'single';
      continue;
    }
    if (ch === '"') {
      out += ch;
      inString = 'double';
      continue;
    }

    out += ch;
  }

  // Post-process: replace Python tokens with JSON tokens outside of strings.
  // A simple approach: run regex on the entire output which now uses JSON string delimiters (double quotes),
  // so these tokens will only match outside strings.
  let normalized = out
    .replace(/\bNone\b/g, 'null')
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false');

  // Quote unquoted object keys: { key: ... } => { "key": ... }
  normalized = normalized.replace(/([\{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');

  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}

