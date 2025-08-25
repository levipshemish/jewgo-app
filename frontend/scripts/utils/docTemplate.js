#!/usr/bin/env node

/**
 * Documentation Template System
 * =============================
 * 
 * This module provides standardized documentation templates for all scripts
 * in the project. It includes templates for different script types, function
 * documentation, and automated documentation generation.
 * 
 * Features:
 * - Standardized script header templates
 * - Function documentation templates
 * - Configuration documentation templates
 * - Usage examples and command-line options
 * - Automated documentation validation
 * - Template customization and extension
 */

const fs = require('fs');
const path = require('path');

// Documentation template types
const TEMPLATE_TYPES = {
  SCRIPT_HEADER: 'script_header',
  FUNCTION: 'function',
  CONFIGURATION: 'configuration',
  USAGE: 'usage',
  EXAMPLES: 'examples',
  DEPENDENCIES: 'dependencies',
  ERROR_HANDLING: 'error_handling',
  LOGGING: 'logging',
  TESTING: 'testing',
  DEPLOYMENT: 'deployment'
};

// Script categories for different template styles
const SCRIPT_CATEGORIES = {
  VALIDATION: 'validation',
  DEPLOYMENT: 'deployment',
  MAINTENANCE: 'maintenance',
  MONITORING: 'monitoring',
  OPTIMIZATION: 'optimization',
  UTILITY: 'utility',
  SETUP: 'setup',
  CLEANUP: 'cleanup'
};

class DocTemplate {
  constructor() {
    this.templates = this._initializeTemplates();
  }

  /**
   * Initialize all documentation templates
   */
  _initializeTemplates() {
    return {
      [TEMPLATE_TYPES.SCRIPT_HEADER]: this._getScriptHeaderTemplate(),
      [TEMPLATE_TYPES.FUNCTION]: this._getFunctionTemplate(),
      [TEMPLATE_TYPES.CONFIGURATION]: this._getConfigurationTemplate(),
      [TEMPLATE_TYPES.USAGE]: this._getUsageTemplate(),
      [TEMPLATE_TYPES.EXAMPLES]: this._getExamplesTemplate(),
      [TEMPLATE_TYPES.DEPENDENCIES]: this._getDependenciesTemplate(),
      [TEMPLATE_TYPES.ERROR_HANDLING]: this._getErrorHandlingTemplate(),
      [TEMPLATE_TYPES.LOGGING]: this._getLoggingTemplate(),
      [TEMPLATE_TYPES.TESTING]: this._getTestingTemplate(),
      [TEMPLATE_TYPES.DEPLOYMENT]: this._getDeploymentTemplate()
    };
  }

  /**
   * Get script header template
   */
  _getScriptHeaderTemplate() {
    return `#!/usr/bin/env node

/**
 * {SCRIPT_NAME}
 * {SCRIPT_DESCRIPTION}
 * 
 * {DETAILED_DESCRIPTION}
 * 
 * @author {AUTHOR}
 * @version {VERSION}
 * @created {CREATED_DATE}
 * @lastModified {LAST_MODIFIED_DATE}
 * @category {CATEGORY}
 * 
 * @dependencies {DEPENDENCIES}
 * @requires {REQUIREMENTS}
 * 
 * @usage {USAGE_EXAMPLES}
 * @options {COMMAND_LINE_OPTIONS}
 * 
 * @example
 * {EXAMPLE_USAGE}
 * 
 * @returns {RETURN_VALUE}
 * @throws {ERRORS}
 * 
 * @see {RELATED_SCRIPTS}
 * @see {RELATED_DOCUMENTATION}
 */
`;
  }

  /**
   * Get function documentation template
   */
  _getFunctionTemplate() {
    return `/**
 * {FUNCTION_NAME}
 * {FUNCTION_DESCRIPTION}
 * 
 * @param {PARAM_TYPE} {PARAM_NAME} - {PARAM_DESCRIPTION}
 * @param {PARAM_TYPE} {PARAM_NAME} - {PARAM_DESCRIPTION}
 * @param {Object} options - {OPTIONS_DESCRIPTION}
 * @param {OPTION_TYPE} options.{OPTION_NAME} - {OPTION_DESCRIPTION}
 * 
 * @returns {RETURN_TYPE} - {RETURN_DESCRIPTION}
 * @throws {ERROR_TYPE} - {ERROR_DESCRIPTION}
 * 
 * @example
 * {EXAMPLE_CODE}
 * 
 * @since {VERSION}
 * @author {AUTHOR}
 */
`;
  }

  /**
   * Get configuration documentation template
   */
  _getConfigurationTemplate() {
    return `/**
 * Configuration Object
 * ===================
 * 
 * @description {CONFIG_DESCRIPTION}
 * @type {Object}
 * 
 * @property {PROPERTY_TYPE} {PROPERTY_NAME} - {PROPERTY_DESCRIPTION}
 * @property {PROPERTY_TYPE} {PROPERTY_NAME} - {PROPERTY_DESCRIPTION}
 * 
 * @example
 * {EXAMPLE_CONFIG}
 * 
 * @default {DEFAULT_VALUES}
 * @environment {ENVIRONMENT_SPECIFIC}
 */
`;
  }

  /**
   * Get usage documentation template
   */
  _getUsageTemplate() {
    return `/**
 * Usage
 * =====
 * 
 * @description {USAGE_DESCRIPTION}
 * 
 * Command Line Usage:
 * {COMMAND_LINE_USAGE}
 * 
 * Options:
 * {OPTIONS_LIST}
 * 
 * Examples:
 * {USAGE_EXAMPLES}
 * 
 * Environment Variables:
 * {ENVIRONMENT_VARIABLES}
 * 
 * Configuration Files:
 * {CONFIGURATION_FILES}
 */
`;
  }

  /**
   * Get examples documentation template
   */
  _getExamplesTemplate() {
    return `/**
 * Examples
 * ========
 * 
 * @description {EXAMPLES_DESCRIPTION}
 * 
 * Basic Usage:
 * {BASIC_EXAMPLE}
 * 
 * Advanced Usage:
 * {ADVANCED_EXAMPLE}
 * 
 * Error Handling:
 * {ERROR_HANDLING_EXAMPLE}
 * 
 * Integration Examples:
 * {INTEGRATION_EXAMPLES}
 */
`;
  }

  /**
   * Get dependencies documentation template
   */
  _getDependenciesTemplate() {
    return `/**
 * Dependencies
 * ============
 * 
 * @description {DEPENDENCIES_DESCRIPTION}
 * 
 * Required Dependencies:
 * {REQUIRED_DEPENDENCIES}
 * 
 * Optional Dependencies:
 * {OPTIONAL_DEPENDENCIES}
 * 
 * External Services:
 * {EXTERNAL_SERVICES}
 * 
 * Environment Requirements:
 * {ENVIRONMENT_REQUIREMENTS}
 * 
 * Installation:
 * {INSTALLATION_INSTRUCTIONS}
 */
`;
  }

  /**
   * Get error handling documentation template
   */
  _getErrorHandlingTemplate() {
    return `/**
 * Error Handling
 * ==============
 * 
 * @description {ERROR_HANDLING_DESCRIPTION}
 * 
 * Error Types:
 * {ERROR_TYPES}
 * 
 * Recovery Strategies:
 * {RECOVERY_STRATEGIES}
 * 
 * Error Codes:
 * {ERROR_CODES}
 * 
 * Debugging:
 * {DEBUGGING_INSTRUCTIONS}
 * 
 * Logging:
 * {LOGGING_INFORMATION}
 */
`;
  }

  /**
   * Get logging documentation template
   */
  _getLoggingTemplate() {
    return `/**
 * Logging
 * =======
 * 
 * @description {LOGGING_DESCRIPTION}
 * 
 * Log Levels:
 * {LOG_LEVELS}
 * 
 * Log Output:
 * {LOG_OUTPUT}
 * 
 * Log Files:
 * {LOG_FILES}
 * 
 * Configuration:
 * {LOGGING_CONFIGURATION}
 * 
 * Monitoring:
 * {LOGGING_MONITORING}
 */
`;
  }

  /**
   * Get testing documentation template
   */
  _getTestingTemplate() {
    return `/**
 * Testing
 * =======
 * 
 * @description {TESTING_DESCRIPTION}
 * 
 * Test Commands:
 * {TEST_COMMANDS}
 * 
 * Test Coverage:
 * {TEST_COVERAGE}
 * 
 * Test Environment:
 * {TEST_ENVIRONMENT}
 * 
 * Mock Data:
 * {MOCK_DATA}
 * 
 * Integration Tests:
 * {INTEGRATION_TESTS}
 */
`;
  }

  /**
   * Get deployment documentation template
   */
  _getDeploymentTemplate() {
    return `/**
 * Deployment
 * ==========
 * 
 * @description {DEPLOYMENT_DESCRIPTION}
 * 
 * Prerequisites:
 * {PREREQUISITES}
 * 
 * Deployment Steps:
 * {DEPLOYMENT_STEPS}
 * 
 * Environment Setup:
 * {ENVIRONMENT_SETUP}
 * 
 * Configuration:
 * {DEPLOYMENT_CONFIGURATION}
 * 
 * Monitoring:
 * {DEPLOYMENT_MONITORING}
 * 
 * Rollback:
 * {ROLLBACK_PROCEDURE}
 */
`;
  }

  /**
   * Generate script header documentation
   */
  generateScriptHeader(options = {}) {
    const template = this.templates[TEMPLATE_TYPES.SCRIPT_HEADER];
    
    const defaults = {
      SCRIPT_NAME: 'Script Name',
      SCRIPT_DESCRIPTION: 'Brief description of what the script does',
      DETAILED_DESCRIPTION: 'Detailed description of the script functionality, purpose, and behavior',
      AUTHOR: 'Development Team',
      VERSION: '1.0.0',
      CREATED_DATE: new Date().toISOString().split('T')[0],
      LAST_MODIFIED_DATE: new Date().toISOString().split('T')[0],
      CATEGORY: 'utility',
      DEPENDENCIES: 'Node.js, required npm packages',
      REQUIREMENTS: 'Environment variables, configuration files',
      USAGE_EXAMPLES: 'node script-name.js [options]',
      COMMAND_LINE_OPTIONS: '--help, --verbose, --config',
      EXAMPLE_USAGE: 'node script-name.js --verbose --config=production',
      RETURN_VALUE: 'Exit code 0 for success, non-zero for errors',
      ERRORS: 'Common error conditions and their meanings',
      RELATED_SCRIPTS: 'Related scripts in the project',
      RELATED_DOCUMENTATION: 'Links to relevant documentation'
    };

    const values = { ...defaults, ...options };
    
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return values[key] || match;
    });
  }

  /**
   * Generate function documentation
   */
  generateFunctionDoc(options = {}) {
    const template = this.templates[TEMPLATE_TYPES.FUNCTION];
    
    const defaults = {
      FUNCTION_NAME: 'functionName',
      FUNCTION_DESCRIPTION: 'Brief description of what the function does',
      PARAM_TYPE: 'string',
      PARAM_NAME: 'paramName',
      PARAM_DESCRIPTION: 'Description of the parameter',
      OPTIONS_DESCRIPTION: 'Description of the options object',
      OPTION_TYPE: 'string',
      OPTION_NAME: 'optionName',
      OPTION_DESCRIPTION: 'Description of the option',
      RETURN_TYPE: 'Promise<Object>',
      RETURN_DESCRIPTION: 'Description of the return value',
      ERROR_TYPE: 'Error',
      ERROR_DESCRIPTION: 'Description of when this error is thrown',
      EXAMPLE_CODE: 'const result = await functionName(param, { option: value });',
      VERSION: '1.0.0',
      AUTHOR: 'Development Team'
    };

    const values = { ...defaults, ...options };
    
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return values[key] || match;
    });
  }

  /**
   * Generate configuration documentation
   */
  generateConfigDoc(options = {}) {
    const template = this.templates[TEMPLATE_TYPES.CONFIGURATION];
    
    const defaults = {
      CONFIG_DESCRIPTION: 'Description of the configuration object',
      PROPERTY_TYPE: 'string',
      PROPERTY_NAME: 'propertyName',
      PROPERTY_DESCRIPTION: 'Description of the property',
      EXAMPLE_CONFIG: 'const config = { property: "value" };',
      DEFAULT_VALUES: 'Default values for configuration properties',
      ENVIRONMENT_SPECIFIC: 'Environment-specific configuration details'
    };

    const values = { ...defaults, ...options };
    
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return values[key] || match;
    });
  }

  /**
   * Generate usage documentation
   */
  generateUsageDoc(options = {}) {
    const template = this.templates[TEMPLATE_TYPES.USAGE];
    
    const defaults = {
      USAGE_DESCRIPTION: 'Description of how to use the script',
      COMMAND_LINE_USAGE: 'node script-name.js [options]',
      OPTIONS_LIST: 'List of available command-line options',
      USAGE_EXAMPLES: 'Examples of different usage scenarios',
      ENVIRONMENT_VARIABLES: 'Required and optional environment variables',
      CONFIGURATION_FILES: 'Configuration files used by the script'
    };

    const values = { ...defaults, ...options };
    
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return values[key] || match;
    });
  }

  /**
   * Generate complete script documentation
   */
  generateCompleteDoc(scriptInfo = {}) {
    const sections = [];
    
    // Script header
    sections.push(this.generateScriptHeader(scriptInfo.header));
    
    // Usage section
    if (scriptInfo.usage) {
      sections.push(this.generateUsageDoc(scriptInfo.usage));
    }
    
    // Configuration section
    if (scriptInfo.configuration) {
      sections.push(this.generateConfigDoc(scriptInfo.configuration));
    }
    
    // Examples section
    if (scriptInfo.examples) {
      sections.push(this.generateExamplesDoc(scriptInfo.examples));
    }
    
    // Dependencies section
    if (scriptInfo.dependencies) {
      sections.push(this.generateDependenciesDoc(scriptInfo.dependencies));
    }
    
    // Error handling section
    if (scriptInfo.errorHandling) {
      sections.push(this.generateErrorHandlingDoc(scriptInfo.errorHandling));
    }
    
    // Logging section
    if (scriptInfo.logging) {
      sections.push(this.generateLoggingDoc(scriptInfo.logging));
    }
    
    // Testing section
    if (scriptInfo.testing) {
      sections.push(this.generateTestingDoc(scriptInfo.testing));
    }
    
    // Deployment section
    if (scriptInfo.deployment) {
      sections.push(this.generateDeploymentDoc(scriptInfo.deployment));
    }
    
    return sections.join('\n\n');
  }

  /**
   * Validate existing documentation
   */
  validateDocumentation(content) {
    const issues = [];
    
    // Check for required sections
    const requiredSections = [
      'Script Name',
      'Brief description',
      'Usage',
      'Options'
    ];
    
    requiredSections.forEach(section => {
      if (!content.includes(section)) {
        issues.push(`Missing required section: ${section}`);
      }
    });
    
    // Check for JSDoc format
    if (!content.includes('/**')) {
      issues.push('Missing JSDoc comment block');
    }
    
    // Check for usage examples
    if (!content.includes('@example') && !content.includes('Example:')) {
      issues.push('Missing usage examples');
    }
    
    // Check for parameter documentation
    if (content.includes('function') && !content.includes('@param')) {
      issues.push('Missing parameter documentation');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      score: Math.max(0, 100 - (issues.length * 20))
    };
  }

  /**
   * Generate documentation for a specific script type
   */
  generateScriptTypeDoc(scriptType, options = {}) {
    const typeTemplates = {
      [SCRIPT_CATEGORIES.VALIDATION]: {
        header: {
          SCRIPT_NAME: 'Validation Script',
          SCRIPT_DESCRIPTION: 'Validates configuration, environment, or data',
          DETAILED_DESCRIPTION: 'This script performs comprehensive validation of various aspects of the system including environment variables, configuration files, data integrity, and system requirements.',
          CATEGORY: 'validation',
          USAGE_EXAMPLES: 'node validation-script.js [--strict] [--verbose]',
          COMMAND_LINE_OPTIONS: '--strict, --verbose, --config, --output'
        },
        usage: {
          USAGE_DESCRIPTION: 'Validation scripts check system integrity and configuration',
          COMMAND_LINE_USAGE: 'node validation-script.js [options]',
          OPTIONS_LIST: '--strict: Exit on any validation failure\n--verbose: Show detailed validation information\n--config: Specify configuration file\n--output: Output format (json, text)',
          USAGE_EXAMPLES: 'node validate-env.js --strict\nnode validate-config.js --verbose --output=json'
        }
      },
      [SCRIPT_CATEGORIES.DEPLOYMENT]: {
        header: {
          SCRIPT_NAME: 'Deployment Script',
          SCRIPT_DESCRIPTION: 'Handles deployment and release processes',
          DETAILED_DESCRIPTION: 'This script manages the deployment process including environment setup, configuration management, service deployment, and post-deployment verification.',
          CATEGORY: 'deployment',
          USAGE_EXAMPLES: 'node deploy-script.js [--environment] [--version]',
          COMMAND_LINE_OPTIONS: '--environment, --version, --dry-run, --rollback'
        },
        usage: {
          USAGE_DESCRIPTION: 'Deployment scripts manage application deployment and releases',
          COMMAND_LINE_USAGE: 'node deploy-script.js [options]',
          OPTIONS_LIST: '--environment: Target environment (dev, staging, prod)\n--version: Version to deploy\n--dry-run: Simulate deployment without changes\n--rollback: Rollback to previous version',
          USAGE_EXAMPLES: 'node deploy.js --environment=production --version=1.2.3\nnode deploy.js --dry-run --environment=staging'
        }
      },
      [SCRIPT_CATEGORIES.MAINTENANCE]: {
        header: {
          SCRIPT_NAME: 'Maintenance Script',
          SCRIPT_DESCRIPTION: 'Performs system maintenance and cleanup tasks',
          DETAILED_DESCRIPTION: 'This script performs routine maintenance tasks including cleanup, optimization, health checks, and system updates.',
          CATEGORY: 'maintenance',
          USAGE_EXAMPLES: 'node maintenance-script.js [--task] [--force]',
          COMMAND_LINE_OPTIONS: '--task, --force, --dry-run, --schedule'
        },
        usage: {
          USAGE_DESCRIPTION: 'Maintenance scripts perform routine system maintenance',
          COMMAND_LINE_USAGE: 'node maintenance-script.js [options]',
          OPTIONS_LIST: '--task: Specific maintenance task to perform\n--force: Force execution without confirmation\n--dry-run: Simulate maintenance without changes\n--schedule: Schedule maintenance for later',
          USAGE_EXAMPLES: 'node cleanup.js --task=logs --force\nnode optimize.js --dry-run --task=performance'
        }
      }
    };
    
    const template = typeTemplates[scriptType] || typeTemplates[SCRIPT_CATEGORIES.UTILITY];
    return this.generateCompleteDoc({ ...template, ...options });
  }

  /**
   * Create a documentation template file
   */
  createTemplateFile(templateName, content, outputPath) {
    try {
      const fullPath = path.join(outputPath, `${templateName}.md`);
      fs.writeFileSync(fullPath, content, 'utf8');
      return { success: true, path: fullPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate documentation for all scripts in a directory
   */
  generateDirectoryDocs(directoryPath, outputPath) {
    const scripts = fs.readdirSync(directoryPath)
      .filter(file => file.endsWith('.js') && !file.includes('node_modules'));
    
    const results = [];
    
    scripts.forEach(script => {
      const scriptPath = path.join(directoryPath, script);
      const content = fs.readFileSync(scriptPath, 'utf8');
      
      // Determine script type based on content and filename
      const scriptType = this._determineScriptType(script, content);
      
      // Generate documentation
      const doc = this.generateScriptTypeDoc(scriptType, {
        header: {
          SCRIPT_NAME: script.replace('.js', ''),
          SCRIPT_DESCRIPTION: this._extractDescription(content),
          LAST_MODIFIED_DATE: this._getFileModificationDate(scriptPath)
        }
      });
      
      // Create documentation file
      const result = this.createTemplateFile(
        `${script.replace('.js', '')}-docs`,
        doc,
        outputPath
      );
      
      results.push({
        script,
        type: scriptType,
        result
      });
    });
    
    return results;
  }

  /**
   * Determine script type based on filename and content
   */
  _determineScriptType(filename, content) {
    const lowerFilename = filename.toLowerCase();
    const lowerContent = content.toLowerCase();
    
    if (lowerFilename.includes('validate') || lowerContent.includes('validation')) {
      return SCRIPT_CATEGORIES.VALIDATION;
    }
    
    if (lowerFilename.includes('deploy') || lowerContent.includes('deployment')) {
      return SCRIPT_CATEGORIES.DEPLOYMENT;
    }
    
    if (lowerFilename.includes('maintenance') || lowerFilename.includes('cleanup') || lowerContent.includes('maintenance')) {
      return SCRIPT_CATEGORIES.MAINTENANCE;
    }
    
    if (lowerFilename.includes('monitor') || lowerContent.includes('monitoring')) {
      return SCRIPT_CATEGORIES.MONITORING;
    }
    
    if (lowerFilename.includes('optimize') || lowerContent.includes('optimization')) {
      return SCRIPT_CATEGORIES.OPTIMIZATION;
    }
    
    if (lowerFilename.includes('setup') || lowerContent.includes('setup')) {
      return SCRIPT_CATEGORIES.SETUP;
    }
    
    return SCRIPT_CATEGORIES.UTILITY;
  }

  /**
   * Extract description from script content
   */
  _extractDescription(content) {
    const match = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
    return match ? match[1].trim() : 'Script description not found';
  }

  /**
   * Get file modification date
   */
  _getFileModificationDate(filePath) {
    const stats = fs.statSync(filePath);
    return new Date(stats.mtime).toISOString().split('T')[0];
  }
}

// Create default documentation template instance
const defaultDocTemplate = new DocTemplate();

// Export the class and default instance
module.exports = {
  DocTemplate,
  defaultDocTemplate,
  TEMPLATE_TYPES,
  SCRIPT_CATEGORIES
};
