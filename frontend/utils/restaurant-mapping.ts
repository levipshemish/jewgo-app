import { Restaurant } from '@/lib/types/restaurant';
import { ListingData } from '@/components/listing/listing-page';
import { formatDistance } from '@/lib/utils/distance';

export function mapRestaurantToListingData(
  restaurant: Restaurant,
  userLocation?: { latitude: number; longitude: number }
): ListingData {
  // Calculate distance if user location is available
  let distance: string | undefined;
  if (userLocation && restaurant.latitude && restaurant.longitude) {
    const dist = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      restaurant.latitude,
      restaurant.longitude
    );
    distance = formatDistance(dist);
  }

  // Format kosher certification tags - matching the working test page design
  const kosherTags: string[] = [];
  if (restaurant.kosher_category) {
    kosherTags.push(restaurant.kosher_category);
  }
  if (restaurant.certifying_agency) {
    kosherTags.push(restaurant.certifying_agency);
  }
  if (restaurant.is_cholov_yisroel) {
    kosherTags.push('Cholov Yisroel');
  }
  if (restaurant.is_pas_yisroel) {
    kosherTags.push('Pas Yisroel');
  }

  // Format address
  const address = [restaurant.address, restaurant.city, restaurant.state, restaurant.zip_code]
    .filter(Boolean)
    .join(', ');

  // Format hours for display
  const formatHours = (hours: any) => {
    if (typeof hours === 'string') return hours;
    if (hours?.hours_json) {
      try {
        const parsed = JSON.parse(hours.hours_json);
        return Object.entries(parsed)
          .map(([day, time]: [string, any]) => `${day}: ${time}`)
          .join('\n');
      } catch {
        return hours.hours_of_operation || 'Hours not available';
      }
    }
    return hours?.hours_of_operation || 'Hours not available';
  };

  // Create hours info structure
  const hoursInfo = {
    title: restaurant.name,
    hours: [
      { day: 'Monday', time: '9:00 AM - 10:00 PM' },
      { day: 'Tuesday', time: '9:00 AM - 10:00 PM' },
      { day: 'Wednesday', time: '9:00 AM - 10:00 PM' },
      { day: 'Thursday', time: '9:00 AM - 10:00 PM' },
      { day: 'Friday', time: '9:00 AM - 3:00 PM' },
      { day: 'Saturday', time: 'Closed' },
      { day: 'Sunday', time: '9:00 AM - 10:00 PM' },
    ]
  };

  return {
    title: restaurant.name,
    image: {
      src: restaurant.image_url || '/placeholder-restaurant.jpg',
      alt: restaurant.name,
      actionLabel: 'View Gallery',
      onAction: () => {
        // Handle image gallery action
        console.log('View gallery clicked');
      },
      allImages: restaurant.additional_images || [restaurant.image_url].filter(Boolean),
      viewCount: restaurant.review_count || 0
    },
    content: {
      leftText: restaurant.name,
      rightText: restaurant.google_rating ? restaurant.google_rating.toString() : undefined,
      leftAction: restaurant.price_range,
      rightAction: distance,
      leftBold: true,
      rightBold: false,
      leftIcon: undefined,
      rightIcon: distance ? 'map-pin' : undefined,
      onRightTextClick: () => {
        // Handle reviews popup
        console.log('Reviews clicked');
      }
    },
    actions: {
      primaryAction: restaurant.is_open ? {
        label: 'Order Now',
        onClick: () => {
          // Handle order action
          console.log('Order now clicked');
        }
      } : undefined,
      secondaryActions: [
        {
          label: 'Website',
          onClick: () => {
            if (restaurant.website) {
              window.open(restaurant.website, '_blank');
            }
          }
        },
        {
          label: 'Call',
          onClick: () => {
            if (restaurant.phone_number) {
              window.location.href = `tel:${restaurant.phone_number}`;
            }
          }
        },
        {
          label: 'Email',
          onClick: () => {
            // Handle email action - would need email field in restaurant data
            console.log('Email clicked');
          }
        }
      ],
      tags: kosherTags,
      onTagClick: (tag: string) => {
        console.log('Tag clicked:', tag);
      },
      bottomAction: {
        label: 'Hours',
        onClick: () => {
          // Handle hours popup
          console.log('Hours clicked');
        },
        hoursInfo
      }
    },
    header: {
      kosherType: restaurant.kosher_category,
      kosherAgency: restaurant.certifying_agency,
      shareCount: restaurant.google_review_count,
      onBack: () => {
        // Handle back navigation
        window.history.back();
      },
      onFavorite: () => {
        // Handle favorite action
        console.log('Favorite clicked');
      },
      isFavorited: false // Would need to check from favorites state
    },
    address,
    description: restaurant.short_description
  };
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}
