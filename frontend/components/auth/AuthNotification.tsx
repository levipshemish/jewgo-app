'use client';

import React, { useEffect, useState } from 'react';

interface AuthNotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
  className?: string;
}

export const AuthNotification: React.FC<AuthNotificationProps> = ({
  type,
  message,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) {
          setTimeout(onClose, 300); // Wait for animation to complete
        }
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay, isVisible, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      setTimeout(onClose, 300); // Wait for animation to complete
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          container: 'bg-green-50 border-green-200',
          icon: 'text-green-400',
          text: 'text-green-800',
          button: 'text-green-400 hover:text-green-600',
        };
      case 'error':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-400',
          text: 'text-red-800',
          button: 'text-red-400 hover:text-red-600',
        };
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-400',
          text: 'text-yellow-800',
          button: 'text-yellow-400 hover:text-yellow-600',
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-400',
          text: 'text-blue-800',
          button: 'text-blue-400 hover:text-blue-600',
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-200',
          icon: 'text-gray-400',
          text: 'text-gray-800',
          button: 'text-gray-400 hover:text-gray-600',
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'info':
        return (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const styles = getTypeStyles();

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`
        relative border rounded-md p-4 transition-all duration-300 ease-in-out
        ${styles.container}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}
        ${className}
      `}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <div className={styles.icon}>
            {getIcon()}
          </div>
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${styles.text}`}>
            {message}
          </p>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={handleClose}
                className={`
                  inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                  ${styles.button}
                  ${type === 'success' ? 'focus:ring-green-500' : ''}
                  ${type === 'error' ? 'focus:ring-red-500' : ''}
                  ${type === 'warning' ? 'focus:ring-yellow-500' : ''}
                  ${type === 'info' ? 'focus:ring-blue-500' : ''}
                `}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthNotification;
