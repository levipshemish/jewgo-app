#!/usr/bin/env bash
set -euo pipefail

EVENT_PATH="${1:-}"

echo "🔍 Context7 Guard - Checking PR for Context7 acknowledgment"

if [[ -z "$EVENT_PATH" || ! -f "$EVENT_PATH" ]]; then
  echo "⚠️  No GitHub event payload found; skipping Context7 check."
  echo "   This is normal for non-PR events."
  exit 0
fi

# Extract PR body from event
body=$(jq -r '.pull_request.body // ""' "$EVENT_PATH" 2>/dev/null || echo "")

if [[ -z "$body" ]]; then
  echo "⚠️  No PR body found; skipping Context7 check."
  exit 0
fi

# Check for Context7 acknowledgment patterns
context7_patterns=(
  "Context7 confirmed: yes"
  "Context7 confirmed: no"
  "Context7 docs consulted"
  "Context7 unavailable"
  "Context7 skipped"
)

found_pattern=""
for pattern in "${context7_patterns[@]}"; do
  if echo "$body" | grep -qi "$pattern"; then
    found_pattern="$pattern"
    break
  fi
done

if [[ -n "$found_pattern" ]]; then
  echo "✅ PR body contains Context7 acknowledgment: '$found_pattern'"
  exit 0
else
  echo "❌ PR body must confirm Context7 docs were consulted."
  echo "   Add one of these to your PR description:"
  echo "   - 'Context7 confirmed: yes' (if docs were consulted)"
  echo "   - 'Context7 confirmed: no' (if docs unavailable)"
  echo "   - 'Context7 docs consulted' (alternative format)"
  echo "   - 'Context7 unavailable' (for hotfixes)"
  exit 1
fi
