'use client';

import { Heart, MapPin, Clock, User, Building } from 'lucide-react';
import React, { useState } from 'react';

import { MarketplaceListing } from '@/lib/types/marketplace';

interface MarketplaceListingCardProps {
  listing: MarketplaceListing;
  onClick?: () => void;
  className?: string;
  showEndorsements?: boolean;
}

export default function MarketplaceListingCard({
  listing,
  onClick,
  className = "",
  showEndorsements = true
}: MarketplaceListingCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  const formatPrice = (priceCents: number, currency: string) => {
    if (priceCents === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(priceCents / 100);
  };

  const getListingTypeIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return '💰';
      case 'free':
        return '🎁';
      case 'borrow':
        return '📚';
      case 'gemach':
        return '🤝';
      default:
        return '🛍️';
    }
  };

  const getListingTypeColor = (type: string) => {
    switch (type) {
      case 'sale':
        return 'bg-green-100 text-green-800';
      case 'free':
        return 'bg-blue-100 text-blue-800';
      case 'borrow':
        return 'bg-purple-100 text-purple-800';
      case 'gemach':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition?: string) => {
    switch (condition) {
      case 'new':
        return 'bg-green-100 text-green-800';
      case 'used_like_new':
        return 'bg-blue-100 text-blue-800';
      case 'used_good':
        return 'bg-yellow-100 text-yellow-800';
      case 'used_fair':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${className}`}
    >
      {/* Image placeholder */}
      <div className="aspect-square bg-gray-100 flex items-center justify-center">
        <div className="text-4xl text-gray-400">
          {getListingTypeIcon(listing.type)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {listing.title}
            </h3>
          </div>
          
          <button
            onClick={handleLikeClick}
            className={`ml-2 p-1 rounded-full transition-colors ${
              isLiked 
                ? 'text-red-500 bg-red-50' 
                : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Price and Type */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(listing.price_cents, listing.currency)}
          </span>
          
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getListingTypeColor(listing.type)}`}>
            {listing.type.charAt(0).toUpperCase() + listing.type.slice(1)}
          </span>
        </div>

        {/* Description */}
        {listing.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {listing.description}
          </p>
        )}

        {/* Condition */}
        {listing.condition && (
          <div className="mb-3">
            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getConditionColor(listing.condition)}`}>
              {listing.condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
        )}

        {/* Location */}
        {listing.city && (
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="truncate">
              {listing.city}{listing.region && `, ${listing.region}`}
            </span>
          </div>
        )}

        {/* Seller */}
        {listing.seller_name && (
          <div className="flex items-center text-sm text-gray-500 mb-2">
            {listing.seller_type === 'gemach' ? (
              <Building className="w-4 h-4 mr-1 flex-shrink-0" />
            ) : listing.seller_type === 'user' ? (
              <User className="w-4 h-4 mr-1 flex-shrink-0" />
            ) : (
              <User className="w-4 h-4 mr-1 flex-shrink-0" />
            )}
            <span className="truncate">{listing.seller_name}</span>
          </div>
        )}

        {/* Endorsements */}
        {showEndorsements && (listing.endorse_up > 0 || listing.endorse_down > 0) && (
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <div className="flex items-center mr-4">
              <span className="text-green-600 mr-1">👍</span>
              <span>{listing.endorse_up}</span>
            </div>
            <div className="flex items-center">
              <span className="text-red-600 mr-1">👎</span>
              <span>{listing.endorse_down}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            <span>{formatTimeAgo(listing.created_at)}</span>
          </div>
          
          {listing.category && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {typeof listing.category === 'string' ? listing.category : listing.category.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
