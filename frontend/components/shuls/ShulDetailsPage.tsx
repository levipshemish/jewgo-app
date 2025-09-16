'use client';

import { useState } from 'react';
import { ArrowLeft, Heart, Share2, MapPin, Phone, Mail, Globe, Clock, Users, Car, Building2 } from 'lucide-react';
import { ShulListing } from '@/lib/types/shul';
import Image from 'next/image';

interface ShulDetailsPageProps {
  listing: ShulListing;
  onBack?: () => void;
  onLike?: (isLiked: boolean) => void;
  onShare?: () => void;
}

export default function ShulDetailsPage({
  listing,
  onBack,
  onLike,
  onShare
}: ShulDetailsPageProps) {
  const [showHoursPopup, setShowHoursPopup] = useState(false);

  const handleActionClick = (onClick: string) => {
    if (onClick.startsWith('tel:') || onClick.startsWith('mailto:') || onClick.startsWith('http')) {
      window.open(onClick, '_blank');
    } else {
      // Handle other actions
      console.log('Action clicked:', onClick);
    }
  };

  const handleBottomActionClick = (opens: string) => {
    if (opens === 'hoursPopup') {
      setShowHoursPopup(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {listing.backButton && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {listing.tags.shulCategory}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                {listing.tags.shulType}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{listing.viewCount} views</span>
              <span>{listing.shareCount} shares</span>
            </div>
            
            <div className="flex gap-2">
              {listing.showHeart && (
                <button
                  onClick={() => onLike?.(!listing.isLiked)}
                  className={`p-2 rounded-full transition-colors ${
                    listing.isLiked 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  aria-label={listing.isLiked ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className={`w-5 h-5 ${listing.isLiked ? 'fill-current' : ''}`} />
                </button>
              )}
              
              <button
                onClick={onShare}
                className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Hero Image */}
        <div className="relative w-full h-64 bg-gray-200 rounded-xl overflow-hidden">
          <Image
            src={listing.imageUrl}
            alt={listing.leftText}
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Title Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.leftText}</h1>
              {listing.rightText && (
                <p className="text-gray-600 mb-2">{listing.rightText}</p>
              )}
              {listing.leftAction && (
                <p className="text-gray-700 font-medium">Rabbi: {listing.leftAction}</p>
              )}
            </div>
            {listing.rightAction && (
              <div className="text-right">
                <span className="text-lg font-semibold text-blue-600">{listing.rightAction}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {listing.primaryAction && (
              <button
                onClick={() => handleActionClick(listing.primaryAction!.onClick)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {listing.primaryAction.label}
              </button>
            )}
            
            {listing.secondaryActions?.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action.onClick)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
              >
                {action.label === 'Call' && <Phone className="w-4 h-4" />}
                {action.label === 'Email' && <Mail className="w-4 h-4" />}
                {action.label === 'Website' && <Globe className="w-4 h-4" />}
                {action.label}
              </button>
            ))}

            {listing.bottomAction && (
              <button
                onClick={() => handleBottomActionClick(listing.bottomAction!.opens)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center gap-2"
              >
                <Clock className="w-4 h-4" />
                {listing.bottomAction.label}
              </button>
            )}
          </div>
        </div>

        {/* Address & Location */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location
          </h2>
          
          <div className="space-y-2">
            <p className="text-gray-700">{listing.address.line1}</p>
            {listing.address.line2 && (
              <p className="text-gray-700">{listing.address.line2}</p>
            )}
            <p className="text-gray-700">
              {listing.address.city}, {listing.address.state} {listing.address.zip}
            </p>
            {listing.address.country && listing.address.country !== 'USA' && (
              <p className="text-gray-700">{listing.address.country}</p>
            )}
          </div>

          {listing.locationLink && (
            <button
              onClick={() => window.open(listing.locationLink!, '_blank')}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <MapPin className="w-4 h-4" />
              Open in Maps
            </button>
          )}
        </div>

        {/* Description */}
        {listing.description && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
            <p className="text-gray-700 leading-relaxed">{listing.description}</p>
          </div>
        )}

        {/* Features */}
        {listing.features && Object.values(listing.features).some(Boolean) && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Amenities
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {listing.features.parking && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Car className="w-4 h-4" />
                  <span>Parking</span>
                </div>
              )}
              {listing.features.accessibleEntrance && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Users className="w-4 h-4" />
                  <span>Accessible Entrance</span>
                </div>
              )}
              {listing.features.kiddushRoom && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Building2 className="w-4 h-4" />
                  <span>Kiddush Room</span>
                </div>
              )}
              {listing.features.eventHall && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Building2 className="w-4 h-4" />
                  <span>Event Hall</span>
                </div>
              )}
              {listing.features.seforimLibrary && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Building2 className="w-4 h-4" />
                  <span>Seforim Library</span>
                </div>
              )}
              {listing.features.ezrasNashim && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Users className="w-4 h-4" />
                  <span>Ezras Nashim</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Info */}
        {listing.contacts && (listing.contacts.phone || listing.contacts.email || listing.contacts.website) && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact</h2>
            
            <div className="space-y-3">
              {listing.contacts.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <a href={`tel:${listing.contacts.phone}`} className="text-blue-600 hover:text-blue-700">
                    {listing.contacts.phone}
                  </a>
                </div>
              )}
              
              {listing.contacts.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <a href={`mailto:${listing.contacts.email}`} className="text-blue-600 hover:text-blue-700">
                    {listing.contacts.email}
                  </a>
                </div>
              )}
              
              {listing.contacts.website && (
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <a href={listing.contacts.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700">
                    Visit Website
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Verification Status */}
        {listing.moderation?.verified && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-800">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium">Verified Listing</span>
            </div>
            <p className="text-green-700 text-sm mt-1">
              This synagogue information has been verified and is up to date.
            </p>
          </div>
        )}
      </div>

      {/* Hours Popup */}
      {showHoursPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Prayer Times</h3>
                <button
                  onClick={() => setShowHoursPopup(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                {listing.prayerTimes.weekday && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Weekdays</h4>
                    <div className="space-y-1 text-sm text-gray-700">
                      {listing.prayerTimes.weekday.shacharis.times.length > 0 && (
                        <div>Shacharis: {listing.prayerTimes.weekday.shacharis.times.join(', ')}</div>
                      )}
                      {listing.prayerTimes.weekday.mincha.times.length > 0 && (
                        <div>Mincha: {listing.prayerTimes.weekday.mincha.times.join(', ')}</div>
                      )}
                      {listing.prayerTimes.weekday.maariv.times.length > 0 && (
                        <div>Maariv: {listing.prayerTimes.weekday.maariv.times.join(', ')}</div>
                      )}
                    </div>
                  </div>
                )}

                {listing.prayerTimes.shabbos && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Shabbos</h4>
                    <div className="space-y-1 text-sm text-gray-700">
                      {listing.prayerTimes.shabbos.shacharis.times.length > 0 && (
                        <div>Shacharis: {listing.prayerTimes.shabbos.shacharis.times.join(', ')}</div>
                      )}
                      {listing.prayerTimes.shabbos.mincha.times.length > 0 && (
                        <div>Mincha: {listing.prayerTimes.shabbos.mincha.times.join(', ')}</div>
                      )}
                      {listing.prayerTimes.shabbos.maariv.times.length > 0 && (
                        <div>Maariv: {listing.prayerTimes.shabbos.maariv.times.join(', ')}</div>
                      )}
                    </div>
                  </div>
                )}

                {Object.keys(listing.prayerTimes).length === 0 && (
                  <p className="text-gray-500 text-sm">Prayer times not available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
