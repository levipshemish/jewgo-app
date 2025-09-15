export const dynamic = 'force-static'

import Link from 'next/link'
import Header from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { AuthCard } from '@/components/auth'

export default function VerifySuccessPage() {
  return (
    <main>
      <Header />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <AuthCard
          title="Email verified"
          description="Your email has been successfully verified. You can now continue using JewGo with full access."
          actions={
            <Button asChild>
              <Link href="/login">Go to login</Link>
            </Button>
          }
        />
      </div>
    </main>
  )
}
