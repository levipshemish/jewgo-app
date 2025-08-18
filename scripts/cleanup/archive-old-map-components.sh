#!/bin/bash

# Archive Old Map Components Script
# This script archives the old map components after consolidation

echo "🗺️  Archiving old map components..."

# Create archive directory
ARCHIVE_DIR="frontend/components/map/archive/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$ARCHIVE_DIR"

# Archive old components
echo "📦 Archiving LiveMap.tsx (basic version)..."
if [ -f "frontend/components/map/LiveMap.tsx" ]; then
    mv "frontend/components/map/LiveMap.tsx" "$ARCHIVE_DIR/LiveMap.tsx"
    echo "✅ Archived LiveMap.tsx"
else
    echo "⚠️  LiveMap.tsx not found"
fi

echo "📦 Archiving LiveMapClient.tsx (old production version)..."
if [ -f "frontend/components/map/LiveMapClient.tsx" ]; then
    mv "frontend/components/map/LiveMapClient.tsx" "$ARCHIVE_DIR/LiveMapClient.tsx"
    echo "✅ Archived LiveMapClient.tsx"
else
    echo "⚠️  LiveMapClient.tsx not found"
fi

echo "📦 Archiving OptimizedLiveMapClient.tsx (performance version)..."
if [ -f "frontend/components/map/OptimizedLiveMapClient.tsx" ]; then
    mv "frontend/components/map/OptimizedLiveMapClient.tsx" "$ARCHIVE_DIR/OptimizedLiveMapClient.tsx"
    echo "✅ Archived OptimizedLiveMapClient.tsx"
else
    echo "⚠️  OptimizedLiveMapClient.tsx not found"
fi

# Create archive README
cat > "$ARCHIVE_DIR/README.md" << EOF
# Archived Map Components

This directory contains the old map components that were consolidated into UnifiedLiveMapClient.tsx.

## Components

- **LiveMap.tsx**: Basic Google Maps implementation (~115 lines)
- **LiveMapClient.tsx**: Full-featured production version (~745 lines)
- **OptimizedLiveMapClient.tsx**: High-performance version (~1293 lines)

## Migration

All functionality has been consolidated into:
- **UnifiedLiveMapClient.tsx**: New unified component (~800 lines)

## Archive Date

$(date)

## Migration Guide

See: docs/map-consolidation-migration.md
EOF

echo "📋 Created archive README"

# Check for any remaining imports of old components
echo "🔍 Checking for remaining imports of old components..."

OLD_IMPORTS=$(grep -r "LiveMap\|OptimizedLiveMapClient" frontend/ --include="*.tsx" --include="*.ts" --exclude-dir=archive | grep -v "UnifiedLiveMapClient" || true)

if [ -n "$OLD_IMPORTS" ]; then
    echo "⚠️  Found remaining imports of old components:"
    echo "$OLD_IMPORTS"
    echo "Please update these imports to use UnifiedLiveMapClient"
else
    echo "✅ No remaining imports of old components found"
fi

echo ""
echo "🎉 Archive complete!"
echo "📁 Archived components in: $ARCHIVE_DIR"
echo "📖 Migration guide: docs/map-consolidation-migration.md"
echo ""
echo "Next steps:"
echo "1. Test the new UnifiedLiveMapClient"
echo "2. Update any remaining documentation"
echo "3. Remove this script after verification"
