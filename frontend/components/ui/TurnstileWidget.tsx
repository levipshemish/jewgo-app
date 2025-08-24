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

  // Check if we're in development and using a production key
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isLocalhost = typeof window !== 'undefined' && 
                     (window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('localhost'));
  
  const isProductionKeyInDev = isDevelopment && 
                              isLocalhost && 
                              turnstileSiteKey && 
                              !isTestKey && 
                              turnstileSiteKey.startsWith('0x4AAAAAA');

  // Debug the key detection (only in development and only once)
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && !window.turnstileDebugLogged) {
    console.log('Turnstile Key Analysis:', {
      turnstileSiteKey,
      isTestKey,
      isDevelopment,
      isLocalhost,
      isProductionKeyInDev,
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
    });
    window.turnstileDebugLogged = true;
  }



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

  // Handle production key in development
  if (isProductionKeyInDev) {
    console.warn('Production Turnstile key detected in development environment. This will cause domain mismatch errors.');
    return (
      <div className={`text-orange-500 text-sm ${className}`}>
        ⚠️ Production Turnstile key detected on localhost. 
        <br />
        <span className="text-xs">
          Use test key or configure domain-specific key for development.
        </span>
      </div>
    );
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
            console.log('Turnstile ready callback triggered');
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
    if (!isLoaded || !containerRef.current || !turnstileSiteKey || isRendered || isProductionKeyInDev) {
      return;
    }

    const renderWidget = () => {
      // Only log once per render cycle
      if (process.env.NODE_ENV === 'development' && !window.turnstileRenderLogged) {
        console.log('Rendering Turnstile widget...', {
          turnstileExists: !!window.turnstile,
          containerExists: !!containerRef.current,
          siteKey: turnstileSiteKey,
          isTestKey,
          isDevelopment,
          hostname: typeof window !== 'undefined' ? window.location.hostname : 'unknown'
        });
        window.turnstileRenderLogged = true;
        // Reset after a short delay
        setTimeout(() => {
          window.turnstileRenderLogged = false;
        }, 1000);
      }
      
      if (!window.turnstile || !containerRef.current) {return;}

      try {
        const config = {
          sitekey: turnstileSiteKey,
          callback: (token: string) => {
            console.log('Turnstile callback received token:', token);
            setCurrentToken(token);
            onLoading?.(false); // Widget is done loading
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
            onLoading?.(false); // Stop loading on error
            
            // Handle specific error codes
            let errorMessage = 'Turnstile verification failed';
            if (error === '110200') {
              errorMessage = 'Domain mismatch - check Turnstile site key configuration';
            } else if (error === '110201') {
              errorMessage = 'Invalid site key';
            } else if (error === '110202') {
              errorMessage = 'Widget expired';
            }
            
            onError?.(errorMessage);
          },
          theme,
          size,
          // Invisible mode configuration - use 'execute' for invisible behavior
          'appearance': 'execute',
          // Auto-execute for invisible mode
          'auto': true,
          // Simple configuration without complex overrides
          'refresh-expired': 'auto',
          'retry': 'auto'
        };
        
        console.log('Turnstile render config:', config);
        
        const id = window.turnstile.render(containerRef.current, config);
        console.log('Turnstile widget rendered with ID:', id);
        
        setWidgetId(id);
        setIsRendered(true);
        
        // For execute mode, the widget should auto-execute
        if (config.appearance === 'execute') {
          console.log('Turnstile widget configured for auto-execution');
          // Notify parent that we're starting to execute
          onLoading?.(true);
        }
      } catch (error) {
        console.error('Failed to render Turnstile widget:', error);
        onError?.('Failed to render Turnstile widget');
      }
    };

    // Render widget when ready
    renderWidget();
  }, [isLoaded, turnstileSiteKey, isRendered, onVerify, onExpired, onError, theme, size, isTestKey, isProductionKeyInDev]);

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
        className="flex justify-center w-full"
        data-testid="turnstile-widget"
        style={{ 
          minHeight: '1px',
          height: '1px',
          position: 'absolute',
          overflow: 'hidden',
          opacity: 0,
          pointerEvents: 'none'
        }}
      />
      {/* Only show loading/status messages in development */}
      {process.env.NODE_ENV === 'development' && (
        <>
          {!isRendered && isLoaded && !isProductionKeyInDev && (
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
}));