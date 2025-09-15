/**
 * Tests for step-up authentication components and flows
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import StepUpAuthPage from '../../app/auth/step-up/page';
import { postgresAuth } from '@/lib/auth/postgres-auth';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock auth client
jest.mock('@/lib/auth/postgres-auth', () => ({
  postgresAuth: {
    request: jest.fn(),
  },
}));

// Mock WebAuthn API
const mockCredentials = {
  get: jest.fn(),
};

Object.defineProperty(window, 'PublicKeyCredential', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(navigator, 'credentials', {
  writable: true,
  value: mockCredentials,
});

describe('Step-up Authentication', () => {
  const mockPush = jest.fn();
  const mockSearchParams = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    mockSearchParams.get.mockReturnValue('/admin/users/roles');
  });

  describe('Challenge Loading', () => {
    it('should show loading state initially', () => {
      (postgresAuth.request as jest.Mock).mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );

      render(<StepUpAuthPage />);
      
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should fetch step-up challenge on mount', async () => {
      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'fresh_session',
        max_age: 300,
      };

      (postgresAuth.request as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ challenge: mockChallenge }),
      });

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(postgresAuth.request).toHaveBeenCalledWith('/step-up/challenge', {
          method: 'POST',
          body: JSON.stringify({ return_to: '/admin/users/roles' }),
        });
      });
    });

    it('should handle challenge fetch error', async () => {
      (postgresAuth.request as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to fetch challenge')
      );

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/Authentication Error/i)).toBeInTheDocument();
        expect(screen.getByText(/Failed to fetch challenge/i)).toBeInTheDocument();
      });
    });
  });

  describe('Fresh Session Challenge', () => {
    it('should show fresh session option when required', async () => {
      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'fresh_session',
        auth_time: Math.floor(Date.now() / 1000) - 400, // 6+ minutes ago
        max_age: 300,
      };

      (postgresAuth.request as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ challenge: mockChallenge }),
      });

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/Additional Authentication Required/i)).toBeInTheDocument();
        expect(screen.getByText(/Sign In Again/i)).toBeInTheDocument();
      });
    });

    it('should redirect to login when fresh session is clicked', async () => {
      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'fresh_session',
        max_age: 300,
      };

      (postgresAuth.request as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ challenge: mockChallenge }),
      });

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/Sign In Again/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Sign In Again/i));

      expect(mockPush).toHaveBeenCalledWith(
        '/auth/signin?stepUp=true&returnTo=%2Fadmin%2Fusers%2Froles'
      );
    });

    it('should show session age information', async () => {
      const authTime = Math.floor(Date.now() / 1000) - 400; // 6+ minutes ago
      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'fresh_session',
        auth_time: authTime,
        max_age: 300,
      };

      (postgresAuth.request as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ challenge: mockChallenge }),
      });

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/Your session is \d+ minutes old/i)).toBeInTheDocument();
      });
    });
  });

  describe('WebAuthn Challenge', () => {
    beforeEach(() => {
      // Mock WebAuthn support
      window.PublicKeyCredential = jest.fn() as any;
    });

    it('should show WebAuthn option when required', async () => {
      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'webauthn',
        max_age: 300,
      };

      (postgresAuth.request as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ challenge: mockChallenge }),
      });

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/Use Security Key/i)).toBeInTheDocument();
      });
    });

    it('should handle WebAuthn authentication flow', async () => {
      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'webauthn',
        max_age: 300,
      };

      const mockWebAuthnChallenge = {
        options: {
          challenge: 'mock-challenge',
          timeout: 60000,
          rpId: 'localhost',
          allowCredentials: [],
          userVerification: 'required',
        },
      };

      const mockCredential = {
        id: 'mock-credential-id',
        rawId: new ArrayBuffer(32),
        response: {
          authenticatorData: new ArrayBuffer(37),
          clientDataJSON: new ArrayBuffer(121),
          signature: new ArrayBuffer(64),
          userHandle: null,
        },
        type: 'public-key',
      };

      (postgresAuth.request as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ challenge: mockChallenge }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWebAuthnChallenge),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      mockCredentials.get.mockResolvedValueOnce(mockCredential);

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/Use Security Key/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Use Security Key/i));

      await waitFor(() => {
        expect(mockCredentials.get).toHaveBeenCalled();
        expect(mockPush).toHaveBeenCalledWith('/admin/users/roles');
      });
    });

    it('should handle WebAuthn not supported', async () => {
      // Remove WebAuthn support
      delete (window as any).PublicKeyCredential;

      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'webauthn',
        max_age: 300,
      };

      (postgresAuth.request as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ challenge: mockChallenge }),
      });

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/Use Security Key/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Use Security Key/i));

      await waitFor(() => {
        expect(screen.getByText(/WebAuthn is not supported/i)).toBeInTheDocument();
      });
    });

    it('should handle WebAuthn cancellation', async () => {
      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'webauthn',
        max_age: 300,
      };

      (postgresAuth.request as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ challenge: mockChallenge }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            options: {
              challenge: 'mock-challenge',
              timeout: 60000,
              rpId: 'localhost',
              allowCredentials: [],
              userVerification: 'required',
            },
          }),
        });

      mockCredentials.get.mockResolvedValueOnce(null);

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/Use Security Key/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Use Security Key/i));

      await waitFor(() => {
        expect(screen.getByText(/WebAuthn authentication was cancelled/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Challenge', () => {
    it('should show password option when required', async () => {
      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'password',
        max_age: 300,
      };

      (postgresAuth.request as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ challenge: mockChallenge }),
      });

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/Confirm Password/i)).toBeInTheDocument();
      });
    });

    it('should redirect to password confirmation when clicked', async () => {
      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'password',
        max_age: 300,
      };

      (postgresAuth.request as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ challenge: mockChallenge }),
      });

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/Confirm Password/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Confirm Password/i));

      expect(mockPush).toHaveBeenCalledWith(
        '/auth/confirm-password?stepUp=true&returnTo=%2Fadmin%2Fusers%2Froles'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      (postgresAuth.request as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to obtain CSRF token/i)).toBeInTheDocument();
      });
    });

    it('should show cancel button', async () => {
      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'fresh_session',
        max_age: 300,
      };

      (postgresAuth.request as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ challenge: mockChallenge }),
      });

      render(<StepUpAuthPage />);

      await waitFor(() => {
        expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Cancel/i));

      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  describe('ReturnTo Parameter', () => {
    it('should use returnTo parameter from URL', () => {
      mockSearchParams.get.mockReturnValue('/settings/billing');

      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'fresh_session',
        max_age: 300,
      };

      (postgresAuth.request as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ challenge: mockChallenge }),
      });

      render(<StepUpAuthPage />);

      expect(postgresAuth.request).toHaveBeenCalledWith('/step-up/challenge', {
        method: 'POST',
        body: JSON.stringify({ return_to: '/settings/billing' }),
      });
    });

    it('should default to root if no returnTo parameter', () => {
      mockSearchParams.get.mockReturnValue(null);

      const mockChallenge = {
        challenge_id: 'test-challenge-id',
        required_method: 'fresh_session',
        max_age: 300,
      };

      (postgresAuth.request as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ challenge: mockChallenge }),
      });

      render(<StepUpAuthPage />);

      expect(postgresAuth.request).toHaveBeenCalledWith('/step-up/challenge', {
        method: 'POST',
        body: JSON.stringify({ return_to: '/' }),
      });
    });
  });
});