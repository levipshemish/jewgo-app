/**
 * WebAuthn Manager Component
 * 
 * Allows users to manage their WebAuthn credentials (security keys, biometrics).
 * Provides registration, listing, and revocation functionality.
 */

import React, { useState, useEffect } from 'react';
import { useWebAuthn, useAuthError } from '../../lib/hooks/useEnhancedAuth';
import { AuthError } from '../../lib/auth/enhanced-auth-service';

interface WebAuthnManagerProps {
  className?: string;
}

export function WebAuthnManager({ className = '' }: WebAuthnManagerProps) {
  const [showRegistration, setShowRegistration] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    isSupported,
    credentials,
    isLoading,
    loadCredentials,
    registerCredential,
    revokeCredential
  } = useWebAuthn();

  const { handleError } = useAuthError();

  useEffect(() => {
    if (isSupported) {
      loadCredentials();
    }
  }, [isSupported, loadCredentials]);

  const handleRegisterCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim()) return;

    setIsRegistering(true);
    setError(null);
    setSuccess(null);

    try {
      await registerCredential(deviceName.trim());
      setSuccess('Security key registered successfully!');
      setDeviceName('');
      setShowRegistration(false);
    } catch (err) {
      const authError = err instanceof AuthError ? err : new AuthError('Registration failed', 'REGISTRATION_FAILED');
      setError(authError.message);
      handleError(authError);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRevokeCredential = async (credentialId: string, credentialDeviceName: string) => {
    if (!confirm(`Are you sure you want to remove "${credentialDeviceName}"? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await revokeCredential(credentialId);
      setSuccess('Security key removed successfully!');
    } catch (err) {
      const authError = err instanceof AuthError ? err : new AuthError('Revocation failed', 'REVOCATION_FAILED');
      setError(authError.message);
      handleError(authError);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (!isSupported) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              WebAuthn Not Supported
            </h3>
            <p className="mt-1 text-sm text-yellow-700">
              Your browser doesn&apos;t support WebAuthn security keys. Please use a modern browser like Chrome, Firefox, or Safari.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Security Keys</h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage your WebAuthn security keys and biometric authentication methods.
              </p>
            </div>
            <button
              onClick={() => setShowRegistration(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add Security Key
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex justify-between items-start">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  onClick={clearMessages}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex justify-between items-start">
                <p className="text-sm text-green-600">{success}</p>
                <button
                  onClick={clearMessages}
                  className="text-green-400 hover:text-green-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No security keys</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add a security key or enable biometric authentication for enhanced security.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {credentials.map((credential) => (
                <div
                  key={credential.credential_id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {credential.device_name || 'Unnamed Device'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {credential.device_type} • Added {new Date(credential.created_at).toLocaleDateString()}
                        {credential.last_used && (
                          <> • Last used {new Date(credential.last_used).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRevokeCredential(credential.credential_id, credential.device_name)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      {showRegistration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Add Security Key
                </h3>
                <button
                  onClick={() => setShowRegistration(false)}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isRegistering}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Give your security key a name to help you identify it later.
              </p>

              <form onSubmit={handleRegisterCredential} className="space-y-4">
                <div>
                  <label htmlFor="deviceName" className="block text-sm font-medium text-gray-700 mb-1">
                    Device Name
                  </label>
                  <input
                    type="text"
                    id="deviceName"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., iPhone Touch ID, YubiKey 5"
                    disabled={isRegistering}
                    required
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={isRegistering || !deviceName.trim()}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRegistering ? 'Registering...' : 'Register Security Key'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegistration(false)}
                    disabled={isRegistering}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </form>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  After clicking &quot;Register Security Key&quot;, you&apos;ll be prompted to use your security key or biometric authentication.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WebAuthnManager;