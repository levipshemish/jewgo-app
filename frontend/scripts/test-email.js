const nodemailer = require('nodemailer')
require('dotenv').config()

async function testEmailConfig() {
  // Log configuration (without sensitive data)
  console.log('📧 Testing email configuration...');
  
  // Check if required variables are set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP_USER and SMTP_PASS are required!')
    process.exit(1)
  }

  // Create transporter
  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true' || false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  try {
    // Test connection
    await transporter.verify()
    console.log('✅ SMTP connection verified');
    
    // Send test email
    const testEmail = process.env.SMTP_USER // Send to yourself for testing
    
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: testEmail,
      subject: 'JewGo Email Test',
      html: `
        <h2>Email Test Successful!</h2>
        <p>This is a test email from your JewGo application.</p>
        <p>If you received this email, your SMTP configuration is working correctly.</p>
        <hr>
        <p><small>Sent at: ${new Date().toISOString()}</small></p>
      `,
      text: `
        Email Test Successful!
        
        This is a test email from your JewGo application.
        If you received this email, your SMTP configuration is working correctly.
        
        Sent at: ${new Date().toISOString()}
      `
    })
    
    console.log(`✅ Test email sent successfully! Message ID: ${info.messageId}`);
    
  } catch (error) {
    console.error('❌ SMTP test failed:')
    console.error(error.message)
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed. Please check:')
      console.error('1. SMTP_USER and SMTP_PASS are correct')
      console.error('2. If using Gmail, make sure you have:')
      console.error('   - 2-Factor Authentication enabled')
      console.error('   - App Password generated (not your regular password)')
    } else if (error.code === 'ECONNECTION') {
      console.error('\n💡 Connection failed. Please check:')
      console.error('1. SMTP_HOST and SMTP_PORT are correct')
      console.error('2. Your network/firewall allows SMTP connections')
      console.error('3. The SMTP server is accessible')
    }
    
    process.exit(1)
  }
}

testEmailConfig()
