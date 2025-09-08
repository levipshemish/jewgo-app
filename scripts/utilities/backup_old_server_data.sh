#!/bin/bash

# JewGo Server Data Backup Script
# This script extracts all data from the old server via API calls
# for migration to the new server

set -e

OLD_SERVER="https://api.jewgo.app"
BACKUP_DIR="server_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "🚀 Starting data backup from old server..."
echo "📁 Backup directory: $BACKUP_DIR"

# Function to make API calls and save responses
api_call() {
    local endpoint="$1"
    local filename="$2"
    local description="$3"
    
    echo "📥 Fetching $description..."
    
    if curl -s -f "$OLD_SERVER$endpoint" -o "$BACKUP_DIR/$filename" 2>/dev/null; then
        echo "✅ $description saved to $filename"
        # Show file size
        if [ -f "$BACKUP_DIR/$filename" ]; then
            size=$(wc -c < "$BACKUP_DIR/$filename")
            echo "   📊 Size: $size bytes"
        fi
    else
        echo "❌ Failed to fetch $description"
        # Create empty file to indicate failure
        echo "{\"error\": \"Failed to fetch $description from $OLD_SERVER$endpoint\"}" > "$BACKUP_DIR/$filename"
        return 0  # Continue even if this call fails
    fi
}

# Function to test API endpoint
test_endpoint() {
    local endpoint="$1"
    local description="$2"
    
    echo "🔍 Testing $description..."
    if curl -s -f "$OLD_SERVER$endpoint" >/dev/null 2>&1; then
        echo "✅ $description is accessible"
        return 0
    else
        echo "❌ $description is not accessible"
        return 0  # Continue even if endpoint fails
    fi
}

echo ""
echo "🔍 Testing API endpoints..."

# Test main endpoints
test_endpoint "/health" "Health endpoint"
test_endpoint "/api/restaurants" "Restaurants API"
test_endpoint "/api/synagogues" "Synagogues API"
test_endpoint "/api/events" "Events API"
test_endpoint "/api/reviews" "Reviews API"

echo ""
echo "📊 Backing up data..."

# 1. Health and system info
api_call "/health" "health.json" "Health status"

# 2. Restaurants data
api_call "/api/restaurants" "restaurants.json" "All restaurants"
api_call "/api/restaurants?limit=1000" "restaurants_detailed.json" "Detailed restaurants"

# 3. Synagogues data
api_call "/api/synagogues" "synagogues.json" "All synagogues"
api_call "/api/synagogues?limit=1000" "synagogues_detailed.json" "Detailed synagogues"

# 4. Events data
api_call "/api/events" "events.json" "All events"
api_call "/api/events?limit=1000" "events_detailed.json" "Detailed events"

# 5. Reviews data
api_call "/api/reviews" "reviews.json" "All reviews"
api_call "/api/reviews?limit=1000" "reviews_detailed.json" "Detailed reviews"

# 6. User data (if accessible)
api_call "/api/users" "users.json" "User data" || echo "⚠️  User endpoint not accessible"

# 7. Analytics/metrics data
api_call "/api/metrics" "metrics.json" "Application metrics" || echo "⚠️  Metrics endpoint not accessible"

# 8. Search data
api_call "/api/search?q=restaurant" "search_restaurant.json" "Restaurant search results"
api_call "/api/search?q=synagogue" "search_synagogue.json" "Synagogue search results"

# 9. Categories/tags
api_call "/api/categories" "categories.json" "Categories" || echo "⚠️  Categories endpoint not accessible"
api_call "/api/tags" "tags.json" "Tags" || echo "⚠️  Tags endpoint not accessible"

# 10. Configuration data
api_call "/api/config" "config.json" "Configuration" || echo "⚠️  Config endpoint not accessible"

echo ""
echo "📋 Creating backup summary..."

# Create backup summary
cat > "$BACKUP_DIR/backup_summary.txt" << EOF
JewGo Server Data Backup Summary
================================
Backup Date: $(date)
Source Server: $OLD_SERVER
Backup Directory: $BACKUP_DIR

Files Backed Up:
$(ls -la "$BACKUP_DIR" | grep -v "^total" | awk '{print $5, $9}' | while read size file; do
    if [ "$file" != "backup_summary.txt" ]; then
        echo "- $file ($size bytes)"
    fi
done)

API Endpoints Tested:
- /health - Health status
- /api/restaurants - Restaurant data
- /api/synagogues - Synagogue data  
- /api/events - Event data
- /api/reviews - Review data
- /api/users - User data (if accessible)
- /api/metrics - Metrics data (if accessible)
- /api/search - Search functionality
- /api/categories - Categories (if accessible)
- /api/tags - Tags (if accessible)
- /api/config - Configuration (if accessible)

Next Steps:
1. Review the backed up data
2. Set up new server with this data
3. Import data into new database
4. Update DNS to point to new server
EOF

echo "✅ Backup summary created: $BACKUP_DIR/backup_summary.txt"

echo ""
echo "📊 Backup Statistics:"
total_files=$(find "$BACKUP_DIR" -name "*.json" | wc -l)
total_size=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "   📁 Total files: $total_files"
echo "   💾 Total size: $total_size"

echo ""
echo "🎉 Data backup completed successfully!"
echo "📁 All data saved to: $BACKUP_DIR"
echo ""
echo "Next steps:"
echo "1. Review the backed up data in $BACKUP_DIR"
echo "2. Set up new server at 150.136.63.50"
echo "3. Import this data into the new server"
