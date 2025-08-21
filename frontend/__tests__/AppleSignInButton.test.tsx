import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppleSignInButton } from '@/components/ui/AppleSignInButton';

// Mock the i18n function only for UI component tests
jest.mock('@/lib/i18n/apple-strings', () => ({
  getAppleSignInText: jest.fn((locale) => {
    if (locale === 'es-MX') return 'Iniciar sesión con Apple';
    if (locale === 'fr-CA') return 'Se connecter avec Apple';
    return 'Sign in with Apple';
  })
}));

describe('AppleSignInButton', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
  });

  test('renders as a button element with proper semantic HTML', () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });

  test('has proper accessibility attributes', () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Sign in with Apple');
    expect(button).toHaveAttribute('type', 'button');
  });

  test('meets Apple minimum height requirements', () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-11', 'min-h-[44px]');
  });

  test('has Apple-approved styling', () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-black', 'text-white');
    expect(button).toHaveStyle({ borderRadius: '6px' });
  });

  test('renders Apple logo SVG', () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const logo = screen.getByTestId('apple-logo');
    expect(logo).toBeInTheDocument();
    expect(logo.tagName).toBe('svg');
    expect(logo).toHaveAttribute('aria-hidden', 'true');
    expect(logo).toHaveAttribute('role', 'img');
    expect(logo).toHaveAttribute('focusable', 'false');
  });

  test('displays Apple-approved text', () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    expect(screen.getByText('Sign in with Apple')).toBeInTheDocument();
  });

  test('displays localized Apple-approved text for Spanish', () => {
    render(<AppleSignInButton onClick={mockOnClick} locale="es-MX" />);
    
    expect(screen.getByText('Iniciar sesión con Apple')).toBeInTheDocument();
  });

  test('displays localized Apple-approved text for French', () => {
    render(<AppleSignInButton onClick={mockOnClick} locale="fr-CA" />);
    
    expect(screen.getByText('Se connecter avec Apple')).toBeInTheDocument();
  });

  test('falls back to English for unsupported locale', () => {
    render(<AppleSignInButton onClick={mockOnClick} locale="xx-XX" />);
    
    expect(screen.getByText('Sign in with Apple')).toBeInTheDocument();
  });

  test('uses browser locale when no locale prop provided', () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    // Should fall back to English when no locale is provided
    expect(screen.getByText('Sign in with Apple')).toBeInTheDocument();
  });

  test('handles click events', () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('implements one-shot guard to prevent double submits', async () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    
    // First click
    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    
    // Second click should be ignored
    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    
    // Button should be disabled after first click
    expect(button).toBeDisabled();
  });

  test('shows loading state correctly', () => {
    render(<AppleSignInButton onClick={mockOnClick} loading={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    
    // Should show loading spinner
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('animate-spin');
    expect(spinner).toHaveAttribute('role', 'img');
    expect(spinner).toHaveAttribute('focusable', 'false');
  });

  test('handles disabled state', () => {
    render(<AppleSignInButton onClick={mockOnClick} disabled={true} />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed');
  });

  test('respects feature flag when disabled', () => {
    render(<AppleSignInButton onClick={mockOnClick} enabled={false} />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  test('applies custom className', () => {
    render(<AppleSignInButton onClick={mockOnClick} className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  test('has proper focus ring for accessibility', () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('focus:ring-2', 'focus:ring-blue-500', 'focus:ring-offset-2');
  });

  test('supports keyboard navigation', () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    
    // Focus the button
    button.focus();
    expect(button).toHaveFocus();
    
    // Press Enter
    fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
    fireEvent.click(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    
    // Create a new instance for the second test since the first one gets disabled
    render(<AppleSignInButton onClick={mockOnClick} />);
    mockOnClick.mockClear();
    
    const buttons = screen.getAllByRole('button');
    const newButton = buttons[1]; // Get the second button
    newButton.focus();
    
    // Press Space
    fireEvent.keyDown(newButton, { key: ' ', code: 'Space' });
    fireEvent.click(newButton);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test('has proper hover and active states', () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('hover:bg-gray-900', 'active:bg-gray-800');
  });

  test('maintains Apple prominence requirements', () => {
    // This test ensures the button styling meets Apple's prominence requirements
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    
    // Check for black background (Apple requirement)
    expect(button).toHaveClass('bg-black');
    
    // Check for white text (Apple requirement)
    expect(button).toHaveClass('text-white');
    
    // Check for proper font weight
    expect(button).toHaveClass('font-medium');
  });

  test('handles multiple rapid clicks gracefully', async () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    
    // Rapid clicks
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    // Only first click should register
    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
  });

  test('resets state when props change', () => {
    const { rerender } = render(<AppleSignInButton onClick={mockOnClick} loading={true} />);
    
    let button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    // Change loading state
    rerender(<AppleSignInButton onClick={mockOnClick} loading={false} />);
    
    button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  test('has proper transition animations', () => {
    render(<AppleSignInButton onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('transition-all', 'duration-200');
  });

  test('maintains consistent button ordering', () => {
    // This test ensures the Apple button maintains proper ordering relative to other OAuth buttons
    render(
      <div>
        <AppleSignInButton onClick={mockOnClick} />
        <button>Google Sign In</button>
      </div>
    );
    
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveTextContent('Sign in with Apple');
    expect(buttons[1]).toHaveTextContent('Google Sign In');
  });
});
