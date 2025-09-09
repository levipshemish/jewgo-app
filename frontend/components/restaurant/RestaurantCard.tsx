"use client"

import React from 'react'
import Link from 'next/link'
import { MapPinIcon, PhoneIcon, StarIcon } from '@heroicons/react/24/outline'
import { RestaurantDataset } from '@/lib/data/restaurant-dataset'

interface RestaurantCardProps {
  restaurant: RestaurantDataset;
  showDistance?: boolean;
  showRating?: boolean;
}

export function RestaurantCard({ restaurant, showDistance = true, showRating = true }: RestaurantCardProps) {
  const availableFeatures = restaurant.data_fields.filter(f => f.value === 'Yes').length
  const totalFeatures = restaurant.data_fields.length
  const featurePercentage = Math.round((availableFeatures / totalFeatures) * 100)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <Link 
              href={`/restaurant/${restaurant.id}`}
              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
            >
              {restaurant.name}
            </Link>
            <div className="flex items-center space-x-2 mt-1">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {restaurant.kosher_category}
              </span>
              <span className="text-xs text-gray-500">
                {restaurant.certifying_agency}
              </span>
            </div>
          </div>
          {showRating && (
            <div className="flex items-center space-x-1">
              <StarIcon className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium text-gray-900">
                {featurePercentage}%
              </span>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="flex items-center space-x-1 text-gray-600 mb-2">
          <MapPinIcon className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm truncate">
            {restaurant.city}, {restaurant.state}
          </span>
        </div>

        {/* Phone */}
        <div className="flex items-center space-x-1 text-gray-600 mb-3">
          <PhoneIcon className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm">{restaurant.phone_number}</span>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">
              {availableFeatures}
            </div>
            <div className="text-xs text-gray-600">Available</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-600">
              {restaurant.data_fields.filter(f => f.value === 'No').length}
            </div>
            <div className="text-xs text-gray-600">Not Available</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">
              {restaurant.data_fields.filter(f => f.notes).length}
            </div>
            <div className="text-xs text-gray-600">With Notes</div>
          </div>
        </div>

        {/* Top Features */}
        <div className="mb-3">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Top Features:</h4>
          <div className="flex flex-wrap gap-1">
            {restaurant.data_fields
              .filter(f => f.value === 'Yes')
              .slice(0, 3)
              .map((field, index) => (
                <span 
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-50 text-green-700 border border-green-200"
                >
                  {field.field}
                </span>
              ))}
            {availableFeatures > 3 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-50 text-gray-600 border border-gray-200">
                +{availableFeatures - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Link 
          href={`/restaurant/${restaurant.id}`}
          className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          View Full Details
        </Link>
      </div>
    </div>
  )
}

export default RestaurantCard