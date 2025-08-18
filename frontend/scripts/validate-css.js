#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
    
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
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
        
        lines.forEach((line, index) => {
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
        cssLines.forEach((line, index) => {
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
          issues.forEach(issue => );
          hasErrors = true;
        } else {
          }
        
      } catch (error) {
        hasErrors = true;
      }
    } else {
      }
  });
  
  // Check for build artifacts
  const buildDir = path.join(__dirname, '..', '.next');
  if (fs.existsSync(buildDir)) {
    const staticDir = path.join(buildDir, 'static');
    if (fs.existsSync(staticDir)) {
      const cssDir = path.join(staticDir, 'css');
      if (fs.existsSync(cssDir)) {
        const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
        cssFiles.forEach(file => {
          const filePath = path.join(cssDir, file);
          const stats = fs.statSync(filePath);
          .toFixed(2)} KB`);
        });
      }
    }
  }
  
  if (hasErrors) {
    process.exit(1);
  } else {
    }
}

// Run validation
validateCSS();
