'use client';

import { useEffect } from 'react';

export function CustomHead() {
  useEffect(() => {
    // Simple monitoring without interfering with Next.js CSS loading
    const monitorCssHealth = () => {
      // Just log for debugging, don't interfere with loading
      setTimeout(() => {
        const styleSheets = Array.from(document.styleSheets);
        const validSheets = styleSheets.filter(sheet => {
          try {
            return sheet.href && sheet.href.startsWith(window.location.origin);
          } catch {
            // Cross-origin stylesheets will throw errors, which is normal
            return false;
          }
        });

        // Log for debugging only
        if (validSheets.length === 0) {
          // console.warn('No valid stylesheets detected');
        }
      }, 2000);
    };

    // Run the health check
    monitorCssHealth();
  }, []);

  return null;
}
