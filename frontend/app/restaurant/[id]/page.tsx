'use client';

import { Globe2, ChevronLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { BottomNavigation } from '@/components/navigation/ui';
import EnhancedHoursDisplay from '@/components/restaurant/EnhancedHoursDisplay';
import ImageCarousel from '@/components/restaurant/ImageCarousel';
import { OrderForm } from '@/components/restaurant/OrderForm';
import ReviewsModal from '@/components/restaurant/ReviewsModal';
import SpecialsSection from '@/components/restaurant/SpecialsSection';
import StickyCTA from '@/components/ui/StickyCTA';
import { useIntersectionObserver } from '@/lib/hooks/useIntersectionObserver';
import { Restaurant } from '@/lib/types/restaurant';
import { getSafeImageUrl } from '@/lib/utils/imageUrlValidator';
import { processRestaurantImages } from '@/lib/utils/imageValidation';
import { 
  getBusinessTypeDisplayName, 
  getBusinessTypeIcon, 
  getBusinessTypeColor
} from '@/lib/utils/reviewUtils';
import { commonTypography } from '@/lib/utils/typography';
import { getRestaurant } from '@/lib/api/restaurants';

const RestaurantDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);


  // Intersection observers for animations
  const { ref: specialsSectionRef } = useIntersectionObserver();

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const restaurantId = parseInt(params?.['id'] as string);
        if (isNaN(restaurantId)) {
          throw new Error('Invalid restaurant ID');
        }
        
        const data = await getRestaurant(restaurantId);
        if (data) {
          setRestaurant(data);
          
          // Check if restaurant is in favorites
          const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
          setIsFavorite(favorites.includes(data.id));
        } else {
          throw new Error('Restaurant not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load restaurant');
      } finally {
        setLoading(false);
      }
    };

    if (params?.['id']) {
      fetchRestaurant();
    }
  }, [params]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getAgencyBadgeClass = (agency: string) => {
    switch (agency?.toUpperCase()) {
      case 'ORB':
        return 'bg-white text-blue-600 border border-blue-200';
      case 'KOSHER MIAMI':
        return 'bg-white text-green-600 border border-green-200';
      default:
        return 'bg-white text-gray-600 border border-gray-200';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const __getKosherBadgeClass = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'dairy':
        return 'bg-white text-blue-600 border border-blue-200';
      case 'meat':
        return 'bg-white text-red-600 border border-red-200';
      case 'pareve':
        return 'bg-white text-yellow-600 border border-yellow-200';
      default:
        return 'bg-white text-gray-600 border border-gray-200';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _getAllTags = (restaurant: Restaurant) => {
    const tags = [];
    
    // Certification agency
    if (restaurant.certifying_agency && restaurant.certifying_agency !== 'Unknown') {
      tags.push({
        text: restaurant.certifying_agency,
        className: 'text-blue-600'
      });
    }
    
    // Kosher category
    if (restaurant.kosher_category) {
      const category = restaurant.kosher_category.charAt(0).toUpperCase() + restaurant.kosher_category.slice(1);
      let categoryColor = 'text-gray-600';
      
      switch (restaurant.kosher_category.toLowerCase()) {
        case 'dairy':
          categoryColor = 'text-blue-600';
          break;
        case 'meat':
          categoryColor = 'text-red-600';
          break;
        case 'pareve':
          categoryColor = 'text-yellow-600';
          break;
      }
      
      tags.push({
        text: category,
        className: categoryColor
      });
    }
    
    // Dietary restrictions
    if (restaurant.is_cholov_yisroel) {
      tags.push({
        text: 'Chalav Yisroel',
        className: 'text-[#8a4a4a]'
      });
    } else if (restaurant.cholov_stam) {
      tags.push({
        text: 'Chalav Stam',
        className: 'text-[#8B4513]'
      });
    }
    
    if (restaurant.is_pas_yisroel) {
      tags.push({
        text: 'Pas Yisroel',
        className: 'text-[#1a4a2a]'
      });
    }
    
    return tags;
  };

  const formatCompleteAddress = (restaurant: Restaurant) => {
    const parts: string[] = [];
    if (restaurant.address) {
      parts.push(restaurant.address);
    }
    if (restaurant.city) {
      parts.push(restaurant.city);
    }
    if (restaurant.state) {
      parts.push(restaurant.state);
    }
    if (restaurant.zip_code) {
      parts.push(restaurant.zip_code);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
  };

  const getRestaurantImages = (restaurant: Restaurant) => {
    const images: string[] = [];
    
    // Add main image if available (sanitize the URL first)
    if (restaurant.image_url) {
      const safeImageUrl = getSafeImageUrl(restaurant.image_url);
      if (safeImageUrl && !safeImageUrl.endsWith('/default-restaurant.webp')) {
        images.push(safeImageUrl);
      }
    }
    
    // Add additional images if available (sanitize each URL)
    if (restaurant.additional_images && Array.isArray(restaurant.additional_images)) {
      const safeAdditionalImages = restaurant.additional_images
        .map(url => getSafeImageUrl(url))
        .filter(url => !!url && !url.endsWith('/default-restaurant.webp'));
      images.push(...safeAdditionalImages);
    }
    
    // If we have at least one Cloudinary image, return only Cloudinary images (policy)
    if (images.length > 0) {
      return processRestaurantImages(images, restaurant.kosher_category, images.length);
    }
    // No images: use a single placeholder
    return processRestaurantImages([], restaurant.kosher_category, 1);
  };

  const getPriceRange = (restaurant: Restaurant) => {
    return restaurant.price_range || 'Price not available';
  };

  const getRating = (restaurant: Restaurant) => {
    return restaurant.rating || restaurant.star_rating || restaurant.google_rating || 'N/A';
  };

  const getReviewCount = (restaurant: Restaurant) => {
    return restaurant.review_count || restaurant.google_review_count || 0;
  };

  const toggleFavorite = () => {
    if (!restaurant) {
      return;
    }
    
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    const newFavorites = isFavorite 
      ? favorites.filter((id: number) => id !== restaurant.id)
      : [...favorites, restaurant.id];
    
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
  };

  const shareRestaurant = () => {
    if (!restaurant) {
      return;
    }
    
    if (navigator.share) {
      navigator.share({
        title: restaurant.name,
        text: `Check out ${restaurant.name} on Jewgo!`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };



  const handleOrderSubmit = async (_orderData: {
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    deliveryAddress: string;
    deliveryInstructions: string;
    orderType: 'pickup' | 'delivery';
    paymentMethod: 'cash' | 'card' | 'online';
    estimatedTime: string;
    items: Array<{
      id: string;
      name: string;
      price: number;
      quantity: number;
      specialInstructions?: string;
    }>;
  }) => {
    try {
      // TODO: Implement actual order submission to backend API endpoint
      if (process.env.NODE_ENV === 'development') {
        // Log order submission for debugging
        // console.log('Order submission (dev mode):', orderData);
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message
      alert('Order submitted successfully! You will receive a confirmation shortly.');
      setShowOrderForm(false);
    } catch {
      // // console.error('Order submission error:', error);
      throw new Error('Failed to submit order. Please try again.');
    }
  };

  // Sticky CTA handlers
  const handleOrderClick = () => {
    setShowOrderForm(true);
  };

  const handleCallClick = () => {
    if (restaurant?.phone_number) {
      window.open(`tel:${restaurant.phone_number}`, '_self');
    }
  };

  const handleWebsiteClick = () => {
    if (restaurant?.website) {
      window.open(restaurant.website, '_blank', 'noopener,noreferrer');
    }
  };

  const handleFavoriteClick = () => {
    toggleFavorite();
  };

  // Back navigation with fallback to /eatery
  const handleBack = () => {
    if (typeof window !== 'undefined') {
      const hasHistory = window.history.length > 1;
      const referrer = document.referrer;
      let isSameOriginReferrer = false;
      if (referrer) {
        try {
          isSameOriginReferrer = new URL(referrer).origin === window.location.origin;
        } catch {
          isSameOriginReferrer = false;
        }
      }
      if (hasHistory && isSameOriginReferrer) {
        router.back();
        return;
      }
    }
    router.push('/eatery');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🍽️</div>
          <h1 className={`${commonTypography.detailTitle} mb-2`}>Loading...</h1>
          <p className="text-gray-600">Loading restaurant details...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🍽️</div>
          <h1 className={`${commonTypography.detailTitle} mb-2`}>Restaurant Not Found</h1>
          <p className={`${commonTypography.bodyText} mb-6`}>
            {error || 'The restaurant you\'re looking for doesn\'t exist or the data is incomplete.'}
          </p>
          <div className="space-y-2 mb-6">
            <p className="text-sm text-gray-500">Debug Info:</p>
            <p className="text-xs text-gray-400">Error: {error || 'None'}</p>
            <p className="text-xs text-gray-400">Restaurant: {restaurant ? 'Loaded' : 'Not loaded'}</p>
            <p className="text-xs text-gray-400">ID: {params?.['id']}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="bg-green-600 text-white px-6 py-3 rounded-full font-medium hover:bg-green-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-white">
      {/* Hero Image Carousel Section */}
      <div className="relative restaurant-hero-section">
        <ImageCarousel
          images={getRestaurantImages(restaurant)}
          restaurantName={restaurant.name}
          kosherCategory={restaurant.kosher_category}
          className="h-[calc(33vh+10px)] min-h-[310px] max-h-[510px]"
        />
        
        {/* Overlay with unified pill (includes back button) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-6 left-3 right-3 flex items-center justify-center pointer-events-auto">
            {/* Unified pill with tags and action buttons - centered and responsive */}
            <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg px-3 sm:px-4 py-2 flex items-center gap-2 sm:gap-3 w-auto max-w-[min(92vw,680px)]">
              {/* Back button inside pill */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  aria-label="Go back"
                  onClick={handleBack}
                  className="w-8 h-8 flex items-center justify-center transition-all duration-200 rounded-full hover:bg-gray-100 text-gray-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Divider */}
              <div className="w-px h-4 bg-gray-300 flex-shrink-0"></div>

              {/* Tags section - agency and type only */}
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-1">
                {/* Kosher Agency */}
                {restaurant.certifying_agency && (
                  <span className="text-xs sm:text-sm font-bold text-blue-600 whitespace-nowrap truncate">
                    {restaurant.certifying_agency}
                  </span>
                )}
                
                {/* Separator between agency and type */}
                {restaurant.certifying_agency && restaurant.kosher_category && (
                  <span className="text-gray-300 text-xs">•</span>
                )}
                
                {/* Kosher Category/Type */}
                {restaurant.kosher_category && (
                  <span className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
                    restaurant.kosher_category.toLowerCase() === 'dairy' ? 'text-blue-500' :
                    restaurant.kosher_category.toLowerCase() === 'meat' ? 'text-red-600' :
                    restaurant.kosher_category.toLowerCase() === 'pareve' ? 'text-yellow-600' :
                    'text-gray-600'
                  }`}>
                    {restaurant.kosher_category.charAt(0).toUpperCase() + restaurant.kosher_category.slice(1)}
                  </span>
                )}
              </div>
              
              {/* Divider */}
              {(restaurant.certifying_agency || restaurant.kosher_category) && (
                <div className="w-px h-4 bg-gray-300 flex-shrink-0"></div>
              )}
              
              {/* Action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0 pl-1">
                <button
                  onClick={toggleFavorite}
                  className={`w-8 h-8 flex items-center justify-center transition-all duration-200 rounded-full hover:bg-gray-100 ${
                    isFavorite ? 'text-red-500' : 'text-gray-600'
                  }`}
                >
                  <svg className="w-5 h-5" fill={isFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                  </svg>
                </button>
                <button
                  onClick={shareRestaurant}
                  className="w-8 h-8 flex items-center justify-center transition-all duration-200 text-gray-600 rounded-full hover:bg-gray-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Restaurant Details Section - White Card with enhanced overlap effect */}
      <div 
        className="bg-white restaurant-details-card relative -mt-24 sm:-mt-20 md:-mt-24 lg:-mt-28 xl:-mt-32 z-10 shadow-lg" 
        style={{
          borderTopLeftRadius: '32px',
          borderTopRightRadius: '32px',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10,
          // Force rounded corners on mobile with explicit styling
          ...(typeof window !== 'undefined' && window.innerWidth <= 768 && {
            borderTopLeftRadius: '32px',
            borderTopRightRadius: '32px',
            WebkitBorderTopLeftRadius: '32px',
            WebkitBorderTopRightRadius: '32px',
            MozBorderRadiusTopLeft: '32px',
            MozBorderRadiusTopRight: '32px'
          })
        }}
      >
        <div
          className="restaurant-dynamic-layout pt-16 sm:pt-10 md:pt-12 lg:pt-16 xl:pt-20 pb-24 max-w-screen-md mx-auto"
          style={{
            // Ensure content never gets hidden behind the fixed bottom navigation
            // and floating StickyCTA, including iOS safe area
            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 9rem)'
          }}
        >
          {/* Restaurant Name */}
          <h1 className="dynamic-text-2xl font-bold text-gray-900 leading-tight text-center mb-2 px-4">
            {restaurant.name || 'Restaurant Name Not Available'}
          </h1>



          {/* Address - clickable with map choice prompt */}
          <div className="flex justify-center mb-2 px-4">
            <button
              onClick={() => {
                const address = encodeURIComponent(formatCompleteAddress(restaurant));
                const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${address}`;
                const appleMapsUrl = `https://maps.apple.com/?q=${address}`;

                // Detect iOS devices and default to Apple Maps without blocking confirm()
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                if (isIOS) {
                  window.open(appleMapsUrl, '_blank');
                  return;
                }

                // Other platforms default to Google Maps
                window.open(googleMapsUrl, '_blank');
              }}
              className="text-green-600 dynamic-text-sm font-medium text-center hover:text-green-700 hover:underline transition-colors cursor-pointer break-words"
              title="Open in Maps"
            >
              {formatCompleteAddress(restaurant)}
            </button>
          </div>

          {/* Debug info - remove this after testing */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400 text-center mb-2 px-4">
              Debug: Name=&quot;{restaurant.name}&quot;, Address=&quot;{restaurant.address}&quot;, City=&quot;{restaurant.city}&quot;
            </div>
          )}

          {/* Hours - enhanced expandable display */}
          <div className="flex justify-center mb-3 px-4">
            <div className="w-full max-w-md">
              <EnhancedHoursDisplay restaurantId={restaurant.id} className="mx-auto" showTimezone={false} />
            </div>
          </div>

          {/* Certification Tags */}
          {(restaurant.is_cholov_yisroel || restaurant.is_pas_yisroel) && (
            <div className="flex justify-center mb-3 px-4">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {restaurant.is_cholov_yisroel && (
                  <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-200">
                    Cholov Yisroel
                  </span>
                )}
                {restaurant.is_pas_yisroel && (
                  <span className="inline-block px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                    Pas Yisroel
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Business Type Badge */}
          {restaurant.business_types && restaurant.business_types !== 'None' && (
            <div className="flex justify-center mb-3 px-4">
              <span className={`inline-block px-3 py-1.5 text-sm font-medium rounded-full shadow-sm ${getBusinessTypeColor(restaurant.business_types)}`}>
                <span className="mr-1.5">{getBusinessTypeIcon(restaurant.business_types)}</span>
                {getBusinessTypeDisplayName(restaurant.business_types)}
              </span>
            </div>
          )}

          {/* Price, Rating, and Reviews - Compact layout */}
          <div className="flex items-center justify-center space-x-2 sm:space-x-4 dynamic-text-sm mb-3 px-4 flex-wrap">
            <span className="text-gray-900 font-medium">{getPriceRange(restaurant)}</span>
            <span className="text-gray-400 hidden sm:inline">•</span>
            <div className="flex items-center">
              <svg className="dynamic-icon-sm text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-gray-900 font-medium">{getRating(restaurant)}</span>
            </div>
            <span className="text-gray-400 hidden sm:inline">•</span>
            {/* Reviews link - clickable to open reviews modal */}
            {(() => {
              const reviewCount = getReviewCount(restaurant);
              return (
                <button
                  onClick={() => setShowReviewsModal(true)}
                  className="text-gray-600 text-xs sm:text-sm underline hover:text-gray-800 cursor-pointer"
                  aria-label="View reviews"
                >
                  {reviewCount} Reviews
                </button>
              );
            })()}
          </div>

          {/* Short Description */}
          {restaurant.short_description && (
            <div className="px-6 sm:px-8 mb-3">
              <p className="dynamic-text-sm text-gray-700 text-center leading-snug">
                {restaurant.short_description}
              </p>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 mb-3 mx-4"></div>

          {/* Specials Section */}
          <div ref={specialsSectionRef} className="mt-1 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <SpecialsSection 
              specials={restaurant.specials || []} 
            />
          </div>

          {/* Action Bar - 4 buttons with proper styling (align to container width) */}
          <div className="flex justify-center items-center gap-2 sm:gap-4 px-4 mt-4 sm:mt-6 md:mt-8 max-w-screen-md mx-auto">
            {restaurant.website ? (
              <a
                href={restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 md:max-w-[120px] bg-black text-white rounded-full py-2.5 sm:py-2 px-3 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:opacity-90 transition-opacity font-semibold text-xs sm:text-sm"
              >
                <Globe2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Website</span>
              </a>
            ) : (
              <button className="flex-1 md:max-w-[120px] bg-gray-300 text-gray-500 rounded-full py-2.5 sm:py-2 px-3 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 shadow-md cursor-not-allowed font-semibold text-xs sm:text-sm">
                <Globe2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Website</span>
              </button>
            )}

            <button 
              onClick={() => setShowOrderForm(true)}
              className="flex-1 md:max-w-[120px] bg-green-500 text-white rounded-full py-2.5 sm:py-2 px-3 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:opacity-90 transition-opacity font-semibold text-xs sm:text-sm"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
              </svg>
              <span>Order</span>
            </button>

            {restaurant.phone_number ? (
              <a
                href={`tel:${restaurant.phone_number}`}
                className="flex-1 md:max-w-[120px] bg-black text-white rounded-full py-2.5 sm:py-2 px-3 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 shadow-md hover:opacity-90 transition-opacity font-semibold text-xs sm:text-sm"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>
                <span>Call</span>
              </a>
            ) : (
              <button className="flex-1 md:max-w-[120px] bg-gray-300 text-gray-500 rounded-full py-2.5 sm:py-2 px-3 sm:px-4 flex items-center justify-center gap-1.5 sm:gap-2 shadow-md cursor-not-allowed font-semibold text-xs sm:text-sm">
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                </svg>
                <span>Call</span>
              </button>
            )}
          </div>

          {/* Removed on-page reviews per new design */}
        </div>
      </div>

      {/* Sticky CTA - Follows user as they scroll */}
      <StickyCTA
        restaurant={{
          name: restaurant.name,
          phone_number: restaurant.phone_number,
          website: restaurant.website
        }}
        onOrderClick={handleOrderClick}
        onCallClick={handleCallClick}
        onWebsiteClick={handleWebsiteClick}
        onFavoriteClick={handleFavoriteClick}
        isFavorite={isFavorite}
      />



      {/* Order Form Modal */}
      {showOrderForm && restaurant && (
        <OrderForm
          restaurant={restaurant}
          onOrderSubmit={handleOrderSubmit}
          onClose={() => setShowOrderForm(false)}
        />
      )}

      {/* Reviews Modal */}
      {showReviewsModal && restaurant && (
        <ReviewsModal
          isOpen={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
          restaurant={restaurant}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default RestaurantDetailPage; 