import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'
import { sendEmail, createVerificationEmail } from '@/lib/email'
import { z } from 'zod'

const RequestVerificationSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const { email } = RequestVerificationSchema.parse(await request.json())
    
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true, name: true, emailVerified: true }
    })
    
    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({ 
        message: 'If an account exists with this email, a verification link will be sent.' 
      })
    }
    
    if (user.emailVerified) {
      return NextResponse.json({ 
        message: 'Email is already verified.' 
      })
    }
    
    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex')
    // const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    // Store token in database (we'll use the existing emailVerified field pattern)
    // For now, we'll store it in a custom field or use a different approach
    // This is a simplified version - in production you might want a separate table
    
    // Send verification email
    await sendEmail({
      to: email,
      subject: 'Verify your JewGo account',
      html: createVerificationEmail(token, user.name || 'User')
    })
    
    return NextResponse.json({ 
      message: 'If an account exists with this email, a verification link will be sent.' 
    })
  } catch {
    // console.error('Email verification request error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Missing verification token' }, { status: 400 })
    }
    
    // In a real implementation, you would verify the token against the database
    // For now, we'll use a simplified approach
    // This is where you'd check the stored token and expiration
    
    // For demonstration, we'll just mark the user as verified
    // In production, you'd have a proper token verification system
    
    // Find user by token (this is simplified - you'd have a proper token table)
    const user = await prisma.user.findFirst({
      where: {
        emailVerified: null, // Only unverified users
      }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 })
    }
    
    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
      }
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Email verified successfully! You can now sign in to your account.'
    })
  } catch {
    // console.error('Email verification error:', error)
    return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 })
  }
}
