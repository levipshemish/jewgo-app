const fs = require('fs')
const path = require('path')
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(_prompt) {
  return new Promise((_resolve) => {
    rl.question(prompt, resolve)
  })
}

async function setupEnvironment() {
  try {
    // Get SMTP configuration
    const smtpHost = await question('SMTP Host (default: smtp.gmail.com): ') || 'smtp.gmail.com'
    const smtpPort = await question('SMTP Port (default: 587): ') || '587'
    const smtpSecure = await question('SMTP Secure (true/false, default: false): ') || 'false'
    const smtpUser = await question('SMTP Username (email): ')
    const smtpPass = await question('SMTP Password (app password): ')
    const smtpFrom = await question('From Email (default: same as username): ') || smtpUser
    const appUrl = await question('Application URL (default: http://localhost:3000): ') || 'http://localhost:3000'
    
    if (!smtpUser || !smtpPass) {
      // console.error('❌ SMTP username and password are required!')
      process.exit(1)
    }
    
    // Create .env content
    const envContent = `# Email Configuration
SMTP_HOST="${smtpHost}"
SMTP_PORT="${smtpPort}"
SMTP_SECURE=${smtpSecure}
SMTP_USER="${smtpUser}"
SMTP_PASS="${smtpPass}"
SMTP_FROM="${smtpFrom}"

# Application URL
NEXT_PUBLIC_URL="${appUrl}"

# Database (already configured)
# DATABASE_URL="your-database-url"
`
    
    // Write to .env file
    const envPath = path.join(__dirname, '..', '.env')
    fs.writeFileSync(envPath, envContent)
    
    } catch (error) {
    // console.error('❌ Setup failed:', error.message)
  } finally {
    rl.close()
  }
}

setupEnvironment()
