'use client';

import { Star, ThumbsUp, Flag, User, Clock, Shield, MoreVertical } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';

import { supabaseClient } from '@/lib/supabase/client-secure';
import { isSupabaseConfigured, handleUserLoadError } from '@/lib/utils/auth-utils';
// NextAuth removed - using Supabase only
import { formatDate } from '@/lib/utils/dateUtils';

export interface Review {
  id: string;
  restaurant_id: number;
  user_id: string;
  user_name: string;
  rating: number;
  title?: string;
  content: string;
  images?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  created_at: string;
  updated_at?: string;
  verified_purchase?: boolean;
  helpful_count: number;
  report_count: number;
}

interface ReviewCardProps {
  review: Review;
  onHelpful?: (reviewId: string) => Promise<void>;
  onFlag?: (reviewId: string, reason: string, description?: string) => Promise<void>;
  onEdit?: (review: Review) => void;
  onDelete?: (reviewId: string) => Promise<void>;
  showActions?: boolean;
  className?: string;
}

export default function ReviewCard({
  review, onHelpful, onFlag, onEdit, onDelete, showActions = true, className = ''
}: ReviewCardProps) {
  const [session, setSession] = useState<any>(null);
  const [isHelpfulLoading, setIsHelpfulLoading] = useState(false);
  const [isFlagLoading, setIsFlagLoading] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagDescription, setFlagDescription] = useState('');

  // Get Supabase session using centralized approach
  useEffect(() => {
    const getSession = async () => {
      try {
        // Use centralized configuration check
        if (!isSupabaseConfigured()) {
          return;
        }

        const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
        setSession(currentSession);
      } catch (sessionError) {
        console.error('Error getting session:', sessionError);
        handleUserLoadError(sessionError);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event: string, authSession: Session | null) => {
      // Only update on actual auth events, not on subscription
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setSession(authSession);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Using unified date formatting utility

  const handleHelpful = async () => {
    if (!onHelpful || isHelpfulLoading) {
      return;
    }
    
    setIsHelpfulLoading(true);
    try {
      await onHelpful(review.id);
    } catch {
      // // console.error('Error marking review as helpful:', error);
    } finally {
      setIsHelpfulLoading(false);
    }
  };

  const handleFlag = async () => {
    if (!onFlag || isFlagLoading || !flagReason) {
      return;
    }
    
    setIsFlagLoading(true);
    try {
      await onFlag(review.id, flagReason, flagDescription);
      setShowFlagModal(false);
      setFlagReason('');
      setFlagDescription('');
    } catch {
      // // console.error('Error flagging review:', error);
    } finally {
      setIsFlagLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) {
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this review?')) {
      try {
        await onDelete(review.id);
      } catch {
        // // console.error('Error deleting review:', error);
      }
    }
  };

  const isOwner = session?.user?.id === review.user_id;
  const canEdit = isOwner && review.status === 'approved';
  const canDelete = isOwner;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      {/* Review Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{review.user_name}</span>
              {review.verified_purchase && (
                <div className="relative group">
                  <Shield className="w-4 h-4 text-green-500" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Verified Purchase
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatDate(review.created_at)}</span>
            </div>
          </div>
        </div>

        {showActions && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[120px]">
                {canEdit && (
                  <button
                    onClick={() => {
                      onEdit?.(review);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => {
                      handleDelete();
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowFlagModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Flag
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600">{review.rating} stars</span>
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
      )}

      {/* Content */}
      <p className="text-gray-700 mb-4 leading-relaxed">{review.content}</p>

      {/* Images */}
      {review.images && review.images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {review.images.map((image, index) => (
            <img
              key={index}
              src={image}
              alt={`Review image ${index + 1}`}
              className="w-full h-20 object-cover rounded-md"
            />
          ))}
        </div>
      )}

      {/* Status Badge */}
      {review.status !== 'approved' && (
        <div className="mb-3">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            review.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            review.status === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-orange-100 text-orange-800'
          }`}>
            {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
          </span>
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
          <button
            onClick={handleHelpful}
            disabled={isHelpfulLoading}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            <ThumbsUp className="w-4 h-4" />
            <span>Helpful ({review.helpful_count})</span>
          </button>

          <button
            onClick={() => setShowFlagModal(true)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 transition-colors"
          >
            <Flag className="w-4 h-4" />
            <span>Flag</span>
          </button>
        </div>
      )}

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Flag Review</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason *
                </label>
                <select
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a reason</option>
                  <option value="inappropriate">Inappropriate content</option>
                  <option value="spam">Spam</option>
                  <option value="fake">Fake review</option>
                  <option value="offensive">Offensive language</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={flagDescription}
                  onChange={(e) => setFlagDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Please provide additional details..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleFlag}
                disabled={isFlagLoading || !flagReason}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isFlagLoading ? 'Submitting...' : 'Submit Flag'}
              </button>
              <button
                onClick={() => {
                  setShowFlagModal(false);
                  setFlagReason('');
                  setFlagDescription('');
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
