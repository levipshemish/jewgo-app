import { redirect } from 'next/navigation'

export const dynamic = 'force-static'

export default function VerifyEmailPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const tokenParam = searchParams?.token
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam
  if (!token) {
    redirect('/auth/verify-error?code=MISSING_TOKEN')
  }
  redirect(`/api/v5/auth/verify-email?token=${encodeURIComponent(token!)}`)
}

