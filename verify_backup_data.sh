#!/bin/bash

# Verify backup data script
BACKUP_DIR="server_backup_20250908_030822"

echo "🔍 Verifying backed up data from $BACKUP_DIR"
echo ""

if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Backup directory not found!"
    exit 1
fi

echo "📊 Backup Summary:"
echo "=================="

# Check each file and show its status
for file in "$BACKUP_DIR"/*.json; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        size=$(wc -c < "$file")
        
        # Check if it's an error file
        if grep -q '"error"' "$file" 2>/dev/null; then
            echo "❌ $filename ($size bytes) - ERROR"
        else
            echo "✅ $filename ($size bytes) - SUCCESS"
            
            # Show sample data for successful files
            if [ "$filename" = "restaurants.json" ]; then
                count=$(jq '.items | length' "$file" 2>/dev/null || echo "N/A")
                echo "   📍 Contains $count restaurant records"
            elif [ "$filename" = "health.json" ]; then
                status=$(jq -r '.status' "$file" 2>/dev/null || echo "N/A")
                echo "   🏥 Health status: $status"
            fi
        fi
    fi
done

echo ""
echo "📈 Data Statistics:"
echo "==================="

# Count successful vs failed backups
total_files=$(find "$BACKUP_DIR" -name "*.json" | wc -l)
successful_files=$(find "$BACKUP_DIR" -name "*.json" -exec grep -L '"error"' {} \; | wc -l)
failed_files=$((total_files - successful_files))

echo "📁 Total files: $total_files"
echo "✅ Successful: $successful_files"
echo "❌ Failed: $failed_files"

# Show restaurant data details
if [ -f "$BACKUP_DIR/restaurants.json" ] && ! grep -q '"error"' "$BACKUP_DIR/restaurants.json"; then
    echo ""
    echo "🍽️  Restaurant Data Details:"
    echo "============================"
    
    total_restaurants=$(jq '.items | length' "$BACKUP_DIR/restaurants.json")
    echo "📊 Total restaurants: $total_restaurants"
    
    # Count by kosher category
    echo "🏷️  By Kosher Category:"
    jq -r '.items[].kosher_category' "$BACKUP_DIR/restaurants.json" | sort | uniq -c | while read count category; do
        echo "   $category: $count"
    done
    
    # Count by city
    echo "🏙️  Top Cities:"
    jq -r '.items[].city' "$BACKUP_DIR/restaurants.json" | sort | uniq -c | sort -nr | head -5 | while read count city; do
        echo "   $city: $count"
    done
fi

echo ""
echo "🎯 Ready for Migration:"
echo "======================="

if [ $successful_files -gt 0 ]; then
    echo "✅ Backup contains usable data"
    echo "📤 Ready to migrate to new server at 150.136.63.50"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Run: ./setup_new_server.sh"
    echo "2. Update DNS to point to new server"
    echo "3. Test all endpoints"
else
    echo "❌ No usable data found in backup"
    echo "🔧 Please check API endpoints and retry backup"
fi
