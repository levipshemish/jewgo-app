import { useState, useCallback, useRef } from 'react';

interface TurnstileState {
  isRequired: boolean;
  isVerified: boolean;
  token: string | null;
  error: string | null;
  attempts: number;
}

interface UseTurnstileOptions {
  maxAttempts?: number;
  onRateLimitExceeded?: () => void;
}

export function useCaptcha(options: UseTurnstileOptions = {}) {
  const { maxAttempts = 3, onRateLimitExceeded } = options;
  
  const [state, setState] = useState<TurnstileState>({
    isRequired: true, // Always require Turnstile for guest sign-in
    isVerified: false,
    token: null,
    error: null,
    attempts: 0
  });

  const turnstileRef = useRef<any>(null);

  const incrementAttempts = useCallback(() => {
    setState(prev => {
      const newAttempts = prev.attempts + 1;
      
      // Since Turnstile is always required, only trigger callback at rate limit threshold
      if (newAttempts >= maxAttempts) {
        onRateLimitExceeded?.();
      }
      
      return {
        ...prev,
        attempts: newAttempts,
        isRequired: true // Always required
      };
    });
  }, [maxAttempts, onRateLimitExceeded]);

  const handleCaptchaVerify = useCallback((token: string) => {
    setState(prev => ({
      ...prev,
      isVerified: true,
      token,
      error: null
    }));
  }, []);

  const handleCaptchaError = useCallback((error: string) => {
    setState(prev => ({
      ...prev,
      isVerified: false,
      token: null,
      error
    }));
  }, []);

  const handleCaptchaExpired = useCallback(() => {
    setState(prev => ({
      ...prev,
      isVerified: false,
      token: null,
      error: null
    }));
  }, []);

  const resetCaptcha = useCallback(() => {
    setState({
      isRequired: true, // Always require Turnstile for guest sign-in
      isVerified: false,
      token: null,
      error: null,
      attempts: 0
    });
    
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  return {
    state,
    turnstileRef,
    incrementAttempts,
    handleCaptchaVerify,
    handleCaptchaError,
    handleCaptchaExpired,
    resetCaptcha,
    clearError
  };
}
