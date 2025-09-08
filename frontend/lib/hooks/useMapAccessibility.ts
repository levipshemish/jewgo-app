'use client';

import { useCallback, useEffect, useRef } from 'react';

interface MapAccessibilityOptions {
  enabled?: boolean;
  announceMapUpdates?: boolean;
  enableKeyboardNavigation?: boolean;
  ariaLiveRegion?: 'polite' | 'assertive';
}

interface MapAccessibilityReturn {
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  announceMapUpdate: (restaurantCount: number, searchQuery?: string) => void;
  announceRestaurantSelection: (restaurantName: string) => void;
  handleKeyboardNavigation: (event: KeyboardEvent, restaurants: any[], selectedIndex: number, onSelect: (index: number) => void) => void;
  setUpAriaLabels: (mapElement: HTMLElement) => void;
  cleanupAccessibility: () => void;
}

const DEFAULT_OPTIONS: Required<MapAccessibilityOptions> = {
  enabled: true,
  announceMapUpdates: true,
  enableKeyboardNavigation: true,
  ariaLiveRegion: 'polite',
};

export function useMapAccessibility(
  options: MapAccessibilityOptions = {}
): MapAccessibilityReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const _announcerRef = useRef<HTMLElement | null>(null);
  const keyboardListenerRef = useRef<((e: KeyboardEvent) => void) | null>(null);

  // Create or get the screen reader announcer element
  const getAnnouncer = useCallback((priority: 'polite' | 'assertive' = 'polite') => {
    if (!opts.enabled || typeof window === 'undefined') return null;

    const existingAnnouncer = document.getElementById(`map-announcer-${priority}`);
    if (existingAnnouncer) return existingAnnouncer;

    // Create new announcer element
    const announcer = document.createElement('div');
    announcer.id = `map-announcer-${priority}`;
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only absolute -left-10000 w-1 h-1 overflow-hidden';
    announcer.style.cssText = `
      position: absolute !important;
      left: -10000px !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
    `;
    document.body.appendChild(announcer);
    return announcer;
  }, [opts.enabled]);

  // Announce message to screen readers
  const announceToScreenReader = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = opts.ariaLiveRegion
  ) => {
    if (!opts.enabled || !message.trim()) return;

    const announcer = getAnnouncer(priority);
    if (!announcer) return;

    // Clear previous message
    announcer.textContent = '';
    
    // Add new message after a brief delay to ensure screen readers pick it up
    setTimeout(() => {
      announcer.textContent = message;
      
      // Clear message after 10 seconds to prevent clutter
      setTimeout(() => {
        if (announcer.textContent === message) {
          announcer.textContent = '';
        }
      }, 10000);
    }, 100);
  }, [opts.enabled, opts.ariaLiveRegion, getAnnouncer]);

  // Announce map updates
  const announceMapUpdate = useCallback((
    restaurantCount: number,
    searchQuery?: string
  ) => {
    if (!opts.announceMapUpdates) return;

    let message = `Map updated: ${restaurantCount} restaurant${restaurantCount === 1 ? '' : 's'} found`;
    if (searchQuery?.trim()) {
      message += ` for "${searchQuery}"`;
    }
    message += '. Use Tab to navigate to restaurant markers.';
    
    announceToScreenReader(message);
  }, [opts.announceMapUpdates, announceToScreenReader]);

  // Announce restaurant selection
  const announceRestaurantSelection = useCallback((restaurantName: string) => {
    if (!opts.enabled) return;
    
    const message = `Selected restaurant: ${restaurantName}. Press Enter to view details or Escape to close.`;
    announceToScreenReader(message);
  }, [opts.enabled, announceToScreenReader]);

  // Handle keyboard navigation for restaurant markers
  const handleKeyboardNavigation = useCallback((
    event: KeyboardEvent,
    restaurants: any[],
    selectedIndex: number,
    onSelect: (index: number) => void
  ) => {
    if (!opts.enableKeyboardNavigation || restaurants.length === 0) return;

    let newIndex = selectedIndex;
    let handled = false;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        newIndex = selectedIndex < restaurants.length - 1 ? selectedIndex + 1 : 0;
        handled = true;
        break;
      
      case 'ArrowUp':
      case 'ArrowLeft':
        newIndex = selectedIndex > 0 ? selectedIndex - 1 : restaurants.length - 1;
        handled = true;
        break;
      
      case 'Home':
        newIndex = 0;
        handled = true;
        break;
      
      case 'End':
        newIndex = restaurants.length - 1;
        handled = true;
        break;
      
      case 'Enter':
      case ' ':
        if (selectedIndex >= 0 && selectedIndex < restaurants.length) {
          onSelect(selectedIndex);
          announceRestaurantSelection(restaurants[selectedIndex].name || 'Unknown restaurant');
        }
        handled = true;
        break;
      
      case 'Escape':
        // Clear selection
        onSelect(-1);
        announceToScreenReader('Selection cleared');
        handled = true;
        break;
    }

    if (handled) {
      event.preventDefault();
      event.stopPropagation();
      
      if (newIndex !== selectedIndex && newIndex >= 0) {
        onSelect(newIndex);
        const restaurant = restaurants[newIndex];
        announceToScreenReader(
          `Restaurant ${newIndex + 1} of ${restaurants.length}: ${restaurant.name || 'Unknown'}${
            restaurant.kosher_category ? `, ${restaurant.kosher_category}` : ''
          }${restaurant.city ? `, ${restaurant.city}` : ''}`
        );
      }
    }
  }, [opts.enableKeyboardNavigation, announceToScreenReader, announceRestaurantSelection]);

  // Set up ARIA labels and attributes for map elements
  const setUpAriaLabels = useCallback((mapElement: HTMLElement) => {
    if (!opts.enabled || !mapElement) return;

    mapElement.setAttribute('role', 'application');
    mapElement.setAttribute('aria-label', 'Interactive restaurant map. Use Tab to navigate between restaurants, arrow keys to move selection, Enter to select.');
    mapElement.setAttribute('tabindex', '0');
    
    // Add keyboard navigation instructions
    const instructions = document.createElement('div');
    instructions.id = 'map-instructions';
    instructions.className = 'sr-only';
    instructions.textContent = 'Interactive map with restaurant locations. Use Tab to navigate, arrow keys to move between restaurants, Enter to select, Escape to clear selection.';
    
    if (!document.getElementById('map-instructions')) {
      mapElement.appendChild(instructions);
    }
    
    mapElement.setAttribute('aria-describedby', 'map-instructions');
  }, [opts.enabled]);

  // Cleanup accessibility features
  const cleanupAccessibility = useCallback(() => {
    // Remove announcers
    ['polite', 'assertive'].forEach(priority => {
      const announcer = document.getElementById(`map-announcer-${priority}`);
      if (announcer) {
        announcer.remove();
      }
    });

    // Remove instructions
    const instructions = document.getElementById('map-instructions');
    if (instructions) {
      instructions.remove();
    }

    // Remove keyboard listener
    if (keyboardListenerRef.current && typeof window !== 'undefined') {
      window.removeEventListener('keydown', keyboardListenerRef.current);
    }
  }, []);

  // Initialize accessibility features
  useEffect(() => {
    if (!opts.enabled) return;

    // Set up initial announcer
    getAnnouncer('polite');
    
    return () => {
      cleanupAccessibility();
    };
  }, [opts.enabled, getAnnouncer, cleanupAccessibility]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAccessibility();
    };
  }, [cleanupAccessibility]);

  return {
    announceToScreenReader,
    announceMapUpdate,
    announceRestaurantSelection,
    handleKeyboardNavigation,
    setUpAriaLabels,
    cleanupAccessibility,
  };
}

// Utility function to create accessible button for map controls
export function createAccessibleMapButton(
  text: string,
  onClick: () => void,
  options: {
    ariaLabel?: string;
    className?: string;
    disabled?: boolean;
  } = {}
): HTMLButtonElement {
  const button = document.createElement('button');
  button.textContent = text;
  button.setAttribute('type', 'button');
  button.setAttribute('aria-label', options.ariaLabel || text);
  button.className = options.className || 'map-control-button';
  button.disabled = options.disabled || false;
  button.addEventListener('click', onClick);
  
  return button;
}

// Utility to announce loading states
export function announceLoadingState(
  state: 'loading' | 'loaded' | 'error',
  context: string = 'restaurants'
): void {
  const messages = {
    loading: `Loading ${context}...`,
    loaded: `${context} loaded successfully`,
    error: `Failed to load ${context}. Please try again.`,
  };

  const announcer = document.getElementById('map-announcer-polite');
  if (announcer) {
    announcer.textContent = messages[state];
  }
}