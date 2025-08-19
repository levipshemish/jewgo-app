import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import SignUpPage from '@/app/auth/supabase-signup/page';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock reCAPTCHA
jest.mock('@/lib/utils/recaptcha', () => ({
  useRecaptcha: () => ({
    execute: jest.fn().mockResolvedValue('test-token' as any),
    siteKey: 'test-site-key',
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('SignUpPage Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render signup form with all fields', () => {
    render(<SignUpPage />);
    
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('should show/hide password when toggle is clicked', async () => {
    render(<SignUpPage />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole('button', { name: '' }); // SVG button
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should validate email in real-time', async () => {
    render(<SignUpPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    
    // Type invalid email
    await user.type(emailInput, 'invalid-email');
    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    
    // Clear and type valid email
    await user.clear(emailInput);
    await user.type(emailInput, 'test@example.com');
    expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
  });

  it('should validate password requirements in real-time', async () => {
    render(<SignUpPage />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    
    // Test various invalid passwords
    await user.type(passwordInput, 'short');
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    
    await user.clear(passwordInput);
    await user.type(passwordInput, 'alllowercase');
    expect(screen.getByText(/uppercase letter/i)).toBeInTheDocument();
    
    await user.clear(passwordInput);
    await user.type(passwordInput, 'ValidPass123');
    expect(screen.queryByText(/password must/i)).not.toBeInTheDocument();
  });

  it('should disable submit button when form has errors', async () => {
    render(<SignUpPage />);
    
    const submitButton = screen.getByRole('button', { name: /create account/i });
    const emailInput = screen.getByLabelText(/email address/i);
    
    // Type invalid email
    await user.type(emailInput, 'invalid');
    expect(submitButton).toBeDisabled();
    
    // Fix email
    await user.clear(emailInput);
    await user.type(emailInput, 'test@example.com');
    expect(submitButton).not.toBeDisabled();
  });

  it('should handle successful registration', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        user: { id: '123', email: 'test@example.com', name: 'Test User' },
      }),
    });

    render(<SignUpPage />);
    
    // Fill form
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'ValidPass123');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    // Check loading state
    expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
    
    // Check success message and redirect
    await waitFor(() => {
      expect(screen.getByText(/account created/i)).toBeInTheDocument();
    });
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    }, { timeout: 2000 });
  });

  it('should handle registration errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        success: false,
        message: 'Email already in use',
      }),
    });

    render(<SignUpPage />);
    
    // Fill form
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'ValidPass123');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    // Check error message
    await waitFor(() => {
      expect(screen.getByText(/email already in use/i)).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<SignUpPage />);
    
    // Fill form
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'ValidPass123');
    
    // Submit form
    await user.click(screen.getByRole('button', { name: /create account/i }));
    
    // Check error message
    await waitFor(() => {
      expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
    });
  });

  it('should display password requirements hint', () => {
    render(<SignUpPage />);
    
    expect(screen.getByText(/must be at least 8 characters with uppercase, lowercase, and a number/i)).toBeInTheDocument();
  });

  it('should have link to sign in page', () => {
    render(<SignUpPage />);
    
    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/auth/signin');
  });
});
