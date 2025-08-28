'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { googlePlacesAPI } from '@/lib/google/places';
import { appLogger } from '@/lib/utils/logger';
import PlacesStatusBadge from '@/components/debug/PlacesStatusBadge';

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
  const [apiError, setApiError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  // Keep a stable ref for debounce timeout to avoid stacked timers
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize Google Places API
  useEffect(() => {
    const initializeAPI = async () => {
      try {
        appLogger.debug('Initializing Google Places API');
        await googlePlacesAPI.initialize();
        setApiError(null);
        appLogger.debug('Google Places API initialized successfully');
        

      } catch (error) {
        appLogger.error('Failed to initialize Google Places API', { error: String(error) });
        setApiError('Failed to initialize address autocomplete. Please check your internet connection and try again.');
      }
    };

    initializeAPI();
  }, []);

  const getAddressSuggestions = async (input: string) => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      return;
    }

    // Only log in development when explicitly enabled
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_PLACES === 'true') {
      appLogger.debug('Getting suggestions for input', { input });
    }

    if (apiError) {
      appLogger.warn('Google Places API not available', { apiError });
      return;
    }

    setIsLoading(true);
    setApiError(null);
    
    try {
      const predictions = await googlePlacesAPI.getPlacePredictions(input, {
        types: ['address'],
        country: 'us'
      });
      
      // Only log in development when explicitly enabled
      if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_PLACES === 'true') {
        appLogger.debug('Predictions received', {
          count: predictions.length,
          predictions: predictions.map((p: any) => p.description).join(', ')
        });
      }
      
      setSuggestions(predictions);
    } catch (error) {
      appLogger.error('Error fetching address suggestions', { error: String(error) });
      setSuggestions([]);
      setApiError('Failed to fetch address suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    setSelectedIndex(-1);
    
    // Debounce the API call using a persistent ref
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      getAddressSuggestions(newValue);
    }, 200); // Reduced from 300ms to 200ms for better responsiveness
  };

  const handleSuggestionClick = async (suggestion: PlaceResult) => {
    if (apiError) {
      appLogger.warn('Google Places API not available', { apiError });
      return;
    }

    // Debug logging for suggestion object
    appLogger.debug('Suggestion clicked', {
      place_id: suggestion.place_id,
      place_id_type: typeof suggestion.place_id,
      place_id_length: suggestion.place_id?.length,
      description: suggestion.description
    } as any);

    // Validate that suggestion has a valid place_id
    if (!suggestion.place_id || typeof suggestion.place_id !== 'string' || suggestion.place_id.trim() === '') {
      appLogger.error('Invalid place_id in suggestion', { suggestion });
      setApiError('Invalid address selection');
      return;
    }

    try {
      appLogger.debug('Getting place details for place_id', { place_id: suggestion.place_id });

      const placeDetails = await googlePlacesAPI.getPlaceDetails(suggestion.place_id, [
        'name',
        'formatted_address',
        'address_components',
        'geometry'
      ]);

      appLogger.debug('Place details received', {
        placeDetails,
        keys: Object.keys(placeDetails || {}),
        formatted_address: placeDetails?.formatted_address,
        formattedAddress: placeDetails?.formattedAddress,
        name: placeDetails?.name,
        displayName: placeDetails?.displayName,
        address_components: placeDetails?.address_components,
        addressComponents: placeDetails?.addressComponents
      });

      if (placeDetails) {
        // For modern API, we'll use the formatted_address and parse it
        const formattedAddress = placeDetails.formatted_address || placeDetails.formattedAddress || '';
        
        appLogger.debug('Formatted address', { formattedAddress });
        
        // If we don't have a formatted address from place details, use the suggestion description
        const finalAddress = formattedAddress || suggestion.description || '';
        
        appLogger.debug('Final address to use', { finalAddress });
        
        onChange(finalAddress);
        
        if (onAddressSelect) {
          // Try to extract address components from place details first
          let street = '';
          let city = '';
          let state = '';
          let zipCode = '';

          if (placeDetails.address_components && Array.isArray(placeDetails.address_components)) {
            // Parse address components for more accurate extraction
            appLogger.debug('Processing address components', { address_components: placeDetails.address_components });
            let zipSuffix = '';
            for (const component of placeDetails.address_components) {
              const types = component.types || [];
              const longName = (component as any).long_name ?? (component as any).longText ?? '';
              const shortName = (component as any).short_name ?? (component as any).shortText ?? '';
              appLogger.debug('Processing component', { types, long_name: longName, short_name: shortName });

              if (types.includes('street_number') || types.includes('route')) {
                street += longName + ' ';
              } else if (types.includes('locality')) {
                city = longName;
              } else if (types.includes('administrative_area_level_1')) {
                state = shortName || longName;
              } else if (types.includes('postal_code')) {
                zipCode = longName;
              } else if (types.includes('postal_code_suffix')) {
                zipSuffix = longName;
              }
            }
            
            // Clean up street address
            street = street.trim();
            // Combine ZIP+4 if available
            if (zipCode && zipSuffix) {
              zipCode = `${zipCode}-${zipSuffix}`;
            }
            appLogger.debug('After component processing', { street, city, state, zipCode });
          }

          // Fallback to parsing formatted address if components didn't work
          if (!city || !state || !zipCode) {
            const addressParts = finalAddress.split(',').map((part: string) => part.trim());

            if (addressParts.length >= 1 && !street) {
              street = addressParts[0];
            }
            if (addressParts.length >= 2 && !city) {
              city = addressParts[1];
            }
            // Try robust state and ZIP(+4) extraction from the remaining segment
            if (addressParts.length >= 3 && (!state || !zipCode)) {
              const stateZipStr = addressParts[2];
              const m = stateZipStr.match(/^([A-Z]{2})\s+(\d{5})(?:-(\d{4}))?$/);
              if (m) {
                const st = m[1];
                const zip = m[2];
                const suf = m[3];
                if (!state) { state = st; }
                if (!zipCode) { zipCode = suf ? `${zip}-${suf}` : zip; }
              } else {
                const stateZip = stateZipStr.split(' ').filter(Boolean);
                if (stateZip.length >= 2) {
                  if (!state) { state = stateZip[0]; }
                  if (!zipCode) { zipCode = stateZip[1]; }
                } else if (!state) {
                  state = stateZip[0];
                }
              }
            }
          }

          if (process.env.NODE_ENV === 'development') {
            appLogger.debug('Extracted address components', { street, city, state, zipCode });
          }

          onAddressSelect({ street, city, state, zipCode });
        }
      } else {
        // Fallback: use the suggestion description if place details failed
        appLogger.debug('Place details failed, using suggestion description as fallback');
        const fallbackAddress = suggestion.description || '';
        onChange(fallbackAddress);
        
        if (onAddressSelect) {
          // Parse the fallback address with improved logic
          const addressParts = fallbackAddress.split(',').map((part: string) => part.trim());
          let street = '';
          let city = '';
          let state = '';
          let zipCode = '';

          if (addressParts.length >= 1) {
            street = addressParts[0] || '';
          }
          if (addressParts.length >= 2) {
            city = addressParts[1] || '';
          }
          if (addressParts.length >= 3) {
            const stateZip = (addressParts[2] || '').split(' ');
            if (stateZip.length >= 2) {
              state = stateZip[0] || '';
              zipCode = stateZip[1] || '';
            } else {
              state = stateZip[0] || '';
            }
          }

          appLogger.debug('Fallback extracted address components', { street, city, state, zipCode });

          onAddressSelect({ street, city, state, zipCode });
        }
      }
    } catch (error) {
      appLogger.error('Error getting place details', { error: String(error) });
      
      // Fallback: use the suggestion description if place details failed
      appLogger.debug('Place details error, using suggestion description as fallback');
      const fallbackAddress = suggestion.description || '';
      onChange(fallbackAddress);
      
      if (onAddressSelect) {
        // Parse the fallback address
        const addressParts = fallbackAddress.split(',').map((part: string) => part.trim());
        let street = '';
        let city = '';
        let state = '';
        let zipCode = '';

        if (addressParts.length >= 1) {
          street = addressParts[0] || '';
        }
        if (addressParts.length >= 2) {
          city = addressParts[1] || '';
        }
        if (addressParts.length >= 3) {
          const stateZipStr = addressParts[2] || '';
          const m = stateZipStr.match(/^([A-Z]{2})\s+(\d{5})(?:-(\d{4}))?$/);
          if (m) {
            const st = m[1];
            const zip = m[2];
            const suf = m[3];
            state = st || '';
            zipCode = suf ? `${zip}-${suf}` : (zip || '');
          } else {
            const stateZip = stateZipStr.split(' ').filter(Boolean);
            if (stateZip.length >= 2) {
              state = stateZip[0] || '';
              zipCode = stateZip[1] || '';
            } else {
              state = stateZip[0] || '';
            }
          }
        }

        onAddressSelect({ street, city, state, zipCode });
      }
      
      setApiError('Failed to get address details, but using suggestion as fallback');
    }

    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {return;}

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
          const suggestion = suggestions[selectedIndex];
          if (suggestion) {
            handleSuggestionClick(suggestion);
          }
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

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {process.env.NEXT_PUBLIC_DEBUG_PLACES_BADGE === 'true' && (
        <PlacesStatusBadge />
      )}
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

      {/* Error Messages */}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
      
      {apiError && (
        <p className="text-orange-500 text-sm mt-1">
          ⚠️ Address autocomplete temporarily unavailable. You can still type your address manually.
        </p>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-500 mt-1">
        Start typing to see address suggestions. Select from the dropdown for automatic city, state, and ZIP code filling.
      </p>
    </div>
  );
}
