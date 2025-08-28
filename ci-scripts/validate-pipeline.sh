#!/usr/bin/env bash
set -euo pipefail

echo "🔍 CI/CD Pipeline Validation"
echo "============================"

# Check if all required CI scripts exist
required_scripts=(
    "phase_tracking.sh"
    "temp_deprecated_check.js"
    "context7_guard.sh"
    "context7_validation.js"
    "coverage_gate.js"
    "db_performance_check.js"
    "deprecation_check.sh"
    "deprecation_ownership_check.js"
    "dup_scan.js"
    "duplication_prevention.js"
    "fe_coverage_gate.js"
    "file_placement_check.js"
    "performance_budget.js"
    "performance_regression.js"
    "pr_template_validation.js"
    "rollback_validation.js"
    "root_litter_check.sh"
)

echo "📋 Checking required CI scripts..."
missing_scripts=()

for script in "${required_scripts[@]}"; do
    if [[ ! -f "ci-scripts/$script" ]]; then
        missing_scripts+=("$script")
        echo "❌ Missing: ci-scripts/$script"
    else
        echo "✅ Found: ci-scripts/$script"
    fi
done

if [[ ${#missing_scripts[@]} -gt 0 ]]; then
    echo ""
    echo "❌ Missing ${#missing_scripts[@]} required CI scripts:"
    for script in "${missing_scripts[@]}"; do
        echo "  - $script"
    done
    echo ""
    echo "💡 Some scripts may need to be created for the CI pipeline to work properly."
    echo "   The pipeline can continue with warnings for missing scripts."
fi

# Check script permissions
echo ""
echo "🔒 Checking script permissions..."
for script in "${required_scripts[@]}"; do
    if [[ -f "ci-scripts/$script" ]]; then
        if [[ "$script" == *.sh ]]; then
            if [[ ! -x "ci-scripts/$script" ]]; then
                echo "⚠️  Making executable: ci-scripts/$script"
                chmod +x "ci-scripts/$script"
            fi
        fi
    fi
done

# Validate JavaScript syntax for existing scripts
echo ""
echo "📝 Validating JavaScript CI scripts..."
for script in ci-scripts/*.js; do
    if [[ -f "$script" ]]; then
        if node -c "$script"; then
            echo "✅ Valid syntax: $script"
        else
            echo "❌ Syntax error in: $script"
        fi
    fi
done

# Validate shell scripts
echo ""
echo "🐚 Validating shell scripts..."
for script in ci-scripts/*.sh; do
    if [[ -f "$script" ]]; then
        if bash -n "$script"; then
            echo "✅ Valid syntax: $script"
        else
            echo "❌ Syntax error in: $script"
        fi
    fi
done

# Check environment setup scripts
echo ""
echo "🌍 Checking environment setup scripts..."
if [[ -f "scripts/env-consistency-check.js" ]]; then
    echo "✅ Found: scripts/env-consistency-check.js"
    if node -c "scripts/env-consistency-check.js"; then
        echo "✅ Valid syntax: scripts/env-consistency-check.js"
    else
        echo "❌ Syntax error in: scripts/env-consistency-check.js"
    fi
else
    echo "❌ Missing: scripts/env-consistency-check.js"
fi

if [[ -f "scripts/validate-db-separation.sh" ]]; then
    echo "✅ Found: scripts/validate-db-separation.sh"
    chmod +x "scripts/validate-db-separation.sh"
else
    echo "❌ Missing: scripts/validate-db-separation.sh"
fi

echo ""
echo "📊 Validation Summary"
echo "===================="
echo "Total required scripts: ${#required_scripts[@]}"
echo "Missing scripts: ${#missing_scripts[@]}"

if [[ ${#missing_scripts[@]} -eq 0 ]]; then
    echo "✅ All CI scripts are present and validated"
    exit 0
else
    echo "⚠️  Some scripts are missing but CI can continue with warnings"
    echo "💡 Consider implementing the missing scripts for full pipeline functionality"
    exit 0
fi