#!/usr/bin/env node

/**
 * CSS Optimization Script for JewGo Frontend
 * 
 * This script analyzes and optimizes CSS files for better performance.
 */

const fs = require('fs');
const path = require('path');

// CSS optimization functions
const cssOptimizations = {
  // Analyze CSS files
  analyzeCSS: () => {
    const cssFiles = [];
    const cssDir = path.join(__dirname, '../app');
    
    function findCSSFiles(_dir) {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          findCSSFiles(filePath);
        } else if (file.endsWith('.css')) {
          cssFiles.push(filePath);
        }
      });
    }
    
    try {
      findCSSFiles(cssDir);
      
      cssFiles.forEach(file => {
        const stats = fs.statSync(file);
        const sizeKB = (stats.size / 1024).toFixed(2);
        }: ${sizeKB} KB`);
      });
      
      // Analyze globals.css specifically
      const globalsPath = path.join(__dirname, '../app/globals.css');
      if (fs.existsSync(globalsPath)) {
        const content = fs.readFileSync(globalsPath, 'utf8');
        const lines = content.split('\n');
        const totalLines = lines.length;
        const emptyLines = lines.filter(line => line.trim() === '').length;
        const commentLines = lines.filter(line => line.trim().startsWith('/*') || line.trim().startsWith('//')).length;
        const actualCodeLines = totalLines - emptyLines - commentLines;
        
        .size / 1024).toFixed(2)} KB`);
      }
      
    } catch (error) {
      }
  },

  // Check for unused CSS
  checkUnusedCSS: () => {
    const globalsPath = path.join(__dirname, '../app/globals.css');
    if (!fs.existsSync(globalsPath)) {
      return;
    }
    
    const content = fs.readFileSync(globalsPath, 'utf8');
    
    // Check for common optimization opportunities
    const checks = [
      {
        name: 'Duplicate selectors',
        pattern: /([^{}]+)\s*{[^}]*}\s*\1\s*{[^}]*}/g,
        found: content.match(/([^{}]+)\s*{[^}]*}\s*\1\s*{[^}]*}/g)?.length || 0
      },
      {
        name: 'Empty rules',
        pattern: /[^{}]+{\s*}/g,
        found: content.match(/[^{}]+{\s*}/g)?.length || 0
      },
      {
        name: 'Unused media queries',
        pattern: /@media[^{]+{[^}]*}/g,
        found: content.match(/@media[^{]+{[^}]*}/g)?.length || 0
      },
      {
        name: 'Long selectors',
        pattern: /[^{}]{50,}\s*{/g,
        found: content.match(/[^{}]{50,}\s*{/g)?.length || 0
      }
    ];
    
    checks.forEach(check => {
      if (check.found > 0) {
        } else {
        }
    });
  },

  // Generate optimization recommendations
  generateRecommendations: () => {
    },

  // Check Tailwind configuration
  checkTailwindConfig: () => {
    const tailwindConfigPath = path.join(__dirname, '../tailwind.config.js');
    if (fs.existsSync(tailwindConfigPath)) {
      try {
        const config = require(tailwindConfigPath);
        if (config.content) {
          } else {
          }
        
        if (config.purge) {
          }
      } catch (error) {
        }
    } else {
      }
  }
};

// Run CSS optimizations
async function runCSSOptimizations() {
  const steps = [
    'analyzeCSS',
    'checkUnusedCSS',
    'checkTailwindConfig',
    'generateRecommendations'
  ];

  for (const step of steps) {
    if (cssOptimizations[step]) {
      cssOptimizations[step]();
    }
  }

  }

// Run optimizations
runCSSOptimizations().catch(error => {
  // // console.error('❌ CSS optimization failed:', error);
  process.exit(1);
});
