'use client'

import Link from 'next/link'
import Header from '@/components/layout/Header'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/components/auth'
import { Suspense } from 'react'

function VerifyErrorContent() {
  const params = useSearchParams()
  const code = params.get('code') || 'UNKNOWN'

  const message = (() => {
    switch (code) {
      case 'MISSING_TOKEN':
        return 'Verification token was not provided.'
      case 'INVALID_OR_EXPIRED':
        return 'Your verification link is invalid or has expired.'
      default:
        return 'We could not verify your email address.'
    }
  })()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <AuthCard
        variant="error"
        title="Verification error"
        description={`${message} Code: ${code}`}
        actions={
          <Button asChild variant="link">
            <Link href="/login">Back to login</Link>
          </Button>
        }
      />
    </div>
  )
}

export default function VerifyErrorPage() {
  return (
    <main>
      <Header />
      <Suspense fallback={
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <AuthCard
            variant="error"
            title="Verification error"
            description="Loading..."
            actions={
              <Button asChild variant="link">
                <Link href="/login">Back to login</Link>
              </Button>
            }
          />
        </div>
      }>
        <VerifyErrorContent />
      </Suspense>
    </main>
  )
}
