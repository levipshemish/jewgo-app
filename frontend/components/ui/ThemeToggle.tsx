'use client';

import React, { useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useAnimationConfig } from '@/lib/hooks/useAnimationConfig';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeToggleProps {
  /**
   * Whether to show labels
   */
  showLabels?: boolean;
  /**
   * Size of the toggle
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Variant of the toggle
   */
  variant?: 'button' | 'dropdown' | 'segmented';
  /**
   * Custom CSS class name
   */
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  showLabels = false,
  size = 'md',
  variant = 'button',
  className = '',
}) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { getConfig, shouldDisableAnimation } = useAnimationConfig({
    enabled: true,
    respectReducedMotion: true,
  });

  const animationsDisabled = shouldDisableAnimation('fast');
  const _animationConfig = getConfig('fast');

  // Size configurations
  const sizeConfig = {
    sm: { button: 'w-8 h-8', icon: 16, text: 'text-xs' },
    md: { button: 'w-10 h-10', icon: 20, text: 'text-sm' },
    lg: { button: 'w-12 h-12', icon: 24, text: 'text-base' },
  };

  const currentSize = sizeConfig[size];

  // Theme options
  const themeOptions = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    if (variant === 'dropdown') {
      setIsOpen(false);
    }
  };

  // Get current theme icon
  const getCurrentIcon = () => {
    if (theme === 'system') {
      return resolvedTheme === 'dark' ? Moon : Sun;
    }
    return theme === 'dark' ? Moon : Sun;
  };

  const CurrentIcon = getCurrentIcon();

  // Button variant
  if (variant === 'button') {
    return (
      <motion.button
        className={`${currentSize.button} rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${className}`}
        onClick={() => handleThemeChange(theme === 'light' ? 'dark' : 'light')}
        whileHover={animationsDisabled ? {} : { scale: 1.05 }}
        whileTap={animationsDisabled ? {} : { scale: 0.95 }}
        transition={{ duration: 0.2 }}
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        <CurrentIcon size={currentSize.icon} />
      </motion.button>
    );
  }

  // Segmented variant
  if (variant === 'segmented') {
    return (
      <div className={`flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 ${className}`}>
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;
          
          return (
            <motion.button
              key={option.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              onClick={() => handleThemeChange(option.value as 'light' | 'dark' | 'system')}
              whileHover={animationsDisabled ? {} : { scale: 1.02 }}
              whileTap={animationsDisabled ? {} : { scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Icon size={16} />
              {showLabels && <span>{option.label}</span>}
            </motion.button>
          );
        })}
      </div>
    );
  }

  // Dropdown variant
  return (
    <div className={`relative ${className}`}>
      <motion.button
        className={`${currentSize.button} rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center`}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={animationsDisabled ? {} : { scale: 1.05 }}
        whileTap={animationsDisabled ? {} : { scale: 0.95 }}
        transition={{ duration: 0.2 }}
        aria-label="Open theme menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <CurrentIcon size={currentSize.icon} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
            initial={animationsDisabled ? {} : { opacity: 0, scale: 0.95, y: -10 }}
            animate={animationsDisabled ? {} : { opacity: 1, scale: 1, y: 0 }}
            exit={animationsDisabled ? {} : { opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              
              return (
                <motion.button
                  key={option.value}
                  className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'
                  }`}
                  onClick={() => handleThemeChange(option.value as 'light' | 'dark' | 'system')}
                  whileHover={animationsDisabled ? {} : { backgroundColor: 'rgba(0, 0, 0, 0.05)' }}
                  transition={{ duration: 0.2 }}
                >
                  <Icon size={16} />
                  <span>{option.label}</span>
                  {isActive && (
                    <motion.div
                      className="ml-auto w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default ThemeToggle;
