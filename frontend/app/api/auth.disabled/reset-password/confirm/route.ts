import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendEmail, createPasswordChangedEmail } from '@/lib/email'
import { z } from 'zod'

const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
})

export async function POST(request: NextRequest) {
  try {
    const { token, password } = ResetPasswordSchema.parse(await request.json())
    
    // Hash the token to match storage
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')
    
    // Find valid reset token
    const passwordReset = await prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        expires: { gt: new Date() },
        used: false,
      },
      include: { user: true }
    })
    
    if (!passwordReset) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Update user password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: passwordReset.userId },
        data: { password: hashedPassword }
      }),
      prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: { used: true }
      })
    ])
    
    // Send confirmation email
    await sendEmail({
      to: passwordReset.user.email!,
      subject: 'Password Changed Successfully - JewGo',
      html: createPasswordChangedEmail(passwordReset.user.name || 'User')
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Password reset successfully! You can now sign in with your new password.'
    })
  } catch (error) {
    // console.error('Password reset confirmation error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid password format',
        details: error.issues 
      }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
