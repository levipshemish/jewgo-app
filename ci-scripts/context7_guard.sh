#!/usr/bin/env bash
set -euo pipefail
EVENT_PATH="${1:-}"
if [[ -z "$EVENT_PATH" || ! -f "$EVENT_PATH" ]]; then
  echo "No GitHub event payload found; skipping."
  exit 0
fi
body=$(jq -r '.pull_request.body // ""' "$EVENT_PATH")
if echo "$body" | grep -qi "Context7"; then
  echo "✅ PR body mentions Context7"
  exit 0
else
  echo "❌ PR body must confirm Context7 docs were consulted."
  exit 1
fi
