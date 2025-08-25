#!/usr/bin/env node

/**
 * Unused Files Detector
 * =====================
 * 
 * This script automatically identifies unused files in the codebase by analyzing
 * import statements, references, and file dependencies to prevent accumulation
 * of unnecessary files.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category maintenance
 * 
 * @dependencies Node.js, fs, path, glob, acorn, walk-sync
 * @requires File analysis capabilities, dependency tracking
 * 
 * @usage node unused-files-detector.js [options]
 * @options --scan, --analyze, --report, --cleanup, --dry-run
 * 
 * @example
 * node unused-files-detector.js --scan --report
 * 
 * @returns Analysis results and unused file recommendations
 * @throws Analysis errors and file processing issues
 * 
 * @see File organization guidelines and cleanup procedures
 * @see Dependency analysis and import tracking
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { defaultLogger } = require('./utils/logger');
const { defaultErrorHandler } = require('./utils/errorHandler');

/**
 * Wrap function with error handling
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

// Analysis configuration
const ANALYSIS_CONFIG = {
  // File patterns to analyze
  patterns: {
    // Source files to analyze for imports
    sourceFiles: [
      '**/*.js',
      '**/*.ts',
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte'
    ],
    
    // Files to check for usage
    checkFiles: [
      '**/*.js',
      '**/*.ts',
      '**/*.tsx',
      '**/*.jsx',
      '**/*.vue',
      '**/*.svelte',
      '**/*.css',
      '**/*.scss',
      '**/*.sass',
      '**/*.less',
      '**/*.json',
      '**/*.md',
      '**/*.txt',
      '**/*.yml',
      '**/*.yaml'
    ],
    
    // Files to exclude from analysis
    excludePatterns: [
      'node_modules/**',
      '.git/**',
      'dist/**',
      'build/**',
      '.next/**',
      'out/**',
      'coverage/**',
      'sandbox/**',
      '**/node_modules/**',
      '**/sandbox/**',
      '*.log',
      '*.tmp',
      '*.temp'
    ]
  },
  
  // Import patterns to detect
  importPatterns: {
    // ES6 imports
    es6Imports: [
      /import\s+.*?from\s+['"`]([^'"`]+)['"`]/g,
      /import\s+['"`]([^'"`]+)['"`]/g,
      /export\s+.*?from\s+['"`]([^'"`]+)['"`]/g
    ],
    
    // CommonJS requires
    commonJSRequires: [
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      /require\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*\)/g
    ],
    
    // Dynamic imports
    dynamicImports: [
      /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
      /import\s*\(\s*`([^`]+)`\s*\)/g
    ],
    
    // CSS imports
    cssImports: [
      /@import\s+['"`]([^'"`]+)['"`]/g,
      /@import\s+url\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g
    ],
    
    // HTML references
    htmlReferences: [
      /src\s*=\s*['"`]([^'"`]+)['"`]/g,
      /href\s*=\s*['"`]([^'"`]+)['"`]/g,
      /link\s+.*?href\s*=\s*['"`]([^'"`]+)['"`]/g
    ]
  },
  
  // File categories and their importance
  fileCategories: {
    critical: {
      patterns: ['**/*.tsx', '**/*.ts', '**/*.jsx', '**/*.js'],
      description: 'Source code files',
      risk: 'high'
    },
    important: {
      patterns: ['**/*.css', '**/*.scss', '**/*.json'],
      description: 'Style and configuration files',
      risk: 'medium'
    },
    documentation: {
      patterns: ['**/*.md', '**/*.txt'],
      description: 'Documentation files',
      risk: 'low'
    },
    assets: {
      patterns: ['**/*.png', '**/*.jpg', '**/*.svg', '**/*.webp'],
      description: 'Asset files',
      risk: 'medium'
    }
  },
  
  // Analysis settings
  analysis: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    timeout: 30000, // 30 seconds
    maxDepth: 10, // Maximum import depth
    confidenceThreshold: 0.8 // Minimum confidence for unused file detection
  }
};

// Analysis results
let analysisResults = {
  totalFiles: 0,
  analyzedFiles: 0,
  usedFiles: 0,
  unusedFiles: 0,
  potentiallyUnused: 0,
  errors: [],
  warnings: [],
  recommendations: [],
  unusedFileList: [],
  potentiallyUnusedList: [],
  fileDependencies: {},
  importMap: {}
};

/**
 * Get all files matching patterns
 */
async function getAllFiles() {
  defaultLogger.section('Scanning for Files');
  
  try {
    const allFiles = await glob(ANALYSIS_CONFIG.patterns.checkFiles, {
      ignore: ANALYSIS_CONFIG.patterns.excludePatterns,
      absolute: true
    });
    
    analysisResults.totalFiles = allFiles.length;
    defaultLogger.info(`Found ${allFiles.length} files to analyze`);
    
    return allFiles;
  } catch (error) {
    defaultLogger.error('Failed to scan for files:', error.message);
    return [];
  }
}

/**
 * Extract imports from file content
 */
function extractImports(fileContent, filePath) {
  const imports = new Set();
  const relativePath = path.relative(process.cwd(), filePath);
  
  try {
    // ES6 imports
    ANALYSIS_CONFIG.importPatterns.es6Imports.forEach(pattern => {
      let match;
      while ((match = pattern.exec(fileContent)) !== null) {
        const importPath = match[1];
        if (importPath && !importPath.startsWith('.')) {
          // Handle package imports
          imports.add(importPath.split('/')[0]);
        } else if (importPath && importPath.startsWith('.')) {
          // Handle relative imports
          const resolvedPath = resolveRelativePath(importPath, filePath);
          if (resolvedPath) {
            imports.add(resolvedPath);
          }
        }
      }
    });
    
    // CommonJS requires
    ANALYSIS_CONFIG.importPatterns.commonJSRequires.forEach(pattern => {
      let match;
      while ((match = pattern.exec(fileContent)) !== null) {
        const requirePath = match[1] || match[2];
        if (requirePath && !requirePath.startsWith('.')) {
          imports.add(requirePath.split('/')[0]);
        } else if (requirePath && requirePath.startsWith('.')) {
          const resolvedPath = resolveRelativePath(requirePath, filePath);
          if (resolvedPath) {
            imports.add(resolvedPath);
          }
        }
      }
    });
    
    // CSS imports
    ANALYSIS_CONFIG.importPatterns.cssImports.forEach(pattern => {
      let match;
      while ((match = pattern.exec(fileContent)) !== null) {
        const cssPath = match[1];
        if (cssPath && cssPath.startsWith('.')) {
          const resolvedPath = resolveRelativePath(cssPath, filePath);
          if (resolvedPath) {
            imports.add(resolvedPath);
          }
        }
      }
    });
    
    // HTML references
    ANALYSIS_CONFIG.importPatterns.htmlReferences.forEach(pattern => {
      let match;
      while ((match = pattern.exec(fileContent)) !== null) {
        const refPath = match[1];
        if (refPath && refPath.startsWith('.')) {
          const resolvedPath = resolveRelativePath(refPath, filePath);
          if (resolvedPath) {
            imports.add(resolvedPath);
          }
        }
      }
    });
    
  } catch (error) {
    defaultLogger.warning(`Failed to extract imports from ${relativePath}:`, error.message);
  }
  
  return Array.from(imports);
}

/**
 * Resolve relative path to absolute path
 */
function resolveRelativePath(relativePath, baseFilePath) {
  try {
    const baseDir = path.dirname(baseFilePath);
    const resolvedPath = path.resolve(baseDir, relativePath);
    
    // Try different extensions
    const extensions = ['.js', '.ts', '.tsx', '.jsx', '.json', '.css', '.scss', '.md'];
    
    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      if (fs.existsSync(fullPath)) {
        return path.relative(process.cwd(), fullPath);
      }
    }
    
    // Try without extension
    if (fs.existsSync(resolvedPath)) {
      return path.relative(process.cwd(), resolvedPath);
    }
    
    // Try with index file
    for (const ext of extensions) {
      const indexPath = path.join(resolvedPath, `index${ext}`);
      if (fs.existsSync(indexPath)) {
        return path.relative(process.cwd(), indexPath);
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Analyze file for imports and dependencies
 */
function analyzeFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  
  try {
    const stats = fs.statSync(filePath);
    
    // Skip files that are too large
    if (stats.size > ANALYSIS_CONFIG.analysis.maxFileSize) {
      defaultLogger.warning(`Skipping large file: ${relativePath} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
      return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const imports = extractImports(content, filePath);
    
    // Store file dependencies
    analysisResults.fileDependencies[relativePath] = imports;
    
    // Update import map
    imports.forEach(importPath => {
      if (!analysisResults.importMap[importPath]) {
        analysisResults.importMap[importPath] = [];
      }
      analysisResults.importMap[importPath].push(relativePath);
    });
    
    analysisResults.analyzedFiles++;
    return imports;
  } catch (error) {
    defaultLogger.error(`Failed to analyze file ${relativePath}:`, error.message);
    analysisResults.errors.push({
      file: relativePath,
      error: error.message
    });
    return [];
  }
}

/**
 * Check if file is used by other files
 */
function isFileUsed(filePath, allFiles) {
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Check if file is imported by other files
  if (analysisResults.importMap[relativePath]) {
    return true;
  }
    
  // Check if file is a main entry point
  const fileName = path.basename(filePath);
  const mainEntryPoints = [
    'index.js', 'index.ts', 'index.tsx',
    'main.js', 'main.ts', 'main.tsx',
    'app.js', 'app.ts', 'app.tsx',
    'package.json', 'next.config.js', 'tailwind.config.js',
    'tsconfig.json', 'jest.config.js', 'cypress.config.js'
  ];
  
  if (mainEntryPoints.includes(fileName)) {
    return true;
  }
  
  // Check if file is in a special directory
  const specialDirs = [
    'public', 'static', 'assets', 'images', 'icons',
    'docs', 'documentation', 'examples', 'demos'
  ];
  
  const fileDir = path.dirname(relativePath);
  if (specialDirs.some(dir => fileDir.includes(dir))) {
    return true;
  }
  
  // Check if file is referenced in package.json scripts
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};
      const scriptsContent = JSON.stringify(scripts);
      
      if (scriptsContent.includes(fileName)) {
        return true;
      }
    }
  } catch (error) {
    // Ignore package.json parsing errors
  }
  
  return false;
}

/**
 * Categorize file by importance
 */
function categorizeFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);
  const ext = path.extname(filePath);
  
  for (const [category, config] of Object.entries(ANALYSIS_CONFIG.fileCategories)) {
    for (const pattern of config.patterns) {
      if (glob.hasMagic(pattern)) {
        // Handle glob patterns
        const patternRegex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        if (patternRegex.test(relativePath)) {
          return {
            category,
            description: config.description,
            risk: config.risk
          };
        }
      } else {
        // Handle simple patterns
        if (relativePath.endsWith(pattern.replace('**/', ''))) {
          return {
            category,
            description: config.description,
            risk: config.risk
          };
        }
      }
    }
  }
  
  return {
    category: 'unknown',
    description: 'Unknown file type',
    risk: 'low'
  };
}

/**
 * Analyze all files for unused files
 */
async function analyzeUnusedFiles() {
  defaultLogger.section('Analyzing File Dependencies');
  
  const allFiles = await getAllFiles();
  
  if (allFiles.length === 0) {
    defaultLogger.warning('No files found to analyze');
    return;
  }
  
  // First pass: analyze all files for imports
  for (const file of allFiles) {
    analyzeFile(file);
    
    // Progress indicator
    if (analysisResults.analyzedFiles % 100 === 0) {
      defaultLogger.info(`Analyzed ${analysisResults.analyzedFiles}/${allFiles.length} files...`);
    }
  }
  
  defaultLogger.info(`Completed analysis of ${analysisResults.analyzedFiles} files`);
  
  // Second pass: identify unused files
  defaultLogger.section('Identifying Unused Files');
  
  for (const file of allFiles) {
    const relativePath = path.relative(process.cwd(), file);
    const isUsed = isFileUsed(file, allFiles);
    const category = categorizeFile(file);
    
    if (!isUsed) {
      analysisResults.unusedFiles++;
      analysisResults.unusedFileList.push({
        path: relativePath,
        category: category.category,
        description: category.description,
        risk: category.risk,
        size: fs.statSync(file).size,
        lastModified: fs.statSync(file).mtime
      });
    } else {
      analysisResults.usedFiles++;
    }
  }
  
  // Identify potentially unused files (low confidence)
  analysisResults.potentiallyUnusedList = analysisResults.unusedFileList.filter(file => {
    return file.category === 'documentation' || file.risk === 'low';
  });
  
  analysisResults.potentiallyUnused = analysisResults.potentiallyUnusedList.length;
  
  defaultLogger.success(`Analysis complete: ${analysisResults.unusedFiles} unused files found`);
}

/**
 * Generate analysis report
 */
function generateAnalysisReport() {
  defaultLogger.section('Unused Files Analysis Report');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalFiles: analysisResults.totalFiles,
      analyzedFiles: analysisResults.analyzedFiles,
      usedFiles: analysisResults.usedFiles,
      unusedFiles: analysisResults.unusedFiles,
      potentiallyUnused: analysisResults.potentiallyUnused,
      unusedPercentage: ((analysisResults.unusedFiles / analysisResults.totalFiles) * 100).toFixed(1)
    },
    categories: {},
    recommendations: []
  };
  
  // Categorize unused files
  analysisResults.unusedFileList.forEach(file => {
    if (!report.categories[file.category]) {
      report.categories[file.category] = [];
    }
    report.categories[file.category].push(file);
  });
  
  // Generate recommendations
  if (analysisResults.unusedFiles > 0) {
    report.recommendations.push(`Found ${analysisResults.unusedFiles} unused files (${report.summary.unusedPercentage}% of total files)`);
    
    if (analysisResults.unusedFiles > 50) {
      report.recommendations.push('High number of unused files detected - consider comprehensive cleanup');
    }
    
    if (analysisResults.unusedFiles > 10) {
      report.recommendations.push('Run cleanup script to remove unused files');
    }
    
    // Category-specific recommendations
    Object.entries(report.categories).forEach(([category, files]) => {
      if (files.length > 5) {
        report.recommendations.push(`Multiple unused ${category} files found - review and clean up`);
      }
    });
  } else {
    report.recommendations.push('No unused files detected - codebase is clean');
  }
  
  // Display summary
  defaultLogger.info(`Total files: ${report.summary.totalFiles}`);
  defaultLogger.info(`Analyzed files: ${report.summary.analyzedFiles}`);
  defaultLogger.success(`Used files: ${report.summary.usedFiles}`);
  defaultLogger.error(`Unused files: ${report.summary.unusedFiles} (${report.summary.unusedPercentage}%)`);
  defaultLogger.warning(`Potentially unused: ${report.summary.potentiallyUnused}`);
  
  // Display unused files by category
  Object.entries(report.categories).forEach(([category, files]) => {
    defaultLogger.section(`Unused ${category} files (${files.length})`);
    files.forEach(file => {
      const sizeKB = (file.size / 1024).toFixed(1);
      defaultLogger.warning(`${file.path} (${sizeKB}KB, ${file.risk} risk)`);
    });
  });
  
  // Display recommendations
  if (report.recommendations.length > 0) {
    defaultLogger.section('Recommendations');
    report.recommendations.forEach(rec => {
      defaultLogger.info(`- ${rec}`);
    });
  }
  
  return report;
}

/**
 * Save analysis report to file
 */
function saveAnalysisReport(report) {
  try {
    const reportFile = path.join(process.cwd(), 'unused-files-report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    defaultLogger.success(`Analysis report saved to: ${reportFile}`);
    return reportFile;
  } catch (error) {
    defaultLogger.error('Failed to save analysis report:', error.message);
    return null;
  }
}

/**
 * Generate cleanup script
 */
function generateCleanupScript() {
  const unusedFiles = analysisResults.unusedFileList
    .filter(file => file.risk === 'low' || file.category === 'documentation')
    .map(file => file.path);
  
  if (unusedFiles.length === 0) {
    defaultLogger.info('No safe files to clean up');
    return null;
  }
  
  const cleanupScript = `#!/bin/bash
# Auto-generated cleanup script for unused files
# Generated on: ${new Date().toISOString()}
# Total files to remove: ${unusedFiles.length}

echo "Removing ${unusedFiles.length} unused files..."

${unusedFiles.map(file => `rm -f "${file}"`).join('\n')}

echo "Cleanup completed!"
`;
  
  try {
    const scriptFile = path.join(process.cwd(), 'cleanup-unused-files.sh');
    fs.writeFileSync(scriptFile, cleanupScript);
    fs.chmodSync(scriptFile, '755');
    
    defaultLogger.success(`Cleanup script generated: ${scriptFile}`);
    return scriptFile;
  } catch (error) {
    defaultLogger.error('Failed to generate cleanup script:', error.message);
    return null;
  }
}

/**
 * Main analysis function
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {
    scan: args.includes('--scan'),
    analyze: args.includes('--analyze'),
    report: args.includes('--report'),
    cleanup: args.includes('--cleanup'),
    dryRun: args.includes('--dry-run')
  };
  
  defaultLogger.section('Unused Files Detector');
  
  try {
    if (options.scan || options.analyze || args.length === 0) {
      await analyzeUnusedFiles();
      
      const report = generateAnalysisReport();
      
      if (options.report) {
        saveAnalysisReport(report);
      }
      
      if (options.cleanup) {
        generateCleanupScript();
      }
      
      // Exit with error code if there are many unused files
      if (analysisResults.unusedFiles > 20) {
        defaultLogger.warning('High number of unused files detected - consider cleanup');
        process.exit(1);
      }
    } else {
      // Show help
      defaultLogger.info('Unused Files Detector');
      defaultLogger.info('Usage: node unused-files-detector.js [options]');
      defaultLogger.info('Options:');
      defaultLogger.info('  --scan      Scan and analyze files for usage');
      defaultLogger.info('  --analyze   Analyze file dependencies');
      defaultLogger.info('  --report    Generate detailed report');
      defaultLogger.info('  --cleanup   Generate cleanup script');
      defaultLogger.info('  --dry-run   Show what would be cleaned up');
    }
  } catch (error) {
    defaultLogger.error('Analysis failed:', error.message);
    process.exit(1);
  }
}

// Execute with error handling
if (require.main === module) {
  main().catch(error => {
    defaultLogger.error('Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  analyzeUnusedFiles,
  generateAnalysisReport,
  saveAnalysisReport,
  generateCleanupScript,
  ANALYSIS_CONFIG
};
