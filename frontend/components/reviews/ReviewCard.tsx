'use client';

import { Star, ThumbsUp, Flag, User, Clock, Shield, MoreVertical } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { supabaseBrowser } from '@/lib/supabase/client';
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
  const [loading, setLoading] = useState(true);
  const [isHelpfulLoading, setIsHelpfulLoading] = useState(false);
  const [isFlagLoading, setIsFlagLoading] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagDescription, setFlagDescription] = useState('');

  // Get Supabase session
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

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
    
    if (confirm('Are you sure you want to delete this review?')) {
      try {
        await onDelete(review.id);
      } catch {
        // // console.error('Error deleting review:', error);
      }
    }
  };

  const isOwner = session?.user?.email === review.user_id;
  const canEdit = isOwner && review.status === 'pending';
  const canDelete = isOwner;

  const FLAG_REASONS = [
    { value: 'inappropriate', label: 'Inappropriate Content' },
    { value: 'spam', label: 'Spam' },
    { value: 'fake', label: 'Fake Review' },
    { value: 'offensive', label: 'Offensive Language' },
    { value: 'irrelevant', label: 'Irrelevant' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <>
      <div className={`bg-white border rounded-lg p-4 ${className}`}>
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
                  <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-50">
                    <Shield className="w-3 h-3" />
                    Verified
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatDate(review.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Action Menu */}
          {showActions && (canEdit || canDelete) && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg z-10 min-w-[120px]">
                  {canEdit && (
                    <button
                      onClick={() => {
                        onEdit?.(review);
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
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
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">{review.rating}/5</span>
        </div>

        {/* Title */}
        {review.title && (
          <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
        )}

        {/* Content */}
        <p className="text-gray-700 mb-3 leading-relaxed">{review.content}</p>

        {/* Images */}
        {review.images && review.images.length > 0 && (
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {review.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Review image ${index + 1}`}
                className="w-20 h-20 object-cover rounded flex-shrink-0"
              />
            ))}
          </div>
        )}

        {/* Review Actions */}
        {showActions && (
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-4">
              <button
                onClick={handleHelpful}
                disabled={isHelpfulLoading}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Helpful ({review.helpful_count})</span>
              </button>
              
              {session && !isOwner && (
                <button
                  onClick={() => setShowFlagModal(true)}
                  disabled={isFlagLoading}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  <Flag className="w-4 h-4" />
                  <span>Report</span>
                </button>
              )}
            </div>

            {/* Status Badge */}
            {review.status !== 'approved' && (
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                review.status === 'pending' ? 'text-yellow-600 bg-yellow-50' :
                review.status === 'rejected' ? 'text-red-600 bg-red-50' :
                'text-orange-600 bg-orange-50'
              }`}>
                {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Report Review</h3>
            
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
                  {FLAG_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
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
                  placeholder="Provide additional details..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleFlag}
                disabled={isFlagLoading || !flagReason}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isFlagLoading ? 'Reporting...' : 'Report Review'}
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

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowMenu(false)}
        />
      )}
    </>
  );
}
