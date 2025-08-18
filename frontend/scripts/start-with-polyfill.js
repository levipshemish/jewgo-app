#!/usr/bin/env node

// This script ensures the self polyfill runs before Next.js starts
// It should be used as the entry point for the build process

// Load the polyfill first
require('../lib/polyfills/self-polyfill.js');

// Verify the polyfill is working
if (typeof self === 'undefined') {
  // // console.error('❌ Self polyfill failed to load');
  process.exit(1);
} else {
  }

// Now start Next.js
const { spawn } = require('child_process');

// Get the command from arguments
const args = process.argv.slice(2);
const command = args[0] || 'build';

// Spawn the Next.js process
const nextProcess = spawn('npx', ['next', command, ...args.slice(1)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    SELF_POLYFILL_LOADED: 'true',
  },
});

nextProcess.on('close', (_code) => {
  process.exit(code);
});

nextProcess.on('error', (error) => {
  // // console.error('Failed to start Next.js:', error);
  process.exit(1);
});
