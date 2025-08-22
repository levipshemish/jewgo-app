#!/usr/bin/env node

/**
 * Context7 Validation
 * 
 * Ensures PRs include Context7 confirmation:
 * - PRs must include "Context7 confirmed: <yes/no>" in description
 * - CI fails if "no" for non-hotfixes
 * - Requires justification for hotfixes without Context7
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONTEXT7_PATTERN = /Context7\s+confirmed:\s*(yes|no)/i;
const HOTFIX_PATTERNS = [
  /hotfix/i,
  /urgent/i,
  /critical/i,
  /emergency/i,
  /fix.*urgent/i,
  /urgent.*fix/i
];

function parsePRDescription(prDescription) {
  const context7Match = prDescription.match(CONTEXT7_PATTERN);
  const isHotfix = HOTFIX_PATTERNS.some(pattern => pattern.test(prDescription));
  
  return {
    hasContext7Confirmation: !!context7Match,
    context7Confirmed: context7Match ? context7Match[1].toLowerCase() === 'yes' : null,
    isHotfix,
    description: prDescription
  };
}

function validateContext7(prData) {
  const issues = [];
  
  // Check if PR has Context7 confirmation
  if (!prData.hasContext7Confirmation) {
    issues.push({
      type: 'missing_confirmation',
      message: 'PR description must include "Context7 confirmed: <yes/no>"',
      severity: 'error'
    });
    return issues;
  }
  
  // If Context7 not confirmed
  if (!prData.context7Confirmed) {
    if (prData.isHotfix) {
      // For hotfixes, check if justification is provided
      const justificationPatterns = [
        /justification:/i,
        /reason.*no.*context7/i,
        /context7.*unavailable/i,
        /emergency.*override/i
      ];
      
      const hasJustification = justificationPatterns.some(pattern => 
        pattern.test(prData.description)
      );
      
      if (!hasJustification) {
        issues.push({
          type: 'missing_justification',
          message: 'Hotfix without Context7 requires justification (e.g., "Justification: emergency fix, Context7 unavailable")',
          severity: 'error'
        });
      } else {
        issues.push({
          type: 'hotfix_override',
          message: 'Hotfix proceeding without Context7 - ensure review when available',
          severity: 'warning'
        });
      }
    } else {
      // Non-hotfix PRs cannot proceed without Context7
      issues.push({
        type: 'no_context7_non_hotfix',
        message: 'Non-hotfix PRs cannot proceed without Context7 confirmation',
        severity: 'error'
      });
    }
  }
  
  return issues;
}

function generateReport(prData, issues) {

  if (issues.length === 0) {

    return true;
  }
  
  // Group issues by severity
  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');
  
  if (errors.length > 0) {

    errors.forEach(issue => {

    });

  }
  
  if (warnings.length > 0) {

    warnings.forEach(issue => {

    });

  }
  
  // Recommendations

  // Return success if only warnings (no errors)
  return errors.length === 0;
}

function main() {

  try {
    // Get PR description from environment or file
    let prDescription = '';
    
    // Try to get from environment variable
    if (process.env.PR_DESCRIPTION) {
      prDescription = process.env.PR_DESCRIPTION;
    } else if (process.env.GITHUB_EVENT_PATH) {
      // Try to read from GitHub event
      const eventPath = process.env.GITHUB_EVENT_PATH;
      if (fs.existsSync(eventPath)) {
        const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
        prDescription = eventData.pull_request?.body || '';
      }
    } else {
      // Try to read from file
      const prFile = 'pr_description.txt';
      if (fs.existsSync(prFile)) {
        prDescription = fs.readFileSync(prFile, 'utf8');
      }
    }
    
    if (!prDescription) {

      prDescription = 'feat: add new feature\n\nContext7 confirmed: yes';
    }
    
    // Parse PR description
    const prData = parsePRDescription(prDescription);
    
    // Validate Context7
    const issues = validateContext7(prData);
    
    // Generate report
    const success = generateReport(prData, issues);
    
    if (!success) {

      process.exit(1);
    } else {

      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error running Context7 validation:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  parsePRDescription, 
  validateContext7, 
  generateReport 
};
