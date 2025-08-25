'use client';

import React, { useState, useEffect } from 'react';
import { emailUpgradeFlow, EmailUpgradeResult, MergeConflictResult } from '@/lib/auth/email-upgrade';
// import { writeGates } from '@/lib/auth/write-gates';

interface EmailUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmailUpgradeModal({ isOpen, onClose, onSuccess }: EmailUpgradeModalProps) {
  // Early return to prevent hooks violation - must be before any hooks
  if (!isOpen) {
    return null;
  }

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'verify' | 'password' | 'merge' | 'success'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [requiresMerge, setRequiresMerge] = useState(false);
  const [mergeMessage, setMergeMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('email');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setError(null);
      // setRequiresMerge(false);
      setMergeMessage(null);
    }
  }, [isOpen]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result: EmailUpgradeResult = await emailUpgradeFlow.upgradeWithEmail(email);
      
      if (result.success) {
        setStep('verify');
        setMergeMessage('Please check your email and click the verification link.');
      } else if (result.requiresMerge) {
        // setRequiresMerge(true);
        setMergeMessage('This email is already registered. Please sign in with your existing account to merge your data.');
        setStep('merge');
      } else {
        setError(result.error || 'Failed to upgrade account');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await emailUpgradeFlow.setPassword(password);
      
      if (result.success) {
        setStep('success');
        onSuccess();
      } else {
        setError(result.error || 'Failed to set password');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  // const handleMerge = async () => {
  //   setLoading(true);
  //   setError(null);

  //   try {
  //     const result: MergeConflictResult = await emailUpgradeFlow.handleAccountMerge();
      
  //     if (result.success) {
  //       setStep('success');
  //       setMergeMessage(`Account merged successfully! ${result.movedRecords?.length || 0} items moved to your account.`);
  //       onSuccess();
  //     } else {
  //       setError(result.error || 'Failed to merge accounts');
  //     }
  //   } catch (err) {
  //     setError(err instanceof Error ? err.message : 'Unexpected error');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSignInRedirect = () => {
    window.location.href = '/auth/signin?merge=true';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upgrade Your Account</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {mergeMessage && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700">
            {mergeMessage}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email address"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Upgrading...' : 'Upgrade Account'}
              </button>
            </div>
          </form>
        )}

        {step === 'verify' && (
          <div>
            <p className="mb-4 text-gray-600">
              We&apos;ve sent a verification email to <strong>{email}</strong>. 
              Please check your inbox and click the verification link.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => setStep('password')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                I&apos;ve Verified My Email
              </button>
            </div>
          </div>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Set Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a password"
                required
                minLength={8}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm your password"
                required
                minLength={8}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Setting Password...' : 'Set Password'}
              </button>
            </div>
          </form>
        )}

        {step === 'merge' && (
          <div>
            <p className="mb-4 text-gray-600">
              This email is already registered. To merge your anonymous data with your existing account, 
              please sign in with your existing account.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSignInRedirect}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Sign In to Merge
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div>
            <div className="text-center mb-4">
              <div className="text-green-500 text-4xl mb-2">✓</div>
              <h3 className="text-lg font-semibold text-gray-900">Account Upgraded Successfully!</h3>
              <p className="text-gray-600 mt-2">
                Your account has been upgraded and you can now perform all actions.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
