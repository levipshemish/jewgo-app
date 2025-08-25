#!/usr/bin/env node

/**
 * deploy-setup
 * Wrap function with error handling
 * 
 * This script provides wrap function with error handling for the JewGo application.
 * 
 * @author Development Team
 * @version 1.0.0
 * @created 2025-08-25
 * @lastModified 2025-08-25
 * @category deployment
 * 
 * @dependencies Node.js, required npm packages
 * @requires Environment variables, configuration files
 * 
 * @usage node deploy-setup.js [options]
 * @options --help, --verbose, --config
 * 
 * @example
 * node deploy-setup.js --verbose --config=production
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
#!/usr/bin/env node

const fs = require(
const { defaultErrorHandler } = require('./utils/errorHandler');
const { defaultLogger } = require('./utils/logger');

'fs')
const path = require('path')
const crypto = require('crypto')

// Environment variable templates with secure placeholders
const VERCEL_ENV_TEMPLATE = {
  // SMTP Configuration
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: '${SMTP_USER}',
  SMTP_PASS: '${SMTP_PASS}',
  SMTP_FROM: '${SMTP_FROM}',
  
  // Application URLs
  NEXT_PUBLIC_URL: 'https://jewgo-app.vercel.app',
  NEXTAUTH_URL: 'https://jewgo-app.vercel.app',
  
  // Database
  DATABASE_URL: '${DATABASE_URL}',
  
  // NextAuth
  NEXTAUTH_SECRET: '${NEXTAUTH_SECRET}',
  
  // Google OAuth
  GOOGLE_CLIENT_ID: '${GOOGLE_CLIENT_ID}',
  GOOGLE_CLIENT_SECRET: '${GOOGLE_CLIENT_SECRET}',
  
  // Backend URL
  NEXT_PUBLIC_BACKEND_URL: 'https://jewgo-app-oyoh.onrender.com',
  
  // Google Maps
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: '${NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}',
  NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: '5060e374c6d88aacf8fea324',
  
  // Environment
  NODE_ENV: 'production'
}

const RENDER_ENV_TEMPLATE = {
  // SMTP Configuration
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: '${SMTP_USER}',
  SMTP_PASS: '${SMTP_PASS}',
  SMTP_FROM: '${SMTP_FROM}',
  
  // Database
  DATABASE_URL: '${DATABASE_URL}',
  
  // Security Tokens
  ADMIN_TOKEN: '${ADMIN_TOKEN}',
  SCRAPER_TOKEN: '${SCRAPER_TOKEN}',
  
  // Application URLs
  FRONTEND_URL: 'https://jewgo-app.vercel.app',
  BACKEND_URL: 'https://jewgo-app-oyoh.onrender.com',
  
  // Redis Configuration
  REDIS_URL: '${REDIS_URL}',
  REDIS_HOST: '${REDIS_HOST}',
  REDIS_PORT: '${REDIS_PORT}',
  REDIS_DB: '${REDIS_DB}',
  REDIS_USERNAME: '${REDIS_USERNAME}',
  REDIS_PASSWORD: '${REDIS_PASSWORD}',
  
  // Google Places API
  GOOGLE_PLACES_API_KEY: '${GOOGLE_PLACES_API_KEY}',
  
  // Sentry
  SENTRY_DSN: '${SENTRY_DSN}',
  
  // Environment
  ENVIRONMENT: 'production',
  FLASK_ENV: 'production'
}

function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex')
}

function generateScraperToken() {
  return generateSecureToken()
}

function displayVercelSetup() {
  defaultLogger.info('🔐 Vercel Environment Variables Setup')
  defaultLogger.info('=====================================')
  defaultLogger.info('')
  defaultLogger.info('⚠️  SECURITY NOTICE: Replace all placeholder values with your actual credentials')
  defaultLogger.info('')
  
  Object.entries(VERCEL_ENV_TEMPLATE).forEach(([key, value]) => {
    if (value.startsWith('${') && value.endsWith('}')) {
      defaultLogger.info(`${key}=${value}  # ⚠️  REQUIRES ACTUAL VALUE`)
    } else {
      defaultLogger.info(`${key}=${value}`)
    }
  })
  
  defaultLogger.info('')
  defaultLogger.info('📝 Instructions:')
  defaultLogger.info('1. Copy these variables to your Vercel environment settings')
  defaultLogger.info('2. Replace all ${PLACEHOLDER} values with actual credentials')
  defaultLogger.info('3. Never commit real credentials to version control')
  defaultLogger.info('')
}

function displayRenderSetup() {
  defaultLogger.info('🔐 Render Environment Variables Setup')
  defaultLogger.info('=====================================')
  defaultLogger.info('')
  defaultLogger.info('⚠️  SECURITY NOTICE: Replace all placeholder values with your actual credentials')
  defaultLogger.info('')
  
  Object.entries(RENDER_ENV_TEMPLATE).forEach(([key, value]) => {
    if (key === 'SCRAPER_TOKEN' && value === '${SCRAPER_TOKEN}') {
      const generatedToken = generateScraperToken()
      defaultLogger.info(`${key}=${generatedToken}  # ✅ Auto-generated secure token`)
    } else if (value.startsWith('${') && value.endsWith('}')) {
      defaultLogger.info(`${key}=${value}  # ⚠️  REQUIRES ACTUAL VALUE`)
    } else {
      defaultLogger.info(`${key}=${value}`)
    }
  })
  
  defaultLogger.info('')
  defaultLogger.info('📝 Instructions:')
  defaultLogger.info('1. Copy these variables to your Render environment settings')
  defaultLogger.info('2. Replace all ${PLACEHOLDER} values with actual credentials')
  defaultLogger.info('3. SCRAPER_TOKEN is auto-generated - use the value shown above')
  defaultLogger.info('4. Never commit real credentials to version control')
  defaultLogger.info('')
}

function createEnvFiles() {
  defaultLogger.info('📁 Creating Environment Template Files')
  defaultLogger.info('=====================================')
  defaultLogger.info('')
  
  // Create Vercel env template file
  const vercelEnvContent = Object.entries(VERCEL_ENV_TEMPLATE)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  
  const vercelTemplatePath = 'vercel.env.template'
  wrapSyncWithErrorHandling(() => fs.writeFileSync)(vercelTemplatePath, vercelEnvContent)
  defaultLogger.info(`✅ Created: ${vercelTemplatePath}`)
  defaultLogger.info('   ⚠️  This is a template - replace placeholders with real values')
  
  // Create Render env template file
  const renderEnvVars = { ...RENDER_ENV_TEMPLATE }
  renderEnvVars.SCRAPER_TOKEN = generateScraperToken()
  
  const renderEnvContent = Object.entries(renderEnvVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  
  const renderTemplatePath = 'render.env.template'
  wrapSyncWithErrorHandling(() => fs.writeFileSync)(renderTemplatePath, renderEnvContent)
  defaultLogger.info(`✅ Created: ${renderTemplatePath}`)
  defaultLogger.info('   ⚠️  This is a template - replace placeholders with real values')
  
  defaultLogger.info('')
  defaultLogger.info('🔒 Security Notes:')
  defaultLogger.info('- Template files are safe to commit to version control')
  defaultLogger.info('- Never commit files with actual credentials')
  defaultLogger.info('- Use environment variables in your deployment platform')
  defaultLogger.info('')
}

function displayQuickCommands() {
  defaultLogger.info('🚀 Quick Deployment Commands')
  defaultLogger.info('============================')
  defaultLogger.info('')
  defaultLogger.info('# Vercel Deployment')
  defaultLogger.info('vercel --prod')
  defaultLogger.info('')
  defaultLogger.info('# Render Deployment')
  defaultLogger.info('git push origin main')
  defaultLogger.info('')
  defaultLogger.info('# Environment Setup')
  defaultLogger.info('1. Copy template values to your deployment platform')
  defaultLogger.info('2. Replace all placeholders with actual credentials')
  defaultLogger.info('3. Deploy your application')
  defaultLogger.info('')
}

function displaySecurityWarnings() {
  defaultLogger.info('🔒 CRITICAL SECURITY WARNINGS')
  defaultLogger.info('=============================')
  defaultLogger.info('')
  defaultLogger.info('⚠️  NEVER commit the following to version control:')
  defaultLogger.info('   - Real API keys')
  defaultLogger.info('   - Database passwords')
  defaultLogger.info('   - OAuth secrets')
  defaultLogger.info('   - Admin tokens')
  defaultLogger.info('   - SMTP credentials')
  defaultLogger.info('')
  defaultLogger.info('✅ SAFE to commit:')
  defaultLogger.info('   - Template files with placeholders')
  defaultLogger.info('   - Public URLs and endpoints')
  defaultLogger.info('   - Non-sensitive configuration')
  defaultLogger.info('')
  defaultLogger.info('🔐 Use your deployment platform\'s environment variable system')
  defaultLogger.info('   - Vercel: Environment Variables in project settings')
  defaultLogger.info('   - Render: Environment Variables in service settings')
  defaultLogger.info('')
}

// Main execution
const args = process.argv.slice(2)

if (args.includes('--vercel')) {
  displayVercelSetup()
} else if (args.includes('--render')) {
  displayRenderSetup()
} else if (args.includes('--files')) {
  createEnvFiles()
} else if (args.includes('--security')) {
  displaySecurityWarnings()
} else {
  displaySecurityWarnings()
  defaultLogger.info('')
  displayVercelSetup()
  defaultLogger.info('')
  displayRenderSetup()
  defaultLogger.info('')
  createEnvFiles()
  defaultLogger.info('')
  displayQuickCommands()
}

