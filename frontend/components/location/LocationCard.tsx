'use client';

import { MapPin, Star, Phone, Home, Building2, Store } from 'lucide-react';
import React from 'react';

import { Restaurant } from '@/lib/types/restaurant';
import { getKosherCategoryBadgeClasses } from '@/lib/utils/colors';
import { titleCase } from '@/lib/utils/stringUtils';

interface LocationCardProps {
  location: Restaurant;
  type: 'mikvah' | 'shul' | 'store';
  onClick?: () => void;
}

export default function LocationCard({ location, type, onClick }: LocationCardProps) {
  const getIcon = () => {
    switch (type) {
      case 'mikvah':
        return <Home className="w-6 h-6 text-blue-600" />;
      case 'shul':
        return <Building2 className="w-6 h-6 text-purple-600" />;
      case 'store':
        return <Store className="w-6 h-6 text-green-600" />;
      default:
        return <MapPin className="w-6 h-6 text-gray-600" />;
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'mikvah':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'shul':
        return 'bg-purple-50 border-purple-200 hover:bg-purple-100';
      case 'store':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      default:
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  const getTypeText = () => {
    switch (type) {
      case 'mikvah':
        return 'Mikvah';
      case 'shul':
        return 'Synagogue';
      case 'store':
        return 'Store';
      default:
        return 'Location';
    }
  };

  // Using unified string formatting utility

  const getRating = () => {
    const rating = location.rating || location.star_rating || location.google_rating;
    return rating && rating > 0 ? rating : null;
  };

  return (
    <div 
      className={`bg-white rounded-2xl border-2 ${getTypeColor()} shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${onClick ? 'hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      {/* Header with Icon and Type */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-white shadow-sm">
              {getIcon()}
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {getTypeText()}
              </span>
            </div>
          </div>
          
          {/* Rating */}
          {getRating() && (
            <div className="flex items-center space-x-1 bg-white/80 rounded-lg px-2 py-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-semibold text-gray-800">
                {getRating()?.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Location Name */}
        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-2 group-hover:text-gray-700 transition-colors">
          {titleCase(location.name)}
        </h3>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {/* Location */}
        <div className="flex items-center text-sm text-gray-600 mb-2">
          <MapPin className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
          <span className="truncate">{location.city}, {location.state}</span>
        </div>

        {/* Phone Number */}
        {location.phone_number && (
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <Phone className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
            <span className="truncate">{location.phone_number}</span>
          </div>
        )}

        {/* Kosher Category */}
        {location.kosher_category && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getKosherCategoryBadgeClasses(location.kosher_category.toLowerCase() as 'meat' | 'dairy' | 'pareve', 'light')}`}>
              {titleCase(location.kosher_category)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 