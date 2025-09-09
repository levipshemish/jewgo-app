"use client"

import React, { useState, useMemo } from 'react'
import { SAMPLE_RESTAURANT_DATASET } from '@/lib/data/restaurant-dataset'
import RestaurantCard from '@/components/restaurant/RestaurantCard'
import Header from '@/components/layout/Header'
import { MagnifyingGlassIcon, FunnelIcon } from '@heroicons/react/24/outline'

export default function RestaurantsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState('name')

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['All', ...Array.from(new Set(SAMPLE_RESTAURANT_DATASET.map(r => r.kosher_category)))]
    return cats
  }, [])

  // Filter and sort restaurants
  const filteredRestaurants = useMemo(() => {
    const filtered = SAMPLE_RESTAURANT_DATASET.filter(restaurant => {
      const matchesSearch = restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           restaurant.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           restaurant.certifying_agency.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = selectedCategory === 'All' || restaurant.kosher_category === selectedCategory
      
      return matchesSearch && matchesCategory
    })

    // Sort restaurants
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'city':
          return a.city.localeCompare(b.city)
        case 'features':
          const aFeatures = a.data_fields.filter(f => f.value === 'Yes').length
          const bFeatures = b.data_fields.filter(f => f.value === 'Yes').length
          return bFeatures - aFeatures
        default:
          return 0
      }
    })

    return filtered
  }, [searchQuery, selectedCategory, sortBy])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Restaurants</h1>
          <p className="text-gray-600">
            Discover kosher restaurants with comprehensive details and features
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search restaurants..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="city">Sort by City</option>
              <option value="features">Sort by Features</option>
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredRestaurants.length} of {SAMPLE_RESTAURANT_DATASET.length} restaurants
            {searchQuery && ` matching "${searchQuery}"`}
            {selectedCategory !== 'All' && ` in ${selectedCategory}`}
          </p>
        </div>

        {/* Restaurant Grid */}
        {filteredRestaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                showDistance={true}
                showRating={true}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <MagnifyingGlassIcon className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-600">
              Try adjusting your search terms or filters
            </p>
          </div>
        )}

        {/* Dataset Information */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">About This Dataset</h2>
          <p className="text-blue-800 mb-4">
            This restaurant dataset includes comprehensive Yes/No/Notes information with over 100 fields covering:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Kosher Certification</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Certificate validity</li>
                <li>• Cholov Yisroel</li>
                <li>• Pas Yisroel</li>
                <li>• Multiple agencies</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Food & Services</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Food categories</li>
                <li>• Dietary restrictions</li>
                <li>• Service types</li>
                <li>• Payment options</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">Amenities</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Accessibility</li>
                <li>• Technology</li>
                <li>• Family features</li>
                <li>• Special services</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
