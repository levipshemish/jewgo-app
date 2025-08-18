# Quick Security Fixes - Immediate Implementation

These fixes can be implemented within hours to address the most critical vulnerabilities:

## 1. Add Basic Rate Limiting (30 minutes)

Create `/frontend/lib/simpleRateLimit.ts`:
```typescript
const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxAttempts: number = 5, windowMs: number = 900000): boolean {
  const now = Date.now()
  const record = attempts.get(key)
  
  if (!record || record.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  
  if (record.count >= maxAttempts) {
    return false
  }
  
  record.count++
  return true
}
```

Update `/frontend/app/api/auth/register/route.ts`:
```typescript
import { checkRateLimit } from '@/lib/simpleRateLimit'

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  
  if (!checkRateLimit(`register:${ip}`, 3, 900000)) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    )
  }
  
  // ... existing code
}
```

## 2. Add JWT Expiration (15 minutes)

Update `/frontend/app/api/auth/[...nextauth]/route.ts`:
```typescript
export const authOptions = {
  // ... existing config
  
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 60, // 30 minutes
  },
  
  jwt: {
    maxAge: 30 * 60, // 30 minutes
  },
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.isSuperAdmin = (user as any).isSuperAdmin
        // Add expiration
        token.exp = Math.floor(Date.now() / 1000) + (30 * 60)
      }
      return token
    },
  },
}
```

## 3. Add Email Verification Check (20 minutes)

Update `/frontend/app/api/auth/[...nextauth]/route.ts` authorize function:
```typescript
async authorize(credentials) {
  // ... existing validation
  
  const user = await prisma.user.findUnique({ where: { email: credentials.email } })
  
  if (!user || !user.password) {
    return null
  }
  
  // Check if email is verified
  if (!user.emailVerified) {
    throw new Error('Please verify your email before signing in')
  }
  
  // ... rest of existing code
}
```

## 4. Add Security Headers (10 minutes)

Update `/frontend/middleware.ts`:
```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Basic security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return response
}
```

## 5. Add Basic Input Sanitization (20 minutes)

Create `/frontend/lib/sanitize.ts`:
```typescript
import { z } from 'zod'

export function sanitizeInput(input: string): string {
  // Remove potential SQL injection patterns
  return input
    .replace(/['";\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .trim()
}

export const SafeStringSchema = z.string().transform(sanitizeInput)

// For HTML content
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}
```

## 6. Add Failed Login Tracking (30 minutes)

Create `/frontend/lib/auth/loginTracking.ts`:
```typescript
const failedAttempts = new Map<string, number>()

export function trackFailedLogin(email: string): boolean {
  const attempts = failedAttempts.get(email) || 0
  failedAttempts.set(email, attempts + 1)
  
  // Lock after 5 attempts
  if (attempts + 1 >= 5) {
    // In production, store this in database
    return false // Account locked
  }
  
  // Reset after 15 minutes
  setTimeout(() => failedAttempts.delete(email), 15 * 60 * 1000)
  
  return true // Not locked
}

export function clearFailedAttempts(email: string): void {
  failedAttempts.delete(email)
}
```

## 7. Add Basic Audit Logging (15 minutes)

Create `/frontend/lib/auditLog.ts`:
```typescript
interface AuditEvent {
  timestamp: Date
  action: string
  userId?: string
  email?: string
  ip?: string
  details?: any
}

export async function logAuditEvent(event: Omit<AuditEvent, 'timestamp'>) {
  const auditEvent: AuditEvent = {
    ...event,
    timestamp: new Date(),
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[AUDIT]', JSON.stringify(auditEvent, null, 2))
  }
  
  // In production, send to logging service
  // TODO: Implement proper audit logging to database or service
  
  // For now, at least track in Sentry
  if (typeof window === 'undefined') {
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureMessage(`Audit: ${event.action}`, {
        level: 'info',
        extra: auditEvent,
      })
    } catch (error) {
      console.error('Failed to log audit event:', error)
    }
  }
}
```

## 8. Secure Admin Token Generation Script (5 minutes)

Create `/workspace/scripts/generate-admin-token.js`:
```javascript
const crypto = require('crypto')

// Generate secure admin token
const token = crypto.randomBytes(32).toString('hex')
console.log('New Admin Token:', token)
console.log('\nAdd this to your environment variables:')
console.log(`ADMIN_TOKEN="${token}"`)
console.log('\nMake sure to keep this token secure!')
```

Run: `node scripts/generate-admin-token.js`

## 9. Add CSRF Protection (20 minutes)

Create `/frontend/lib/csrf.ts`:
```typescript
import crypto from 'crypto'

const tokens = new Map<string, { token: string; expires: number }>()

export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  tokens.set(sessionId, {
    token,
    expires: Date.now() + 3600000 // 1 hour
  })
  return token
}

export function validateCSRFToken(sessionId: string, token: string): boolean {
  const stored = tokens.get(sessionId)
  if (!stored || stored.expires < Date.now()) {
    tokens.delete(sessionId)
    return false
  }
  return stored.token === token
}
```

## 10. Environment Variables Security Check (10 minutes)

Create `/workspace/scripts/check-env-security.js`:
```javascript
const requiredVars = [
  'NEXTAUTH_SECRET',
  'DATABASE_URL',
  'ADMIN_TOKEN',
  'EMAIL_HOST',
  'EMAIL_PASSWORD'
]

const warnings = []

// Check for missing variables
requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    warnings.push(`Missing required: ${varName}`)
  }
})

// Check for weak values
if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
  warnings.push('NEXTAUTH_SECRET is too short (min 32 chars)')
}

if (process.env.ADMIN_TOKEN && process.env.ADMIN_TOKEN.length < 32) {
  warnings.push('ADMIN_TOKEN is too short (min 32 chars)')
}

if (warnings.length > 0) {
  console.error('Security warnings:')
  warnings.forEach(w => console.error(`  - ${w}`))
  process.exit(1)
} else {
  console.log('✓ Environment variables security check passed')
}
```

## Deployment Steps

1. **Immediate (Today)**:
   - Implement rate limiting (#1)
   - Add JWT expiration (#2)
   - Add security headers (#4)
   - Generate new admin tokens (#8)

2. **Tomorrow**:
   - Add email verification check (#3)
   - Implement input sanitization (#5)
   - Add failed login tracking (#6)

3. **This Week**:
   - Add audit logging (#7)
   - Implement CSRF protection (#9)
   - Run security check script (#10)

## Testing Commands

```bash
# Test rate limiting
for i in {1..10}; do curl -X POST http://localhost:3000/api/auth/register -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"Test123!","name":"Test"}'; done

# Check security headers
curl -I http://localhost:3000

# Run security check
node scripts/check-env-security.js
```

## Monitoring

After deployment, monitor:
- 429 responses (rate limiting working)
- Failed login attempts
- Audit logs in Sentry
- JWT expiration errors

These quick fixes address the most critical vulnerabilities and can be implemented immediately while planning the comprehensive security overhaul.
