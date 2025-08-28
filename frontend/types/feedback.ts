// Feedback type definitions
// This provides proper typing for feedback-related data structures

export type FeedbackType = 'bug' | 'feature' | 'general' | 'restaurant';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

export interface FeedbackData {
  id: string;
  type: FeedbackType;
  category: string;
  priority: FeedbackPriority;
  description: string;
  userEmail?: string;
  restaurantId?: number;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackSubmission {
  type: FeedbackType;
  category: string;
  priority: FeedbackPriority;
  description: string;
  userEmail?: string;
  restaurantId?: number;
}

export interface FeedbackAttachment {
  filename: string;
  path: string;
  size: number;
}

export interface BackendFeedbackData extends FeedbackData {
  restaurantName?: string | null;
  contactEmail?: string | null;
  attachments: FeedbackAttachment[];
  userAgent?: string | null;
  ipAddress: string;
  referrer?: string | null;
}

// Type guards for feedback validation
export function isValidFeedbackType(type: string): type is FeedbackType {
  return ['bug', 'feature', 'general', 'restaurant'].includes(type);
}

export function isValidFeedbackPriority(priority: string): priority is FeedbackPriority {
  return ['low', 'medium', 'high', 'critical'].includes(priority);
}

export function isValidFeedbackStatus(status: string): status is FeedbackStatus {
  return ['pending', 'in_progress', 'resolved', 'closed'].includes(status);
}

// Validation functions
export function validateFeedbackType(type: string): FeedbackType | null {
  return isValidFeedbackType(type) ? type : null;
}

export function validateFeedbackPriority(priority: string): FeedbackPriority | null {
  return isValidFeedbackPriority(priority) ? priority : null;
}

export function validateFeedbackStatus(status: string): FeedbackStatus | null {
  return isValidFeedbackStatus(status) ? status : null;
}
