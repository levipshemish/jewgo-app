/**
 * CAPTCHA Challenge Component
 * Provides Turnstile and reCAPTCHA integration for abuse control
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, RefreshCw } from 'lucide-react';

interface CaptchaChallengeProps {
  siteKey: string;
  provider: 'turnstile' | 'recaptcha';
  onVerify: (token: string) => void;
  onError?: (error: string) => void;
  onExpired?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  className?: string;
}

interface _CaptchaWidget {
  reset: () => void;
  getResponse: () => string;
  execute: () => void;
}

export default function CaptchaChallenge({
  siteKey,
  provider,
  onVerify,
  onError,
  onExpired,
  theme = 'light',
  size = 'normal',
  className = ''
}: CaptchaChallengeProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [widgetId, setWidgetId] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  // Load CAPTCHA script
  useEffect(() => {
    const loadCaptchaScript = () => {
      if (isLoaded) return;

      const scriptId = provider === 'turnstile' ? 'turnstile-script' : 'recaptcha-script';
      
      // Remove existing script if present
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      
      if (provider === 'turnstile') {
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.onload = () => {
          setIsLoaded(true);
          renderTurnstile();
        };
      } else {
        script.src = `https://www.google.com/recaptcha/api.js?render=explicit&onload=recaptchaCallback`;
        (window as any).recaptchaCallback = () => {
          setIsLoaded(true);
          renderRecaptcha();
        };
      }

      script.onerror = () => {
        setError(`Failed to load ${provider} script`);
        onError?.(`Failed to load ${provider} script`);
      };

      document.head.appendChild(script);
      scriptRef.current = script;
    };

    loadCaptchaScript();

    return () => {
      if (scriptRef.current) {
        scriptRef.current.remove();
      }
    };
  }, [provider, isLoaded, siteKey]);

  const renderTurnstile = () => {
    if (!widgetRef.current || !(window as any).turnstile) return;

    try {
      const id = (window as any).turnstile.render(widgetRef.current, {
        sitekey: siteKey,
        theme,
        size,
        callback: (token: string) => {
          setIsVerifying(true);
          onVerify(token);
        },
        'error-callback': (turnstileError: string) => {
          setError(`Turnstile error: ${turnstileError}`);
          onError?.(turnstileError);
        },
        'expired-callback': () => {
          setError('CAPTCHA expired. Please try again.');
          onExpired?.();
        },
        'timeout-callback': () => {
          setError('CAPTCHA timeout. Please try again.');
          onError?.('CAPTCHA timeout');
        }
      });
      setWidgetId(id);
    } catch (_err) {
      setError('Failed to render Turnstile widget');
      onError?.('Failed to render Turnstile widget');
    }
  };

  const renderRecaptcha = () => {
    if (!widgetRef.current || !(window as any).grecaptcha) return;

    try {
      const id = (window as any).grecaptcha.render(widgetRef.current, {
        sitekey: siteKey,
        theme,
        size,
        callback: (token: string) => {
          setIsVerifying(true);
          onVerify(token);
        },
        'error-callback': () => {
          setError('reCAPTCHA error occurred');
          onError?.('reCAPTCHA error');
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.');
          onExpired?.();
        }
      });
      setWidgetId(id);
    } catch (_err) {
      setError('Failed to render reCAPTCHA widget');
      onError?.('Failed to render reCAPTCHA widget');
    }
  };

  const resetCaptcha = () => {
    setError(null);
    setIsVerifying(false);
    
    if (provider === 'turnstile' && (window as any).turnstile && widgetId) {
      (window as any).turnstile.reset(widgetId);
    } else if (provider === 'recaptcha' && (window as any).grecaptcha && widgetId) {
      (window as any).grecaptcha.reset(widgetId);
    }
  };

  const refreshCaptcha = () => {
    resetCaptcha();
    
    // Re-render the widget
    setTimeout(() => {
      if (provider === 'turnstile') {
        renderTurnstile();
      } else {
        renderRecaptcha();
      }
    }, 100);
  };

  return (
    <Card className={`w-full max-w-md ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          Security Verification
        </CardTitle>
        <CardDescription>
          Please complete the security challenge to continue
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-center">
          <div 
            ref={widgetRef}
            className="captcha-widget"
            style={{ minHeight: size === 'compact' ? '65px' : '78px' }}
          />
        </div>

        {!isLoaded && (
          <div className="flex items-center justify-center py-4">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-gray-600">Loading security challenge...</span>
          </div>
        )}

        {isVerifying && (
          <div className="flex items-center justify-center py-2">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span className="text-sm text-blue-600">Verifying...</span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshCaptcha}
            disabled={!isLoaded || isVerifying}
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="text-xs text-gray-500 text-center">
          <p>
            This site is protected by {provider === 'turnstile' ? 'Cloudflare Turnstile' : 'reCAPTCHA'} and the Google{' '}
            <a 
              href="https://policies.google.com/privacy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              Privacy Policy
            </a>{' '}
            and{' '}
            <a 
              href="https://policies.google.com/terms" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              Terms of Service
            </a>{' '}
            apply.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Hook for CAPTCHA integration
export function useCaptcha() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = (token: string) => {
    setCaptchaToken(token);
    setIsVerified(true);
    setError(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setIsVerified(false);
    setCaptchaToken(null);
  };

  const handleExpired = () => {
    setIsVerified(false);
    setCaptchaToken(null);
    setError('CAPTCHA expired. Please complete the challenge again.');
  };

  const reset = () => {
    setCaptchaToken(null);
    setIsVerified(false);
    setError(null);
  };

  return {
    captchaToken,
    isVerified,
    error,
    handleVerify,
    handleError,
    handleExpired,
    reset
  };
}
