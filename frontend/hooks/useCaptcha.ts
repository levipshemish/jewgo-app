import { useState, useCallback, useRef } from 'react';

interface CaptchaState {
  isRequired: boolean;
  isVerified: boolean;
  token: string | null;
  error: string | null;
  attempts: number;
}

interface UseCaptchaOptions {
  maxAttempts?: number;
  onRateLimitExceeded?: () => void;
}

export function useCaptcha(options: UseCaptchaOptions = {}) {
  const { maxAttempts = 3, onRateLimitExceeded } = options;
  
  const [state, setState] = useState<CaptchaState>({
    isRequired: false,
    isVerified: false,
    token: null,
    error: null,
    attempts: 0
  });

  const turnstileRef = useRef<any>(null);

  const incrementAttempts = useCallback(() => {
    setState(prev => {
      const newAttempts = prev.attempts + 1;
      const isRequired = newAttempts >= maxAttempts;
      
      if (isRequired && !prev.isRequired) {
        onRateLimitExceeded?.();
      }
      
      return {
        ...prev,
        attempts: newAttempts,
        isRequired
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
      isRequired: false,
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
