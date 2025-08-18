const fs = require('fs')
const path = require('path')

function validateEnvironment() {
  const requiredEnvVars = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'NEXT_PUBLIC_URL',
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL'
  ]
  
  const optionalEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXT_PUBLIC_BACKEND_URL'
  ]
  
  const missing = []
  const warnings = []
  
  // Check required environment variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName)
    }
  })
  
  // Check optional environment variables
  optionalEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      warnings.push(varName)
    }
  })
  
  // Check for hardcoded secrets
  const filesToCheck = [
    'lib/email.ts',
    'app/api/auth/register/route.ts',
    'app/api/auth/verify-email/route.ts',
    'app/api/auth/reset-password/route.ts',
    'app/api/auth/reset-password/confirm/route.ts'
  ]
  
  const hardcodedSecrets = []
  
  filesToCheck.forEach(file => {
    const filePath = path.join(__dirname, '..', file)
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8')
      const suspiciousPatterns = [
        /wmkr lmud pxxh iler/,
        /selleroptimization\.net/,
        /Mendy@selleroptimization\.net/
      ]
      
      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          hardcodedSecrets.push(`${file}: ${pattern.source}`)
        }
      })
    }
  })
  
  // Report results
  if (missing.length > 0) {
    // console.error('❌ Missing required environment variables:')
    missing.forEach(varName => {
      // console.error(`   - ${varName}`)
    })
    // console.error('')
  }
  
  if (warnings.length > 0) {
    warnings.forEach(varName => {
      })
    }
  
  if (hardcodedSecrets.length > 0) {
    // console.error('❌ Potential hardcoded secrets found:')
    hardcodedSecrets.forEach(secret => {
      // console.error(`   - ${secret}`)
    })
    // console.error('')
  }
  
  // Check file structure
  const requiredFiles = [
    'lib/email.ts',
    'lib/api-config.ts',
    'app/api/auth/register/route.ts',
    'app/api/auth/verify-email/route.ts',
    'app/api/auth/reset-password/route.ts',
    'app/api/auth/reset-password/confirm/route.ts',
    'app/auth/forgot-password/page.tsx',
    'app/auth/reset-password/page.tsx',
    'vercel.json',
    'prisma/schema.prisma'
  ]
  
  const missingFiles = []
  
  requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file)
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file)
    }
  })
  
  if (missingFiles.length > 0) {
    // console.error('❌ Missing required files:')
    missingFiles.forEach(file => {
      // console.error(`   - ${file}`)
    })
    // console.error('')
  }
  
  // Summary
  const hasErrors = missing.length > 0 || hardcodedSecrets.length > 0 || missingFiles.length > 0
  
  if (hasErrors) {
    // console.error('❌ Deployment validation failed!')
    // console.error('Please fix the issues above before deploying.')
    process.exit(1)
  } else {
    }
}

function validateDatabase() {
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    // console.error('❌ DATABASE_URL is not set')
    return false
  }
  
  // Check if it's a valid PostgreSQL URL
  if (!databaseUrl.startsWith('postgresql://')) {
    // console.error('❌ DATABASE_URL should be a PostgreSQL connection string')
    return false
  }
  
  return true
}

function validateEmail() {
  const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS']
  const missing = required.filter(varName => !process.env[varName])
  
  if (missing.length > 0) {
    // console.error('❌ Missing email configuration:')
    missing.forEach(varName => {
      // console.error(`   - ${varName}`)
    })
    return false
  }
  
  return true
}

// Run validation
validateEnvironment()
validateDatabase()
validateEmail()

