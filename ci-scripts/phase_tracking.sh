#!/usr/bin/env bash
set -euo pipefail

echo "🔍 Progressive Enhancement Phase Analysis"
echo "=========================================="

# Count PHASE markers across different file types
p0_count=0
p1_count=0
p2_count=0

if grep -R "// PHASE: P0" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null >/dev/null; then
    p0_count=$(grep -R "// PHASE: P0" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null | wc -l | tr -d ' ')
fi

if grep -R "// PHASE: P1" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null >/dev/null; then
    p1_count=$(grep -R "// PHASE: P1" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null | wc -l | tr -d ' ')
fi

if grep -R "// PHASE: P2" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null >/dev/null; then
    p2_count=$(grep -R "// PHASE: P2" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null | wc -l | tr -d ' ')
fi

echo "Feature Phase Status:"
printf "  P0 (Core): %s features\n" "${p0_count}"
printf "  P1 (Quality): %s features\n" "${p1_count}"
printf "  P2 (Polish): %s features\n" "${p2_count}"
echo ""

# Calculate phase distribution
total_features=$((p0_count + p1_count + p2_count))
if [ "$total_features" -gt 0 ]; then
    p0_pct=$((p0_count * 100 / total_features))
    p1_pct=$((p1_count * 100 / total_features))
    p2_pct=$((p2_count * 100 / total_features))
    
    echo "Phase Distribution:"
    echo "  P0: ${p0_pct}%"
    echo "  P1: ${p1_pct}%"
    echo "  P2: ${p2_pct}%"
    echo ""
else
    echo "No PHASE markers found in codebase"
    echo "💡 Add // PHASE: P0|P1|P2 comments to track feature development"
    echo ""
fi

# Health checks
warnings=0

# Warn if P0 features exceed P1 (potential tech debt)
if [ "$p0_count" -gt "$p1_count" ] && [ "$p0_count" -gt 0 ]; then
    echo "⚠️  Warning: More P0 than P1 features detected (potential tech debt)"
    warnings=$((warnings + 1))
fi

# Warn if too many P0 features (should be temporary)
if [ "$p0_count" -gt 5 ]; then
    echo "⚠️  Warning: High number of P0 features ($p0_count) - consider prioritizing P1 transitions"
    warnings=$((warnings + 1))
fi

# Warn if no P2 features (missing polish)
if [ "$p2_count" -eq 0 ] && [ "$total_features" -gt 0 ]; then
    echo "⚠️  Warning: No P2 features detected - consider adding polish features"
    warnings=$((warnings + 1))
fi

# List specific features by phase
echo "Detailed Feature Breakdown:"
echo "=========================="

if [ "$p0_count" -gt 0 ]; then
    echo "P0 Features (Core):"
    grep -R "// PHASE: P0" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null | head -10 | sed 's/^/  /' || true
    if [ "$p0_count" -gt 10 ]; then
        echo "  ... and $((p0_count - 10)) more"
    fi
    echo ""
fi

if [ "$p1_count" -gt 0 ]; then
    echo "P1 Features (Quality):"
    grep -R "// PHASE: P1" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null | head -10 | sed 's/^/  /' || true
    if [ "$p1_count" -gt 10 ]; then
        echo "  ... and $((p1_count - 10)) more"
    fi
    echo ""
fi

if [ "$p2_count" -gt 0 ]; then
    echo "P2 Features (Polish):"
    grep -R "// PHASE: P2" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.py" . 2>/dev/null | head -10 | sed 's/^/  /' || true
    if [ "$p2_count" -gt 10 ]; then
        echo "  ... and $((p2_count - 10)) more"
    fi
    echo ""
fi

# Exit with warning count (non-zero if warnings exist)
if [ "$warnings" -gt 0 ]; then
    echo "📊 Summary: $warnings warning(s) detected"
    echo "💡 Consider addressing warnings to improve codebase health"
    # Don't fail the build, just report warnings
    exit 0
else
    echo "✅ No phase-related warnings detected"
    exit 0
fi
