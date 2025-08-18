#!/usr/bin/env bash
set -euo pipefail

echo "🧹 Temporary & Experimental File Cleanup Check"
echo "==============================================="

# Track findings
expired_files=()
missing_deadlines=()
temp_files=()
experimental_files=()

# File extensions to check (exclude documentation files)
FILE_EXTENSIONS=("*.ts" "*.tsx" "*.js" "*.jsx" "*.py")

# Current date for comparison
current_date=$(date +%Y-%m-%d)

# Find all files with TEMPORARY or EXPERIMENTAL markers
for ext in "${FILE_EXTENSIONS[@]}"; do
    while IFS= read -r -d '' file; do
        # Check for TEMPORARY markers (skip documentation examples)
        if grep -q "// TEMPORARY:" "$file" && ! grep -q "Example" "$file"; then
            temp_files+=("$file")
            
            # Extract deadline from TEMPORARY comment
            deadline_line=$(grep "// TEMPORARY:" "$file" | head -1)
            
            # Check if deadline is specified
            if echo "$deadline_line" | grep -q "Cleanup by:"; then
                deadline=$(echo "$deadline_line" | sed -n 's/.*Cleanup by: \([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\).*/\1/p')
                
                if [ -n "$deadline" ]; then
                    # Compare dates
                    if [[ "$deadline" < "$current_date" ]]; then
                        expired_files+=("$file (deadline: $deadline)")
                    else
                        days_remaining=$(( ($(date -d "$deadline" +%s) - $(date -d "$current_date" +%s)) / 86400 ))
                        echo "📅 $file - expires in $days_remaining days (deadline: $deadline)"
                    fi
                else
                    missing_deadlines+=("$file")
                fi
            else
                missing_deadlines+=("$file")
            fi
        fi
        
        # Check for EXPERIMENTAL markers (skip documentation examples)
        if grep -q "// EXPERIMENTAL:" "$file" && ! grep -q "Example" "$file"; then
            experimental_files+=("$file")
            echo "🧪 $file - experimental code (7-day cleanup required)"
        fi
    done < <(find . -name "$ext" -print0 2>/dev/null || true)
done

echo ""

# Report findings
if [ ${#temp_files[@]} -eq 0 ]; then
    echo "✅ No temporary files found"
    exit 0
fi

echo "📊 Temporary & Experimental File Summary:"
echo "  Total temporary files: ${#temp_files[@]}"
echo "  Total experimental files: ${#experimental_files[@]}"
echo "  Expired files: ${#expired_files[@]}"
echo "  Files missing deadlines: ${#missing_deadlines[@]}"
echo ""

# Report expired files
if [ ${#expired_files[@]} -gt 0 ]; then
    echo "❌ EXPIRED TEMPORARY FILES (must be cleaned up):"
    for file in "${expired_files[@]}"; do
        echo "  - $file"
    done
    echo ""
fi

# Report files missing deadlines
if [ ${#missing_deadlines[@]} -gt 0 ]; then
    echo "⚠️  TEMPORARY FILES MISSING DEADLINES:"
    for file in "${missing_deadlines[@]}"; do
        echo "  - $file"
    done
    echo "   Add 'Cleanup by: YYYY-MM-DD' to TEMPORARY comments"
    echo ""
fi

# Show all temporary files for reference
echo "📋 All Temporary Files:"
for file in "${temp_files[@]}"; do
    # Extract purpose from TEMPORARY comment
    purpose=$(grep "// TEMPORARY:" "$file" | head -1 | sed 's/.*\/\/ TEMPORARY: //' | sed 's/ Cleanup by:.*//')
    echo "  - $file ($purpose)"
done

# Show all experimental files for reference
if [ ${#experimental_files[@]} -gt 0 ]; then
    echo "🧪 All Experimental Files:"
    for file in "${experimental_files[@]}"; do
        echo "  - $file (experimental code)"
    done
fi
echo ""

# Fail if there are expired files
if [ ${#expired_files[@]} -gt 0 ]; then
    echo "🚨 FAIL: Clean up expired temporary files before merging"
    echo "💡 Use: git rm <file> or convert to permanent structure"
    exit 1
fi

# Warn if missing deadlines (but don't fail)
if [ ${#missing_deadlines[@]} -gt 0 ]; then
    echo "⚠️  WARNING: Some temporary files are missing cleanup deadlines"
    echo "💡 Add deadlines to prevent accumulation of temporary files"
    exit 0
fi

echo "✅ All temporary files have valid deadlines"
exit 0
