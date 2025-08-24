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

  // Check if using test keys
  const isTestKey = turnstileSiteKey === '1x00000000000000000000AA' || 
                   turnstileSiteKey === '0x4AAAAAAADUAAAAAAAAAAAAAAAAAAAB';

  // Handle missing site key gracefully
  if (!turnstileSiteKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Turnstile site key not configured. Guest sign-in will be disabled.');
      return (
        <div className={`text-yellow-500 text-sm ${className}`}>
          ⚠️ Turnstile not configured - Guest sign-in disabled
        </div>
      );
    } else {
      return (
        <div className={`text-red-500 text-sm ${className}`}>
          Turnstile site key not configured
        </div>
      );
    }
  }

  useEffect(() => {
    // Load Turnstile script
    if (typeof window !== 'undefined' && !window.turnstile && !scriptRef.current) {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      // Don't use async/defer when using turnstile.ready()
      script.async = false;
      script.defer = false;
      script.onload = () => {
        console.log('Turnstile script loaded successfully');
        // Use turnstile.ready() for proper initialization
        if (window.turnstile?.ready) {
          window.turnstile.ready(() => {
            setIsLoaded(true);
          });
        } else {
          // Fallback if ready() is not available
          setIsLoaded(true);
        }
      };
      script.onerror = () => {
        console.error('Failed to load Turnstile script');
        onError?.('Failed to load Turnstile');
      };
      document.head.appendChild(script);
      scriptRef.current = script;
    } else if (typeof window !== 'undefined' && window.turnstile) {
      console.log('Turnstile already loaded');
      if (window.turnstile?.ready) {
        window.turnstile.ready(() => {
          setIsLoaded(true);
        });
      } else {
        setIsLoaded(true);
      }
    }
  }, [onError]);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !turnstileSiteKey || isRendered) {
      return;
    }

    const renderWidget = () => {
      console.log('Rendering Turnstile widget...', {
        turnstileExists: !!window.turnstile,
        containerExists: !!containerRef.current,
        siteKey: turnstileSiteKey,
        isTestKey
      });
      
      if (!window.turnstile || !containerRef.current) {return;}

      try {
        const config = {
          sitekey: turnstileSiteKey,
          callback: (token: string) => {
            console.log('Turnstile callback received token:', token);
            setCurrentToken(token);
            onVerify(token);
          },
          'expired-callback': () => {
            console.log('Turnstile token expired');
            setCurrentToken('');
            onExpired?.();
          },
          'error-callback': (error: string) => {
            console.log('Turnstile error callback:', error);
            setCurrentToken('');
            onError?.('Turnstile verification failed');
          },
          theme,
          size,
          // Simple configuration without complex overrides
          'refresh-expired': 'auto',
          'retry': 'auto'
        };
        
        console.log('Turnstile render config:', config);
        
        const id = window.turnstile.render(containerRef.current, config);
        console.log('Turnstile widget rendered with ID:', id);
        
        setWidgetId(id);
        setIsRendered(true);
      } catch (error) {
        console.error('Failed to render Turnstile widget:', error);
        onError?.('Failed to render Turnstile widget');
      }
    };

    // Render widget when ready
    renderWidget();
  }, [isLoaded, turnstileSiteKey, isRendered, onVerify, onExpired, onError, theme, size, isTestKey]);

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

  return (
    <div className={`${className}`}>
      <div 
        ref={containerRef} 
        className="flex justify-center min-h-[78px] w-full"
        data-testid="turnstile-widget"
        style={{ 
          minHeight: '78px',
          position: 'relative',
          overflow: 'visible'
        }}
      />
      {/* Only show loading/status messages in development */}
      {process.env.NODE_ENV === 'development' && (
        <>
          {!isRendered && isLoaded && (
            <div className="text-center text-sm text-gray-400 mt-2">
              Loading security check...
            </div>
          )}
          {isRendered && (
            <div className="text-center text-sm text-green-400 mt-2">
              ✅ Turnstile widget ready (ID: {widgetId})
            </div>
          )}
        </>
      )}
    </div>
  );
});

TurnstileWidget.displayName = 'TurnstileWidget';