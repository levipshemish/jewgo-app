import { NextResponse, NextRequest } from 'next/server'

export const runtime = 'nodejs'
import { z } from 'zod'

import { prisma } from '@/lib/db/prisma'

import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const RegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
})

export async function POST(request: NextRequest) {
  try {
    // Log request details for debugging
    const body = await request.json()
    
    const { name, email, password } = RegisterSchema.parse(body)
    // Test database connection
    await prisma.$connect()
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ success: false, message: 'Email already in use' }, { status: 409 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { name, email, password: hashed } })
    // Send verification email
    try {
      const { sendEmail, createVerificationEmail } = await import('@/lib/email')
      const token = crypto.randomBytes(32).toString('hex')
      
      await sendEmail({
        to: email,
        subject: 'Verify your JewGo account',
        html: createVerificationEmail(token, name)
      })
      
      } catch (emailError) {
      // console.error('[AUTH][REGISTER] Failed to send verification email:', emailError)
      // Don't fail registration if email fails, but log it
    }

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name },
      message: 'Account created successfully! Please check your email to verify your account.'
    }, { status: 201 })
  } catch (_err) {
    if (_err instanceof z.ZodError) {
      // console.error('[AUTH][REGISTER] Validation error:', _err.issues)
      return NextResponse.json({ success: false, message: 'Validation failed', errors: _err.issues }, { status: 400 })
    }
    
    // Detailed error logging
    // console.error('[AUTH][REGISTER] Error details:', {
    //   message: (_err as Error)?.message,
    //   stack: (_err as Error)?.stack,
    //   name: (_err as Error)?.name,
    //   timestamp: new Date().toISOString(),
    //   environment: process.env.NODE_ENV,
    //   databaseUrl: process.env['DATABASE_URL'] ? 'SET' : 'NOT_SET'
    // })
    
    const isDev = process.env.NODE_ENV !== 'production'
    return NextResponse.json(
      isDev
        ? { success: false, message: (_err as Error)?.message || 'Internal server error', stack: (_err as Error)?.stack }
        : { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}


