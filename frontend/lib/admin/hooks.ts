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
    let mounted = true;
    let refreshTimer: any;

    // Grab any token already injected by the layout
    const existing = (typeof window !== 'undefined' && (window as any).__CSRF_TOKEN__) || '';
    if (existing) {
      setToken(existing);
      // Schedule periodic refresh at ~50 minutes to avoid TTL expiry (1h)
      refreshTimer = setInterval(async () => {
        try {
          const res = await fetch('/api/admin/csrf', { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const t = json?.token || '';
            (window as any).__CSRF_TOKEN__ = t;
            if (mounted) { setToken(t); }
          }
        } catch {
          // Silent failure; UI should handle missing token state
        }
      }, 50 * 60 * 1000);
      return () => {
        mounted = false;
        if (refreshTimer) {
          clearInterval(refreshTimer);
        }
      };
    }

    // Otherwise fetch a new token for this session
    const fetchToken = async () => {
      try {
        const res = await fetch('/api/admin/csrf', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          const t = json?.token || '';
          (window as any).__CSRF_TOKEN__ = t;
          if (mounted) {
            setToken(t);
          }
          // Schedule periodic refresh
          refreshTimer = setInterval(async () => {
            try {
              const res2 = await fetch('/api/admin/csrf', { cache: 'no-store' });
              if (res2.ok) {
                const json2 = await res2.json();
                const t2 = json2?.token || '';
                (window as any).__CSRF_TOKEN__ = t2;
                if (mounted) { setToken(t2); }
              }
            } catch {
              // Silent failure; UI should handle missing token state
            }
          }, 50 * 60 * 1000);
        } else {
          // Silent failure; UI should handle missing token state
        }
      } catch (err) {
        // Silent failure; UI should handle missing token state
      }
    };
    fetchToken();
    return () => {
      mounted = false;
      if (refreshTimer) { clearInterval(refreshTimer); }
    };
  }, []);

  return token;
}
