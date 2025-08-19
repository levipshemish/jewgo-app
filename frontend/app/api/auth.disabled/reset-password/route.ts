import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { prisma } from '@/lib/db/prisma'
import { sendEmail, createPasswordResetEmail } from '@/lib/email'


const RequestResetSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const { email } = RequestResetSchema.parse(await request.json())
    
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true, name: true, email: true }
    })
    
    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({ 
        message: 'If an account exists with this email, a password reset link will be sent.' 
      })
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    
    // Hash token for storage
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex')
    
    // Store in database
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expires: resetExpires,
      }
    })
    
    // Send email
    await sendEmail({
      to: email,
      subject: 'Password Reset Request - JewGo',
      html: createPasswordResetEmail(resetToken, user.name || 'User')
    })
    
    return NextResponse.json({ 
      message: 'If an account exists with this email, a password reset link will be sent.' 
    })
  } catch {
    // console.error('Password reset request error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
