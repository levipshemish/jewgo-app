/**
 * Step-up authentication challenge page
 * Requires fresh session or WebAuthn for elevated operations
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Clock, Key } from 'lucide-react';
import { postgresAuth } from '@/lib/auth/postgres-auth';

interface StepUpChallenge {
  required_method: 'fresh_session' | 'webauthn' | 'password';
  auth_time?: number;
  max_age: number;
  challenge_id?: string;
}

function StepUpAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  
  const [challenge, setChallenge] = useState<StepUpChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchStepUpChallenge = useCallback(async () => {
    try {
      const response = await postgresAuth.request('/step-up/challenge', {
        method: 'POST',
        body: JSON.stringify({ return_to: returnTo }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch step-up challenge');
      }

      const data = await response.json();
      setChallenge(data.challenge);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load challenge');
    } finally {
      setLoading(false);
    }
  }, [returnTo]);

  useEffect(() => {
    fetchStepUpChallenge();
  }, [fetchStepUpChallenge]);

  const handleFreshSession = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Redirect to login with step-up context
      const loginUrl = `/auth/signin?stepUp=true&returnTo=${encodeURIComponent(returnTo)}`;
      router.push(loginUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate fresh session');
      setProcessing(false);
    }
  };

  const handleWebAuthn = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      // Get WebAuthn challenge from backend
      const challengeResponse = await postgresAuth.request('/step-up/webauthn/challenge', {
        method: 'POST',
        body: JSON.stringify({ challenge_id: challenge?.challenge_id }),
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to get WebAuthn challenge');
      }

      const { options } = await challengeResponse.json();

      // Convert base64url to ArrayBuffer for WebAuthn
      const credentialRequestOptions = {
        ...options,
        challenge: base64urlToArrayBuffer(options.challenge),
        allowCredentials: options.allowCredentials?.map((cred: any) => ({
          ...cred,
          id: base64urlToArrayBuffer(cred.id),
        })),
      };

      // Get credential from authenticator
      const credential = await navigator.credentials.get({
        publicKey: credentialRequestOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('WebAuthn authentication was cancelled');
      }

      // Prepare assertion for backend
      const response = credential.response as AuthenticatorAssertionResponse;
      const assertion = {
        id: credential.id,
        rawId: arrayBufferToBase64url(credential.rawId),
        response: {
          authenticatorData: arrayBufferToBase64url(response.authenticatorData),
          clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
          signature: arrayBufferToBase64url(response.signature),
          userHandle: response.userHandle ? arrayBufferToBase64url(response.userHandle) : null,
        },
        type: credential.type,
      };

      // Verify assertion with backend
      const verifyResponse = await postgresAuth.request('/step-up/webauthn/verify', {
        method: 'POST',
        body: JSON.stringify({
          challenge_id: challenge?.challenge_id,
          assertion,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('WebAuthn verification failed');
      }

      // Success - redirect to original destination
      router.push(returnTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'WebAuthn authentication failed');
      setProcessing(false);
    }
  };

  const handlePasswordChallenge = async () => {
    setProcessing(true);
    setError(null);

    try {
      // Redirect to password confirmation with step-up context
      const passwordUrl = `/auth/confirm-password?stepUp=true&returnTo=${encodeURIComponent(returnTo)}`;
      router.push(passwordUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate password challenge');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Authentication Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button 
              onClick={() => router.push('/auth/signin')} 
              className="w-full mt-4"
            >
              Return to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTimeRemaining = () => {
    if (!challenge?.auth_time) return null;
    const elapsed = Math.floor(Date.now() / 1000) - challenge.auth_time;
    const remaining = Math.max(0, challenge.max_age - elapsed);
    return remaining;
  };

  const timeRemaining = getTimeRemaining();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Additional Authentication Required
          </CardTitle>
          <CardDescription>
            This action requires additional verification for security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {timeRemaining !== null && timeRemaining > 0 && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Your session is {Math.floor(timeRemaining / 60)} minutes old. 
                Fresh authentication is required for this sensitive operation.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {challenge?.required_method === 'fresh_session' && (
              <Button
                onClick={handleFreshSession}
                disabled={processing}
                className="w-full"
                variant="default"
              >
                <Clock className="h-4 w-4 mr-2" />
                {processing ? 'Redirecting...' : 'Sign In Again'}
              </Button>
            )}

            {challenge?.required_method === 'webauthn' && (
              <Button
                onClick={handleWebAuthn}
                disabled={processing}
                className="w-full"
                variant="default"
              >
                <Key className="h-4 w-4 mr-2" />
                {processing ? 'Authenticating...' : 'Use Security Key'}
              </Button>
            )}

            {challenge?.required_method === 'password' && (
              <Button
                onClick={handlePasswordChallenge}
                disabled={processing}
                className="w-full"
                variant="default"
              >
                <Shield className="h-4 w-4 mr-2" />
                {processing ? 'Redirecting...' : 'Confirm Password'}
              </Button>
            )}

            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full"
              disabled={processing}
            >
              Cancel
            </Button>
          </div>

          <div className="text-sm text-gray-600 text-center">
            <p>This helps protect your account from unauthorized access.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Utility functions for WebAuthn
function base64urlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < view.byteLength; i++) {
    binary += String.fromCharCode(view[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}