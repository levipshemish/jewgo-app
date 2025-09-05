import { MikvahDB, ListingData, UserLocation } from '@/types/listing'
import { 
  calculateDistance, 
  formatHoursForPopup, 
  openImageCarousel, 
  openDirections, 
  handleOrder, 
  handleFavorite, 
  handleShare, 
  handleEmail,
  handleTagClick,
  formatPriceRange,
  formatRating
} from './eatery-helpers'

/**
 * Map mikvah database data to listing utility format
 */
export function mapMikvahToListingData(
  mikvah: MikvahDB, 
  userLocation?: UserLocation | null,
  reviews?: any[],
  onLocationRequest?: () => void,
  locationPermission?: 'granted' | 'denied' | 'prompt' | 'unknown'
): ListingData {
  
  // Debug logging
  console.log('=== MIKVAH MAPPING DEBUG ===')
  console.log('Mikvah images:', mikvah.images)
  console.log('Mikvah image_url:', mikvah.image_url)
  console.log('User location:', userLocation)
  console.log('Mikvah location:', mikvah.location)
  console.log('Location permission:', locationPermission)
  console.log('========================')
  
  const result = {
    // Header Section - Remove title from header, only show kosher info and stats
    header: {
      kosherType: mikvah.kosher_type,
      kosherAgency: mikvah.kosher_agency,
      viewCount: mikvah.stats.view_count,
      shareCount: mikvah.stats.share_count,
      onBack: () => {
        // This would typically use Next.js router
        if (typeof window !== 'undefined') {
          window.history.back()
        }
      },
      isFavorited: false, // TODO: Connect to user favorites
      onFavorite: () => handleFavorite(mikvah.id),
    },

    // Image Section
    image: {
      src: (() => {
        const src = mikvah.images?.[0] || mikvah.image_url || '/images/default-mikvah.jpg'
        console.log('Mikvah image src:', src)
        return src
      })(),
      alt: `${mikvah.name} - ${mikvah.kosher_type || 'Kosher'} Mikvah`,
      allImages: (() => {
        const allImages = mikvah.images || [mikvah.image_url].filter(Boolean)
        console.log('All mikvah images for gallery:', allImages)
        return allImages
      })(),
      onAction: () => {
        // This will trigger the gallery view in ListingImage component
        console.log('View gallery clicked for:', mikvah.name)
      }
    },

    // Content Section
    content: {
      leftText: mikvah.name,
      rightText: formatRating(mikvah.rating),
      leftAction: mikvah.fee_amount > 0 ? `$${mikvah.fee_amount}` : 'Free',
      rightAction: userLocation ? calculateDistance(mikvah.location, userLocation) : undefined,
      leftBold: true, // Mikvah name should be bold
      rightBold: false,
      leftIcon: undefined,
      rightIcon: undefined, // Remove icon from rating line
      onLeftAction: undefined,
      onRightAction: userLocation ? () => openDirections(mikvah.location) : undefined,
      // Make rating clickable for reviews
      onRightTextClick: () => {
        // Use real review data from API
        if (mikvah.reviews?.google_reviews) {
          try {
            const reviews = JSON.parse(mikvah.reviews.google_reviews)
            console.log('Reviews for', mikvah.name, ':', reviews)
            
            // Format reviews for display
            const formattedReviews = reviews.map((review: any) => ({
              author: review.author,
              rating: review.rating,
              text: review.text,
              time: new Date(review.time * 1000).toLocaleDateString()
            }))
            
            // For now, show in console. In a real app, this would open a reviews popup
            console.table(formattedReviews)
            alert(`Reviews for ${mikvah.name}:\n\n${formattedReviews.map((r: any) => `${r.author} (${r.rating}/5): ${r.text}`).join('\n\n')}`)
          } catch (error) {
            console.error('Error parsing reviews:', error)
            alert(`Reviews for ${mikvah.name} - Unable to load reviews at this time`)
          }
        } else {
          alert(`Reviews for ${mikvah.name} - No reviews available`)
        }
      },
    },

    // Actions Section
    actions: {
      // Primary Action (Book Appointment - conditional)
      primaryAction: mikvah.requires_appointment ? {
        label: "Book Appointment",
        onClick: () => {
          if (mikvah.appointment_phone) {
            window.location.href = `tel:${mikvah.appointment_phone}`
          } else if (mikvah.appointment_website) {
            window.open(mikvah.appointment_website, '_blank')
          } else {
            alert('Please call to book an appointment')
          }
        },
      } : undefined,

      // Secondary Actions - Website, Call, Email in order
      secondaryActions: [
        ...(mikvah.contact.website ? [{
          label: "Website",
          onClick: () => window.open(mikvah.contact.website, '_blank'),
        }] : []),
        ...(mikvah.contact.phone ? [{
          label: "Call",
          onClick: () => window.location.href = `tel:${mikvah.contact.phone}`,
        }] : []),
        {
          label: "Email",
          onClick: () => handleEmail(mikvah.contact.email),
        },
      ].slice(0, 3), // Max 3 secondary actions

      // Tags (Mikvah info)
      tags: [
        mikvah.mikvah_type,
        mikvah.mikvah_category,
        mikvah.kosher_agency,
      ].filter((tag): tag is string => Boolean(tag)).slice(0, 3), // Max 3 tags

      onTagClick: (tag) => handleTagClick(tag),

      // Bottom Action (Hours)
      bottomAction: {
        label: "Hours",
        onClick: () => {
          // The hours popup is handled by the ListingActions component
          // when hoursInfo is provided
        },
        hoursInfo: {
          title: `${mikvah.name} Hours`,
          hours: formatHoursForPopup(mikvah.hours),
        },
      },
    },

    // Additional text sections
    address: mikvah.address,
    description: mikvah.short_description || mikvah.description,
    location: mikvah.location,
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
  
  console.log('Mikvah mapping reviews:', reviews)
  console.log('Mapped mikvah reviews:', result.reviews)
  return result
}

/**
 * Format hours for popup display
 */
function formatHoursForPopup(hours: MikvahDB['hours']): Array<{ day: string; time: string }> {
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
    const dayHours = hours[key as keyof MikvahDB['hours']]
    let time = 'Closed'
    
    if (!dayHours.closed && dayHours.open && dayHours.close) {
      time = `${dayHours.open} - ${dayHours.close}`
    }
    
    return { day: label, time }
  })
}
