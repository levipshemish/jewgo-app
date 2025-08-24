'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpired?: () => void;
  onLoading?: (loading: boolean) => void;
  className?: string;
  siteKey?: string;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
  action?: string;
  appearance?: 'always' | 'execute' | 'interaction-only';
  variant?: 'inline' | 'button';
  label?: string;
}

interface TurnstileWidgetRef {
  reset: () => void;
  getToken: () => string;
}

declare global {
  interface Window {
    turnstile?: {
      ready: (callback: () => void) => void;
      render: (container: string | HTMLElement, options: any) => string;
      reset: (widgetId: string) => void;
      getResponse: (widgetId: string) => string;
      execute?: (widgetId: string) => void;
    };
    turnstile_onverify?: (token: string) => void;
    turnstile_onexpired?: () => void;
    turnstile_onerror?: (error: string) => void;
  }
}

export const TurnstileWidget = React.memo(React.forwardRef<TurnstileWidgetRef, TurnstileWidgetProps>(({ 
  onVerify, 
  onError, 
  onExpired, 
  onLoading,
  className = '',
  siteKey,
  theme = 'light',
  size = 'normal',
  action = 'verify',
  appearance = 'always',
  variant = 'inline',
  label = "Verify"
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [currentToken, setCurrentToken] = useState('');
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Calculate key analysis at component level
  const isDevelopment = process.env.NODE_ENV === "development";
  // const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  
  // Always use real Turnstile site key
  const turnstileSiteKey = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
  
  const isTestKey = turnstileSiteKey === "1x00000000000000000000AA";
  // const isProductionKeyInDev = !isTestKey && isDevelopment;

  // Detect already-loaded script (Next.js Script onLoad will also set)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.turnstile) {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || isRendered) {
      return;
    }

    const renderWidget = () => {
      try {
        // Bind global callbacks for the managed widget
        window.turnstile_onverify = (token: string) => {
          setCurrentToken(token);
          onLoading?.(false);
          onVerify(token);
        };
        window.turnstile_onexpired = () => {
          setCurrentToken('');
          onExpired?.();
        };
        window.turnstile_onerror = (_error: string) => {
          setCurrentToken('');
          onLoading?.(false);
          let errorMessage = 'Turnstile verification failed';
          if (_error === 'timeout') {
            errorMessage = 'Verification timed out. Please try again.';
          } else if (_error === 'network-error') {
            errorMessage = 'Network error. Please check your connection.';
          }
          onError?.(errorMessage);
        };

        // Insert the placeholder and explicitly render
        const el = document.createElement('div');
        el.className = 'cf-turnstile';
        containerRef.current!.innerHTML = '';
        containerRef.current!.appendChild(el);

        const id = window.turnstile!.render(el, {
          sitekey: turnstileSiteKey,
          action,
          theme,
          size,
          appearance,
          callback: (token: string) => {
            setCurrentToken(token);
            onLoading?.(false);
            onVerify(token);
            setVerifying(false);
          },
          'expired-callback': () => {
            setCurrentToken('');
            onExpired?.();
          },
          'error-callback': (_error: string) => {
            setCurrentToken('');
            onLoading?.(false);
            let errorMessage = 'Turnstile verification failed';
            if (_error === 'timeout') {
              errorMessage = 'Verification timed out. Please try again.';
            } else if (_error === 'network-error') {
              errorMessage = 'Network error. Please check your connection.';
            }
            onError?.(errorMessage);
            setVerifying(false);
          },
          tabindex: 0,
          'refresh-expired': 'auto'
        });
        setWidgetId(id);
        setIsRendered(true);
      } catch (_error) {
        setError('Failed to render Turnstile widget');
        onError?.('Failed to render Turnstile widget');
      }
    };

    if (window.turnstile?.ready) {
      window.turnstile.ready(renderWidget);
    } else {
      // Fallback retry shortly if API not ready yet
      const t = setTimeout(() => {
        if (window.turnstile) renderWidget();
      }, 200);
      return () => clearTimeout(t);
    }
  }, [isLoaded, isRendered, siteKey, action, theme, size, appearance, onVerify, onError, onExpired, onLoading]);

  // Always call useImperativeHandle
  React.useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetId && window.turnstile) {
        window.turnstile.reset(widgetId);
        setCurrentToken('');
        setError(null);
      }
    },
    getToken: () => currentToken,
    execute: () => {
      if (widgetId && window.turnstile?.execute) {
        window.turnstile.execute(widgetId);
      }
    }
  }), [widgetId, currentToken]);

  return (
    <div className={`${className}`}>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onLoad={() => setIsLoaded(true)} />
      <div 
        ref={containerRef} 
        className="flex justify-center w-full"
        data-testid="turnstile-widget"
      />

      {variant === 'button' && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => {
              if (widgetId && window.turnstile?.execute) {
                setVerifying(true);
                window.turnstile.execute(widgetId);
              }
            }}
            disabled={verifying || !!currentToken}
            className={`inline-flex items-center px-4 py-2 rounded-lg border transition-colors ${currentToken
              ? 'bg-emerald-500 border-emerald-600 text-white'
              : 'bg-neutral-800 border-neutral-600 text-neutral-200 hover:bg-neutral-700'}`}
            aria-live="polite"
          >
            {currentToken ? (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                Verified
              </>
            ) : verifying ? (
              <>
                <svg className="animate-spin w-4 h-4 mr-2" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path></svg>
                Verifying...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4s-3 1.567-3 3.5S10.343 11 12 11z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.5 21a6.5 6.5 0 0113 0"/></svg>
                {label}
              </>
            )}
          </button>
        </div>
      )}
      {/* No custom UI below: show only the official Turnstile widget */}
    </div>
  );
}));