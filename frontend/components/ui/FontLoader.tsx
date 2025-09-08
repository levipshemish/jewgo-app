'use client';

import { useEffect } from 'react';

interface FontLoaderProps {
  children: React.ReactNode;
}

export function FontLoader({ children }: FontLoaderProps) {
  useEffect(() => {
    // Ensure fonts are loaded and applied immediately
    const loadFonts = async () => {
      try {
        // Check if fonts are already loaded
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
        
        // Force font loading by applying font classes to a hidden element
        const fontLoader = document.createElement('div');
        fontLoader.style.position = 'absolute';
        fontLoader.style.visibility = 'hidden';
        fontLoader.style.fontFamily = 'var(--font-nexa), system-ui, sans-serif';
        fontLoader.style.fontWeight = '300 400 500 700';
        fontLoader.textContent = 'Font Loading Test';
        document.body.appendChild(fontLoader);
        
        // Remove the test element after a short delay
        setTimeout(() => {
          if (fontLoader.parentNode) {
            fontLoader.parentNode.removeChild(fontLoader);
          }
        }, 100);
        
      } catch {
        }
    };

    loadFonts();
  }, []);

  return <>{children}</>;
}
