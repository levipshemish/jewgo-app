"use client"

import React, { useState } from 'react'
import { ListingPage, ListingData } from '@/components/listing-details-utility/listing-page'
import Header from '@/components/layout/Header'
import { useAuth } from '@/contexts/AuthContext'
import { submitReview } from '@/lib/api/review-api'

// Mock review data for testing
const mockReviews = [
  {
    id: '1',
    user: 'John Doe',
    rating: 5,
    comment: 'Excellent kosher restaurant with amazing food and great service!',
    date: '2025-09-15T10:30:00Z',
    source: 'user' as const,
    profile_photo_url: null,
    relative_time_description: '4 days ago'
  },
  {
    id: '2', 
    user: 'Sarah Cohen',
    rating: 4,
    comment: 'Good food and atmosphere, but service was a bit slow.',
    date: '2025-09-14T15:45:00Z',
    source: 'user' as const,
    profile_photo_url: null,
    relative_time_description: '5 days ago'
  },
  {
    id: '3',
    user: 'Mike Goldberg',
    rating: 5,
    comment: 'Perfect for family dining. Kids loved it!',
    date: '2025-09-13T19:20:00Z',
    source: 'google' as const,
    profile_photo_url: null,
    relative_time_description: '6 days ago'
  }
]

export default function TestReviewsPage() {
  const { user, isAuthenticated, login, logout } = useAuth()
  const [reviews, setReviews] = useState(mockReviews)
  const [isLoading, setIsLoading] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [email, setEmail] = useState('admin@jewgo.com')
  const [password, setPassword] = useState('Admin123!')

  // Test data for the listing
  const testListingData: ListingData = {
    header: {
      title: 'Test Restaurant - Reviews Demo',
      restaurantId: 1, // This will be used for review submission
      kosherType: 'Glatt Kosher',
      kosherAgency: 'OU',
      kosherAgencyWebsite: 'https://ou.org'
    },
    image: {
      src: '/api/placeholder/400/300',
      alt: 'Test Restaurant',
      actionLabel: 'View Menu'
    },
    content: {
      leftText: 'Test Restaurant',
      rightText: '4.7',
      leftAction: 'Reviews',
      rightAction: 'Write Review',
      leftBold: true,
      rightBold: false,
      leftIcon: 'star',
      rightIcon: 'star',
      restaurantId: 1 // This is the key prop for review submission
    },
    address: '123 Test Street, Test City, NY 12345',
    description: 'This is a test restaurant for demonstrating the review submission functionality.',
    reviews: reviews,
    reviewsPagination: {
      total: reviews.length,
      limit: 10,
      offset: 0,
      hasMore: false,
      currentPage: 1,
      totalPages: 1
    },
    onLoadMoreReviews: () => {
      console.log('Load more reviews clicked')
      // In a real app, this would fetch more reviews from the API
    },
    reviewsLoading: isLoading
  }

  const handleReviewSubmit = async (reviewData: { rating: number; comment: string }) => {
    console.log('Review submitted:', reviewData)
    
    if (!isAuthenticated()) {
      setTestMessage('❌ Authentication required to submit reviews')
      return
    }

    try {
      // Test actual API submission
      const response = await submitReview({
        rating: reviewData.rating,
        content: reviewData.comment,
        entity_type: 'restaurants',
        entity_id: 1
      })
      
      console.log('API Response:', response)
      setTestMessage(`✅ Review submitted successfully!\nStatus: ${response.moderation_status}\nMessage: ${response.message}`)
      
      // Add to local state for UI update
      const newReview = {
        id: `test-${Date.now()}`,
        user: user?.email || 'Authenticated User',
        rating: reviewData.rating,
        comment: reviewData.comment,
        date: new Date().toISOString(),
        source: 'user' as const,
        profile_photo_url: null,
        relative_time_description: 'Just now'
      }
      
      setReviews(prev => [newReview, ...prev])
      
    } catch (error) {
      console.error('Review submission error:', error)
      setTestMessage(`❌ Review submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleLogin = async () => {
    try {
      await login(email, password)
      setTestMessage('✅ Login successful! You can now submit reviews.')
    } catch (error: any) {
      setTestMessage(`❌ Login failed: ${error.message}`)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      setTestMessage('✅ Logout successful!')
    } catch (error: any) {
      setTestMessage(`❌ Logout failed: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-md mx-auto">
        {/* Authentication Status */}
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg m-4">
          <h2 className="text-lg font-semibold text-green-900 mb-2">Authentication Status</h2>
          <div className="text-sm text-green-700 mb-4">
            <p><strong>Authenticated:</strong> {isAuthenticated() ? '✅ Yes' : '❌ No'}</p>
            <p><strong>User:</strong> {user ? user.email : 'None'}</p>
            <p><strong>Roles:</strong> {user ? user.roles.join(', ') : 'None'}</p>
          </div>
          
          {!isAuthenticated() ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-green-800 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-green-800 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <button
                onClick={handleLogin}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-xs font-medium"
              >
                Login to Test Reviews
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-medium"
            >
              Logout
            </button>
          )}
        </div>

        {/* Test Results */}
        {testMessage && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg m-4">
            <h3 className="text-sm font-semibold text-yellow-900 mb-2">Test Results</h3>
            <pre className="text-xs text-yellow-700 whitespace-pre-wrap">{testMessage}</pre>
          </div>
        )}

        {/* API Info */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg m-4">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Review Submission Test</h2>
          <p className="text-sm text-blue-700 mb-4">
            This page tests the complete review submission functionality. 
            Click "Write Review" to test the ReviewsPopup component.
          </p>
          <div className="text-xs text-blue-600">
            <p><strong>Restaurant ID:</strong> {testListingData.content?.restaurantId}</p>
            <p><strong>API Endpoint:</strong> /api/v5/reviews</p>
            <p><strong>Authentication:</strong> {isAuthenticated() ? '✅ Authenticated' : '❌ Required'}</p>
          </div>
        </div>

        <ListingPage 
          data={testListingData}
          loading={false}
          error={null}
        />
        
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg m-4">
          <h3 className="text-md font-semibold text-yellow-900 mb-2">Test Instructions:</h3>
          <ol className="text-sm text-yellow-700 space-y-1">
            <li>1. {isAuthenticated() ? '✅' : '❌'} Login with admin credentials above</li>
            <li>2. Click "Write Review" button in the listing below</li>
            <li>3. Select a rating (1-5 stars)</li>
            <li>4. Write a review comment</li>
            <li>5. Click "Submit Review"</li>
            <li>6. Check browser console for API calls</li>
            <li>7. Verify success/error messages in test results above</li>
          </ol>
        </div>

        <div className="p-4 bg-gray-100 border border-gray-300 rounded-lg m-4">
          <h3 className="text-md font-semibold text-gray-900 mb-2">Current Reviews:</h3>
          <div className="space-y-2">
            {reviews.map(review => (
              <div key={review.id} className="text-sm text-gray-700 p-2 bg-white rounded border">
                <div className="font-medium">{review.user}</div>
                <div className="text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</div>
                <div>{review.comment}</div>
                <div className="text-xs text-gray-500">{review.relative_time_description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
