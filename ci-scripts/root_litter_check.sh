#!/usr/bin/env bash
set -euo pipefail

# Allowlist for root-level files
ALLOWED=(
  "README.md" "RULES.md" "DEPRECATIONS.md" "LICENSE" ".gitignore" ".gitattributes" "package.json" ".DS_Store"
  "pnpm-lock.yaml" "package-lock.json" "yarn.lock" "tsconfig.json" "next.config.js"
  "jest.config.js" "babel.config.js" "vercel.json" "netlify.toml" "docker-compose.yml"
  "Dockerfile" "pyproject.toml" "requirements.txt" "Pipfile" "Pipfile.lock"
  ".prettierrc" ".eslintrc.js" ".eslintignore" ".ruff.toml" "setup.cfg" ".env.example"
  ".nvmrc" ".python-version" ".tool-versions" ".editorconfig" ".pre-commit-config.yaml"
  "build.sh" "commitlint.config.js" "duplication_analysis_report.json"
  "test_deployment.py" "test_deployment_simple.py" ".env" ".env.local"
  "render.yaml" "app.py" "Procfile"
)

violations=0

for f in $(find . -maxdepth 1 -type f | sed 's|^./||'); do
  allowed=false
  for a in "${ALLOWED[@]}"; do
    if [[ "$f" == "$a" ]]; then allowed=true; break; fi
  done
  if [ "$allowed" = false ]; then
    echo "Root litter: $f"
    violations=$((violations+1))
  fi
done

if [ "$violations" -gt 0 ]; then
  echo "FAIL: Remove or relocate root files not in allowlist."
  exit 1
else
  echo "✅ Root litter check passed"
fi
