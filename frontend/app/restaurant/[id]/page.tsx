"use client"

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { SAMPLE_RESTAURANT_DATASET, RestaurantDataset } from '@/lib/data/restaurant-dataset'
import YesNoNotesDisplay from '@/components/data-display/YesNoNotesDisplay'
import Header from '@/components/layout/Header'
import { MapPinIcon, PhoneIcon, GlobeAltIcon } from '@heroicons/react/24/outline'

export default function RestaurantDetailPage() {
  const params = useParams()
  const [restaurant, setRestaurant] = useState<RestaurantDataset | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const restaurantId = parseInt(params.id as string)
    const foundRestaurant = SAMPLE_RESTAURANT_DATASET.find(r => r.id === restaurantId)
    
    if (foundRestaurant) {
      setRestaurant(foundRestaurant)
    }
    setLoading(false)
  }, [params.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Restaurant Not Found</h1>
            <p className="text-gray-600">The restaurant you&apos;re looking for doesn&apos;t exist.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Restaurant Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
              <div className="flex items-center space-x-4 text-gray-600 mb-4">
                <div className="flex items-center space-x-1">
                  <MapPinIcon className="h-5 w-5" />
                  <span>{restaurant.address}, {restaurant.city}, {restaurant.state} {restaurant.zip_code}</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <PhoneIcon className="h-4 w-4" />
                  <span>{restaurant.phone_number}</span>
                </div>
                {restaurant.website && (
                  <div className="flex items-center space-x-1">
                    <GlobeAltIcon className="h-4 w-4" />
                    <a 
                      href={restaurant.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Website
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-2">
                {restaurant.kosher_category}
              </div>
              <div className="text-sm text-gray-600">
                {restaurant.certifying_agency}
              </div>
            </div>
          </div>
        </div>

        {/* Restaurant Details */}
        <YesNoNotesDisplay 
          dataFields={restaurant.data_fields}
          title="Restaurant Details & Features"
          showCategories={true}
          collapsible={true}
          maxItems={20}
        />

        {/* Additional Information */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Status</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                restaurant.status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : restaurant.status === 'inactive'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {restaurant.status.charAt(0).toUpperCase() + restaurant.status.slice(1)}
              </span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Last Updated</h3>
              <p className="text-sm text-gray-600">
                {new Date(restaurant.updated_at).toLocaleDateString()}
              </p>
            </div>
            {restaurant.latitude && restaurant.longitude && (
              <div className="md:col-span-2">
                <h3 className="font-medium text-gray-900 mb-2">Location</h3>
                <p className="text-sm text-gray-600">
                  Coordinates: {restaurant.latitude.toFixed(6)}, {restaurant.longitude.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {restaurant.data_fields.filter(f => f.value === 'Yes').length}
              </div>
              <div className="text-sm text-gray-600">Available Features</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {restaurant.data_fields.filter(f => f.value === 'No').length}
              </div>
              <div className="text-sm text-gray-600">Not Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {restaurant.data_fields.filter(f => f.value !== 'Yes' && f.value !== 'No').length}
              </div>
              <div className="text-sm text-gray-600">Special Cases</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {restaurant.data_fields.filter(f => f.notes).length}
              </div>
              <div className="text-sm text-gray-600">With Notes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
