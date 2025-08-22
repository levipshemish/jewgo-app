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
      console.log('Rendering Turnstile widget...', {
        turnstileExists: !!window.turnstile,
        containerExists: !!containerRef.current,
        siteKey: turnstileSiteKey,
        containerElement: containerRef.current
      });
      
      if (!window.turnstile || !containerRef.current) return;

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
          'error-callback': () => {
            console.log('Turnstile error callback');
            setCurrentToken('');
            onError?.('Turnstile verification failed');
          },
          theme,
          size,
          tabindex: 0
        };
        
        console.log('Turnstile render config:', config);
        const id = window.turnstile.render(containerRef.current, config);
        console.log('Turnstile widget rendered with ID:', id);
        
        // Debug: Check if the widget is actually in the DOM
        setTimeout(() => {
          const widgetElement = document.querySelector(`[data-widget-id="${id}"]`);
          const iframeElement = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
          console.log('Widget debugging:', {
            widgetElement: widgetElement,
            iframeElement: iframeElement,
            containerChildren: containerRef.current?.children,
            containerHTML: containerRef.current?.innerHTML
          });
          
          // Test: Try to render a simple widget to verify site key
          if (!iframeElement && window.turnstile) {
            console.log('Testing simple widget render...');
            try {
              const testId = window.turnstile.render('#turnstile-test', {
                sitekey: turnstileSiteKey,
                theme: 'dark'
              });
              console.log('Test widget rendered with ID:', testId);
            } catch (error) {
              console.error('Test widget render failed:', error);
            }
          }
        }, 1000);
        
        setWidgetId(id);
        setIsRendered(true);
      } catch (error) {
        console.error('Failed to render Turnstile widget:', error);
        onError?.('Failed to render Turnstile widget');
      }
    };

    // Use turnstile.ready() for more reliable rendering
    if (window.turnstile && typeof window.turnstile.ready === 'function') {
      window.turnstile.ready(() => {
        console.log('Turnstile ready, rendering widget...');
        renderWidget();
      });
    } else {
      // Fallback to direct rendering
      console.log('Turnstile ready not available, trying direct render...');
      renderWidget();
    }
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
    <div className={`${className}`}>
      <div 
        ref={containerRef} 
        className="flex justify-center min-h-[78px] w-full border border-red-500 bg-yellow-100"
        data-testid="turnstile-widget"
        style={{ 
          minHeight: '78px',
          position: 'relative',
          zIndex: 1000,
          overflow: 'visible'
        }}
      />
      {/* Test container for debugging */}
      <div 
        id="turnstile-test"
        className="mt-2 p-2 border border-blue-500 bg-blue-100 min-h-[50px]"
        style={{ display: 'none' }}
      />
      {!isRendered && isLoaded && (
        <div className="text-center text-sm text-gray-400 mt-2">
          Loading security check...
        </div>
      )}
      {isRendered && (
        <div className="text-center text-sm text-green-400 mt-2">
          Widget rendered with ID: {widgetId}
        </div>
      )}
    </div>
  );
});

TurnstileWidget.displayName = 'TurnstileWidget';
