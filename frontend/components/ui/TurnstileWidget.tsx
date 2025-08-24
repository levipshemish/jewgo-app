'use client';

import React, { useEffect, useRef, useState } from 'react';

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
      execute?: (widgetId: string) => void;
    };
    turnstileDebugLogged?: boolean;
    turnstileRenderLogged?: boolean;
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
  action = 'verify'
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [currentToken, setCurrentToken] = useState('');
  const [widgetId, setWidgetId] = useState<string | null>(null);
  // const [error, setError] = useState<string | null>(null);

  // Calculate key analysis at component level
  const isDevelopment = process.env.NODE_ENV === "development";
  // const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  
  // Always use real Turnstile site key
  const turnstileSiteKey = siteKey || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
  
  const isTestKey = turnstileSiteKey === "1x00000000000000000000AA";
  // const isProductionKeyInDev = !isTestKey && isDevelopment;

  // Always call useEffect hooks in the same order
  useEffect(() => {
    const loadTurnstileScript = async () => {
      if (typeof window === 'undefined') {
        return;
      }

      // Check if Turnstile is already loaded
      if (window.turnstile) {
        setIsLoaded(true);
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="turnstile/v0/api.js"]')) {
        // Wait for existing script to load
        const checkLoaded = () => {
          if (window.turnstile) {
            setIsLoaded(true);
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      try {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Turnstile script'));
          document.head.appendChild(script);
        });
        setIsLoaded(true);
      } catch (_error) {
        // setError('Failed to load Turnstile script');
        onError?.('Failed to load Turnstile script');
      }
    };

    loadTurnstileScript();
  }, [onError]);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || isRendered) {
      return;
    }

    // Log Turnstile configuration in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Turnstile widget rendering with:');
      console.log('  Site Key:', turnstileSiteKey);
      console.log('  Hostname:', window.location.hostname);
      console.log('  Origin:', window.location.origin);
    }

    try {
      if (!window.turnstile) {
        throw new Error('Turnstile not loaded');
      }

      const config = {
        sitekey: turnstileSiteKey,
        action,
        callback: (token: string) => {
          // console.log('Turnstile completed with token:', `${token.substring(0, 20)}...`);
          setCurrentToken(token);
          onLoading?.(false);
          onVerify(token);
        },
        'expired-callback': () => {
          setCurrentToken('');
          onExpired?.();
        },
        'error-callback': (_error: string) => {
          // console.error('Turnstile error:', error);
          setCurrentToken('');
          onLoading?.(false);
          
          let errorMessage = 'Turnstile verification failed';
          if (_error === 'timeout') {
            errorMessage = 'Verification timed out. Please try again.';
          } else if (_error === 'network-error') {
            errorMessage = 'Network error. Please check your connection.';
          }
          
          // setError(errorMessage);
          onError?.(errorMessage);
        },
        theme,
        size,
        tabindex: 0,
        'refresh-expired': 'auto'
        // Remove 'auto-reset' and 'execution' as they may interfere with visible challenges
      };

      const id = window.turnstile.render(containerRef.current, config);
      setWidgetId(id);
      setIsRendered(true);
    } catch (_error) {
      // setError('Failed to render Turnstile widget');
      onError?.('Failed to render Turnstile widget');
    }
  }, [isLoaded, isRendered, siteKey, action, theme, size, onVerify, onError, onExpired, onLoading]);

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
      <div 
        ref={containerRef} 
        className="flex justify-center w-full"
        data-testid="turnstile-widget"
      />
      {/* Show helpful messages for development */}
      {process.env.NODE_ENV === 'development' && (
        <>
          {!isRendered && isLoaded && (
            <div className="text-center text-sm text-gray-400 mt-2">
              Loading security check...
            </div>
          )}
          {isRendered && !currentToken && (
            <div className="text-center text-sm text-blue-400 mt-2">
              ⚡ Complete the captcha above to continue
            </div>
          )}
          {isRendered && currentToken && (
            <div className="text-center text-sm text-green-400 mt-2">
              ✅ Captcha completed! You can now sign in.
            </div>
          )}
        </>
      )}
    </div>
  );
}));