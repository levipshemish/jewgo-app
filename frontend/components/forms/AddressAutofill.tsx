'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressAutofillProps {
  value: string;
  onChange: (value: string) => void;
  onAddressSelect?: (address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  }) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}

interface PlaceResult {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function AddressAutofill({
  value,
  onChange,
  onAddressSelect,
  placeholder = "Enter your address...",
  className = "",
  error
}: AddressAutofillProps) {
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load Google Places API
  useEffect(() => {
    const loadGooglePlacesAPI = () => {
      if (window.google && window.google.maps) {
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    loadGooglePlacesAPI();
  }, []);

  const getAddressSuggestions = async (input: string) => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      return;
    }

    if (!window.google || !window.google.maps) {
      console.warn('Google Maps API not loaded');
      return;
    }

    setIsLoading(true);
    try {
      const service = new window.google.maps.places.AutocompleteService();
      
      // Use callback-based API instead of async/await
      service.getPlacePredictions({
        input,
        types: ['address'],
        componentRestrictions: { country: 'us' }, // Restrict to US addresses
      }, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions);
        } else {
          setSuggestions([]);
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);
    
    // Debounce the API call
    const timeoutId = setTimeout(() => {
      getAddressSuggestions(newValue);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleSuggestionClick = async (suggestion: PlaceResult) => {
    if (!window.google || !window.google.maps) {
      console.warn('Google Maps API not loaded');
      return;
    }

    try {
      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      service.getDetails(
        {
          placeId: suggestion.place_id,
          fields: ['address_components', 'formatted_address'],
        },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const addressComponents = place.address_components || [];
            let street = '';
            let city = '';
            let state = '';
            let zipCode = '';

            addressComponents.forEach((component) => {
              const types = component.types;
              if (types.includes('street_number') || types.includes('route')) {
                street += component.long_name + ' ';
              }
              if (types.includes('locality')) {
                city = component.long_name;
              }
              if (types.includes('administrative_area_level_1')) {
                state = component.short_name;
              }
              if (types.includes('postal_code')) {
                zipCode = component.long_name;
              }
            });

            street = street.trim();
            onChange(place.formatted_address || '');
            
            if (onAddressSelect) {
              onAddressSelect({ street, city, state, zipCode });
            }
          }
        }
      );
    } catch (error) {
      console.error('Error getting place details:', error);
    }

    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 200);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full px-3 py-2 pl-10 border rounded-md focus:outline-none focus:ring-2 ${
            error 
              ? 'border-red-500 focus:ring-red-400' 
              : 'border-gray-300 focus:ring-green-400'
          }`}
        />
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.place_id}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="font-medium text-sm">
                {suggestion.structured_formatting.main_text}
              </div>
              <div className="text-xs text-gray-500">
                {suggestion.structured_formatting.secondary_text}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500 mt-1">
        Start typing to see address suggestions. Select from the dropdown for automatic city, state, and ZIP code filling.
      </p>
    </div>
  );
}
