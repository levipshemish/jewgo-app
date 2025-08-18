#!/usr/bin/env node

/**
 * PR Template Validation
 * 
 * Validates PR template completion:
 * - Ensures required sections are completed
 * - Validates Context7 confirmation or skip justification
 * - Checks TEMPORARY/DEPRECATED summary table
 * - Validates rollback testing confirmation
 * - Enforces CI/CD confirmation
 */

const fs = require('fs');
const path = require('path');

// Required sections for full PR template
const REQUIRED_SECTIONS = [
  '## Reason Why',
  '## Dependencies',
  '## Success Criteria',
  '## Change Impact',
  '## Mini-Changelog',
  '## Context7 Documentation',
  '## Progressive Enhancement Phase',
  '## Testing',
  '## Performance Impact',
  '## Security & Validation',
  '## Rollback Plan'
];

// Required sections for hotfix PR template
const HOTFIX_REQUIRED_SECTIONS = [
  '## Reason Why',
  '## Change Impact',
  '## Mini-Changelog',
  '## Hotfix Validation',
  '## Testing',
  '## Rollback Plan'
];

// Required checkboxes
const REQUIRED_CHECKBOXES = [
  'Context7 docs checked and applied',
  'Rollback tested in staging/pre-prod environment',
  'Build/lint/tests pass locally',
  'CI pipeline green before merge'
];

// Context7 patterns
const CONTEXT7_PATTERNS = [
  /Context7\s+docs\s+checked\s+and\s+applied/i,
  /Skipped\s*\(justification:/i,
  /Context7\s+confirmed:\s*(yes|no)/i
];

// TEMPORARY/DEPRECATED table patterns
const TEMP_DEPRECATED_PATTERNS = [
  /\|\s*Code Ref\s*\|/i,
  /\|\s*Type\s*\|/i,
  /\|\s*Deadline\s*\|/i,
  /\|\s*Owner\s*\|/i
];

function getPRDescription() {
  try {
    if (process.env.GITHUB_EVENT_PATH) {
      const eventData = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
      return eventData.pull_request?.body || '';
    }
  } catch (err) {
    console.warn('Could not read PR description from GitHub event');
  }
  
  return '';
}

function isHotfixPR(prDescription) {
  const hotfixPatterns = [
    /hotfix/i,
    /urgent/i,
    /critical/i,
    /emergency/i,
    /fix.*urgent/i,
    /urgent.*fix/i
  ];
  
  return hotfixPatterns.some(pattern => pattern.test(prDescription));
}

function validateRequiredSections(prDescription, isHotfix) {
  const requiredSections = isHotfix ? HOTFIX_REQUIRED_SECTIONS : REQUIRED_SECTIONS;
  const missingSections = [];
  
  requiredSections.forEach(section => {
    if (!prDescription.includes(section)) {
      missingSections.push(section);
    }
  });
  
  return missingSections;
}

function validateCheckboxes(prDescription) {
  const missingCheckboxes = [];
  
  REQUIRED_CHECKBOXES.forEach(checkbox => {
    const checkboxPattern = new RegExp(`-\\s*\\[\\s*\\]\\s*${checkbox.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    if (!checkboxPattern.test(prDescription)) {
      missingCheckboxes.push(checkbox);
    }
  });
  
  return missingCheckboxes;
}

function validateContext7(prDescription) {
  const hasContext7Confirmation = CONTEXT7_PATTERNS.some(pattern => pattern.test(prDescription));
  
  if (!hasContext7Confirmation) {
    return {
      isValid: false,
      message: 'Missing Context7 confirmation or skip justification'
    };
  }
  
  // Check if skipped without justification
  const skippedWithoutJustification = /Skipped\s*\(justification:\s*\)/i.test(prDescription);
  if (skippedWithoutJustification) {
    return {
      isValid: false,
      message: 'Context7 skipped but no justification provided'
    };
  }
  
  return {
    isValid: true,
    message: 'Context7 validation passed'
  };
}

function validateTempDeprecatedTable(prDescription) {
  // Check if TEMPORARY/DEPRECATED section exists
  if (!prDescription.includes('## TEMPORARY/DEPRECATED Summary')) {
    return {
      isValid: false,
      message: 'Missing TEMPORARY/DEPRECATED Summary section'
    };
  }
  
  // Check if table structure is present
  const hasTableStructure = TEMP_DEPRECATED_PATTERNS.every(pattern => pattern.test(prDescription));
  if (!hasTableStructure) {
    return {
      isValid: false,
      message: 'TEMPORARY/DEPRECATED table missing required columns'
    };
  }
  
  // Check if table has actual data (not just headers)
  const tableDataPattern = /\|\s*`[^`]+`\s*\|/;
  if (!tableDataPattern.test(prDescription)) {
    return {
      isValid: true, // Empty table is OK if no TEMPORARY/DEPRECATED items
      message: 'TEMPORARY/DEPRECATED table present but empty (OK if no items)'
    };
  }
  
  return {
    isValid: true,
    message: 'TEMPORARY/DEPRECATED table validation passed'
  };
}

function validateRollbackTesting(prDescription) {
  const rollbackPatterns = [
    /Rollback\s+tested\s+in\s+staging/i,
    /Rollback\s+tested\s+in\s+pre-prod/i,
    /Rollback\s+plan\s+documented\s+and\s+tested/i
  ];
  
  const hasRollbackTesting = rollbackPatterns.some(pattern => pattern.test(prDescription));
  
  if (!hasRollbackTesting) {
    return {
      isValid: false,
      message: 'Missing rollback testing confirmation'
    };
  }
  
  return {
    isValid: true,
    message: 'Rollback testing validation passed'
  };
}

function validateCICD(prDescription) {
  const cicdPatterns = [
    /Build\/lint\/tests\s+pass\s+locally/i,
    /CI\s+pipeline\s+green\s+before\s+merge/i,
    /All\s+Mendel\s+Mode\s+checks\s+passed/i
  ];
  
  const hasCICDConfirmation = cicdPatterns.some(pattern => pattern.test(prDescription));
  
  if (!hasCICDConfirmation) {
    return {
      isValid: false,
      message: 'Missing CI/CD confirmation'
    };
  }
  
  return {
    isValid: true,
    message: 'CI/CD validation passed'
  };
}

function generateReport(validationResults) {
  console.log('\n🔍 PR Template Validation Report');
  console.log('================================\n');
  
  const {
    isHotfix,
    missingSections,
    missingCheckboxes,
    context7Validation,
    tempDeprecatedValidation,
    rollbackValidation,
    cicdValidation
  } = validationResults;
  
  console.log(`📊 Analysis:`);
  console.log(`   • PR Type: ${isHotfix ? 'Hotfix' : 'Feature/Refactor'}`);
  console.log(`   • Missing sections: ${missingSections.length}`);
  console.log(`   • Missing checkboxes: ${missingCheckboxes.length}`);
  console.log(`   • Context7: ${context7Validation.isValid ? 'Valid' : 'Invalid'}`);
  console.log(`   • TEMP/DEPRECATED: ${tempDeprecatedValidation.isValid ? 'Valid' : 'Invalid'}`);
  console.log(`   • Rollback Testing: ${rollbackValidation.isValid ? 'Valid' : 'Invalid'}`);
  console.log(`   • CI/CD: ${cicdValidation.isValid ? 'Valid' : 'Invalid'}\n`);
  
  let hasErrors = false;
  
  if (missingSections.length > 0) {
    console.log('❌ Missing Required Sections:');
    console.log('-------------------------------');
    missingSections.forEach(section => {
      console.log(`   • ${section}`);
    });
    console.log('');
    hasErrors = true;
  }
  
  if (missingCheckboxes.length > 0) {
    console.log('❌ Missing Required Checkboxes:');
    console.log('--------------------------------');
    missingCheckboxes.forEach(checkbox => {
      console.log(`   • ${checkbox}`);
    });
    console.log('');
    hasErrors = true;
  }
  
  if (!context7Validation.isValid) {
    console.log('❌ Context7 Validation:');
    console.log('------------------------');
    console.log(`   • ${context7Validation.message}`);
    console.log('');
    hasErrors = true;
  }
  
  if (!tempDeprecatedValidation.isValid) {
    console.log('❌ TEMPORARY/DEPRECATED Validation:');
    console.log('-----------------------------------');
    console.log(`   • ${tempDeprecatedValidation.message}`);
    console.log('');
    hasErrors = true;
  }
  
  if (!rollbackValidation.isValid) {
    console.log('❌ Rollback Testing Validation:');
    console.log('--------------------------------');
    console.log(`   • ${rollbackValidation.message}`);
    console.log('');
    hasErrors = true;
  }
  
  if (!cicdValidation.isValid) {
    console.log('❌ CI/CD Validation:');
    console.log('--------------------');
    console.log(`   • ${cicdValidation.message}`);
    console.log('');
    hasErrors = true;
  }
  
  if (!hasErrors) {
    console.log('✅ PR template validation passed');
    console.log('');
    console.log('💡 Template Usage:');
    console.log('------------------');
    console.log('• Use full template for features, refactors, and significant changes');
    console.log('• Use hotfix template for urgent fixes and minimal changes');
    console.log('• Ensure all required sections are completed');
    console.log('• Provide Context7 confirmation or skip justification');
    console.log('• Complete TEMPORARY/DEPRECATED summary table if applicable');
    console.log('• Confirm rollback testing and CI/CD completion');
  } else {
    console.log('💡 How to Fix:');
    console.log('--------------');
    console.log('1. Complete all required sections');
    console.log('2. Check all required checkboxes');
    console.log('3. Provide Context7 confirmation or skip justification');
    console.log('4. Complete TEMPORARY/DEPRECATED summary table');
    console.log('5. Confirm rollback testing completion');
    console.log('6. Confirm CI/CD pipeline completion');
  }
  
  return !hasErrors;
}

function main() {
  console.log('🔍 Running PR Template Validation...\n');
  
  try {
    const prDescription = getPRDescription();
    
    if (!prDescription) {
      console.log('⚠️  No PR description found. Running in demo mode...');
      return true;
    }
    
    const isHotfix = isHotfixPR(prDescription);
    const missingSections = validateRequiredSections(prDescription, isHotfix);
    const missingCheckboxes = validateCheckboxes(prDescription);
    const context7Validation = validateContext7(prDescription);
    const tempDeprecatedValidation = validateTempDeprecatedTable(prDescription);
    const rollbackValidation = validateRollbackTesting(prDescription);
    const cicdValidation = validateCICD(prDescription);
    
    const validationResults = {
      isHotfix,
      missingSections,
      missingCheckboxes,
      context7Validation,
      tempDeprecatedValidation,
      rollbackValidation,
      cicdValidation
    };
    
    const success = generateReport(validationResults);
    
    if (!success) {
      console.log('\n❌ PR template validation failed');
      console.log('Please complete all required sections before merging');
      process.exit(1);
    } else {
      console.log('\n✅ PR template validation passed');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error running PR template validation:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  validateRequiredSections, 
  validateCheckboxes, 
  validateContext7, 
  validateTempDeprecatedTable, 
  validateRollbackTesting, 
  validateCICD, 
  generateReport 
};
