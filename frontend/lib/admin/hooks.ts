'use client';

import { useEffect, useState } from 'react';

/**
 * useAdminCsrf
 * Ensures a signed CSRF token is available on the client for admin mutations.
 * - Reads from window.__CSRF_TOKEN__ if injected by the admin layout
 * - Falls back to fetching /api/admin/csrf to populate the token
 */
export function useAdminCsrf(): { token: string; error: string | null; loading: boolean } {
  const [token, setToken] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    let refreshTimer: any;

    // Grab any token already injected by the layout via meta tag
    const getTokenFromMeta = () => {
      if (typeof document !== 'undefined') {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag?.getAttribute('content') || '';
      }
      return '';
    };
    
    const existing = getTokenFromMeta();
    if (existing) {
      setToken(existing);
      setLoading(false);
      // Schedule periodic refresh at ~50 minutes to avoid TTL expiry (1h)
      refreshTimer = setInterval(async () => {
        try {
          const res = await fetch('/api/admin/csrf', { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const t = json?.token || '';
            // Update meta tag with new token
            if (typeof document !== 'undefined') {
              const metaTag = document.querySelector('meta[name="csrf-token"]');
              if (metaTag) {
                metaTag.setAttribute('content', t);
              }
            }
            if (mounted) { setToken(t); }
          }
        } catch (err) {
          if (mounted) {
            setError('Failed to refresh CSRF token');
            setLoading(false);
          }
        }
      }, 50 * 60 * 1000);
    } else {
      // Otherwise fetch a new token for this session
      const fetchToken = async () => {
        try {
          const res = await fetch('/api/admin/csrf', { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const t = json?.token || '';
            // Update meta tag with new token
            if (typeof document !== 'undefined') {
              const metaTag = document.querySelector('meta[name="csrf-token"]');
              if (metaTag) {
                metaTag.setAttribute('content', t);
              }
            }
            if (mounted) {
              setToken(t);
              setLoading(false);
            }
            // Schedule periodic refresh
            refreshTimer = setInterval(async () => {
              try {
                const res2 = await fetch('/api/admin/csrf', { cache: 'no-store' });
                if (res2.ok) {
                  const json2 = await res2.json();
                  const t2 = json2?.token || '';
                  // Update meta tag with new token
                  if (typeof document !== 'undefined') {
                    const metaTag = document.querySelector('meta[name="csrf-token"]');
                    if (metaTag) {
                      metaTag.setAttribute('content', t2);
                    }
                  }
                  if (mounted) { setToken(t2); }
                }
              } catch (err) {
                if (mounted) {
                  setError('Failed to refresh CSRF token');
                }
              }
            }, 50 * 60 * 1000);
          } else {
            if (mounted) {
              setError('Failed to fetch CSRF token');
              setLoading(false);
            }
          }
        } catch (err) {
          if (mounted) {
            setError('Failed to fetch CSRF token');
            setLoading(false);
          }
        }
      };
      fetchToken();
    }

    return () => {
      mounted = false;
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, []);

  return { token, error, loading };
}
