import { StoreDB, ListingData, UserLocation } from '@/types/listing'
import { 
  calculateDistance, 
  openDirections, 
  handleFavorite, 
  handleEmail,
  handleTagClick
} from './eatery-helpers'

/**
 * Map store database data to listing utility format
 */
export function mapStoreToListingData(
  store: StoreDB, 
  userLocation?: UserLocation | null,
  reviews?: any[],
  onLocationRequest?: () => void,
  locationPermission?: 'granted' | 'denied' | 'prompt' | 'unknown'
): ListingData {
  
  // Debug logging
  console.log('=== STORE MAPPING DEBUG ===')
  console.log('Store images:', store.images)
  console.log('Store image_url:', store.image_url)
  console.log('User location:', userLocation)
  console.log('Store location:', store.location)
  console.log('Location permission:', locationPermission)
  console.log('========================')
  
  const result = {
    // Header Section - Remove title from header, only show kosher info and stats
    header: {
      kosherType: store.kosher_type,
      kosherAgency: store.kosher_agency,
      viewCount: store.stats.view_count,
      shareCount: store.stats.share_count,
      onBack: () => {
        // This would typically use Next.js router
        if (typeof window !== 'undefined') {
          window.history.back()
        }
      },
      isFavorited: false, // TODO: Connect to user favorites
      onFavorite: () => handleFavorite(store.id),
    },

    // Image Section
    image: {
      src: (() => {
        const src = store.images?.[0] || store.image_url || '/images/default-store.jpg'
        console.log('Store image src:', src)
        return src
      })(),
      alt: `${store.name} - ${store.kosher_type || 'Kosher'} Store`,
      allImages: (() => {
        const allImages = store.images || [store.image_url].filter(Boolean)
        console.log('All store images for gallery:', allImages)
        return allImages
      })(),
      onAction: () => {
        // This will trigger the gallery view in ListingImage component
        console.log('View gallery clicked for:', store.name)
      }
    },

    // Content Section
    content: {
      leftText: store.name,
      rightText: formatRating(store.rating),
      leftAction: formatPriceRange(store.price_range),
      rightAction: userLocation ? calculateDistance(store.location, userLocation) : undefined,
      leftBold: true, // Store name should be bold
      rightBold: false,
      leftIcon: undefined,
      rightIcon: undefined, // Remove icon from rating line
      onLeftAction: undefined,
      onRightAction: userLocation ? () => openDirections(store.location) : undefined,
      // Make rating clickable for reviews
      onRightTextClick: () => {
        // Use real review data from API
        if (store.reviews?.google_reviews) {
          try {
            const parsedReviews = JSON.parse(store.reviews.google_reviews)
            console.log('Reviews for', store.name, ':', parsedReviews)
            
            // Format reviews for display
            const _formattedReviews = parsedReviews.map((review: any) => ({
              author: review.author,
              rating: review.rating,
              text: review.text,
              time: new Date(review.time * 1000).toLocaleDateString()
            }))
            
            // For now, show in alert. In a real app, this would open a reviews popup
            alert(`Reviews for ${store.name}:\n\n${formattedReviews.map((r: any) => `${r.author} (${r.rating}/5): ${r.text}`).join('\n\n')}`)
          } catch (_error) {
            // Error parsing reviews - show fallback message
            alert(`Reviews for ${store.name} - Unable to load reviews at this time`)
          }
        } else {
          alert(`Reviews for ${store.name} - No reviews available`)
        }
      },
    },

    // Actions Section
    actions: {
      // Primary Action (Order Now - conditional)
      primaryAction: store.admin_settings?.show_order_button ? {
        label: "Order Now",
        onClick: () => handleOrder(store.admin_settings.order_url),
      } : undefined,

      // Secondary Actions - Website, Call, Email in order
      secondaryActions: [
        ...(store.contact.website ? [{
          label: "Website",
          onClick: () => window.open(store.contact.website, '_blank'),
        }] : []),
        ...(store.contact.phone ? [{
          label: "Call",
          onClick: () => window.location.href = `tel:${store.contact.phone}`,
        }] : []),
        {
          label: "Email",
          onClick: () => handleEmail(store.contact.email),
        },
      ].slice(0, 3), // Max 3 secondary actions

      // Tags (Store info)
      tags: [
        store.store_type,
        store.kosher_type,
        store.kosher_agency,
      ].filter((tag): tag is string => Boolean(tag)).slice(0, 3), // Max 3 tags

      onTagClick: (tag: any) => handleTagClick(tag),

      // Bottom Action (Hours)
      bottomAction: {
        label: "Hours",
        onClick: () => {
          // The hours popup is handled by the ListingActions component
          // when hoursInfo is provided
        },
        hoursInfo: {
          title: `${store.name} Hours`,
          hours: formatHoursForPopup(store.hours),
        },
      },
    },

    // Additional text sections
    address: store.address,
    description: store.short_description || store.description,
    location: store.location,
    reviews: reviews?.map(review => ({
      id: review.id?.toString() || review.review_id?.toString() || Math.random().toString(),
      user: review.user_name || review.author_name || review.user || 'Anonymous',
      rating: review.rating || 0,
      comment: review.content || review.text || review.comment || '',
      date: review.created_at || review.time || review.date || new Date().toISOString(),
      source: review.source || 'user', // 'user' or 'google'
      profile_photo_url: review.profile_photo_url || null,
      relative_time_description: review.relative_time_description || null
    })) || [],
    reviewsPagination: undefined, // Will be set by the page component
    onLoadMoreReviews: undefined, // Will be set by the page component
    reviewsLoading: false
  }
  
  console.log('Store mapping reviews:', reviews)
  console.log('Mapped store reviews:', result.reviews)
  return result
}

/**
 * Format hours for popup display
 */
function formatHoursForPopup(hours: StoreDB['hours']): Array<{ day: string; time: string }> {
  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ]

  return days.map(({ key, label }) => {
    const dayHours = hours[key as keyof StoreDB['hours']]
    let time = 'Closed'
    
    if (!dayHours.closed && dayHours.open && dayHours.close) {
      time = `${dayHours.open} - ${dayHours.close}`
    }
    
    return { day: label, time }
  })
}
