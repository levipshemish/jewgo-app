'use client';

import React, { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpired?: () => void;
  className?: string;
  siteKey?: string;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
}

interface TurnstileWidgetRef {
  reset: () => void;
  getToken: () => string;
}

declare global {
  interface Window {
    turnstile: {
      ready: (callback: () => void) => void;
      render: (container: string | HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string;
    };
  }
}

export const TurnstileWidget = React.forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(({ 
  onVerify, 
  onError, 
  onExpired, 
  className = '',
  siteKey,
  theme = 'light',
  size = 'normal'
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [currentToken, setCurrentToken] = useState<string>('');

  const turnstileSiteKey = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    // Load Turnstile script manually to avoid async/defer issues
    if (typeof window !== 'undefined' && !window.turnstile && !scriptRef.current) {
      const script = document.createElement('script');
      // Load Turnstile script without cache busting (Cloudflare handles caching)
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.onload = () => setIsLoaded(true);
      script.onerror = () => onError?.('Failed to load Turnstile');
      document.head.appendChild(script);
      scriptRef.current = script;
    } else if (typeof window !== 'undefined' && window.turnstile) {
      setIsLoaded(true);
    }
  }, [onError]);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !turnstileSiteKey || isRendered) {
      return;
    }

    const renderWidget = () => {
      if (!window.turnstile || !containerRef.current) return;

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => {
            setCurrentToken(token);
            onVerify(token);
          },
          'expired-callback': () => {
            setCurrentToken('');
            onExpired?.();
          },
          'error-callback': () => {
            setCurrentToken('');
            onError?.('Turnstile verification failed');
          },
          theme,
          size,
          tabindex: 0
        });
        
        setWidgetId(id);
        setIsRendered(true);
      } catch (error) {
        console.error('Failed to render Turnstile widget:', error);
        onError?.('Failed to render Turnstile widget');
      }
    };

    // Try to render immediately, then retry with increasing delays if needed
    let attempts = 0;
    const maxAttempts = 5;
    
    const tryRender = () => {
      attempts++;
      
      if (window.turnstile && typeof window.turnstile.render === 'function') {
        renderWidget();
      } else if (attempts < maxAttempts) {
        // Retry with exponential backoff
        setTimeout(tryRender, Math.pow(2, attempts) * 100);
      } else {
        console.error('Failed to render Turnstile widget after multiple attempts');
        onError?.('Failed to render Turnstile widget');
      }
    };

    tryRender();
  }, [isLoaded, turnstileSiteKey, isRendered, onVerify, onExpired, onError, theme, size]);

  // Expose methods via ref
  React.useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetId && window.turnstile) {
        window.turnstile.reset(widgetId);
        setCurrentToken('');
      }
    },
    getToken: () => currentToken
  }), [widgetId, currentToken]);

  if (!turnstileSiteKey) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        Turnstile site key not configured
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`flex justify-center ${className}`}
      data-testid="turnstile-widget"
    />
  );
});

TurnstileWidget.displayName = 'TurnstileWidget';
