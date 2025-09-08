'use client';

import { useEffect } from 'react';

interface FontOptimizerProps {
  children: React.ReactNode;
}

export function FontOptimizer({ children }: FontOptimizerProps) {
  useEffect(() => {
    // Simple font optimization to prevent preload warnings
    const optimizeFontLoading = () => {
      // Wait for DOM to be ready
      const waitForDOM = () => {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', optimizeFontLoading);
          return;
        }
        
        // Ensure font is applied to the document root
        const rootElement = document.documentElement;
        if (rootElement && !rootElement.classList.contains('font-applied')) {
          rootElement.classList.add('font-applied');
        }

        // Simple font usage forcing - only if body is available
        if (document.body) {
          const forceFontUsage = () => {
            // Create a test element to force font loading
            const testElement = document.createElement('div');
            testElement.style.fontFamily = 'var(--font-nunito), system-ui, sans-serif';
            testElement.style.position = 'absolute';
            testElement.style.visibility = 'hidden';
            testElement.style.pointerEvents = 'none';
            testElement.style.zIndex = '-1';
            testElement.textContent = 'Font Test';
            document.body.appendChild(testElement);
            
            // Remove after ensuring font is loaded
            setTimeout(() => {
              if (testElement.parentNode) {
                testElement.parentNode.removeChild(testElement);
              }
            }, 50);
          };

          // Apply font usage immediately
          forceFontUsage();

          // Monitor for font loading completion
          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => {
              // Fonts are loaded, ensure they're being used
              if (rootElement) {
                rootElement.classList.add('font-applied');
              }
              forceFontUsage();
            });
          }
        }
      };

      waitForDOM();
    };

    optimizeFontLoading();
  }, []);

  return <>{children}</>;
}
