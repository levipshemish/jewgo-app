import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Create transporter with fallback for missing environment variables
const createTransporter = () => {
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com'
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587')
  const secure = process.env.SMTP_SECURE === 'true' || port === 465
  const user = process.env.SMTP_USER || process.env.EMAIL_USER
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD

  if (!user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port,
    secure, // Use SMTP_SECURE environment variable or auto-detect
    auth: {
      user,
      pass,
    },
  })
}

const transporter = createTransporter()

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!transporter) {
    return
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    }

    const info = await transporter.sendMail(mailOptions)
    } catch {
    // console.error('Failed to send email:', error)
    throw new Error('Failed to send email')
  }
}

// Email templates
export function createVerificationEmail(token: string, name: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
  const verificationUrl = `${baseUrl}/auth/verify?token=${token}`
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Welcome to JewGo!</h2>
      <p>Hi ${name},</p>
      <p>Thank you for creating an account with JewGo. Please verify your email address by clicking the button below:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" 
           style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Verify Email Address
        </a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
      
      <p>This link will expire in 24 hours.</p>
      
      <p>If you didn't create an account with JewGo, please ignore this email.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        This is an automated email from JewGo. Please do not reply to this email.
      </p>
    </div>
  `
}

export function createPasswordResetEmail(token: string, name: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`
  
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hi ${name},</p>
      <p>We received a request to reset your password for your JewGo account. Click the button below to reset your password:</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" 
           style="background-color: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Reset Password
        </a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${resetUrl}</p>
      
      <p><strong>This link will expire in 15 minutes for security reasons.</strong></p>
      
      <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
      
      <p>If you're having trouble with the button above, copy and paste the URL below into your web browser.</p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        This is an automated email from JewGo. Please do not reply to this email.
      </p>
    </div>
  `
}

export function createPasswordChangedEmail(name: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Changed Successfully</h2>
      <p>Hi ${name},</p>
      <p>Your JewGo account password has been successfully changed.</p>
      
      <p>If you made this change, you can safely ignore this email.</p>
      
      <p><strong>If you didn't make this change, please contact our support team immediately.</strong></p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        This is an automated email from JewGo. Please do not reply to this email.
      </p>
    </div>
  `
}
