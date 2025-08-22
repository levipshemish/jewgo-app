// Cloudflare Turnstile utilities
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || '';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(
  token: string,
  expectedAction?: string,
  minScore: number = 0.5
): Promise<{ success: boolean; score?: number; action?: string; errors?: unknown }> {
  try {
    if (!TURNSTILE_SECRET_KEY) {
      console.error('Turnstile secret key not configured');
      return { success: false, errors: 'missing_secret_key' };
    }

    // Always verify with Cloudflare - no bypasses

    if (!token) {
      return { success: false, errors: 'missing_token' };
    }

    const params = new URLSearchParams();
    params.append('secret', TURNSTILE_SECRET_KEY);
    params.append('response', token);

    const resp = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!resp.ok) {
      return { success: false, errors: `http_${resp.status}` };
    }

    const data = await resp.json();

    if (!data.success) {
      return { success: false, errors: data['error-codes'] };
    }

    // Turnstile doesn't have action/score like reCAPTCHA v3, but we can check for specific fields
    if (expectedAction && data.action && data.action !== expectedAction) {
      return { success: false, errors: `action_mismatch:${data.action}` };
    }

    return { success: true, score: 1, action: data.action };
  } catch (e) {
    return { success: false, errors: (e as Error).message };
  }
}

export function useTurnstile() {
  return {
    async execute(action: string): Promise<string> {
      try {
        if (typeof window === 'undefined') {
          return '';
        }

        const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
        const turnstile = (window as any).turnstile;

        if (!siteKey || !turnstile || typeof turnstile.render !== 'function') {
          return '';
        }

        // For Turnstile, we need to render a widget and get the token
        // This is a simplified version - in practice, you'd render the widget
        return new Promise((resolve) => {
          turnstile.render('#turnstile-widget', {
            sitekey: siteKey,
            callback: (token: string) => resolve(token),
            'expired-callback': () => resolve(''),
            'error-callback': () => resolve('')
          });
        });
      } catch {
        return '';
      }
    },
  };
}
