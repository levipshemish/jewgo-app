import { renderHook, act, waitFor } from '@testing-library/react';
import { useCaptcha } from '@/hooks/useCaptcha';

describe('useCaptcha', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useCaptcha());

    expect(result.current.state).toEqual({
      isRequired: false, // No CAPTCHA required
      isVerified: false,
      token: null,
      error: null,
      attempts: 0
    });
  });

  it('increments attempts and triggers rate limit callback', () => {
    const onRateLimitExceeded = jest.fn();
    const { result } = renderHook(() => 
      useCaptcha({ 
        maxAttempts: 2, 
        onRateLimitExceeded 
      })
    );

    // First attempt
    act(() => {
      result.current.incrementAttempts();
    });

    expect(result.current.state.attempts).toBe(1);
    expect(result.current.state.isRequired).toBe(true); // Always required now
    expect(onRateLimitExceeded).not.toHaveBeenCalled();

    // Second attempt - should trigger rate limit callback when reaching maxAttempts
    act(() => {
      result.current.incrementAttempts();
    });

    expect(result.current.state.attempts).toBe(2);
    expect(result.current.state.isRequired).toBe(true);
    expect(onRateLimitExceeded).toHaveBeenCalledTimes(1);
  });

  it('handles captcha verification', () => {
    const { result } = renderHook(() => useCaptcha());

    act(() => {
      result.current.handleCaptchaVerify('test-token');
    });

    expect(result.current.state.isVerified).toBe(true);
    expect(result.current.state.token).toBe('test-token');
    expect(result.current.state.error).toBe(null);
  });

  it('handles captcha error', () => {
    const { result } = renderHook(() => useCaptcha());

    act(() => {
      result.current.handleCaptchaError('Verification failed');
    });

    expect(result.current.state.isVerified).toBe(false);
    expect(result.current.state.token).toBe(null);
    expect(result.current.state.error).toBe('Verification failed');
  });

  it('handles captcha expiration', () => {
    const { result } = renderHook(() => useCaptcha());

    // First verify
    act(() => {
      result.current.handleCaptchaVerify('test-token');
    });

    expect(result.current.state.isVerified).toBe(true);
    expect(result.current.state.token).toBe('test-token');

    // Then expire
    act(() => {
      result.current.handleCaptchaExpired();
    });

    expect(result.current.state.isVerified).toBe(false);
    expect(result.current.state.token).toBe(null);
    expect(result.current.state.error).toBe(null);
  });

  it('resets captcha state', () => {
    const { result } = renderHook(() => useCaptcha());

    // Set some state
    act(() => {
      result.current.incrementAttempts();
    });

    expect(result.current.state.attempts).toBe(1);

    act(() => {
      result.current.handleCaptchaVerify('test-token');
    });

    expect(result.current.state.isVerified).toBe(true);
    expect(result.current.state.token).toBe('test-token');

    act(() => {
      result.current.handleCaptchaError('test-error');
    });

    expect(result.current.state.error).toBe('test-error');

    // Reset
    act(() => {
      result.current.resetCaptcha();
    });

    expect(result.current.state).toEqual({
      isRequired: true, // Always required now
      isVerified: false,
      token: null,
      error: null,
      attempts: 0
    });
  });

  it('clears error', () => {
    const { result } = renderHook(() => useCaptcha());

    // Set error
    act(() => {
      result.current.handleCaptchaError('test-error');
    });

    expect(result.current.state.error).toBe('test-error');

    // Clear error
    act(() => {
      result.current.clearError();
    });

    expect(result.current.state.error).toBe(null);
  });

  
});
