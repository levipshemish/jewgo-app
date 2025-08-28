#!/usr/bin/env node

/**
 * Deprecation Ownership Enforcement
 * 
 * Ensures new DEPRECATED markers have matching entries in DEPRECATIONS.md:
 * - New // DEPRECATED: must have owner + deadline in DEPRECATIONS.md. Updated: 2026-01-31
 * - CI fails if new deprecated code lacks proper documentation
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const DEPRECATIONS_FILE = 'DEPRECATIONS.md';
const IGNORE_PATTERNS = [
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
  '__pycache__', 'venv', '.venv', 'docs/', 'README.md', 'RULES.md',
  '.github/pull_request_template.md', 'ci-scripts/'
];

// Regex patterns
const DEPRECATED_PATTERN = /\/\/\s*DEPRECATED:\s*(.+?)(?:\.\s*Removal target:\s*(\d{4}-\d{2}-\d{2}))?/g;
const ISO_DATE_PATTERN = /(\d{4}-\d{2}-\d{2})/;

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function extractDeprecatedMarkers(content, filePath) {
  const markers = [];
  let match;
  
  while ((match = DEPRECATED_PATTERN.exec(content)) !== null) {
    const reason = match[1].trim();
    const removalDate = match[2] || null;
    const lineNumber = content.substring(0, match.index).split('\n').length;
    
    markers.push({
      reason,
      removalDate,
      lineNumber,
      filePath,
      fullMatch: match[0]
    });
  }
  
  return markers;
}

function parseDeprecationsFile() {
  if (!fs.existsSync(DEPRECATIONS_FILE)) {
    console.warn(`Warning: ${DEPRECATIONS_FILE} not found`);
    return [];
  }
  
  const content = fs.readFileSync(DEPRECATIONS_FILE, 'utf8');
  const entries = [];
  
  // Parse DEPRECATIONS.md entries
  const lines = content.split('\n');
  let currentEntry = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for entry headers
    if (line.startsWith('- **Component**:') || line.startsWith('- **API**:')) {
      if (currentEntry) {
        entries.push(currentEntry);
      }
      currentEntry = {
        component: '',
        reason: '',
        owner: '',
        targetDate: '',
        replacement: '',
        lineNumber: i + 1
      };
      
      // Extract component name
      const componentMatch = line.match(/:\s*(.+)/);
      if (componentMatch) {
        currentEntry.component = componentMatch[1].trim();
      }
    }
    
    if (currentEntry) {
      if (line.startsWith('- **Reason**:')) {
        const reasonMatch = line.match(/:\s*(.+)/);
        if (reasonMatch) {
          currentEntry.reason = reasonMatch[1].trim();
        }
      } else if (line.startsWith('- **Owner**:')) {
        const ownerMatch = line.match(/:\s*(.+)/);
        if (ownerMatch) {
          currentEntry.owner = ownerMatch[1].trim();
        }
      } else if (line.startsWith('- **Target Date**:')) {
        const dateMatch = line.match(/:\s*(.+)/);
        if (dateMatch) {
          currentEntry.targetDate = dateMatch[1].trim();
        }
      } else if (line.startsWith('- **Replacement**:')) {
        const replacementMatch = line.match(/:\s*(.+)/);
        if (replacementMatch) {
          currentEntry.replacement = replacementMatch[1].trim();
        }
      }
    }
  }
  
  // Add the last entry
  if (currentEntry) {
    entries.push(currentEntry);
  }
  
  return entries;
}

function findDeprecatedMarkers() {
  const allMarkers = [];
  
  // Find all files with potential deprecated markers
  const fileExtensions = ['*.js', '*.ts', '*.tsx', '*.jsx', '*.py', '*.md', '*.txt'];
  
  fileExtensions.forEach(ext => {
    try {
      const files = execSync(`find . -name "${ext}" -type f`, { encoding: 'utf8' })
        .split('\n')
        .filter(file => file && !shouldIgnoreFile(file));
      
      files.forEach(file => {
        try {
          const content = fs.readFileSync(file, 'utf8');
          const markers = extractDeprecatedMarkers(content, file);
          allMarkers.push(...markers);
        } catch (err) {
          console.warn(`Warning: Could not read ${file}: ${err.message}`);
        }
      });
    } catch (err) {
      // Ignore if no files found for this extension
    }
  });
  
  return allMarkers;
}

function validateDeprecationOwnership(markers, deprecationsEntries) {
  const issues = [];
  
  markers.forEach(marker => {
    // Check if this marker has a corresponding entry in DEPRECATIONS.md
    const matchingEntry = deprecationsEntries.find(entry => {
      // Try to match by component name or reason
      return entry.component && (
        marker.reason.includes(entry.component) ||
        entry.component.includes(marker.reason) ||
        entry.reason.includes(marker.reason) ||
        marker.reason.includes(entry.reason)
      );
    });
    
    if (!matchingEntry) {
      issues.push({
        type: 'missing_entry',
        marker,
        message: `DEPRECATED marker found but no corresponding entry in ${DEPRECATIONS_FILE}`
      });
    } else {
      // Validate the entry has required fields
      if (!matchingEntry.owner || matchingEntry.owner === '(REQUIRED)') {
        issues.push({
          type: 'missing_owner',
          marker,
          entry: matchingEntry,
          message: `DEPRECATED entry missing required owner field`
        });
      }
      
      if (!matchingEntry.targetDate) {
        issues.push({
          type: 'missing_date',
          marker,
          entry: matchingEntry,
          message: `DEPRECATED entry missing target date`
        });
      }
      
      // Validate date format
      if (matchingEntry.targetDate && !ISO_DATE_PATTERN.test(matchingEntry.targetDate)) {
        issues.push({
          type: 'invalid_date',
          marker,
          entry: matchingEntry,
          message: `DEPRECATED entry has invalid date format (expected YYYY-MM-DD)`
        });
      }
    }
  });
  
  return issues;
}

function generateReport(markers, deprecationsEntries, issues) {

  if (issues.length === 0) {

    return true;
  }
  
  // Group issues by type
  const missingEntries = issues.filter(issue => issue.type === 'missing_entry');
  const missingOwners = issues.filter(issue => issue.type === 'missing_owner');
  const missingDates = issues.filter(issue => issue.type === 'missing_date');
  const invalidDates = issues.filter(issue => issue.type === 'invalid_date');
  
  if (missingEntries.length > 0) {

    missingEntries.forEach(issue => {

    });
  }
  
  if (missingOwners.length > 0) {

    missingOwners.forEach(issue => {

    });
  }
  
  if (missingDates.length > 0) {

    missingDates.forEach(issue => {

    });
  }
  
  if (invalidDates.length > 0) {

    invalidDates.forEach(issue => {

    });
  }
  
  // Recommendations

  console.log('5. Set realistic removal deadlines (max 30 days)');
  
  return false;
}

function main() {

  try {
    // Find all deprecated markers
    const markers = findDeprecatedMarkers();
    
    // Parse DEPRECATIONS.md
    const deprecationsEntries = parseDeprecationsFile();
    
    // Validate ownership
    const issues = validateDeprecationOwnership(markers, deprecationsEntries);
    
    // Generate report
    const success = generateReport(markers, deprecationsEntries, issues);
    
    if (!success) {

      process.exit(1);
    } else {

      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error running deprecation ownership check:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { 
  findDeprecatedMarkers, 
  parseDeprecationsFile, 
  validateDeprecationOwnership, 
  generateReport 
};
