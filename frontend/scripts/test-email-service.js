const { sendEmail, createVerificationEmail, createPasswordResetEmail } = require('../lib/email')

async function testEmailService() {
  try {
    // Test verification email
    await sendEmail({
      to: process.env.SMTP_USER || 'test@example.com',
      subject: 'JewGo Email Service Test - Verification',
      html: createVerificationEmail('test-token-123', 'Test User')
    })
    // Test password reset email
    await sendEmail({
      to: process.env.SMTP_USER || 'test@example.com',
      subject: 'JewGo Email Service Test - Password Reset',
      html: createPasswordResetEmail('test-reset-token-456', 'Test User')
    })
    } catch (error) {
    // console.error('❌ Email service test failed:')
    // console.error(error.message)
    process.exit(1)
  }
}

testEmailService()
