#!/usr/bin/env node

/**
 * Script to fix critical linting errors
 * This script addresses missing curly braces, console statements, and other critical issues
 */

const fs = require('fs');
const path = require('path');

// Files with critical fixes needed
const criticalFixes = [
  {
    file: 'app/test-markers/page.tsx',
    fixes: [
      { pattern: /console\.log\(/g, replacement: '// console.log(' },
      { pattern: /console\.error\(/g, replacement: '// console.error(' }
    ]
  },
  {
    file: 'components/LocationPromptPopup.tsx',
    fixes: [
      { pattern: /if \(!isLoading\) return;/g, replacement: 'if (!isLoading) { return; }' },
      { pattern: /Don't/g, replacement: 'Don&apos;t' },
      { pattern: /can't/g, replacement: 'can&apos;t' },
      { pattern: /won't/g, replacement: 'won&apos;t' }
    ]
  },
  {
    file: 'components/admin/DataTable.tsx',
    fixes: [
      { pattern: /if \(!data\) return null;/g, replacement: 'if (!data) { return null; }' }
    ]
  },
  {
    file: 'components/admin/KosherPlacesDatabaseClient.tsx',
    fixes: [
      { pattern: /if \(!data\) return null;/g, replacement: 'if (!data) { return null; }' }
    ]
  },
  {
    file: 'components/debug/EnvCheck.tsx',
    fixes: [
      { pattern: /console\.log\(/g, replacement: '// console.log(' }
    ]
  },
  {
    file: 'components/debug/PlacesStatusBadge.tsx',
    fixes: [
      { pattern: /if \(!status\) return null;/g, replacement: 'if (!status) { return null; }' }
    ]
  },
  {
    file: 'components/map/InteractiveRestaurantMap.tsx',
    fixes: [
      { pattern: /if \(!restaurants\) return;/g, replacement: 'if (!restaurants) { return; }' },
      { pattern: /if \(!map\) return;/g, replacement: 'if (!map) { return; }' },
      { pattern: /if \(!markersRef\.current\) return;/g, replacement: 'if (!markersRef.current) { return; }' }
    ]
  },
  {
    file: 'components/map/hooks/useMarkerManagement.ts',
    fixes: [
      { pattern: /if \(!markers\) return;/g, replacement: 'if (!markers) { return; }' },
      { pattern: /console\.log\(/g, replacement: '// console.log(' }
    ]
  },
  {
    file: 'lib/admin/audit.ts',
    fixes: [
      { pattern: /if \(!data\) return;/g, replacement: 'if (!data) { return; }' },
      { pattern: /if \(!response\) return;/g, replacement: 'if (!response) { return; }' },
      { pattern: /if \(!result\) return;/g, replacement: 'if (!result) { return; }' },
      { pattern: /if \(!error\) return;/g, replacement: 'if (!error) { return; }' },
      { pattern: /if \(!user\) return;/g, replacement: 'if (!user) { return; }' }
    ]
  },
  {
    file: 'lib/hooks/useAuth.ts',
    fixes: [
      { pattern: /if \(!session\) return;/g, replacement: 'if (!session) { return; }' }
    ]
  },
  {
    file: 'lib/types/external-libraries.ts',
    fixes: [
      { pattern: /console\.log\(/g, replacement: '// console.log(' }
    ]
  },
  {
    file: 'lib/types/supabase-auth.ts',
    fixes: [
      { pattern: /console\.log\(/g, replacement: '// console.log(' },
      { pattern: /console\.error\(/g, replacement: '// console.error(' }
    ]
  },
  {
    file: 'lib/utils/correlation.ts',
    fixes: [
      { pattern: /if \(!correlationId\) return;/g, replacement: 'if (!correlationId) { return; }' }
    ]
  },
  {
    file: 'lib/utils/favorites.ts',
    fixes: [
      { pattern: /if \(!user\) return;/g, replacement: 'if (!user) { return; }' },
      { pattern: /if \(!restaurantId\) return;/g, replacement: 'if (!restaurantId) { return; }' },
      { pattern: /if \(!response\) return;/g, replacement: 'if (!response) { return; }' },
      { pattern: /if \(!data\) return;/g, replacement: 'if (!data) { return; }' },
      { pattern: /if \(!result\) return;/g, replacement: 'if (!result) { return; }' }
    ]
  },
  {
    file: 'lib/utils/type-safe-wrappers.ts',
    fixes: [
      { pattern: /console\.log\(/g, replacement: '// console.log(' }
    ]
  }
];

function fixFile(filePath, fixes) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  fixes.forEach(fix => {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing critical linting errors...\n');

  let fixedCount = 0;
  let totalFiles = criticalFixes.length;

  criticalFixes.forEach(({ file, fixes }) => {
    if (fixFile(file, fixes)) {
      fixedCount++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${totalFiles}`);
  console.log(`   Files fixed: ${fixedCount}`);
  console.log(`   Files unchanged: ${totalFiles - fixedCount}`);

  if (fixedCount > 0) {
    console.log('\n🎉 Critical linting fixes applied successfully!');
    console.log('💡 Run "npm run lint" to verify the fixes.');
  } else {
    console.log('\nℹ️  No critical fixes were needed.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, criticalFixes };
