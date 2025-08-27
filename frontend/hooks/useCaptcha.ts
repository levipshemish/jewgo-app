import { useState, useCallback, useRef } from 'react';

interface CheckboxCaptchaState {
  isRequired: boolean;
  isVerified: boolean;
  isLoading: boolean;
  token: string | null;
  error: string | null;
  attempts: number;
}

interface UseCheckboxCaptchaOptions {
  maxAttempts?: number;
  onRateLimitExceeded?: () => void;
}

export function useCaptcha(options: UseCheckboxCaptchaOptions = {}) {
  const { maxAttempts = 3, onRateLimitExceeded } = options;
  
  const [state, setState] = useState<CheckboxCaptchaState>({
    isRequired: true, // Always require checkbox verification for guest sign-in
    isVerified: false,
    isLoading: false, // Start in not loading state
    token: null,
    error: null,
    attempts: 0
  });

  const checkboxRef = useRef<HTMLInputElement>(null);

  const incrementAttempts = useCallback(() => {
    setState(prev => {
      const newAttempts = prev.attempts + 1;
      
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
    if (process.env.NODE_ENV === 'development') {

    }
    setState(prev => ({
      ...prev,
      isVerified: true,
      isLoading: false,
      token,
      error: null
    }));
  }, []);

  const handleCaptchaError = useCallback((error: string) => {
    if (process.env.NODE_ENV === 'development') {

    }
    setState(prev => ({
      ...prev,
      isVerified: false,
      isLoading: false,
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
      isRequired: true,
      isVerified: false,
      isLoading: false,
      token: null,
      error: null,
      attempts: 0
    });
    
    if (checkboxRef.current) {
      checkboxRef.current.checked = false;
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({
      ...prev,
      isLoading: loading
    }));
  }, []);

  // Generate a simple token when checkbox is checked
  const generateCheckboxToken = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const token = `checkbox_${timestamp}_${random}`;
    handleCaptchaVerify(token);
  }, [handleCaptchaVerify]);

  return {
    state,
    checkboxRef,
    incrementAttempts,
    handleCaptchaVerify,
    handleCaptchaError,
    handleCaptchaExpired,
    resetCaptcha,
    clearError,
    setLoading,
    generateCheckboxToken
  };
}
