import { useState, useCallback, useMemo } from 'react';

export interface SearchSuggestion {
  id: string;
  type: 'category' | 'agency' | 'location' | 'address' | 'popular' | 'google_place';
  title: string;
  subtitle?: string;
  icon: string;
  color: string;
  action: () => void;
  metadata?: unknown;
}

export interface GooglePlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

export interface AddressEntry {
  address: string;
  city: string;
  state: string;
  zip: string;
  icon: string;
  color: string;
}

export interface PopularSearch {
  text: string;
  icon: string;
  color: string;
}

export const useSearchSuggestions = () => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // Popular searches data
  const popularSearches = useMemo(() => [
    { text: 'Kosher restaurants near me', icon: '🍽️', color: 'bg-green-500' },
    { text: 'ORB certified', icon: '✓', color: 'bg-blue-500' },
    { text: 'Dairy restaurants', icon: '🥛', color: 'bg-blue-400' },
    { text: 'Meat restaurants', icon: '🥩', color: 'bg-red-500' },
    { text: 'Miami Beach', icon: '🏖️', color: 'bg-yellow-500' },
    { text: 'Boca Raton', icon: '🌴', color: 'bg-green-400' }
  ], []);

  // Comprehensive address database
  const addressDatabase = useMemo(() => [
    // Miami Beach addresses
    { address: '2963 Cedar Ln', city: 'Miami Beach', state: 'FL', zip: '33139', icon: '🏖️', color: 'bg-yellow-500' },
    { address: '1234 Collins Ave', city: 'Miami Beach', state: 'FL', zip: '33139', icon: '🏖️', color: 'bg-yellow-500' },
    { address: '5678 Ocean Dr', city: 'Miami Beach', state: 'FL', zip: '33139', icon: '🏖️', color: 'bg-yellow-500' },
    { address: '9012 Lincoln Rd', city: 'Miami Beach', state: 'FL', zip: '33139', icon: '🏖️', color: 'bg-yellow-500' },
    { address: '3456 Alton Rd', city: 'Miami Beach', state: 'FL', zip: '33139', icon: '🏖️', color: 'bg-yellow-500' },
    
    // Boca Raton addresses
    { address: '7890 Glades Rd', city: 'Boca Raton', state: 'FL', zip: '33431', icon: '🌴', color: 'bg-green-400' },
    { address: '2345 Palmetto Park Rd', city: 'Boca Raton', state: 'FL', zip: '33486', icon: '🌴', color: 'bg-green-400' },
    { address: '6789 Federal Hwy', city: 'Boca Raton', state: 'FL', zip: '33487', icon: '🌴', color: 'bg-green-400' },
    { address: '1234 Yamato Rd', city: 'Boca Raton', state: 'FL', zip: '33431', icon: '🌴', color: 'bg-green-400' },
    
    // Hollywood addresses
    { address: '4567 Hollywood Blvd', city: 'Hollywood', state: 'FL', zip: '33021', icon: '🎬', color: 'bg-orange-500' },
    { address: '8901 Sheridan St', city: 'Hollywood', state: 'FL', zip: '33024', icon: '🎬', color: 'bg-orange-500' },
    { address: '2345 Stirling Rd', city: 'Hollywood', state: 'FL', zip: '33020', icon: '🎬', color: 'bg-orange-500' },
    
    // Aventura addresses
    { address: '19501 Biscayne Blvd', city: 'Aventura', state: 'FL', zip: '33180', icon: '🏢', color: 'bg-blue-500' },
    { address: '20801 NE 29th Ave', city: 'Aventura', state: 'FL', zip: '33180', icon: '🏢', color: 'bg-blue-500' },
    { address: '19901 NE 29th Ave', city: 'Aventura', state: 'FL', zip: '33180', icon: '🏢', color: 'bg-blue-500' },
    
    // Sunny Isles addresses
    { address: '17201 Collins Ave', city: 'Sunny Isles Beach', state: 'FL', zip: '33160', icon: '🌅', color: 'bg-pink-500' },
    { address: '18001 Collins Ave', city: 'Sunny Isles Beach', state: 'FL', zip: '33160', icon: '🌅', color: 'bg-pink-500' },
    { address: '18501 Collins Ave', city: 'Sunny Isles Beach', state: 'FL', zip: '33160', icon: '🌅', color: 'bg-pink-500' },
    
    // North Miami Beach addresses
    { address: '16701 NE 19th Ave', city: 'North Miami Beach', state: 'FL', zip: '33162', icon: '🏖️', color: 'bg-cyan-500' },
    { address: '17001 NE 19th Ave', city: 'North Miami Beach', state: 'FL', zip: '33162', icon: '🏖️', color: 'bg-cyan-500' },
    { address: '17501 NE 19th Ave', city: 'North Miami Beach', state: 'FL', zip: '33162', icon: '🏖️', color: 'bg-cyan-500' },
    
    // Miami addresses
    { address: '1234 Brickell Ave', city: 'Miami', state: 'FL', zip: '33131', icon: '🌆', color: 'bg-purple-500' },
    { address: '5678 Coral Way', city: 'Miami', state: 'FL', zip: '33145', icon: '🌆', color: 'bg-purple-500' },
    { address: '9012 SW 8th St', city: 'Miami', state: 'FL', zip: '33135', icon: '🌆', color: 'bg-purple-500' },
    { address: '3456 NW 7th Ave', city: 'Miami', state: 'FL', zip: '33127', icon: '🌆', color: 'bg-purple-500' },
    
    // Fort Lauderdale addresses
    { address: '1234 Las Olas Blvd', city: 'Fort Lauderdale', state: 'FL', zip: '33301', icon: '⛵', color: 'bg-indigo-500' },
    { address: '5678 Sunrise Blvd', city: 'Fort Lauderdale', state: 'FL', zip: '33304', icon: '⛵', color: 'bg-indigo-500' },
    { address: '9012 Commercial Blvd', city: 'Fort Lauderdale', state: 'FL', zip: '33309', icon: '⛵', color: 'bg-indigo-500' },
    
    // Weston addresses
    { address: '1234 Weston Rd', city: 'Weston', state: 'FL', zip: '33326', icon: '🏘️', color: 'bg-teal-500' },
    { address: '5678 Bonaventure Blvd', city: 'Weston', state: 'FL', zip: '33326', icon: '🏘️', color: 'bg-teal-500' },
    
    // Pembroke Pines addresses
    { address: '1234 Pines Blvd', city: 'Pembroke Pines', state: 'FL', zip: '33024', icon: '🏠', color: 'bg-emerald-500' },
    { address: '5678 Flamingo Rd', city: 'Pembroke Pines', state: 'FL', zip: '33028', icon: '🏠', color: 'bg-emerald-500' },
    
    // Plantation addresses
    { address: '1234 Broward Blvd', city: 'Plantation', state: 'FL', zip: '33317', icon: '🌳', color: 'bg-lime-500' },
    { address: '5678 Sunrise Blvd', city: 'Plantation', state: 'FL', zip: '33322', icon: '🌳', color: 'bg-lime-500' },
    
    // Coral Springs addresses
    { address: '1234 Sample Rd', city: 'Coral Springs', state: 'FL', zip: '33065', icon: '🌺', color: 'bg-rose-500' },
    { address: '5678 University Dr', city: 'Coral Springs', state: 'FL', zip: '33071', icon: '🌺', color: 'bg-rose-500' },
    
    // Parkland addresses
    { address: '1234 Holmberg Rd', city: 'Parkland', state: 'FL', zip: '33067', icon: '🌲', color: 'bg-green-600' },
    { address: '5678 Loxahatchee Rd', city: 'Parkland', state: 'FL', zip: '33076', icon: '🌲', color: 'bg-green-600' }
  ], []);

  // Generate database search suggestions (for non-Google API searches)
  const generateDatabaseSuggestions = useCallback((searchQuery: string, onSuggestionSelect: (query: string) => void) => {
    const allSuggestions: SearchSuggestion[] = [];
    const queryLower = searchQuery.toLowerCase();

    // Address suggestions
    if (searchQuery.length > 2) {
      const addressSuggestions: SearchSuggestion[] = addressDatabase
        .filter(addr => 
          addr.address.toLowerCase().includes(queryLower) ||
          addr.city.toLowerCase().includes(queryLower) ||
          addr.state.toLowerCase().includes(queryLower) ||
          addr.zip.includes(searchQuery) ||
          `${addr.address} ${addr.city}`.toLowerCase().includes(queryLower)
        )
        .map(addr => ({
          id: `address-${addr.address}-${addr.city}`,
          type: 'address' as const,
          title: addr.address,
          subtitle: `${addr.city}, ${addr.state} ${addr.zip}`,
          icon: addr.icon,
          color: addr.color,
          action: () => onSuggestionSelect(`${addr.address}, ${addr.city}, ${addr.state}`)
        }));

      allSuggestions.push(...addressSuggestions.slice(0, 8));
    }

    // Category suggestions
    const categorySuggestions: SearchSuggestion[] = [
      { text: 'kosher', icon: '✓', color: 'bg-green-500' },
      { text: 'dairy', icon: '🥛', color: 'bg-blue-400' },
      { text: 'meat', icon: '🥩', color: 'bg-red-500' },
      { text: 'pareve', icon: '🥬', color: 'bg-green-400' },
      { text: 'restaurant', icon: '🍽️', color: 'bg-orange-500' },
      { text: 'cafe', icon: '☕', color: 'bg-brown-500' },
      { text: 'bakery', icon: '🥖', color: 'bg-yellow-400' },
      { text: 'pizza', icon: '🍕', color: 'bg-red-400' },
      { text: 'sushi', icon: '🍣', color: 'bg-green-300' },
      { text: 'ice cream', icon: '🍦', color: 'bg-pink-300' }
    ]
      .filter(cat => cat.text.toLowerCase().includes(queryLower))
      .map(cat => ({
        id: `category-${cat.text}`,
        type: 'category' as const,
        title: `${cat.text} restaurants`,
        subtitle: `Find ${cat.text} kosher restaurants`,
        icon: cat.icon,
        color: cat.color,
        action: () => onSuggestionSelect(cat.text)
      }));

    allSuggestions.push(...categorySuggestions.slice(0, 5));

    // Agency suggestions
    const agencySuggestions: SearchSuggestion[] = [
      { text: 'ORB', icon: '✓', color: 'bg-blue-500' },
      { text: 'KM', icon: '✓', color: 'bg-green-500' },
              { text: 'Kosher Miami', icon: '✓', color: 'bg-green-500' }
    ]
      .filter(agency => agency.text.toLowerCase().includes(queryLower))
      .map(agency => ({
        id: `agency-${agency.text}`,
        type: 'agency' as const,
        title: `${agency.text} certified`,
        subtitle: `Restaurants certified by ${agency.text}`,
        icon: agency.icon,
        color: agency.color,
        action: () => onSuggestionSelect(agency.text)
      }));

    allSuggestions.push(...agencySuggestions.slice(0, 3));

    // Popular searches
    const popularSuggestions: SearchSuggestion[] = popularSearches
      .filter(pop => pop.text.toLowerCase().includes(queryLower))
      .map(pop => ({
        id: `popular-${pop.text}`,
        type: 'popular' as const,
        title: pop.text,
        subtitle: 'Popular search',
        icon: pop.icon,
        color: pop.color,
        action: () => onSuggestionSelect(pop.text)
      }));

    allSuggestions.push(...popularSuggestions.slice(0, 3));

    return allSuggestions;
  }, [addressDatabase, popularSearches]);

  return {
    suggestions,
    setSuggestions,
    isLoadingGoogle,
    setIsLoadingGoogle,
    googleError,
    setGoogleError,
    popularSearches,
    addressDatabase,
    generateDatabaseSuggestions
  };
}; 