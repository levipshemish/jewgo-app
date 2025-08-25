import { Metadata } from 'next'

import { getSafeImageUrl } from '@/lib/utils/imageUrlValidator'

interface RestaurantLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    
    // Fetch restaurant data for metadata
    const apiUrl = process.env.NODE_ENV === 'production'
    ? 'https://jewgo-app-oyoh.onrender.com/api/restaurants'
    : 'http://localhost:8082/api/restaurants';
    
    const response = await fetch(`${apiUrl}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      return {
        title: 'Restaurant Not Found - Jewgo',
        description: 'The requested restaurant could not be found.',
      }
    }

    const data = await response.json()
    const restaurant = data.restaurant || data

    if (!restaurant) {
      return {
        title: 'Restaurant Not Found - Jewgo',
        description: 'The requested restaurant could not be found.',
      }
    }

    const title = `${restaurant.name} - Kosher Restaurant | Jewgo`
    const description = restaurant.short_description 
      ? `${restaurant.short_description} ${restaurant.address ? `Located in ${restaurant.address}.` : ''}`
      : `Visit ${restaurant.name}, a kosher restaurant${restaurant.address ? ` in ${restaurant.address}` : ''}. ${restaurant.certifying_agency ? `Certified by ${restaurant.certifying_agency}.` : ''}`
    
    // Sanitize image URL to avoid broken Cloudinary paths
    const safeImageUrl = getSafeImageUrl(restaurant.image_url)
    const imageUrl = (safeImageUrl && !safeImageUrl.endsWith('/default-restaurant.webp'))
      ? safeImageUrl
      : 'https://jewgo.com/og-image.jpg'

    return {
      title,
      description,
      keywords: `kosher restaurant, ${restaurant.name}, ${restaurant.kosher_category || 'kosher food'}, ${restaurant.certifying_agency || 'kosher certification'}, Jewish restaurant, kosher dining`,
      openGraph: {
        type: 'website',
        title,
        description,
        url: `https://jewgo.com/restaurant/${id}`,
        siteName: 'Jewgo',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: restaurant.name,
          },
        ],
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
        creator: '@jewgoapp',
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    }
  } catch {
    // // console.error('Error generating restaurant metadata:', error)
    return {
      title: 'Restaurant - Jewgo',
      description: 'Kosher restaurant information on Jewgo.',
    }
  }
}

export default function RestaurantLayout({ children }: RestaurantLayoutProps) {
  return children
} 