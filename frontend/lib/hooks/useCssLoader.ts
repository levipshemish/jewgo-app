import React, { useState, useEffect } from 'react';

interface CssLoaderState {
  isLoaded: boolean;
  hasError: boolean;
  error?: string;
}

export function useCssLoader(): CssLoaderState {
  const [state, setState] = useState<CssLoaderState>({
    isLoaded: false,
    hasError: false,
  });

  useEffect(() => {
    // Simple check for CSS loading - let Next.js handle CSS properly
    const checkCssLoading = () => {
      try {
        const styleSheets = Array.from(document.styleSheets);
        const validSheets = styleSheets.filter(sheet => {
          try {
            // Only check same-origin stylesheets
            return sheet.href && sheet.href.startsWith(window.location.origin);
          } catch (_e) {
            // Cross-origin stylesheets will throw errors, which is normal
            return false;
          }
        });

        // Consider CSS loaded if we have any valid stylesheets
        if (validSheets.length > 0) {
          setState({
            isLoaded: true,
            hasError: false,
          });
        }
      } catch {
        // Don't set error state for check failures
      }
    };

    // Check after a short delay to allow CSS to load
    const timeoutId = setTimeout(checkCssLoading, 1000);

    // Listen for page load
    const handleLoad = () => {
      checkCssLoading();
    };

    window.addEventListener('load', handleLoad);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  return state;
}

// Simplified MIME type monitoring - just for debugging
export function useCssMimeTypeFix(): void {
  useEffect(() => {
    // Only monitor, don't attempt to fix
    const monitorMimeTypeIssues = () => {
      // This is just for debugging - let Next.js handle CSS properly
    };

    setTimeout(monitorMimeTypeIssues, 1000);
  }, []);
}
