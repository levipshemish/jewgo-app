#!/usr/bin/env node

/**
 * Fix ESLint unused variable warnings by prefixing variables with underscore
 */

const fs = require('fs');
const path = require('path');

// Files with unused variables that need fixing
const filesToFix = [
  {
    file: 'frontend/app/api/auth.disabled/sync-user/route.ts',
    fixes: [
      { line: 21, old: 'name', new: '_name' },
      { line: 21, old: 'image', new: '_image' },
      { line: 56, old: 'request', new: '_request' }
    ]
  },
  {
    file: 'frontend/app/api/restaurants/[id]/approve/route.ts',
    fixes: [
      { line: 53, old: 'emailError', new: '_emailError' }
    ]
  },
  {
    file: 'frontend/app/api/restaurants/[id]/reject/route.ts',
    fixes: [
      { line: 57, old: 'emailError', new: '_emailError' }
    ]
  },
  {
    file: 'frontend/app/api/restaurants/[id]/route.ts',
    fixes: [
      { line: 58, old: 'fallbackError', new: '_fallbackError' }
    ]
  },
  {
    file: 'frontend/app/api/restaurants/business-types/route.ts',
    fixes: [
      { line: 3, old: 'request', new: '_request' }
    ]
  },
  {
    file: 'frontend/app/api/restaurants/route.ts',
    fixes: [
      { line: 129, old: 'emailError', new: '_emailError' },
      { line: 430, old: '_error', new: '__error' }
    ]
  },
  {
    file: 'frontend/app/api/restaurants/search/route.ts',
    fixes: [
      { line: 205, old: '_error', new: '__error' }
    ]
  },
  {
    file: 'frontend/app/api/reviews/route.ts',
    fixes: [
      { line: 23, old: 'mockReviews', new: '_mockReviews' }
    ]
  }
];

function fixFile(filePath, fixes) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  let lines = content.split('\n');
  let modified = false;

  fixes.forEach(fix => {
    // Create regex to match the variable at the specific line
    if (lines[fix.line - 1]) {
      const lineContent = lines[fix.line - 1];
      const newLine = lineContent.replace(
        new RegExp(`\\b${fix.old}\\b`, 'g'),
        fix.new
      );
      if (newLine !== lineContent) {
        lines[fix.line - 1] = newLine;
        modified = true;
        console.log(`✅ Fixed ${fix.old} → ${fix.new} in ${filePath}:${fix.line}`);
      }
    }
  });

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`✅ Updated ${filePath}`);
  }
}

function main() {
  console.log('🔧 Fixing ESLint unused variable warnings...\n');

  filesToFix.forEach(({ file, fixes }) => {
    fixFile(file, fixes);
  });

  console.log('\n✅ ESLint warning fixes completed!');
  console.log('💡 Run "npm run lint" to verify the fixes');
}

if (require.main === module) {
  main();
}

module.exports = { fixFile };
