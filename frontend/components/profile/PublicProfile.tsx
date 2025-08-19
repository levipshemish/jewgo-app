"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Globe, Star, Heart, MessageSquare, Users } from "lucide-react";

interface ProfileStats {
  reviewCount: number;
  favoriteCount: number;
  memberSince: string;
  restaurantsVisited: number;
  helpfulReviews: number;
}

interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  website: string | null;
  date_of_birth: string | null;
  preferences: {
    publicProfile?: boolean;
    showLocation?: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}

interface PublicProfileProps {
  profile: Profile;
  stats: ProfileStats;
  username: string;
}

export default function PublicProfile({ profile, stats, username }: PublicProfileProps) {
  const {
    display_name,
    bio,
    avatar_url,
    location,
    website,
    date_of_birth,
    preferences,
    created_at,
  } = profile;

  const isPublicProfile = preferences?.publicProfile !== false;
  const showLocation = preferences?.showLocation !== false && location;

  // Format member since date
  const memberSince = new Date(created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  // Calculate age if date of birth is provided
  const getAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            ← Back to JewGo
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Cover Image Placeholder */}
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>

          {/* Profile Header */}
          <div className="relative px-6 pb-6">
            {/* Avatar */}
            <div className="absolute -top-16 left-6">
              <div className="relative">
                {avatar_url ? (
                  <Image
                    src={avatar_url}
                    alt={`${display_name}'s profile picture`}
                    width={128}
                    height={128}
                    className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-400">
                      {display_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="pt-20">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900">{display_name}</h1>
                  <p className="text-gray-500 text-lg">@{username}</p>
                  
                  {/* Bio */}
                  {bio && (
                    <p className="mt-4 text-gray-700 leading-relaxed max-w-2xl">
                      {bio}
                    </p>
                  )}

                  {/* Profile Details */}
                  <div className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600">
                    {showLocation && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{location}</span>
                      </div>
                    )}
                    
                    {website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        <a
                          href={website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                    
                    {date_of_birth && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{getAge(date_of_birth)} years old</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Member since {memberSince}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 sm:mt-0 flex gap-3">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Follow
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    Message
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Activity</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Reviews */}
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.reviewCount}</div>
              <div className="text-sm text-gray-600">Reviews</div>
            </div>

            {/* Favorites */}
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-3">
                <Heart className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.favoriteCount}</div>
              <div className="text-sm text-gray-600">Favorites</div>
            </div>

            {/* Restaurants Visited */}
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                <Users className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.restaurantsVisited}</div>
              <div className="text-sm text-gray-600">Restaurants</div>
            </div>

            {/* Helpful Reviews */}
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-yellow-100 rounded-full mx-auto mb-3">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.helpfulReviews}</div>
              <div className="text-sm text-gray-600">Helpful</div>
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
          
          <div className="space-y-4">
            {/* Placeholder for recent reviews */}
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No recent activity</p>
              <p className="text-sm">When {display_name} writes reviews or adds favorites, they'll appear here.</p>
            </div>
          </div>
        </div>

        {/* Privacy Notice */}
        {!isPublicProfile && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Limited Profile
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    This profile has limited visibility. Some information may not be displayed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
