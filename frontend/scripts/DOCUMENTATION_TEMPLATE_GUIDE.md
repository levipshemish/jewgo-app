# Documentation Template Guide

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
```javascript
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
```

### Script Type Templates
```javascript
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
```

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

```javascript
// Validate existing documentation
const validation = defaultDocTemplate.validateDocumentation(content);
console.log('Documentation score:', validation.score);
console.log('Issues:', validation.issues);
```

## Examples

See the `documentation-examples` directory for complete examples of each template type.

## Integration

The documentation templates are automatically applied to all scripts in the project.
To manually apply documentation templates to a new script, run:
```bash
node scripts/apply-documentation-template.js
```
