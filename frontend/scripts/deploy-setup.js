#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Your actual production credentials
const VERCEL_ENV_VARS = {
  // SMTP Configuration
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'Mendy@selleroptimization.net',
  SMTP_PASS: 'wmkr lmud pxxh iler',
  SMTP_FROM: 'info@selleroptimization.net',
  
  // Application URLs
  NEXT_PUBLIC_URL: 'https://jewgo-app.vercel.app',
  NEXTAUTH_URL: 'https://jewgo-app.vercel.app',
  
  // Database
  DATABASE_URL: 'postgresql://username:password@host:5432/database_name?sslmode=require',
  
  // NextAuth
  NEXTAUTH_SECRET: 'your-nextauth-secret',
  
  // Google OAuth
  GOOGLE_CLIENT_ID: 'your-google-client-id',
  GOOGLE_CLIENT_SECRET: 'your-google-client-secret',
  
  // Backend URL
  NEXT_PUBLIC_BACKEND_URL: 'https://jewgo.onrender.com',
  
  // Google Maps
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'your-google-maps-api-key',
  NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: '5060e374c6d88aacf8fea324',
  
  // Environment
  NODE_ENV: 'production'
}

const RENDER_ENV_VARS = {
  // SMTP Configuration
  SMTP_HOST: 'smtp.gmail.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'Mendy@selleroptimization.net',
  SMTP_PASS: 'wmkr lmud pxxh iler',
  SMTP_FROM: 'info@selleroptimization.net',
  
  // Database
  DATABASE_URL: 'postgresql://username:password@host:5432/database_name?sslmode=require',
  
  // Security Tokens
  ADMIN_TOKEN: 'your-secure-admin-token',
  SCRAPER_TOKEN: 'your-secure-scraper-token', // You need to generate this
  
  // Application URLs
  FRONTEND_URL: 'https://jewgo-app.vercel.app',
  BACKEND_URL: 'https://jewgo.onrender.com',
  
  // Redis Configuration
  REDIS_URL: 'redis://user:password@host:6379',
  REDIS_HOST: 'redis-10768.c14.us-east-1-2.ec2.redns.redis-cloud.com',
  REDIS_PORT: '10768',
  REDIS_DB: '0',
  REDIS_USERNAME: 'default',
  REDIS_PASSWORD: 'your-redis-password',
  
  // Google Places API
  GOOGLE_PLACES_API_KEY: 'your-google-places-api-key',
  
  // Sentry
  SENTRY_DSN: 'your-sentry-dsn',
  
  // Environment
  ENVIRONMENT: 'production',
  FLASK_ENV: 'production'
}

function generateScraperToken() {
  const crypto = require('crypto')
  return crypto.randomBytes(32).toString('hex')
}

function displayVercelSetup() {
  Object.entries(VERCEL_ENV_VARS).forEach(([key, value]) => {
    })
  
  }

function displayRenderSetup() {
  Object.entries(RENDER_ENV_VARS).forEach(([key, value]) => {
    if (key === 'SCRAPER_TOKEN' && value === 'your-secure-scraper-token') {
      const generatedToken = generateScraperToken()
      } else {
      }
  })
  
  }

function createEnvFiles() {
  // Create Vercel env file
  const vercelEnvContent = Object.entries(VERCEL_ENV_VARS)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  
  fs.writeFileSync('vercel.env.production', vercelEnvContent)
  // Create Render env file
  const renderEnvVars = { ...RENDER_ENV_VARS }
  renderEnvVars.SCRAPER_TOKEN = generateScraperToken()
  
  const renderEnvContent = Object.entries(renderEnvVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')
  
  fs.writeFileSync('render.env.production', renderEnvContent)
  }

function displayQuickCommands() {
  }

// Main execution
const args = process.argv.slice(2)

if (args.includes('--vercel')) {
  displayVercelSetup()
} else if (args.includes('--render')) {
  displayRenderSetup()
} else if (args.includes('--files')) {
  createEnvFiles()
} else {
  displayVercelSetup()
  displayRenderSetup()
  createEnvFiles()
  displayQuickCommands()
}

