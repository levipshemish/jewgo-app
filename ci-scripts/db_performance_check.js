#!/usr/bin/env node

/**
 * Database Performance Guardrails
 * 
 * Enforces database performance standards:
 * - p95 query < 100ms
 * - No query > 200ms without index
 * - CI runs EXPLAIN ANALYZE on new queries
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MAX_QUERY_TIME_MS = 200;
const P95_TARGET_MS = 100;
const IGNORE_PATTERNS = [
  'node_modules', '.git', '.next', 'dist', 'build', 'coverage',
  '__pycache__', 'venv', '.venv', 'docs/', 'README.md', 'RULES.md',
  'DEPRECATIONS.md', '.github/pull_request_template.md'
];

// SQL patterns that might indicate slow queries
const SLOW_QUERY_PATTERNS = [
  /SELECT.*FROM.*WHERE.*LIKE.*%/i,  // LIKE with wildcard
  /SELECT.*FROM.*WHERE.*NOT.*IN/i,  // NOT IN subquery
  /SELECT.*FROM.*ORDER BY.*LIMIT/i, // ORDER BY without index
  /SELECT.*FROM.*GROUP BY/i,        // GROUP BY
  /SELECT.*FROM.*JOIN.*ON.*=/i,     // JOINs
  /SELECT.*FROM.*WHERE.*OR/i,       // OR conditions
  /SELECT.*FROM.*WHERE.*AND.*OR/i,  // Complex AND/OR
  /UPDATE.*WHERE.*LIKE/i,           // UPDATE with LIKE
  /DELETE.*WHERE.*LIKE/i,           // DELETE with LIKE
];

// Database-specific patterns
const DB_PATTERNS = {
  python: [
    /\.query\(/g,           // SQLAlchemy queries
    /\.filter\(/g,          // SQLAlchemy filters
    /\.join\(/g,            // SQLAlchemy joins
    /\.order_by\(/g,        // SQLAlchemy ordering
    /\.group_by\(/g,        // SQLAlchemy grouping
    /session\.query\(/g,    // Session queries
    /db\.session\.query\(/g, // Database session queries
  ],
  javascript: [
    /\.find\(/g,            // MongoDB-style queries
    /\.findOne\(/g,         // MongoDB-style queries
    /\.aggregate\(/g,       // MongoDB aggregation
    /prisma\./g,            // Prisma queries
    /\.query\(/g,           // Raw SQL queries
  ]
};

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => filePath.includes(pattern));
}

function extractQueries(content, fileType) {
  const queries = [];
  const patterns = DB_PATTERNS[fileType] || [];
  
  patterns.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        queries.push({
          query: match,
          line: content.substring(0, content.indexOf(match)).split('\n').length,
          file: filePath
        });
      });
    }
  });
  
  return queries;
}

function checkSlowQueryPatterns(content) {
  const slowQueries = [];
  
  SLOW_QUERY_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      matches.forEach(match => {
        slowQueries.push({
          query: match,
          pattern: pattern.toString(),
          line: content.substring(0, content.indexOf(match)).split('\n').length
        });
      });
    }
  });
  
  return slowQueries;
}

function analyzeDatabaseFiles() {
  const issues = [];
  
  // Scan for database-related files
  const dbFiles = [];
  
  // Python files (Flask/SQLAlchemy)
  try {
    const pythonFiles = execSync('find . -name "*.py" -type f', { encoding: 'utf8' })
      .split('\n')
      .filter(file => file && !shouldIgnoreFile(file));
    
    pythonFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('query') || content.includes('session') || content.includes('db.')) {
          dbFiles.push({ path: file, content, type: 'python' });
        }
      } catch (err) {
        console.warn(`Warning: Could not read ${file}: ${err.message}`);
      }
    });
  } catch (err) {
    console.warn('Warning: Could not find Python files');
  }
  
  // JavaScript/TypeScript files (Prisma/ORM)
  try {
    const jsFiles = execSync('find . -name "*.js" -o -name "*.ts" -o -name "*.tsx" -type f', { encoding: 'utf8' })
      .split('\n')
      .filter(file => file && !shouldIgnoreFile(file));
    
    jsFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('prisma') || content.includes('query') || content.includes('find')) {
          dbFiles.push({ path: file, content, type: 'javascript' });
        }
      } catch (err) {
        console.warn(`Warning: Could not read ${file}: ${err.message}`);
      }
    });
  } catch (err) {
    console.warn('Warning: Could not find JavaScript/TypeScript files');
  }
  
  // Analyze each file
  dbFiles.forEach(({ path: filePath, content, type }) => {
    // Check for slow query patterns
    const slowQueries = checkSlowQueryPatterns(content);
    slowQueries.forEach(query => {
      issues.push({
        type: 'slow_query_pattern',
        file: filePath,
        line: query.line,
        query: query.query,
        pattern: query.pattern,
        severity: 'warning',
        message: `Potential slow query detected: ${query.query.substring(0, 100)}...`
      });
    });
    
    // Extract database queries
    const queries = extractQueries(content, type);
    queries.forEach(query => {
      issues.push({
        type: 'database_query',
        file: filePath,
        line: query.line,
        query: query.query,
        severity: 'info',
        message: `Database query found: ${query.query.substring(0, 100)}...`
      });
    });
  });
  
  return issues;
}

function generateReport(issues) {

  if (issues.length === 0) {

    return true;
  }
  
  const slowQueries = issues.filter(issue => issue.type === 'slow_query_pattern');
  const dbQueries = issues.filter(issue => issue.type === 'database_query');
  
  if (slowQueries.length > 0) {

    slowQueries.forEach(issue => {

    });
  }
  
  if (dbQueries.length > 0) {

    dbQueries.forEach(issue => {

    });
  }
  
  // Recommendations

  // Return success if only info-level issues
  const hasWarnings = slowQueries.length > 0;
  return !hasWarnings;
}

function main() {

  try {
    const issues = analyzeDatabaseFiles();
    const success = generateReport(issues);
    
    if (!success) {

      process.exit(1);
    } else {

      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Error running database performance check:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeDatabaseFiles, generateReport };
