module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'This dependency creates a circular dependency',
      from: {},
      to: {
        circular: true
      }
    },
    {
      name: 'no-orphans',
      severity: 'warn',
      comment: 'This module is not used anywhere',
      from: {
        orphan: true,
        pathNot: '\\.d\\.ts$'
      },
      to: {}
    },
    {
      name: 'no-deep-relative',
      severity: 'warn',
      comment: 'Deep relative imports are discouraged. Use absolute imports with @/ alias instead.',
      from: {
        path: '^(app|components|lib|hooks|types|utils)'
      },
      to: {
        path: '^\\.\\./.*\\.\\./'
      }
    }
  ],
  allowed: [
    {
      name: 'allow-all',
      from: {},
      to: {}
    }
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
      dependencyTypes: [
        'npm-no-pkg',
        'npm-unknown'
      ]
    },
    includeOnly: [
      '^app/',
      '^components/',
      '^lib/',
      '^hooks/',
      '^types/',
      '^utils/'
    ],
    tsPreCompilationDeps: false,
    tsConfig: {
      fileName: './tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default']
    },
    reporterOptions: {
      dot: {
        collapsePattern: 'node_modules/[^/]+'
      },
      archi: {
        collapsePattern: '^(packages|src|lib|app|bin|test(s?)|spec(s?))/[^/]+|node_modules/[^/]+'
      }
    }
  }
};
