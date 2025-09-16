import React from 'react';
import { render, screen } from '@testing-library/react';
import AuthErrorPage from '../../app/auth/error/page';

jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

describe('Auth Error Page', () => {
  const mockSearchParams = { get: jest.fn() };
  beforeEach(() => {
    jest.clearAllMocks();
    (require('next/navigation').useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  it('shows magic link invalid message', () => {
    mockSearchParams.get.mockReturnValue('magic_link_invalid');
    render(<AuthErrorPage />);
    expect(screen.getByText(/Magic link invalid or expired/i)).toBeInTheDocument();
    expect(screen.getByText(/Please request a new magic link/i)).toBeInTheDocument();
  });

  it('falls back to generic message', () => {
    mockSearchParams.get.mockReturnValue('unknown_code');
    render(<AuthErrorPage />);
    expect(screen.getByText(/Authentication error/i)).toBeInTheDocument();
  });
});

