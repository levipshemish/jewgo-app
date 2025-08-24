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
  variant?: 'inline' | 'button' | 'checkbox';
  label?: string;
  debug?: boolean;
  hideWidget?: boolean;
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
  label = "Verify",
  debug = false,
  hideWidget = false
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [currentToken, setCurrentToken] = useState('');
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const renderedRef = useRef(false);

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
    if (!isLoaded) {
      return;
    }
    // Bind global callbacks for the managed widget (auto-render will use these)
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
  }, [isLoaded, onVerify, onError, onExpired, onLoading]);

  // Debug: log placeholder styles and watch for iframe injection
  useEffect(() => {
    if (!debug || typeof window === 'undefined' || !placeholderRef.current) {
      return;
    }
    const el = placeholderRef.current;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    // eslint-disable-next-line no-console
    console.log('[Turnstile debug] placeholder:', { width: rect.width, height: rect.height, display: style.display, visibility: style.visibility, opacity: style.opacity, zIndex: style.zIndex });

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((n) => {
          if ((n as HTMLElement)?.tagName === 'IFRAME') {
            const ifr = n as HTMLIFrameElement;
            const ifrStyle = window.getComputedStyle(ifr);
            // eslint-disable-next-line no-console
            console.log('[Turnstile debug] iframe added:', { display: ifrStyle.display, visibility: ifrStyle.visibility, opacity: ifrStyle.opacity, width: ifr.offsetWidth, height: ifr.offsetHeight });
          }
        });
      }
    });
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [debug, isLoaded]);

  // Explicit render once after script load (guarded against double-invoke in React Strict Mode)
  useEffect(() => {
    if (!isLoaded || renderedRef.current || !placeholderRef.current) {
      return;
    }
    const tryRender = () => {
      if (debug) {
        // eslint-disable-next-line no-console
        console.log('[Turnstile debug] trying render, api loaded:', !!window.turnstile, 'placeholder exists:', !!placeholderRef.current);
      }
      if (!placeholderRef.current) return;
      if (window.turnstile?.render) {
        try {
          const id = window.turnstile.render(placeholderRef.current, {
            sitekey: turnstileSiteKey,
            action,
            theme,
            size,
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
          renderedRef.current = true;
          if (debug) {
            // eslint-disable-next-line no-console
            console.log('[Turnstile debug] render complete, widgetId:', id);
          }
        } catch (_err) {
          setError('Failed to render Turnstile widget');
          onError?.('Failed to render Turnstile widget');
        }
      } else {
        setTimeout(tryRender, 50);
      }
    };
    tryRender();
  }, [isLoaded, action, theme, size, onVerify, onError, onExpired, onLoading, turnstileSiteKey]);

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
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setIsLoaded(true)} />
      <div 
        ref={containerRef} 
        className="w-full flex justify-center"
        data-testid="turnstile-widget"
      >
        <div
          className="inline-block"
          style={hideWidget ? {
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0 0 0 0)',
            whiteSpace: 'nowrap',
            border: 0,
          } : {
            minHeight: 68,
            minWidth: 300,
            width: 320,
            position: 'relative',
            zIndex: debug ? 10 : undefined,
            border: debug ? '1px dashed #00e6ff' : undefined,
            background: debug ? 'rgba(0,230,255,0.06)' : undefined,
            borderRadius: debug ? 8 : undefined,
          }}
        >
          <div
            ref={placeholderRef}
            className="cf-turnstile"
            data-sitekey={turnstileSiteKey}
            data-theme={theme}
            data-size={size}
            data-appearance={appearance}
            data-action={action}
            data-callback="turnstile_onverify"
            data-expired-callback="turnstile_onexpired"
            data-error-callback="turnstile_onerror"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {(variant === 'button' || variant === 'checkbox') && (
        <div className="mt-3 flex justify-center">
          {variant === 'button' ? (
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
          ) : (
            <label className="inline-flex items-center select-none cursor-pointer">
              <input
                type="checkbox"
                className="h-5 w-5 rounded border-neutral-600 text-emerald-500 focus:ring-emerald-400"
                checked={!!currentToken}
                disabled={verifying}
                onChange={() => {
                  if (!currentToken && widgetId && window.turnstile?.execute) {
                    setVerifying(true);
                    window.turnstile.execute(widgetId);
                  }
                }}
              />
              <span className="ml-2 text-sm text-neutral-300">
                {currentToken ? 'Verified' : verifying ? 'Verifying…' : 'I am not a bot'}
              </span>
            </label>
          )}
        </div>
      )}
      {/* No custom UI below: show only the official Turnstile widget */}
    </div>
  );
}));