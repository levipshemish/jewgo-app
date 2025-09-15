/**
 * Step-up Authentication Modal Component
 * 
 * Handles step-up authentication challenges for sensitive operations.
 * Supports both password and WebAuthn verification methods.
 */

import React, { useState, useEffect } from 'react';
import { useStepUpAuth, useWebAuthn, useAuthError } from '../../lib/hooks/useEnhancedAuth';
import { AuthError, StepUpChallenge } from '../../lib/auth/enhanced-auth-service';

interface StepUpAuthModalProps {
  isOpen: boolean;
  challenge: StepUpChallenge | null;
  onSuccess: () => void;
  onCancel: () => void;
  onError?: (error: AuthError) => void;
}

export function StepUpAuthModal({
  isOpen,
  challenge,
  onSuccess,
  onCancel,
  onError
}: StepUpAuthModalProps) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { verifyStepUp } = useStepUpAuth();
  const { authenticateWithWebAuthn, isSupported: isWebAuthnSupported } = useWebAuthn();
  const { handleError } = useAuthError();

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge || !password.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await verifyStepUp(challenge.challenge_id, 'password', { password });
      onSuccess();
    } catch (err) {
      const authError = err instanceof AuthError ? err : new AuthError('Step-up verification failed', 'STEP_UP_FAILED');
      setError(authError.message);
      onError?.(authError);
      handleError(authError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWebAuthnAuth = async () => {
    if (!challenge) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // For step-up, we use the WebAuthn challenge endpoint
      await verifyStepUp(challenge.challenge_id, 'webauthn', {});
      onSuccess();
    } catch (err) {
      const authError = err instanceof AuthError ? err : new AuthError('WebAuthn verification failed', 'WEBAUTHN_FAILED');
      setError(authError.message);
      onError?.(authError);
      handleError(authError);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setError(null);
    onCancel();
  };

  if (!isOpen || !challenge) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Additional Verification Required
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            This action requires additional verification for security. Please verify your identity to continue.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {challenge.required_method === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your current password"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !password.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {challenge.required_method === 'webauthn' && (
            <div className="space-y-4">
              {isWebAuthnSupported ? (
                <>
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      Use your security key, fingerprint, or face recognition to verify your identity.
                    </p>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleWebAuthnAuth}
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Verifying...' : 'Verify with Security Key'}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-red-600 mb-4">
                    WebAuthn is not supported in your browser. Please use a modern browser with security key support.
                  </p>
                  <button
                    onClick={handleCancel}
                    className="bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              This verification will expire at {new Date(challenge.expires_at).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StepUpAuthModal;