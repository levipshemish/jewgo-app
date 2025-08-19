'use client';

import { AlertTriangle, CheckCircle, X, Flag, Star, User, Clock, Shield, Eye, EyeOff, ThumbsUp } from 'lucide-react';
import React, { useState } from 'react';

export interface Review {
  id: string;
  restaurantId: number;
  restaurantName: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  images?: string[];
  createdAt: string;
  updatedAt?: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  flags?: ReviewFlag[];
  moderatorNotes?: string;
  verifiedPurchase?: boolean;
  helpfulCount: number;
  reportCount: number;
}

export interface ReviewFlag {
  id: string;
  reason: 'inappropriate' | 'spam' | 'fake' | 'offensive' | 'irrelevant' | 'other';
  description: string;
  reportedBy: string;
  reportedAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

interface ReviewModerationProps {
  review: Review;
  onApprove: (reviewId: string, notes?: string) => void;
  onReject: (reviewId: string, reason: string, notes?: string) => void;
  onFlag: (reviewId: string, flag: Omit<ReviewFlag, 'id' | 'reportedAt'>) => void;
  onResolveFlag: (reviewId: string, flagId: string, action: 'resolve' | 'dismiss') => void;
  className?: string;
}

const FLAG_REASONS = [
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Contains inappropriate or offensive content' },
  { value: 'spam', label: 'Spam', description: 'Automated or promotional content' },
  { value: 'fake', label: 'Fake Review', description: 'Appears to be fake or fraudulent' },
  { value: 'offensive', label: 'Offensive Language', description: 'Contains offensive or hateful language' },
  { value: 'irrelevant', label: 'Irrelevant', description: 'Not relevant to the restaurant experience' },
  { value: 'other', label: 'Other', description: 'Other violation of community guidelines' }
];

const REJECTION_REASONS = [
  'Inappropriate content',
  'Spam or promotional content',
  'Fake or fraudulent review',
  'Offensive language',
  'Irrelevant to restaurant experience',
  'Violation of community guidelines',
  'Duplicate review',
  'Review for wrong restaurant',
  'Other'
];

export default function ReviewModeration({ 
  review, onApprove, onReject, onFlag, onResolveFlag, className = '' 
}: ReviewModerationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModerationForm, setShowModerationForm] = useState(false);

  const [moderationAction, setModerationAction] = useState<'approve' | 'reject' | 'flag'>('approve');
  const [moderationNotes, setModerationNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const [flagDescription, setFlagDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleModerationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      switch (moderationAction) {
        case 'approve':
          await onApprove(review.id, moderationNotes);
          break;
        case 'reject':
          if (!rejectionReason) {
            throw new Error('Rejection reason is required');
          }
          await onReject(review.id, rejectionReason, moderationNotes);
          break;
        case 'flag':
          if (!flagReason) {
            throw new Error('Flag reason is required');
          }
          await onFlag(review.id, {
            reason: flagReason as ReviewFlag['reason'],
            description: flagDescription,
            reportedBy: 'moderator',
            status: 'pending'
          });
          break;
      }

      setShowModerationForm(false);
      setModerationNotes('');
      setRejectionReason('');
      setFlagReason('');
      setFlagDescription('');
    } catch {
      // // console.error('Error submitting moderation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveFlag = async (flagId: string, action: 'resolve' | 'dismiss') => {
    try {
      await onResolveFlag(review.id, flagId, action);
    } catch {
      // // console.error('Error resolving flag:', error);
    }
  };

  const getStatusColor = (status: Review['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      case 'flagged': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: Review['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <X className="w-4 h-4" />;
      case 'flagged': return <Flag className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Review Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(review.status)}`}>
                {getStatusIcon(review.status)}
                {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
              </div>
              {review.verifiedPurchase && (
                <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-blue-600 bg-blue-50">
                  <Shield className="w-3 h-3" />
                  Verified
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-gray-500" />
              <span className="font-medium text-gray-900">{review.userName}</span>
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm text-gray-500">{formatDate(review.createdAt)}</span>
            </div>
            
            <div className="flex items-center gap-2">
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
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowModerationForm(!showModerationForm)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Review Content */}
      <div className="p-4">
        {review.title && (
          <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
        )}
        
        <p className="text-gray-700 mb-3">{review.content}</p>
        
        {/* Review Images */}
        {review.images && review.images.length > 0 && (
          <div className="flex gap-2 mb-3">
            {review.images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`Review image ${index + 1}`}
                className="w-16 h-16 object-cover rounded"
              />
            ))}
          </div>
        )}

        {/* Review Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <ThumbsUp className="w-4 h-4" />
            <span>{review.helpfulCount} helpful</span>
          </div>
          {review.reportCount > 0 && (
            <div className="flex items-center gap-1 text-red-500">
              <Flag className="w-4 h-4" />
              <span>{review.reportCount} reports</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          {/* Flags */}
          {review.flags && review.flags.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-gray-900 mb-2">Flags</h5>
              <div className="space-y-2">
                {review.flags.map((flag) => (
                  <div key={flag.id} className="p-3 bg-red-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-red-700">
                            {flag.reason.charAt(0).toUpperCase() + flag.reason.slice(1)}
                          </span>
                          <span className="text-xs text-gray-500">
                            by {flag.reportedBy} • {formatDate(flag.reportedAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{flag.description}</p>
                      </div>
                      {flag.status === 'pending' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleResolveFlag(flag.id, 'resolve')}
                            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleResolveFlag(flag.id, 'dismiss')}
                            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Moderator Notes */}
          {review.moderatorNotes && (
            <div className="mt-4">
              <h5 className="font-medium text-gray-900 mb-2">Moderator Notes</h5>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{review.moderatorNotes}</p>
            </div>
          )}
        </div>
      )}

      {/* Moderation Form */}
      {showModerationForm && (
        <div className="px-4 pb-4 border-t">
          <form onSubmit={handleModerationSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moderation Action
              </label>
              <div className="flex gap-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="moderationAction"
                    value="approve"
                    checked={moderationAction === 'approve'}
                    onChange={(e) => setModerationAction(e.target.value as 'approve')}
                    className="mr-2"
                  />
                  <span className="text-sm">Approve</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="moderationAction"
                    value="reject"
                    checked={moderationAction === 'reject'}
                    onChange={(e) => setModerationAction(e.target.value as 'reject')}
                    className="mr-2"
                  />
                  <span className="text-sm">Reject</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="moderationAction"
                    value="flag"
                    checked={moderationAction === 'flag'}
                    onChange={(e) => setModerationAction(e.target.value as 'flag')}
                    className="mr-2"
                  />
                  <span className="text-sm">Flag</span>
                </label>
              </div>
            </div>

            {/* Rejection Reason */}
            {moderationAction === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a reason</option>
                  {REJECTION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Flag Reason */}
            {moderationAction === 'flag' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flag Reason *
                </label>
                <select
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a reason</option>
                  {FLAG_REASONS.map((reason) => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </select>
                {flagReason && (
                  <p className="mt-1 text-xs text-gray-500">
                    {FLAG_REASONS.find(r => r.value === flagReason)?.description}
                  </p>
                )}
              </div>
            )}

            {/* Flag Description */}
            {moderationAction === 'flag' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flag Description
                </label>
                <textarea
                  value={flagDescription}
                  onChange={(e) => setFlagDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Provide additional details about the flag..."
                />
              </div>
            )}

            {/* Moderator Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Moderator Notes
              </label>
              <textarea
                value={moderationNotes}
                onChange={(e) => setModerationNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add internal notes about this moderation action..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                  moderationAction === 'approve' ? 'bg-green-500 hover:bg-green-600' :
                  moderationAction === 'reject' ? 'bg-red-500 hover:bg-red-600' :
                  'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 
                  moderationAction === 'approve' ? 'Approve Review' :
                  moderationAction === 'reject' ? 'Reject Review' :
                  'Flag Review'
                }
              </button>
              <button
                type="button"
                onClick={() => setShowModerationForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 