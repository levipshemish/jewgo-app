'use client';

import React, { useEffect } from 'react';

// Simple CSS loader that uses proper Next.js CSS imports
interface CssLoaderProps {
  href: string;
  id?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export function CssLoader({ href, id, onLoad, onError }: CssLoaderProps) {
  useEffect(() => {
    // Check if the stylesheet is already loaded
    const existingLink = document.querySelector(`link[href="${href}"]`);
    if (existingLink) {
      onLoad?.();
      return;
    }

    // Only create link elements for external CSS files, not Next.js static assets
    if (href.startsWith('/_next/static/')) {
      // console.warn('Attempted to load Next.js static CSS dynamically:', href);
      onError?.(new Error('Next.js static CSS should be imported, not loaded dynamically'));
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.href = href;
    if (id) {
      link.id = id;
    }

    link.onload = () => {
      onLoad?.();
    };

    link.onerror = () => {
      const error = new Error(`Failed to load CSS: ${href}`);
      onError?.(error);
    };

    document.head.appendChild(link);

    return () => {
      // Cleanup: remove the link if component unmounts
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    };
  }, [href, id, onLoad, onError]);

  return null;
}

// Leaflet CSS should be imported in the component that uses it, not loaded dynamically
export function LeafletCssLoader() {
  useEffect(() => {
    // console.warn('LeafletCssLoader is deprecated. Import Leaflet CSS directly in your component.');
  }, []);

  return null;
}
