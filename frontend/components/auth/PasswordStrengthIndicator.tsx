'use client';

import React from 'react';
import { getPasswordStrength, getPasswordStrengthColor, getPasswordStrengthText } from '@/lib/utils/password-validation';

interface PasswordStrengthIndicatorProps {
  password: string;
  showDetails?: boolean;
  className?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showDetails = true,
  className = '',
}) => {
  if (!password) {
    return null;
  }

  const strength = getPasswordStrength(password);
  const strengthColor = getPasswordStrengthColor(strength);
  const strengthText = getPasswordStrengthText(strength);

  // Calculate progress percentage
  const getProgressPercentage = (strength: 'weak' | 'medium' | 'strong'): number => {
    switch (strength) {
      case 'weak': return 33;
      case 'medium': return 66;
      case 'strong': return 100;
      default: return 0;
    }
  };

  const progressPercentage = getProgressPercentage(strength);

  // Get progress bar color
  const getProgressBarColor = (strength: 'weak' | 'medium' | 'strong'): string => {
    switch (strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  const progressBarColor = getProgressBarColor(strength);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength indicator */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${progressBarColor}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className={`text-sm font-medium ${strengthColor}`}>
          {strengthText}
        </span>
      </div>

      {/* Detailed requirements */}
      {showDetails && (
        <div className="space-y-1">
          <PasswordRequirement
            met={password.length >= 8}
            text="At least 8 characters"
          />
          <PasswordRequirement
            met={/[a-z]/.test(password)}
            text="One lowercase letter"
          />
          <PasswordRequirement
            met={/[A-Z]/.test(password)}
            text="One uppercase letter"
          />
          <PasswordRequirement
            met={/\d/.test(password)}
            text="One number"
          />
          <PasswordRequirement
            met={/[^a-zA-Z0-9]/.test(password)}
            text="One special character"
          />
        </div>
      )}
    </div>
  );
};

interface PasswordRequirementProps {
  met: boolean;
  text: string;
}

const PasswordRequirement: React.FC<PasswordRequirementProps> = ({ met, text }) => {
  return (
    <div className="flex items-center space-x-2 text-sm">
      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
        met ? 'bg-green-100' : 'bg-gray-100'
      }`}>
        {met ? (
          <svg
            className="w-3 h-3 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <div className="w-2 h-2 bg-gray-400 rounded-full" />
        )}
      </div>
      <span className={met ? 'text-green-700' : 'text-gray-500'}>
        {text}
      </span>
    </div>
  );
};

export default PasswordStrengthIndicator;
