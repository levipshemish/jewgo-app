#!/bin/bash

# Test runner for UnifiedCard component tests

echo "🧪 Running UnifiedCard Component Tests"
echo "======================================"

cd "$(dirname "$0")/.."

# Run accessibility tests
echo ""
echo "📋 Running Accessibility Tests..."
npm test -- components/ui/__tests__/UnifiedCard.accessibility.test.tsx --watchAll=false

# Run functional tests
echo ""
echo "⚡ Running Functional Tests..."
npm test -- components/ui/__tests__/UnifiedCard.functional.test.tsx --watchAll=false

# Run edge case tests
echo ""
echo "🔍 Running Edge Case Tests..."
npm test -- components/ui/__tests__/UnifiedCard.edge-cases.test.tsx --watchAll=false

echo ""
echo "✅ All tests completed!"
echo ""
echo "To run tests in watch mode, use:"
echo "  npm test -- components/ui/__tests__/UnifiedCard"
