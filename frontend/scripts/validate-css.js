#!/usr/bin/env node

/**
 * validate-css
 * Wrap function with error handling
 * 
 * This script provides wrap function with error handling for the JewGo application.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category validation
 * 
 * @dependencies Node.js, required npm packages
 * @requires Environment variables, configuration files
 * 
 * @usage node validate-css.js [options]
 * @options --help, --verbose, --config
 * 
 * @example
 * node validate-css.js --verbose --config=production
 * 
 * @returns Exit code 0 for success, non-zero for errors
 * @throws Common error conditions and their meanings
 * 
 * @see Related scripts in the project
 * @see Links to relevant documentation
 */
function wrapWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapFunction(fn, context);
}

/**
 * Wrap synchronous function with error handling
 */
function wrapSyncWithErrorHandling(fn, context = {}) {
  return defaultErrorHandler.wrapSyncFunction(fn, context);
}


/**
 * Validate CSS files for syntax errors
 */
function validateCSS() {
  const cssFiles = [
    'app/globals.css',
    'app/leaflet.css',
    'components/restaurant/ImageCarousel.module.css'
  ];
  
  let hasErrors = false;
  
  cssFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    
    if (wrapSyncWithErrorHandling(() => fs.existsSync)(filePath)) {
      try {
        const content = wrapSyncWithErrorHandling(() => fs.readFileSync)(filePath, 'utf8');
        
        // Basic CSS syntax validation
        const issues = [];
        
        // Check for unclosed braces
        const openBraces = (content.match(/\{/g) || []).length;
        const closeBraces = (content.match(/\}/g) || []).length;
        
        if (openBraces !== closeBraces) {
          issues.push(`Mismatched braces: ${openBraces} open, ${closeBraces} close`);
        }
        
        // Check for unclosed quotes (improved logic that ignores apostrophes in comments)
        const lines = content.split('\n');
        let singleQuoteCount = 0;
        let doubleQuoteCount = 0;
        
        defaultLogger.startProgress(lines.length, 'Processing lines');
let progressCounter = 0;
lines.forEach((item, index) => {
  progressCounter++;
  defaultLogger.updateProgress(progressCounter, `Processing item ${index + 1}`);
          // Skip comments when counting quotes
          const commentStart = line.indexOf('/*');
          const commentEnd = line.indexOf('*/');
          
          let lineContent = line;
          if (commentStart !== -1 && commentEnd !== -1 && commentEnd > commentStart) {
            // Remove comment content from quote counting
            lineContent = line.substring(0, commentStart) + line.substring(commentEnd + 2);
          } else if (commentStart !== -1) {
            // Remove everything after comment start
            lineContent = line.substring(0, commentStart);
          }
          
          // Count quotes in non-comment content
          const lineSingleQuotes = (lineContent.match(/'/g) || []).length;
          const lineDoubleQuotes = (lineContent.match(/"/g) || []).length;
          
          singleQuoteCount += lineSingleQuotes;
          doubleQuoteCount += lineDoubleQuotes;
        });
        
        // Only check for unclosed quotes if there are any quotes
        if (singleQuoteCount > 0 && singleQuoteCount % 2 !== 0) {
          issues.push(`Unclosed single quotes detected (found ${singleQuoteCount} quotes)`);
        }
        
        if (doubleQuoteCount > 0 && doubleQuoteCount % 2 !== 0) {
          issues.push('Unclosed double quotes detected');
        }
        
        // Check for invalid CSS properties (more specific check)
        const cssLines = content.split('\n');
        defaultLogger.startProgress(cssLines.length, 'Processing cssLines');
let progressCounter = 0;
cssLines.forEach((item, index) => {
  progressCounter++;
  defaultLogger.updateProgress(progressCounter, `Processing item ${index + 1}`);
          // Skip comments and empty lines
          if (line.trim().startsWith('/*') || line.trim().startsWith('*') || line.trim() === '') {
            return;
          }
          
          // Check for CSS properties that might be malformed
          const propertyMatch = line.match(/^\s*([a-zA-Z-]+)\s*:\s*([^;]*?)(?:\s*;?\s*)$/);
          if (propertyMatch) {
            const property = propertyMatch[1];
            const value = propertyMatch[2].trim();
            
            // Check if value is empty or malformed
            if (value === '' || value === undefined) {
              issues.push(`Line ${index + 1}: Empty value for property '${property}'`);
            }
          }
        });
        
        if (issues.length > 0) {
          issues.forEach(issue => defaultLogger.info(`❌ ${file}: ${issue}`));
          hasErrors = true;
        } else {
          defaultLogger.info(`✅ ${file}: No issues found`);
        }
        
      } catch (error) {
        defaultLogger.error(`❌ ${file}: Error reading file - ${error.message}`);
        hasErrors = true;
      }
    } else {
      defaultLogger.info(`⚠️  ${file}: File not found`);
    }
  });
  
  // Check for build artifacts
  const buildDir = path.join(__dirname, '..', '.next');
  if (wrapSyncWithErrorHandling(() => fs.existsSync)(buildDir)) {
    const staticDir = path.join(buildDir, 'static');
    if (wrapSyncWithErrorHandling(() => fs.existsSync)(staticDir)) {
      const cssDir = path.join(staticDir, 'css');
      if (wrapSyncWithErrorHandling(() => fs.existsSync)(cssDir)) {
        const cssFiles = wrapSyncWithErrorHandling(() => fs.readdirSync)(cssDir).filter(file => file.endsWith('.css'));
        cssFiles.forEach(file => {
          const filePath = path.join(cssDir, file);
          const stats = wrapSyncWithErrorHandling(() => fs.statSync)(filePath);
          defaultLogger.info(`📄 Build CSS: ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
        });
      }
    }
  }
  
  if (hasErrors) {
    defaultLogger.info('\n❌ CSS validation failed');
    wrapSyncWithErrorHandling(() => process.exit)(1);
  } else {
    defaultLogger.info('\n✅ CSS validation passed');
  }
}

// Run validation
validateCSS();
