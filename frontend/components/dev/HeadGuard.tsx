"use client";

import { useEffect } from 'react';

export default function HeadGuard() {
  useEffect(() => {
    // Temporarily disable CSS script detection to prevent interference
    // The real issue is in webpack configuration, not runtime detection
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log("HeadGuard: CSS script detection disabled - fixing webpack config instead");
    }
    
    // Only log for debugging, don't interfere with loading
    const monitorCssHealth = () => {
      setTimeout(() => {
        const styleSheets = Array.from(document.styleSheets);
        const validSheets = styleSheets.filter(sheet => {
          try {
            return sheet.href && sheet.href.startsWith(window.location.origin);
          } catch (_e) {
            // Cross-origin stylesheets will throw errors, which is normal
            return false;
          }
        });

        // Log for debugging only
        if (validSheets.length === 0) {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.warn('HeadGuard: No valid stylesheets detected');
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.log('HeadGuard: CSS loading appears normal');
          }
        }
      }, 2000);
    };

    // Run the health check
    monitorCssHealth();
  }, []);
  return null;
}
