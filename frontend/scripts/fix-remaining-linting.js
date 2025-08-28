#!/usr/bin/env node

/**
 * Script to fix remaining linting warnings
 * This script addresses unused variables, imports, and other minor linting issues
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files with specific fixes needed
const filesToFix = [
  {
    file: 'app/account/link/LinkAccountForm.tsx',
    fixes: [
      { pattern: /_err/g, replacement: '_error' },
      { pattern: /catch \(_err\)/g, replacement: 'catch (_error)' }
    ]
  },
  {
    file: 'app/admin/database/images/page.tsx',
    fixes: [
      { pattern: /catch \(e\)/g, replacement: 'catch (_e)' }
    ]
  },
  {
    file: 'app/admin/database/kosher-places/page.tsx',
    fixes: [
      { pattern: /catch \(e\)/g, replacement: 'catch (_e)' }
    ]
  },
  {
    file: 'app/admin/database/restaurants/page.tsx',
    fixes: [
      { pattern: /catch \(e\)/g, replacement: 'catch (_e)' }
    ]
  },
  {
    file: 'app/admin/database/reviews/page.tsx',
    fixes: [
      { pattern: /catch \(e\)/g, replacement: 'catch (_e)' }
    ]
  },
  {
    file: 'app/admin/database/users/page.tsx',
    fixes: [
      { pattern: /catch \(e\)/g, replacement: 'catch (_e)' }
    ]
  },
  {
    file: 'app/admin/layout.tsx',
    fixes: [
      { pattern: /const signedToken = /g, replacement: 'const _signedToken = ' }
    ]
  },
  {
    file: 'app/api/admin/system/stats/route.ts',
    fixes: [
      { pattern: /import.*prisma.*from/g, replacement: '// import { prisma } from' }
    ]
  },
  {
    file: 'app/api/auth/anonymous/route.ts',
    fixes: [
      { pattern: /const body = /g, replacement: 'const _body = ' }
    ]
  },
  {
    file: 'app/api/auth/merge-anonymous/route.ts',
    fixes: [
      { pattern: /catch \(error\)/g, replacement: 'catch (_error)' }
    ]
  },
  {
    file: 'app/api/auth/prepare-merge/route.ts',
    fixes: [
      { pattern: /catch \(error\)/g, replacement: 'catch (_error)' }
    ]
  },
  {
    file: 'app/api/auth/signout/route.ts',
    fixes: [
      { pattern: /catch \(error\)/g, replacement: 'catch (_error)' }
    ]
  },
  {
    file: 'app/api/cron/cleanup-anonymous/route.ts',
    fixes: [
      { pattern: /catch \(error\)/g, replacement: 'catch (_error)' }
    ]
  },
  {
    file: 'app/api/maintenance/cleanup-anonymous/route.ts',
    fixes: [
      { pattern: /catch \(_userError\)/g, replacement: 'catch (_error)' },
      { pattern: /catch \(_error\)/g, replacement: 'catch (_e)' }
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
  console.log('🔧 Fixing remaining linting warnings...\n');

  let fixedCount = 0;
  let totalFiles = filesToFix.length;

  filesToFix.forEach(({ file, fixes }) => {
    if (fixFile(file, fixes)) {
      fixedCount++;
    }
  });

  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${totalFiles}`);
  console.log(`   Files fixed: ${fixedCount}`);
  console.log(`   Files unchanged: ${totalFiles - fixedCount}`);

  if (fixedCount > 0) {
    console.log('\n🎉 Linting fixes applied successfully!');
    console.log('💡 Run "npm run lint" to verify the fixes.');
  } else {
    console.log('\nℹ️  No fixes were needed.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixFile, filesToFix };
