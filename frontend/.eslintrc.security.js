module.exports = {
  extends: [
    'plugin:security/recommended',
    'plugin:security-node/recommended'
  ],
  plugins: [
    'security',
    'security-node'
  ],
  rules: {
    // Security rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    
    // Node.js security rules
    'security-node/detect-crlf': 'error',
    'security-node/detect-dangerous-regex': 'error',
    'security-node/detect-unsafe-regex': 'error',
    
    // Additional security considerations
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    'no-unsafe-finally': 'error',
    
    // React security
    'react/no-danger': 'warn',
    'react/no-danger-with-children': 'error',
    
    // XSS prevention
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Input validation
    'no-unsafe-regex': 'error',
    'no-unsafe-finally': 'error',
    
    // Override some rules for development
    'security/detect-non-literal-fs-filename': 'warn', // Allow some flexibility in development
    'security/detect-non-literal-require': 'warn', // Allow dynamic imports in some cases
  },
  overrides: [
    {
      // Disable some security rules for test files
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
      rules: {
        'security/detect-non-literal-fs-filename': 'off',
        'security/detect-non-literal-require': 'off',
      }
    }
  ]
};
