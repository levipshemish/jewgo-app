# Security Implementation Guide

## Phase 1: Critical Security Fixes - Detailed Implementation

### 1. Email Verification Implementation

#### A. Database Schema Update
```sql
-- Add email verification tracking
ALTER TABLE nextauth."User" 
ADD COLUMN email_verification_token VARCHAR(255),
ADD COLUMN email_verification_expires TIMESTAMP,
ADD COLUMN email_verification_attempts INT DEFAULT 0;
```

#### B. Email Verification Flow

**File: `/frontend/app/api/auth/verify-email/route.ts`**
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'

export async function POST(request: Request) {
  const { email } = await request.json()
  
  // Generate secure token
  const token = crypto.randomBytes(32).toString('hex')
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  
  // Store token in database
  await prisma.user.update({
    where: { email },
    data: {
      email_verification_token: token,
      email_verification_expires: expires,
    }
  })
  
  // Send verification email
  await sendEmail({
    to: email,
    subject: 'Verify your email',
    html: `Click <a href="${process.env.NEXT_PUBLIC_URL}/auth/verify?token=${token}">here</a> to verify your email.`
  })
  
  return NextResponse.json({ success: true })
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  
  const user = await prisma.user.findFirst({
    where: {
      email_verification_token: token,
      email_verification_expires: { gt: new Date() }
    }
  })
  
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }
  
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      email_verification_token: null,
      email_verification_expires: null,
    }
  })
  
  return NextResponse.json({ success: true })
}
```

#### C. Update Registration Flow
```typescript
// In /frontend/app/api/auth/register/route.ts
// After creating user, send verification email
await sendVerificationEmail(user.email)
```

### 2. Password Reset Implementation

#### A. Password Reset Request

**File: `/frontend/app/api/auth/reset-password/route.ts`**
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import crypto from 'crypto'
import { sendEmail } from '@/lib/email'
import { z } from 'zod'

const RequestResetSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const { email } = RequestResetSchema.parse(await request.json())
    
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Don't reveal if user exists
      return NextResponse.json({ message: 'If an account exists, you will receive a reset email.' })
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
      subject: 'Password Reset Request',
      html: `
        <p>You requested a password reset.</p>
        <p>Click <a href="${process.env.NEXT_PUBLIC_URL}/auth/reset-password?token=${resetToken}">here</a> to reset your password.</p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    })
    
    return NextResponse.json({ message: 'If an account exists, you will receive a reset email.' })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
```

#### B. Password Reset Completion

**File: `/frontend/app/api/auth/reset-password/confirm/route.ts`**
```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { z } from 'zod'

const ResetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
})

export async function POST(request: Request) {
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
      to: passwordReset.user.email,
      subject: 'Password Changed',
      html: `
        <p>Your password has been successfully changed.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
      `
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password reset confirmation error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
```

### 3. Rate Limiting Implementation

#### A. Install Dependencies
```bash
npm install express-rate-limit rate-limit-redis ioredis
```

#### B. Rate Limiter Middleware

**File: `/frontend/lib/rateLimit.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

interface RateLimitOptions {
  windowMs: number
  max: number
  message?: string
  keyGenerator?: (req: NextRequest) => string
}

export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests',
    keyGenerator = (req) => req.headers.get('x-forwarded-for') || 'anonymous'
  } = options

  return async function rateLimiter(req: NextRequest) {
    const key = `rate-limit:${keyGenerator(req)}`
    const now = Date.now()
    const window = now - windowMs
    
    // Remove old entries
    await redis.zremrangebyscore(key, '-inf', window)
    
    // Count requests in window
    const count = await redis.zcard(key)
    
    if (count >= max) {
      return NextResponse.json(
        { error: message },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(now + windowMs).toISOString()
          }
        }
      )
    }
    
    // Add current request
    await redis.zadd(key, now, `${now}-${Math.random()}`)
    await redis.expire(key, Math.ceil(windowMs / 1000))
    
    return null // Continue processing
  }
}

// Specific rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts'
})

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
})
```

#### C. Apply Rate Limiting

**Update: `/frontend/app/api/auth/register/route.ts`**
```typescript
import { authRateLimiter } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = await authRateLimiter(request)
  if (rateLimitResult) return rateLimitResult
  
  // ... rest of registration logic
}
```

### 4. JWT Security Enhancement

#### A. Update NextAuth Configuration

**File: `/frontend/app/api/auth/[...nextauth]/route.ts`**
```typescript
import jwt from 'jsonwebtoken'

export const authOptions = {
  // ... existing config
  
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutes
  },
  
  jwt: {
    maxAge: 30 * 60, // 30 minutes
    encode: async ({ secret, token }) => {
      return jwt.sign(token, secret, {
        algorithm: 'HS256',
        expiresIn: '30m',
      })
    },
    decode: async ({ secret, token }) => {
      return jwt.verify(token, secret, {
        algorithms: ['HS256'],
      })
    },
  },
  
  callbacks: {
    async jwt({ token, user, account }) {
      // Add token issued at time
      if (user) {
        token.iat = Math.floor(Date.now() / 1000)
        token.exp = Math.floor(Date.now() / 1000) + (30 * 60)
      }
      
      // Refresh token if needed
      const shouldRefresh = token.exp - Math.floor(Date.now() / 1000) < 5 * 60
      if (shouldRefresh) {
        token.iat = Math.floor(Date.now() / 1000)
        token.exp = Math.floor(Date.now() / 1000) + (30 * 60)
      }
      
      return token
    },
  },
}
```

### 5. Security Headers Implementation

#### A. Middleware Configuration

**File: `/frontend/middleware.ts`**
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.sentry.io",
    "frame-ancestors 'none'",
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)
  
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

### 6. Account Lockout Implementation

#### A. Database Schema Update
```sql
ALTER TABLE nextauth."User" 
ADD COLUMN failed_login_attempts INT DEFAULT 0,
ADD COLUMN account_locked_until TIMESTAMP,
ADD COLUMN last_failed_attempt TIMESTAMP;
```

#### B. Login Attempt Tracking

**File: `/frontend/lib/auth/accountLockout.ts`**
```typescript
import { prisma } from '@/lib/db/prisma'

const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 30 * 60 * 1000 // 30 minutes

export async function checkAccountLockout(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      account_locked_until: true,
      failed_login_attempts: true,
    }
  })
  
  if (!user) return false
  
  // Check if account is locked
  if (user.account_locked_until && user.account_locked_until > new Date()) {
    return true
  }
  
  // Reset if lockout expired
  if (user.account_locked_until && user.account_locked_until <= new Date()) {
    await prisma.user.update({
      where: { email },
      data: {
        failed_login_attempts: 0,
        account_locked_until: null,
      }
    })
  }
  
  return false
}

export async function recordFailedAttempt(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      failed_login_attempts: true,
    }
  })
  
  if (!user) return
  
  const attempts = (user.failed_login_attempts || 0) + 1
  const updateData: any = {
    failed_login_attempts: attempts,
    last_failed_attempt: new Date(),
  }
  
  // Lock account if max attempts reached
  if (attempts >= MAX_ATTEMPTS) {
    updateData.account_locked_until = new Date(Date.now() + LOCKOUT_DURATION)
  }
  
  await prisma.user.update({
    where: { email },
    data: updateData,
  })
}

export async function resetFailedAttempts(email: string): Promise<void> {
  await prisma.user.update({
    where: { email },
    data: {
      failed_login_attempts: 0,
      last_failed_attempt: null,
    }
  })
}
```

## Testing Checklist

### Security Testing
- [ ] Test email verification flow
- [ ] Test password reset with expired tokens
- [ ] Test rate limiting with multiple requests
- [ ] Test account lockout after failed attempts
- [ ] Verify JWT expiration
- [ ] Check security headers in browser
- [ ] Test CSRF protection
- [ ] Verify input validation

### Integration Testing
- [ ] Full authentication flow
- [ ] Admin access control
- [ ] API endpoint protection
- [ ] Session management
- [ ] Error handling

### Performance Testing
- [ ] Load test rate limiting
- [ ] Test Redis connection pooling
- [ ] JWT generation performance
- [ ] Database query optimization

## Deployment Checklist

1. **Environment Variables**
   ```env
   # Email Service
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_USER=noreply@yourdomain.com
   EMAIL_PASSWORD=<YOUR_EMAIL_PASSWORD>
   
   # Security
   NEXTAUTH_SECRET=<YOUR_NEXTAUTH_SECRET>
   JWT_SECRET=<YOUR_JWT_SECRET>
   
   # Redis
   REDIS_URL=redis://<USER>:<PASSWORD>@<HOST>:6379
   
   # Rate Limiting
   AUTH_RATE_LIMIT_WINDOW=900000
   AUTH_RATE_LIMIT_MAX=5
   ```

2. **Database Migrations**
   - Run schema updates
   - Add indexes for performance
   - Backup before migration

3. **Monitoring Setup**
   - Configure Sentry alerts
   - Set up security event logging
   - Enable performance monitoring

4. **Security Audit**
   - Run dependency audit
   - Check for vulnerabilities
   - Test all security features
