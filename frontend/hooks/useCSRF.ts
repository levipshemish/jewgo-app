'use client';

import { useEffect, useState } from 'react';

export function useCSRF() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    // Get CSRF token from window object (set by AdminLayout)
    const token = (window as any).__CSRF_TOKEN__;
    if (token) {
      setCsrfToken(token);
    }
  }, []);

  return csrfToken;
}

export function getCSRFToken(): string | null {
  if (typeof window !== 'undefined') {
    return (window as any).__CSRF_TOKEN__ || null;
  }
  return null;
}
