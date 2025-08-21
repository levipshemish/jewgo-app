'use client';

import React from 'react';
import { getAppleSignInText } from '@/lib/i18n/apple-strings';

interface AppleSignInButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  enabled?: boolean;
  className?: string;
  locale?: string;
}

export function AppleSignInButton({
  onClick,
  disabled = false,
  loading = false,
  enabled = true,
  className = '',
  locale
}: AppleSignInButtonProps) {
  const [isClicked, setIsClicked] = React.useState(false);

  // Reset isClicked when both loading and disabled are false
  React.useEffect(() => {
    if (!loading && !disabled) {
      setIsClicked(false);
    }
  }, [loading, disabled]);

  const handleClick = () => {
    if (disabled || loading || isClicked) {
      return;
    }
    
    // One-shot guard to prevent double submits
    setIsClicked(true);
    onClick();
  };

  if (!enabled) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading || isClicked}
      aria-label={getAppleSignInText(locale)}
      aria-busy={loading}
      className={`
        inline-flex items-center justify-center
        w-full h-11 min-h-[44px] px-4
        bg-black text-white
        rounded-md border-0
        font-medium text-base leading-6
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        hover:bg-gray-900 active:bg-gray-800
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{
        borderRadius: '6px'
      }}
    >
      {/* Apple Logo SVG */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="mr-3 flex-shrink-0"
        role="img"
        aria-hidden="true"
        focusable="false"
        data-testid="apple-logo"
      >
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      
      {/* Sign in with Apple text */}
      <span className="font-medium">
        {getAppleSignInText(locale)}
      </span>
      
      {/* Loading indicator */}
      {loading && (
        <svg
          className="ml-2 animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          role="img"
          aria-hidden="true"
          focusable="false"
          data-testid="loading-spinner"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
    </button>
  );
}
