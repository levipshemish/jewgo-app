// Consolidated reCAPTCHA utilities (v3)
const RECAPTCHA_SITE_KEY_VAR = process.env['NEXT_PUBLIC_RECAPTCHA_SITE_KEY'] || ''
const RECAPTCHA_SECRET_KEY_VAR = process.env['GOOGLE_RECAPTCHA_SECRET'] || process.env['RECAPTCHA_SECRET_KEY'] || ''
const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

export async function verifyRecaptcha(
  token: string, expectedAction?: string, minScore: number = 0.5, ): Promise<{ success: boolean; score?: number; action?: string; errors?: unknown }> {
  try {
    if (!RECAPTCHA_SECRET_KEY_VAR) {
    return { success: true, score: 1 };
  }
    if (process.env.NODE_ENV === 'development' && token === 'test-token') {
      return { success: true, score: 1, action: expectedAction }
    }
    if (!token) {
    return { success: false, errors: 'missing_token' };
  }
    const params = new URLSearchParams()
    params.append('secret', RECAPTCHA_SECRET_KEY_VAR)
    params.append('response', token)
    const resp = await fetch(VERIFY_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() })
    if (!resp.ok) {
    return { success: false, errors: `http_${resp.status}` };
  }
    const data = await resp.json()
      if (!data.success) {
    return { success: false, errors: data['error-codes'] };
  }
  if (expectedAction && data.action !== expectedAction) {
    return { success: false, errors: `action_mismatch:${data.action}` };
  }
  if (typeof data.score === 'number' && data.score < minScore) {
    return { success: false, score: data.score, errors: `low_score:${data.score}` };
  }
    return { success: true, score: data.score, action: data.action }
  } catch (e) {
    return { success: false, errors: (e as Error).message }
  }
}

export function useRecaptcha() {
  return {
    async execute(action: string): Promise<string> {
      try {
        if (typeof window === 'undefined') {
    return '';
  }
        const siteKey = RECAPTCHA_SITE_KEY_VAR
        const grecaptcha = (window as any).grecaptcha
        if (!siteKey || !grecaptcha || typeof grecaptcha.execute !== 'function') {
    return '';
  }
        await grecaptcha.ready()
        const token = await grecaptcha.execute(siteKey, { action })
        return typeof token === 'string' ? token : ''
      } catch {
        return ''
      }
    },
  }
}

// Remove legacy duplicate definitions to prevent conflicts
