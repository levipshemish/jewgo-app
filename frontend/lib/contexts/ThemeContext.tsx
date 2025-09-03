'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  enableSystem?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'jewgo-theme',
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Load theme from storage
  const loadTheme = useCallback((): Theme => {
    if (typeof window === 'undefined') return defaultTheme;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) {
        return stored as Theme;
      }
    } catch (error) {
      console.warn('Failed to load theme from storage:', error);
    }
    
    return defaultTheme;
  }, [defaultTheme, storageKey]);

  // Save theme to storage
  const saveTheme = useCallback((newTheme: Theme) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(storageKey, newTheme);
    } catch (error) {
      console.warn('Failed to save theme to storage:', error);
    }
  }, [storageKey]);

  // Apply theme to document
  const applyTheme = useCallback((newTheme: Theme) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const isDark = newTheme === 'dark' || (newTheme === 'system' && getSystemTheme() === 'dark');
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Add new theme class
    root.classList.add(isDark ? 'dark' : 'light');
    
    // Update CSS custom properties
    const themeVars = isDark ? getDarkThemeVars() : getLightThemeVars();
    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    // Update resolved theme
    setResolvedTheme(isDark ? 'dark' : 'light');
  }, [getSystemTheme]);

  // Set theme function
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
    applyTheme(newTheme);
  }, [saveTheme, applyTheme]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = loadTheme();
    setThemeState(savedTheme);
    applyTheme(savedTheme);
  }, [loadTheme, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!enableSystem || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, enableSystem, applyTheme]);

  // Prevent hydration mismatch
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Theme CSS variables
function getLightThemeVars() {
  return {
    '--color-background': '#ffffff',
    '--color-foreground': '#0f172a',
    '--color-card': '#ffffff',
    '--color-card-foreground': '#0f172a',
    '--color-popover': '#ffffff',
    '--color-popover-foreground': '#0f172a',
    '--color-primary': '#0f172a',
    '--color-primary-foreground': '#ffffff',
    '--color-secondary': '#f1f5f9',
    '--color-secondary-foreground': '#0f172a',
    '--color-muted': '#f8fafc',
    '--color-muted-foreground': '#64748b',
    '--color-accent': '#f1f5f9',
    '--color-accent-foreground': '#0f172a',
    '--color-destructive': '#ef4444',
    '--color-destructive-foreground': '#ffffff',
    '--color-border': '#e2e8f0',
    '--color-input': '#ffffff',
    '--color-ring': '#0f172a',
    '--color-shadow': 'rgba(0, 0, 0, 0.1)',
    '--color-shadow-strong': 'rgba(0, 0, 0, 0.25)',
    '--color-overlay': 'rgba(0, 0, 0, 0.5)',
    '--color-success': '#10b981',
    '--color-warning': '#f59e0b',
    '--color-info': '#3b82f6',
  };
}

function getDarkThemeVars() {
  return {
    '--color-background': '#0f172a',
    '--color-foreground': '#f8fafc',
    '--color-card': '#1e293b',
    '--color-card-foreground': '#f8fafc',
    '--color-popover': '#1e293b',
    '--color-popover-foreground': '#f8fafc',
    '--color-primary': '#f8fafc',
    '--color-primary-foreground': '#0f172a',
    '--color-secondary': '#334155',
    '--color-secondary-foreground': '#f8fafc',
    '--color-muted': '#1e293b',
    '--color-muted-foreground': '#94a3b8',
    '--color-accent': '#334155',
    '--color-accent-foreground': '#f8fafc',
    '--color-destructive': '#f87171',
    '--color-destructive-foreground': '#ffffff',
    '--color-border': '#334155',
    '--color-input': '#1e293b',
    '--color-ring': '#f8fafc',
    '--color-shadow': 'rgba(0, 0, 0, 0.3)',
    '--color-shadow-strong': 'rgba(0, 0, 0, 0.5)',
    '--color-overlay': 'rgba(0, 0, 0, 0.7)',
    '--color-success': '#34d399',
    '--color-warning': '#fbbf24',
    '--color-info': '#60a5fa',
  };
}

// Utility function to get theme-aware color
export function getThemeColor(color: string, fallback: string = color): string {
  if (typeof window === 'undefined') return fallback;
  
  const root = document.documentElement;
  const computedColor = getComputedStyle(root).getPropertyValue(color);
  
  return computedColor || fallback;
}

// Utility function to check if dark mode is active
export function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
}
