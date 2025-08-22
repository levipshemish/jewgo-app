'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

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
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [currentToken, setCurrentToken] = useState<string>('');

  const turnstileSiteKey = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.turnstile) {
      setIsLoaded(true);
    }
  }, []);

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

    window.turnstile.ready(renderWidget);
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
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        onLoad={() => setIsLoaded(true)}
        onError={() => onError?.('Failed to load Turnstile')}
      />
      <div 
        ref={containerRef} 
        className={`flex justify-center ${className}`}
        data-testid="turnstile-widget"
      />
    </>
  );
});

TurnstileWidget.displayName = 'TurnstileWidget';
