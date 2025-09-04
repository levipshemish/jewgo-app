'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useGuestProtection } from '@/lib/utils/guest-protection';
import { fetchMarketplaceListings } from '@/lib/api/marketplace';
import { Header } from '@/components/layout';
import { CategoryTabs, BottomNavigation } from '@/components/navigation/ui';
import UnifiedCard from '@/components/ui/UnifiedCard';
import { Pagination } from '@/components/ui/Pagination';
import MarketplaceActionBar from '@/components/marketplace/MarketplaceActionBar';
import MarketplaceCategoriesDropdown from '@/components/marketplace/MarketplaceCategoriesDropdown';
import MarketplaceFilters from '@/components/marketplace/MarketplaceFilters';


import { scrollToTop } from '@/lib/utils/scrollUtils';
// import { sortRestaurantsByDistance } from '@/lib/utils/distance';
import { useMobileOptimization, useMobileGestures, useMobilePerformance, mobileStyles } from '@/lib/mobile-optimization';
import { useWebSocket } from '@/lib/hooks/useWebSocket';
import { useLocation } from '@/lib/contexts/LocationContext';
import LocationPromptPopup from '@/components/LocationPromptPopup';
import { useScrollDetection } from '@/lib/hooks/useScrollDetection';
import { appLogger } from '@/lib/utils/logger';
import { useDistanceCalculation } from '@/lib/hooks/useDistanceCalculation';

import { MarketplaceListing, MarketplaceCategory, MarketplaceFilters as MarketplaceFiltersType } from '@/lib/types/marketplace';


// Loading component for Suspense fallback
function MarketplacePageLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  );
}

// Sample marketplace data with images for demonstration (expanded for pagination testing)
const sampleMarketplaceData: MarketplaceListing[] = [
  {
    id: "sample-1",
    kind: 'regular',
    txn_type: 'sale',
    title: "2004 Toyota Sienna - Great Family Car",
    description: "Excellent condition family car with low mileage. Perfect for large families.",
    price_cents: 240000,
    originalPrice: 310000,
    currency: "USD",
    condition: 'used_good',
    category_id: 1,
    category_name: "Vehicles",
    city: "Miami Gardens",
    region: "FL",
    country: "US",
    seller_name: "John Doe",
    endorse_up: 12,
    endorse_down: 1,
    status: "active",
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
    views: 127,
    rating: 4.5,
    images: ["/images/default-restaurant.webp"],
    thumbnail: "/images/default-restaurant.webp"
  },
  {
    id: "sample-2",
    kind: 'regular',
    txn_type: 'sale',
    title: "Box of small legos - Mixed colors and pieces",
    description: "Large collection of LEGO pieces in various colors. Great for creative building.",
    price_cents: 0,
    currency: "USD",
    condition: 'used_good',
    category_id: 2,
    category_name: "Toys",
    city: "Miami Gardens",
    region: "FL",
    country: "US",
    seller_name: "Sarah Smith",
    endorse_up: 8,
    endorse_down: 0,
    status: "active",
    created_at: "2024-01-15T08:15:00Z",
    updated_at: "2024-01-15T08:15:00Z",
    views: 89,
    rating: 4.8,
    images: ["/images/default-restaurant.webp"],
    thumbnail: "/images/default-restaurant.webp"
  },
  {
    id: "sample-3",
    kind: 'appliance',
    txn_type: 'sale',
    title: "Kosher fleishig oven - Excellent condition",
    description: "Dedicated meat oven in perfect condition. Never mixed with dairy.",
    price_cents: 0,
    currency: "USD",
    condition: 'used_like_new',
    category_id: 3,
    category_name: "Appliances",
    city: "Miami Gardens",
    region: "FL",
    country: "US",
    seller_name: "Rachel Cohen",
    endorse_up: 15,
    endorse_down: 0,
    status: "active",
    created_at: "2024-01-14T16:45:00Z",
    updated_at: "2024-01-14T16:45:00Z",
    views: 203,
    rating: 5.0,
    images: ["/images/default-restaurant.webp"],
    thumbnail: "/images/default-restaurant.webp"
  },
  {
    id: "sample-4",
    kind: 'regular',
    txn_type: 'sale',
    title: "Couches & chairs - Living room furniture set",
    description: "Complete living room set including sofa and matching chairs.",
    price_cents: 10000,
    currency: "USD",
    condition: 'used_good',
    category_id: 4,
    category_name: "Furniture",
    city: "Miami Gardens",
    region: "FL",
    country: "US",
    seller_name: "David Wilson",
    endorse_up: 6,
    endorse_down: 2,
    status: "active",
    created_at: "2024-01-15T12:20:00Z",
    updated_at: "2024-01-15T12:20:00Z",
    views: 156,
    rating: 4.2,
    images: ["/images/default-restaurant.webp"],
    thumbnail: "/images/default-restaurant.webp"
  },
  {
    id: "sample-5",
    kind: 'vehicle',
    txn_type: 'sale',
    title: "2018 Honda Odyssey - Family Van",
    description: "Well-maintained family van with excellent safety features.",
    price_cents: 350000,
    originalPrice: 420000,
    currency: "USD",
    condition: 'used_good',
    category_id: 1,
    category_name: "Vehicles",
    city: "Miami Beach",
    region: "FL",
    country: "US",
    seller_name: "Michael Brown",
    endorse_up: 20,
    endorse_down: 1,
    status: "active",
    created_at: "2024-01-14T14:30:00Z",
    updated_at: "2024-01-14T14:30:00Z",
    views: 234,
    rating: 4.7,
    images: ["/images/default-restaurant.webp"],
    thumbnail: "/images/default-restaurant.webp"
  },
  {
    id: "sample-6",
    kind: 'appliance',
    txn_type: 'sale',
    title: "Refrigerator - Dairy section only",
    description: "Dedicated dairy refrigerator in excellent condition.",
    price_cents: 80000,
    currency: "USD",
    condition: 'used_like_new',
    category_id: 3,
    category_name: "Appliances",
    city: "Hollywood",
    region: "FL",
    country: "US",
    seller_name: "Lisa Green",
    endorse_up: 10,
    endorse_down: 0,
    status: "active",
    created_at: "2024-01-13T11:15:00Z",
    updated_at: "2024-01-13T11:15:00Z",
    views: 178,
    rating: 4.9,
    images: ["/images/default-restaurant.webp"],
    thumbnail: "/images/default-restaurant.webp"
  },
  // Additional items to test pagination
  {
    id: "sample-7",
    kind: 'regular',
    txn_type: 'sale',
    title: "Kids Bike - Perfect for Ages 5-8",
    description: "Well-maintained children's bicycle with training wheels.",
    price_cents: 7500,
    currency: "USD",
    condition: 'used_good',
    category_id: 5,
    category_name: "Sports",
    city: "Miami",
    region: "FL",
    country: "US",
    seller_name: "Karen Miller",
    endorse_up: 5,
    endorse_down: 0,
    status: "active",
    created_at: "2024-01-15T15:30:00Z",
    updated_at: "2024-01-15T15:30:00Z",
    views: 67,
    rating: 4.3,
    images: ["/images/default-restaurant.webp"],
    thumbnail: "/images/default-restaurant.webp"
  },
  {
    id: "sample-8",
    kind: 'regular',
    txn_type: 'sale',
    title: "Garden Tools Set - Complete Collection",
    description: "Professional quality garden tools including shovels, rakes, and more.",
    price_cents: 12000,
    currency: "USD",
    condition: 'used_like_new',
    category_id: 6,
    category_name: "Tools",
    city: "Miami Beach",
    region: "FL",
    country: "US",
    seller_name: "Bob Johnson",
    endorse_up: 18,
    endorse_down: 1,
    status: "active",
    created_at: "2024-01-14T09:15:00Z",
    updated_at: "2024-01-14T09:15:00Z",
    views: 145,
    rating: 4.6,
    images: ["/images/default-restaurant.webp"],
    thumbnail: "/images/default-restaurant.webp"
  },
  {
    id: "sample-9",
    kind: 'regular',
    txn_type: 'sale',
    title: "Book Collection - Children's Stories",
    description: "Collection of classic children's books in excellent condition.",
    price_cents: 4500,
    currency: "USD",
    condition: 'used_good',
    category_id: 7,
    category_name: "Books",
    city: "Aventura",
    region: "FL",
    country: "US",
    seller_name: "Emma Davis",
    endorse_up: 11,
    endorse_down: 0,
    status: "active",
    created_at: "2024-01-13T14:20:00Z",
    updated_at: "2024-01-13T14:20:00Z",
    views: 98,
    rating: 4.8,
    images: ["/images/default-restaurant.webp"],
    thumbnail: "/images/default-restaurant.webp"
  },
  {
    id: "sample-10",
    kind: 'regular',
    txn_type: 'sale',
    title: "Gaming Chair - Ergonomic Design",
    description: "High-quality gaming chair with excellent lumbar support.",
    price_cents: 18000,
    currency: "USD",
    condition: 'used_like_new',
    category_id: 4,
    category_name: "Furniture",
    city: "Hollywood",
    region: "FL",
    country: "US",
    seller_name: "Alex Chen",
    endorse_up: 22,
    endorse_down: 2,
    status: "active",
    created_at: "2024-01-12T16:45:00Z",
    updated_at: "2024-01-12T16:45:00Z",
    views: 267,
    rating: 4.4,
    images: ["/images/default-restaurant.webp"],
    thumbnail: "/images/default-restaurant.webp"
  },
  // More items to ensure pagination on all screen sizes
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `sample-${11 + i}`,
    kind: 'regular' as const,
    txn_type: 'sale' as const,
    title: `Item ${11 + i} - Sample Marketplace Product`,
    description: `Description for sample item ${11 + i}.`,
    price_cents: (50 + i * 10) * 100,
    currency: "USD",
    condition: 'used_good' as const,
    category_id: 1 + (i % 7),
    category_name: ["Vehicles", "Toys", "Appliances", "Furniture", "Sports", "Tools", "Books"][i % 7],
    city: ["Miami", "Miami Beach", "Hollywood", "Aventura"][i % 4],
    region: "FL",
    country: "US",
    seller_name: `Seller ${11 + i}`,
    endorse_up: 5 + i,
    endorse_down: i % 3,
    status: "active" as const,
    created_at: new Date(2024, 0, 10 - i).toISOString(),
    updated_at: new Date(2024, 0, 10 - i).toISOString(),
    views: 50 + i * 10,
    rating: 4.0 + (i % 10) / 10,
    images: ["/images/default-restaurant.webp"],
    thumbnail: "/images/default-restaurant.webp"
  }))
];

// Main component that uses useSearchParams
function MarketplacePageContent() {
  const router = useRouter();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalListings, setTotalListings] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('marketplace');
  const [showFilters, setShowFilters] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [marketplaceAvailable, setMarketplaceAvailable] = useState(true);
  

  
  // Mobile optimization hooks
  const { isMobile, viewportHeight, viewportWidth } = useMobileOptimization();
  const { isLowPowerMode, isSlowConnection } = useMobilePerformance();
  
  // Centralized distance calculation hook
  const { calculateDistance, formatDistance } = useDistanceCalculation();

  // Performance optimizations based on device capabilities
  const shouldReduceAnimations = isLowPowerMode || isSlowConnection;
  const imageQuality = isLowPowerMode || isSlowConnection ? 'low' : 'high';
  const shouldLazyLoad = isSlowConnection;
  
  // Ensure mobile detection is working correctly
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileDevice(typeof window !== 'undefined' && window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
    };
  }, []);
  
  // Mobile gesture support
  const { onTouchStart, onTouchMove, onTouchEnd } = useMobileGestures(
    () => router.push('/eatery'), // Swipe left to eatery
    () => router.push('/favorites'),   // Swipe right to favorites
    () => scrollToTop(),               // Swipe up to scroll to top
    () => window.scrollTo(0, document.body.scrollHeight) // Swipe down to bottom
  );
  
  // WebSocket for real-time updates (currently disabled)
  const { isConnected, sendMessage } = useWebSocket();
  

  
  // Location state from context
  const {
    userLocation,
    permissionStatus,
    isLoading: locationLoading,
    error: locationError,
    requestLocation,
  } = useLocation();

  // Location prompt popup state
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [hasShownLocationPrompt, setHasShownLocationPrompt] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<MarketplaceFiltersType>({
    category: '',
    subcategory: '',
    kind: '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    city: '',
    region: ''
  });
  
  // Selected category state
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategory | undefined>();

  // Responsive grid with maximum 4 rows and up to 8 columns
  const mobileOptimizedItemsPerPage = useMemo(() => {
    // Calculate items per page to ensure exactly 4 rows on every screen size
    if (isMobile || isMobileDevice) {
      return 8; // 4 rows × 2 columns = 8 items
    } else {
      // For desktop, calculate based on viewport width to ensure 4 rows
      let columnsPerRow = 3; // Default fallback
      
      if (viewportWidth >= 1441) {
        columnsPerRow = 8; // Large desktop: 8 columns × 4 rows = 32 items
      } else if (viewportWidth >= 1025) {
        columnsPerRow = 6; // Desktop: 6 columns × 4 rows = 24 items
      } else if (viewportWidth >= 769) {
        columnsPerRow = 4; // Large tablet: 4 columns × 4 rows = 16 items
      } else if (viewportWidth >= 641) {
        columnsPerRow = 3; // Small tablet: 3 columns × 4 rows = 12 items
      }
      
      return columnsPerRow * 4; // Always 4 rows
    }
  }, [isMobile, isMobileDevice, viewportWidth]);

  // Memoize marketplace listing transformation to prevent unnecessary re-renders
  const transformMarketplaceToCardData = useCallback((listing: MarketplaceListing) => {
    appLogger.debug('Transforming marketplace listing', { listingId: listing.id });
    
  // Format price from cents to dollars
  const formatPrice = (priceCents: number) => {
    return `$${(priceCents / 100).toFixed(0)}`;
  };

  // Format condition for display
  const formatCondition = (condition: string) => {
    switch (condition) {
      case 'new': return 'New';
      case 'used_like_new': return 'Like New';
      case 'used_good': return 'Good';
      case 'used_fair': return 'Fair';
      default: return condition;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {return '1d';}
    if (diffDays < 7) {return `${diffDays}d`;}
    if (diffDays < 30) {return `${Math.floor(diffDays / 7)}w`;}
    if (diffDays < 365) {return `${Math.floor(diffDays / 30)}m`;}
    return `${Math.floor(diffDays / 365)}y`;
  };

  let distanceText: string | undefined;

  if (userLocation && listing.lat && listing.lng) {
    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      listing.lat,
      listing.lng
    );
    distanceText = formatDistance(distance);
  }

    const transformedData = {
    id: listing.id,
      imageUrl: (() => {
        // Adjust image quality based on device capabilities
        let baseImageUrl = listing.thumbnail || listing.images?.[0] || null;
        if (imageQuality === 'low' && baseImageUrl) {
          // For low power mode or slow connections, use lower quality images
          // This is a placeholder - in a real implementation, you'd adjust the URL based on your image service
          baseImageUrl = baseImageUrl.replace(/\/w=\d+/, '/w=150').replace(/\/h=\d+/, '/h=100');
        }
        return baseImageUrl;
      })(),
    imageTag: formatCondition(listing.condition),
    title: listing.title,
    badge: formatDate(listing.created_at),
    subtitle: formatPrice(listing.price_cents),
    additionalText: distanceText, // Only show if location is enabled
    showHeart: true,
    isLiked: false // This will be handled by the component internally
    };
    
    appLogger.debug('Transformed marketplace data', { id: transformedData.id });
    return transformedData;
    }, [userLocation, calculateDistance, formatDistance, imageQuality]); // Include imageQuality dependency



  // Sort listings by distance when location is available
  const sortedListings = useMemo(() => {
    if (permissionStatus !== 'granted' || !userLocation) {
      return listings;
    }

    return [...listings].sort((a, b) => {
      // If either listing doesn't have coordinates, keep original order
      if (!a.lat || !a.lng || !b.lat || !b.lng) {
        return 0;
      }

      const distanceA = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        a.lat,
        a.lng
      );

      const distanceB = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        b.lat,
        b.lng
      );

      return distanceA - distanceB;
    });
  }, [listings, permissionStatus, userLocation, calculateDistance]);



  // Mobile-optimized state
  const { isScrolling } = useScrollDetection({ debounceMs: 100 });

  // Handle page changes for desktop pagination
  const handlePageChange = async (page: number) => {
    if (page === currentPage || loading) {
      return;
    }

    try {
      setLoading(true);
      const params = {
        limit: mobileOptimizedItemsPerPage,
        offset: (page - 1) * mobileOptimizedItemsPerPage,
        search: searchQuery || undefined,
        category: filters.category || undefined,
        subcategory: filters.subcategory || undefined,
        kind: filters.kind || undefined,
        condition: filters.condition || undefined,
        min_price: filters.minPrice ? parseInt(filters.minPrice) * 100 : undefined,
        max_price: filters.maxPrice ? parseInt(filters.maxPrice) * 100 : undefined,
        city: filters.city || undefined,
        region: filters.region || undefined
      };

      const response = await fetchMarketplaceListings(params);
      
      if (response.success && response.data?.listings) {
        const newListings = response.data.listings;
        
        if (newListings.length === 0 && (response.data as any).message === 'Marketplace is not yet available') {
          setMarketplaceAvailable(false);
          setListings([]);
          setHasMore(false);
        } else {
          setMarketplaceAvailable(true);
          setListings(newListings);
          setHasMore(newListings.length === mobileOptimizedItemsPerPage);
          setCurrentPage(page);
        }
      } else {
        setError(response.error || 'Failed to load listings');
      }
    } catch (err) {
      console.error('Error fetching page:', err);
    } finally {
      setLoading(false);
    }
  };

  // Mobile-optimized location handling with context
  const _handleRequestLocation = async () => {
    // Use the context's requestLocation
    requestLocation();
  };

  // Handle location changes and update WebSocket
  useEffect(() => {
    if (userLocation) {
      // Send location update via WebSocket
      if (isConnected) {
        sendMessage({
          type: 'location_update',
          data: { latitude: userLocation.latitude, longitude: userLocation.longitude }
        });
      }
    }
  }, [userLocation, isConnected, sendMessage]);

  // Show location prompt when page loads and user doesn't have location
  useEffect(() => {
    // Only show prompt if we haven't shown it before and user doesn't have location
    if (!hasShownLocationPrompt && !userLocation && !locationLoading) {
      setShowLocationPrompt(true);
      setHasShownLocationPrompt(true);
    }
  }, [hasShownLocationPrompt, userLocation, locationLoading]);

  // Close location prompt when user gets location
  useEffect(() => {
    if (showLocationPrompt && userLocation) {
      setShowLocationPrompt(false);
    }
  }, [showLocationPrompt, userLocation]);

  // Fetch marketplace listings with mobile optimization and distance sorting
  const fetchMarketplaceData = useCallback(async (page = 1, append = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        limit: mobileOptimizedItemsPerPage,
        offset: (page - 1) * mobileOptimizedItemsPerPage,
        search: searchQuery || undefined,
        category: filters.category || undefined,
        subcategory: filters.subcategory || undefined,
        kind: filters.kind || undefined,
        condition: filters.condition || undefined,
        min_price: filters.minPrice ? parseInt(filters.minPrice) * 100 : undefined,
        max_price: filters.maxPrice ? parseInt(filters.maxPrice) * 100 : undefined,
        city: filters.city || undefined,
        region: filters.region || undefined
      };

      const response = await fetchMarketplaceListings(params);
      
      if (response.success && response.data?.listings) {
        const newListings = response.data.listings;
        
        if (newListings.length === 0 && (response.data as any).message === 'Marketplace is not yet available') {
          setMarketplaceAvailable(false);
          setListings([]);
          setHasMore(false);
        } else if (newListings.length === 0) {
          // No listings available, use sample data
          appLogger.info('No listings available, using sample data');
          const sampleListings = sampleMarketplaceData.slice(0, mobileOptimizedItemsPerPage);
          
          setMarketplaceAvailable(true);
          if (append) {
            setListings(prev => [...prev, ...sampleListings]);
          } else {
            setListings(sampleListings);
          }
          
          setHasMore(sampleListings.length === mobileOptimizedItemsPerPage);
          setCurrentPage(page);
          
          // Update pagination state for sample data
          setTotalListings(sampleMarketplaceData.length);
          const calculatedTotalPages = Math.ceil(sampleMarketplaceData.length / mobileOptimizedItemsPerPage);
          setTotalPages(calculatedTotalPages);
          

        } else {
          setMarketplaceAvailable(true);
          if (append) {
            setListings(prev => [...prev, ...newListings]);
          } else {
            setListings(newListings);
          }
          
          setHasMore(newListings.length === mobileOptimizedItemsPerPage);
          setCurrentPage(page);
          
          // Update pagination state
          const total = response.data.total || newListings.length;
          setTotalListings(total);
          const calculatedTotalPages = Math.ceil(total / mobileOptimizedItemsPerPage);
          setTotalPages(calculatedTotalPages);
          

        }
      } else {
        // Use sample data when API fails or returns no data
        appLogger.warn('Using sample marketplace data due to API error or no data');
        appLogger.debug('Sample data count', { count: sampleMarketplaceData.length });
        const sampleListings = sampleMarketplaceData.slice(0, mobileOptimizedItemsPerPage);
        appLogger.debug('Sample listings to display count', { count: sampleListings.length });
        
        setMarketplaceAvailable(true);
        if (append) {
          setListings(prev => [...prev, ...sampleListings]);
        } else {
          setListings(sampleListings);
        }
        
        setHasMore(sampleListings.length === mobileOptimizedItemsPerPage);
        setCurrentPage(page);
        
        // Update pagination state for sample data
        setTotalListings(sampleMarketplaceData.length);
        const calculatedTotalPages = Math.ceil(sampleMarketplaceData.length / mobileOptimizedItemsPerPage);
        setTotalPages(calculatedTotalPages);
        

      }
    } catch (err) {
      // Use sample data when API throws an error
      appLogger.error('Using sample marketplace data due to API error', { error: String(err) });
      appLogger.debug('Sample data count', { count: sampleMarketplaceData.length });
      const sampleListings = sampleMarketplaceData.slice(0, mobileOptimizedItemsPerPage);
      appLogger.debug('Sample listings to display count', { count: sampleListings.length });
      
      setMarketplaceAvailable(true);
      if (append) {
        setListings(prev => [...prev, ...sampleListings]);
      } else {
        setListings(sampleListings);
      }
      
      setHasMore(sampleListings.length === mobileOptimizedItemsPerPage);
      setCurrentPage(page);
      
      // Update pagination state for sample data
      setTotalListings(sampleMarketplaceData.length);
      const calculatedTotalPages = Math.ceil(sampleMarketplaceData.length / mobileOptimizedItemsPerPage);
      setTotalPages(calculatedTotalPages);
      
      
    } finally {
      setLoading(false);
    }
  }, [mobileOptimizedItemsPerPage, searchQuery, filters]);



  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    fetchMarketplaceData(1, false);
  };

  const handleFilterChange = (newFilters: MarketplaceFiltersType) => {
    setFilters(newFilters);
    setCurrentPage(1);
    fetchMarketplaceData(1, false);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    // Handle navigation to different pages based on the selected tab
    switch (tab) {
              case 'mikvah':
          router.push('/mikvah');
        break;
      case 'shuls':
        router.push('/shuls');
        break;
      case 'eatery':
        router.push('/eatery');
        break;
      case 'stores':
        router.push('/stores');
        break;
      case 'marketplace':
        // Already on marketplace page, just update the tab
        break;
      default:
        break;
    }
  };

  const handleSell = () => {
    router.push('/marketplace/add');
  };

  const handleShowCategories = () => {
    setShowCategories(true);
  };

  const handleShowFilters = () => {
    setShowFilters(true);
  };

  const handleCategorySelect = (category: MarketplaceCategory) => {
    setSelectedCategory(category);
    if (category.id) {
      setFilters(prev => ({
        ...prev,
        category: category.name
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        category: ''
      }));
    }
    setCurrentPage(1);
    fetchMarketplaceData(1, false);
  };

  // Pagination handled by existing async handlePageChange above

  // Subscribe to real-time updates
  useEffect(() => {
    if (isConnected) {
      // Subscribe to marketplace updates
      sendMessage({
        type: 'subscribe',
        data: { room_id: 'marketplace_updates' }
      });
    }
  }, [isConnected, sendMessage]);

  // Initial data fetch
  useEffect(() => {
    // For development, use sample data immediately
    if (process.env.NODE_ENV === 'development') {
      appLogger.info('Development mode: using sample data immediately');
      const sampleListings = sampleMarketplaceData.slice(0, mobileOptimizedItemsPerPage);
      setListings(sampleListings);
      setMarketplaceAvailable(true);
      setLoading(false);
      setTotalListings(sampleMarketplaceData.length);
      setTotalPages(Math.ceil(sampleMarketplaceData.length / mobileOptimizedItemsPerPage));
      setHasMore(sampleListings.length === mobileOptimizedItemsPerPage);
      
    } else {
      fetchMarketplaceData();
    }
  }, [fetchMarketplaceData, mobileOptimizedItemsPerPage]);

  // Mobile-specific effects
  useEffect(() => {
    // Auto-hide filters on mobile when scrolling
    if ((isMobile || isMobileDevice) && isScrolling) {
      setShowFilters(false);
    }
  }, [isMobile, isMobileDevice, isScrolling]);

  // Consistent responsive styles
  const responsiveStyles = useMemo(() => {
    const isMobileView = isMobile || isMobileDevice;
    const styles = {
      container: {
        minHeight: isMobileView ? viewportHeight : 'auto',
      },
      filtersContainer: {
        position: isMobileView ? 'fixed' as const : 'relative' as const,
        top: isMobileView ? 'auto' : '0',
        bottom: isMobileView ? '0' : 'auto',
        left: isMobileView ? '0' : 'auto',
        right: isMobileView ? '0' : 'auto',
        zIndex: isMobileView ? 50 : 'auto',
        backgroundColor: isMobileView ? 'white' : 'transparent',
        borderTop: isMobileView ? '1px solid #e5e7eb' : 'none',
        borderRadius: isMobileView ? '16px 16px 0 0' : '0',
        boxShadow: isMobileView ? '0 -4px 6px -1px rgba(0, 0, 0, 0.1)' : 'none',
        maxHeight: isMobileView ? '80vh' : 'auto',
        overflowY: isMobileView ? 'auto' as const : 'visible' as const,
      },
      loadMoreButton: {
        ...mobileStyles.touchButton,
        width: isMobileView ? '100%' : 'auto',
        margin: isMobileView ? '16px 8px' : '16px',
      }
    };

    return styles;
  }, [isMobile, isMobileDevice, viewportHeight]);

  // Show marketplace not available message
  if (!marketplaceAvailable) {
      return (
    <div className="min-h-screen bg-gray-50 marketplace-page">
        <Header />
        
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-6">🛍️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Marketplace Coming Soon!
            </h1>
            <p className="text-gray-600 mb-6">
              Our marketplace feature is currently under development. We&apos;re working hard to bring you a great buying and selling experience for kosher items.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">What&apos;s Coming:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Buy and sell kosher items</li>
                <li>• Vehicle and appliance listings</li>
                <li>• Gemach (free loan) items</li>
                <li>• Location-based search</li>
                <li>• Secure transactions</li>
              </ul>
            </div>
            <button
              onClick={() => router.push('/eatery')}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Back to Home
            </button>
          </div>
        </div>
        
        <BottomNavigation size="compact" showLabels="active-only" />
      </div>
    );
  }

  if (error) {
    return (<div style={responsiveStyles.container}>
        <Header />
        
        {/* Navigation Tabs - Always visible */}
        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100" style={{ zIndex: 999 }}>
          <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
        
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 text-center mb-6 max-w-md">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchMarketplaceData();
            }}
            className="px-6 py-3 bg-[#4ade80] text-white rounded-lg hover:bg-[#22c55e] transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-[#f4f4f4] marketplace-page page-with-bottom-nav"
      style={responsiveStyles.container}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="main"
      aria-label="Marketplace listings"
    >
      <div className="sticky top-0 z-50 bg-white">
        <Header
          onSearch={handleSearch}
          placeholder="Search marketplace listings..."
          showFilters={true}
          onShowFilters={handleShowFilters}
        />

        <div className="px-4 sm:px-6 py-2 bg-white border-b border-gray-100">
          <CategoryTabs activeTab={activeTab} onTabChange={handleTabChange} />
        </div>

        <MarketplaceActionBar
          onSell={handleSell}
          onShowCategories={handleShowCategories}
          onShowFilters={handleShowFilters}
        />
      </div>

      {/* Location Permission Banner */}
      {permissionStatus !== 'granted' && !locationLoading && (
        <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-blue-800">
                Enable location to see distance from you
              </span>
            </div>
            <button
              onClick={requestLocation}
              className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium px-3 py-1 rounded-lg hover:bg-blue-100"
            >
              Enable
            </button>
          </div>
        </div>
      )}
      
      {/* Location Loading Indicator */}
      {locationLoading && (
        <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-100">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-800">Getting your location...</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Location Error Banner */}
      {locationError && permissionStatus !== 'granted' && !locationLoading && (
        <div className="px-4 sm:px-6 py-3 bg-red-50 border-b border-red-100">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-sm text-red-800">{locationError}</span>
            </div>
          </div>
        </div>
      )}

      {/* Location-Based Sorting Indicator */}
      {permissionStatus === 'granted' && userLocation && (
        <div className="px-4 sm:px-6 py-2 bg-green-50 border-b border-green-100">
          <div className="max-w-7xl mx-auto flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm text-green-800 font-medium">
                Listings sorted by distance from you
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Marketplace grid with consistent responsive spacing */}
      {sortedListings.length === 0 && !loading ? (
        <div className="text-center py-10 px-5" role="status" aria-live="polite">
          <div className="text-5xl mb-4" aria-hidden="true">🛍️</div>
          <p className="text-lg text-gray-600 mb-2">No listings found</p>
          <p className="text-sm text-gray-500">
                {searchQuery || Object.values(filters).some(f => f) 
                  ? 'Try adjusting your search or filters'
                  : 'Be the first to add a listing!'
                }
              </p>
            </div>
          ) : (
        <div 
          className="restaurant-grid"
          role="grid"
          aria-label="Marketplace listings"
          style={{ 
            contain: 'layout style paint',
            willChange: 'auto',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            perspective: '1000px'
          }}
        >
          {sortedListings.map((listing, index) => (
            <div 
              key={listing.id} 
              className="w-full" 
              role="gridcell"
              style={{
                contain: 'layout style paint',
                willChange: 'auto',
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden'
              }}
            >
                  <UnifiedCard
                data={{
                  ...transformMarketplaceToCardData(listing),
                  imageUrl: transformMarketplaceToCardData(listing).imageUrl || undefined,
                }}
                    variant="default"
                priority={index < 4 && !shouldReduceAnimations} // Reduce priority when in low power mode
                onCardClick={() => router.push(`/marketplace/product/${listing.id}`)}
                className="w-full h-full"
                showStarInBadge={true}
                isScrolling={shouldReduceAnimations} // Disable animations when in low power mode
                  />
                </div>
              ))}
            </div>
          )}

      {/* Loading states with consistent spacing */}
      {loading && (
        <div className="text-center py-5" role="status" aria-live="polite">
          <p>Loading listings{shouldLazyLoad ? ' (optimized for slow connection)' : ''}...</p>
        </div>
      )}



      {/* Pagination - show on all devices */}
      {totalPages > 1 && (
        <div className="mt-8 mb-24" role="navigation" aria-label="Pagination">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            isLoading={loading}
            className="mb-4"
          />
          <div className="text-center text-sm text-gray-600">
            Showing {sortedListings.length} of {totalListings} listings
          </div>
        </div>
      )}

      {/* Bottom navigation - visible on all screen sizes */}
      <BottomNavigation size="compact" showLabels="active-only" />

      {/* Categories Dropdown */}
      <MarketplaceCategoriesDropdown
        isOpen={showCategories}
        onClose={() => setShowCategories(false)}
        onCategorySelect={handleCategorySelect}
        selectedCategory={selectedCategory}
      />

      {/* Filters Modal */}
      <MarketplaceFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        onApplyFilters={handleFilterChange}
        currentFilters={filters}
      />

      {/* Location Prompt Popup */}
      <LocationPromptPopup
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onSkip={() => {
          setShowLocationPrompt(false);
        }}
      />
    </div>
  );
}

export default function MarketplacePage() {
  const { isLoading, isGuest } = useGuestProtection('/marketplace');

  if (isLoading) {
    return <MarketplacePageLoading />;
  }

  if (isGuest) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-600 mb-4">Guest users must sign in to access the marketplace.</p>
          <p className="text-sm text-gray-500">Redirecting to sign-in...</p>
        </div>
      </div>
    );
  }

  return <MarketplacePageContent />;
}
