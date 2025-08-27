#!/usr/bin/env node

/**
 * Apply Documentation Template
 * ===========================
 * 
 * This script applies standardized documentation templates to existing scripts
 * by analyzing their content and generating appropriate documentation.
 */

const fs = require('fs');
const path = require('path');
const { defaultDocTemplate } = require('./utils/docTemplate');
const { defaultLogger } = require('./utils/logger');

// Scripts to update with documentation templates
const SCRIPTS_TO_UPDATE = [
  'validate-env-unified.js',
  'deploy-setup.js',
  'deploy-validate.js',
  'setup-supabase-storage.js',
  'validate-css.js',
  'remove-console-logs.js',
  'health-monitor.js',
  'check-environment.js',
  'clear-cache.js',
  'fix-font-css.js',
  'setup-env.js',
  'replace-original-images.js',
  'cleanup-unused-vars.js',
  'cleanup-remaining-vars.js',
  'update-hours-cron.js',
  'setup-monitoring.js',
  'check-auth.js',
  'rotate-logs.js',
  'aggregate-metrics.js'
];

/**
 * Check if file already has comprehensive documentation
 */
function hasComprehensiveDocumentation(content) {
  const requiredElements = [
    '@author',
    '@version',
    '@created',
    '@category',
    '@usage',
    '@example'
  ];
  
  return requiredElements.every(element => content.includes(element));
}

/**
 * Extract script information from content
 */
function extractScriptInfo(content, filename) {
  const info = {
    name: filename.replace('.js', ''),
    description: '',
    category: 'utility',
    version: '1.0.0',
    author: 'Development Team',
    usage: '',
    options: '',
    dependencies: '',
    requirements: ''
  };
  
  // Extract description from existing comments
  const descMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
  if (descMatch) {
    info.description = descMatch[1].trim();
  }
  
  // Extract usage information
  const usageMatch = content.match(/Usage:\s*\n\s*([\s\S]*?)(?=\n\n|\n\*\/)/);
  if (usageMatch) {
    info.usage = usageMatch[1].trim();
  }
  
  // Extract options
  const optionsMatch = content.match(/Options:\s*\n\s*([\s\S]*?)(?=\n\n|\n\*\/)/);
  if (optionsMatch) {
    info.options = optionsMatch[1].trim();
  }
  
  // Determine category based on filename and content
  const lowerFilename = filename.toLowerCase();
  const lowerContent = content.toLowerCase();
  
  if (lowerFilename.includes('validate') || lowerContent.includes('validation')) {
    info.category = 'validation';
  } else if (lowerFilename.includes('deploy') || lowerContent.includes('deployment')) {
    info.category = 'deployment';
  } else if (lowerFilename.includes('monitor') || lowerContent.includes('monitoring')) {
    info.category = 'monitoring';
  } else if (lowerFilename.includes('setup') || lowerContent.includes('setup')) {
    info.category = 'setup';
  } else if (lowerFilename.includes('cleanup') || lowerContent.includes('cleanup')) {
    info.category = 'maintenance';
  } else if (lowerFilename.includes('optimize') || lowerContent.includes('optimization')) {
    info.category = 'optimization';
  }
  
  return info;
}

/**
 * Generate comprehensive documentation for a script
 */
function generateScriptDocumentation(scriptInfo) {
  const headerOptions = {
    SCRIPT_NAME: scriptInfo.name,
    SCRIPT_DESCRIPTION: scriptInfo.description || `${scriptInfo.name} script`,
    DETAILED_DESCRIPTION: `This script provides ${scriptInfo.description.toLowerCase() || 'utility functionality'} for the JewGo application.`,
    AUTHOR: scriptInfo.author,
    VERSION: scriptInfo.version,
    CREATED_DATE: new Date().toISOString().split('T')[0],
    LAST_MODIFIED_DATE: new Date().toISOString().split('T')[0],
    CATEGORY: scriptInfo.category,
    DEPENDENCIES: scriptInfo.dependencies || 'Node.js, required npm packages',
    REQUIREMENTS: scriptInfo.requirements || 'Environment variables, configuration files',
    USAGE_EXAMPLES: scriptInfo.usage || `node ${scriptInfo.name}.js [options]`,
    COMMAND_LINE_OPTIONS: scriptInfo.options || '--help, --verbose, --config',
    EXAMPLE_USAGE: `node ${scriptInfo.name}.js --verbose --config=production`,
    RETURN_VALUE: 'Exit code 0 for success, non-zero for errors',
    ERRORS: 'Common error conditions and their meanings',
    RELATED_SCRIPTS: 'Related scripts in the project',
    RELATED_DOCUMENTATION: 'Links to relevant documentation'
  };
  
  return defaultDocTemplate.generateScriptHeader(headerOptions);
}

/**
 * Update script with comprehensive documentation
 */
function updateScriptWithDocumentation(scriptPath) {
  try {
    const content = fs.readFileSync(scriptPath, 'utf8');
    const filename = path.basename(scriptPath);
    
    // Skip if already has comprehensive documentation
    if (hasComprehensiveDocumentation(content)) {
      defaultLogger.warn(`${filename}: Already has comprehensive documentation`);
      return { updated: false, reason: 'Already has comprehensive documentation' };
    }
    
    // Extract script information
    const scriptInfo = extractScriptInfo(content, filename);
    
    // Generate new documentation
    const newDocumentation = generateScriptDocumentation(scriptInfo);
    
    // Find the end of the existing header comment
    const headerEndMatch = content.match(/\*\/\s*\n/);
    if (!headerEndMatch) {
      defaultLogger.error(`${filename}: Could not find header comment end`);
      return { updated: false, error: 'Could not find header comment end' };
    }
    
    const headerEndIndex = content.indexOf(headerEndMatch[0]) + headerEndMatch[0].length;
    const beforeHeader = content.substring(0, headerEndIndex);
    const afterHeader = content.substring(headerEndIndex);
    
    // Replace the header with new comprehensive documentation
    const updatedContent = newDocumentation + afterHeader;
    
    // Write updated content
    fs.writeFileSync(scriptPath, updatedContent, 'utf8');
    
    defaultLogger.success(`${filename}: Documentation template applied`);
    return { updated: true, scriptInfo };
    
  } catch (error) {
    defaultLogger.error(`${path.basename(scriptPath)}: Failed to apply documentation template - ${error.message}`);
    return { updated: false, error: error.message };
  }
}

/**
 * Create documentation template examples
 */
function createTemplateExamples() {
  const examplesDir = path.join(__dirname, 'documentation-examples');
  
  if (!fs.existsSync(examplesDir)) {
    fs.mkdirSync(examplesDir, { recursive: true });
  }
  
  // Create example for validation script
  const validationExample = defaultDocTemplate.generateScriptTypeDoc('validation', {
    header: {
      SCRIPT_NAME: 'validate-env-example',
      SCRIPT_DESCRIPTION: 'Environment validation example',
      LAST_MODIFIED_DATE: new Date().toISOString().split('T')[0]
    }
  });
  
  fs.writeFileSync(path.join(examplesDir, 'validation-script-example.md'), validationExample);
  
  // Create example for deployment script
  const deploymentExample = defaultDocTemplate.generateScriptTypeDoc('deployment', {
    header: {
      SCRIPT_NAME: 'deploy-example',
      SCRIPT_DESCRIPTION: 'Deployment script example',
      LAST_MODIFIED_DATE: new Date().toISOString().split('T')[0]
    }
  });
  
  fs.writeFileSync(path.join(examplesDir, 'deployment-script-example.md'), deploymentExample);
  
  // Create example for maintenance script
  const maintenanceExample = defaultDocTemplate.generateScriptTypeDoc('maintenance', {
    header: {
      SCRIPT_NAME: 'maintenance-example',
      SCRIPT_DESCRIPTION: 'Maintenance script example',
      LAST_MODIFIED_DATE: new Date().toISOString().split('T')[0]
    }
  });
  
  fs.writeFileSync(path.join(examplesDir, 'maintenance-script-example.md'), maintenanceExample);
  
  defaultLogger.info('Created documentation template examples');
}

/**
 * Create documentation guide
 */
function createDocumentationGuide() {
  const guidePath = path.join(__dirname, 'DOCUMENTATION_TEMPLATE_GUIDE.md');
  const guide = `# Documentation Template Guide

## Overview
This guide explains how to use the standardized documentation templates for all scripts in the project.

## Template Types

### Script Header Template
Standardized header documentation for all scripts including:
- Script name and description
- Author and version information
- Usage examples and command-line options
- Dependencies and requirements
- Error handling information

### Function Documentation Template
Comprehensive function documentation including:
- Parameter descriptions with types
- Return value documentation
- Error conditions and handling
- Usage examples
- Version and author information

### Configuration Documentation Template
Configuration object documentation including:
- Property descriptions and types
- Default values
- Environment-specific configurations
- Usage examples

## Usage

### Basic Template Usage
\`\`\`javascript
const { defaultDocTemplate } = require('./utils/docTemplate');

// Generate script header
const header = defaultDocTemplate.generateScriptHeader({
  SCRIPT_NAME: 'My Script',
  SCRIPT_DESCRIPTION: 'Does something useful',
  AUTHOR: 'Your Name',
  VERSION: '1.0.0'
});

// Generate function documentation
const functionDoc = defaultDocTemplate.generateFunctionDoc({
  FUNCTION_NAME: 'myFunction',
  FUNCTION_DESCRIPTION: 'Performs a specific task',
  PARAM_TYPE: 'string',
  PARAM_NAME: 'input',
  PARAM_DESCRIPTION: 'Input parameter description'
});
\`\`\`

### Script Type Templates
\`\`\`javascript
// Generate validation script documentation
const validationDoc = defaultDocTemplate.generateScriptTypeDoc('validation', {
  header: {
    SCRIPT_NAME: 'validate-config',
    SCRIPT_DESCRIPTION: 'Validates configuration files'
  }
});

// Generate deployment script documentation
const deploymentDoc = defaultDocTemplate.generateScriptTypeDoc('deployment', {
  header: {
    SCRIPT_NAME: 'deploy-app',
    SCRIPT_DESCRIPTION: 'Deploys the application'
  }
});
\`\`\`

## Template Categories

### Validation Scripts
- Environment validation
- Configuration validation
- Data validation
- System requirement validation

### Deployment Scripts
- Application deployment
- Environment setup
- Configuration management
- Post-deployment verification

### Maintenance Scripts
- System cleanup
- Performance optimization
- Health checks
- Routine maintenance

### Monitoring Scripts
- Health monitoring
- Performance monitoring
- Error tracking
- Metrics collection

### Setup Scripts
- Environment setup
- Configuration setup
- Service setup
- Initialization scripts

### Utility Scripts
- General utilities
- Helper functions
- Data processing
- File operations

## Best Practices

1. **Always include required sections**: Script name, description, usage, options
2. **Use appropriate categories**: Choose the right template type for your script
3. **Provide comprehensive examples**: Include usage examples and command-line options
4. **Document dependencies**: List all required dependencies and environment variables
5. **Include error handling**: Document error conditions and recovery strategies
6. **Keep documentation updated**: Update documentation when scripts change
7. **Use consistent formatting**: Follow the established template format
8. **Validate documentation**: Use the validation tools to ensure completeness

## Validation

The documentation system includes validation tools to ensure documentation quality:

\`\`\`javascript
// Validate existing documentation
const validation = defaultDocTemplate.validateDocumentation(content);


\`\`\`

## Examples

See the \`documentation-examples\` directory for complete examples of each template type.

## Integration

The documentation templates are automatically applied to all scripts in the project.
To manually apply documentation templates to a new script, run:
\`\`\`bash
node scripts/apply-documentation-template.js
\`\`\`
`;

  fs.writeFileSync(guidePath, guide);
  defaultLogger.info(`Created documentation guide: ${guidePath}`);
}

/**
 * Main function
 */
async function main() {
  defaultLogger.section('Applying Documentation Templates');
  
  const results = {
    total: SCRIPTS_TO_UPDATE.length,
    updated: 0,
    skipped: 0,
    failed: 0,
    details: []
  };
  
  defaultLogger.startProgress(results.total, 'Updating scripts with documentation templates');
  
  // Update each script
  for (let i = 0; i < SCRIPTS_TO_UPDATE.length; i++) {
    const scriptName = SCRIPTS_TO_UPDATE[i];
    const scriptPath = path.join(__dirname, scriptName);
    
    defaultLogger.updateProgress(i + 1, `Processing ${scriptName}`);
    
    if (!fs.existsSync(scriptPath)) {
      defaultLogger.warning(`${scriptName}: File not found`);
      results.skipped++;
      results.details.push({ script: scriptName, status: 'skipped', reason: 'File not found' });
      continue;
    }
    
    const result = updateScriptWithDocumentation(scriptPath);
    results.details.push({ script: scriptName, ...result });
    
    if (result.updated) {
      results.updated++;
    } else if (result.error) {
      results.failed++;
    } else {
      results.skipped++;
    }
  }
  
  defaultLogger.completeProgress('Documentation template application completed');
  
  // Create template examples and guide
  createTemplateExamples();
  createDocumentationGuide();
  
  // Summary
  defaultLogger.section('Documentation Template Application Summary');
  defaultLogger.info(`Total scripts: ${results.total}`);
  defaultLogger.success(`Updated: ${results.updated}`);
  defaultLogger.warning(`Skipped: ${results.skipped}`);
  defaultLogger.error(`Failed: ${results.failed}`);
  
  if (results.failed > 0) {
    defaultLogger.subsection('Failed Updates');
    results.details
      .filter(d => d.error)
      .forEach(d => defaultLogger.error(`${d.script}: ${d.error}`));
  }
  
  defaultLogger.success('Documentation template system applied successfully!');
  defaultLogger.info('See DOCUMENTATION_TEMPLATE_GUIDE.md for usage instructions');
  defaultLogger.info('See documentation-examples/ directory for template examples');
}

// Execute with error handling
if (require.main === module) {
  main().catch(error => {
    defaultLogger.error('Script failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  updateScriptWithDocumentation,
  createTemplateExamples,
  createDocumentationGuide
};
