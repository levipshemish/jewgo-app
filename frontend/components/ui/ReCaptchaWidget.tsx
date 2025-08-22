'use client';

import React, { useEffect, useRef, useState } from 'react';

interface ReCaptchaWidgetProps {
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpired?: () => void;
  className?: string;
  siteKey?: string;
}

interface ReCaptchaWidgetRef {
  reset: () => void;
  getToken: () => string;
}

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      render: (container: string | HTMLElement, options: any) => number;
      reset: (widgetId: number) => void;
      getResponse: (widgetId: number) => string;
    };
  }
}

export const ReCaptchaWidget = React.forwardRef<ReCaptchaWidgetRef, ReCaptchaWidgetProps>(({ 
  onVerify, 
  onError, 
  onExpired, 
  className = '',
  siteKey 
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetId, setWidgetId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  const recaptchaSiteKey = siteKey || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    // Load reCAPTCHA script if not already loaded
    if (typeof window !== 'undefined' && !window.grecaptcha) {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setIsLoaded(true);
      };
      script.onerror = () => {
        onError?.('Failed to load reCAPTCHA');
      };
      document.head.appendChild(script);
    } else if (window.grecaptcha) {
      setIsLoaded(true);
    }

    return () => {
      // Cleanup script if component unmounts
      const existingScript = document.querySelector('script[src*="recaptcha/api.js"]');
      if (existingScript && !document.querySelector('[data-recaptcha-widget]')) {
        existingScript.remove();
      }
    };
  }, [onError]);

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !recaptchaSiteKey || isRendered) {
      return;
    }

    const renderWidget = () => {
      if (!window.grecaptcha || !containerRef.current) return;

      try {
        const id = window.grecaptcha.render(containerRef.current, {
          sitekey: recaptchaSiteKey,
          callback: (token: string) => {
            onVerify(token);
          },
          'expired-callback': () => {
            onExpired?.();
          },
          'error-callback': () => {
            onError?.('reCAPTCHA verification failed');
          },
          theme: 'light',
          size: 'normal',
          tabindex: 0
        });
        
        setWidgetId(id);
        setIsRendered(true);
      } catch (error) {
        console.error('Failed to render reCAPTCHA widget:', error);
        onError?.('Failed to render reCAPTCHA widget');
      }
    };

    window.grecaptcha.ready(renderWidget);
  }, [isLoaded, recaptchaSiteKey, onVerify, onError, onExpired, isRendered]);

  const resetWidget = () => {
    if (widgetId !== null && window.grecaptcha) {
      window.grecaptcha.reset(widgetId);
    }
  };

  const getToken = (): string => {
    if (widgetId !== null && window.grecaptcha) {
      return window.grecaptcha.getResponse(widgetId);
    }
    return '';
  };

  // Expose methods to parent component
  React.useImperativeHandle(ref, () => ({
    reset: resetWidget,
    getToken
  }));

  if (!recaptchaSiteKey) {
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        reCAPTCHA not configured
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className={`recaptcha-container ${className}`}
      data-recaptcha-widget="true"
    />
  );
});
