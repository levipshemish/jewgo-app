#!/usr/bin/env bash
set -euo pipefail
count=$(grep -R --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=venv --exclude-dir=.venv --exclude-dir=venv_py311 --exclude-dir=.venv_py311 --exclude-dir=__pycache__ --exclude-dir=.next --exclude-dir=coverage --exclude-dir=dist --exclude-dir=build -n "DEPRECATED:" || true | wc -l)
echo "DEPRECATED occurrences: $count"
# Not failing build, just reporting. To enforce, uncomment below:
# if [ "$count" -gt 0 ]; then exit 1; fi
