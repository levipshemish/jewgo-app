'use client';

import { useEffect, useState } from 'react';

/**
 * useAdminCsrf
 * Ensures a signed CSRF token is available on the client for admin mutations.
 * - Reads from window.__CSRF_TOKEN__ if injected by the admin layout
 * - Falls back to fetching /api/admin/csrf to populate the token
 */
export function useAdminCsrf(): string {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    // Grab any token already injected by the layout
    const existing = (typeof window !== 'undefined' && (window as any).__CSRF_TOKEN__) || '';
    if (existing) {
      setToken(existing);
      return;
    }

    // Otherwise fetch a new token for this session
    const fetchToken = async () => {
      try {
        const res = await fetch('/api/admin/csrf', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const t = json?.token || '';
          (window as any).__CSRF_TOKEN__ = t;
          setToken(t);
        } else {
          console.warn('[ADMIN] Failed to fetch CSRF token:', res.status);
        }
      } catch (err) {
        console.error('[ADMIN] Error fetching CSRF token:', err);
      }
    };
    fetchToken();
  }, []);

  return token;
}

