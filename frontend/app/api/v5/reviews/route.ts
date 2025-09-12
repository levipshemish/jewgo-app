/**
 * Consolidated v5 reviews API routes.
 * 
 * Handles review operations including creation, retrieval, voting,
 * and flagging across all entity types with comprehensive validation.
 * Replaces: multiple review endpoints
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';
import { isValidEntityType, validateAuthFromRequest } from '@/lib/api/utils-v5';
import type { EntityType } from '@/lib/api/types-v5';

// GET /api/v5/reviews?entity_type=restaurants&entity_id=123
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entity_type');
    const entityId = searchParams.get('entity_id');

    // Validate required parameters
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'entity_type and entity_id are required' },
        { status: 400 }
      );
    }

    if (!isValidEntityType(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    const entityIdNum = parseInt(entityId);
    if (isNaN(entityIdNum) || entityIdNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid entity ID' },
        { status: 400 }
      );
    }

    // Parse optional parameters
    const rating = searchParams.get('rating');
    const verifiedOnly = searchParams.get('verified') === 'true';
    const cursor = searchParams.get('cursor') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sort = searchParams.get('sort') || 'created_at_desc';

    const options: any = {};
    if (rating) {
      const ratingNum = parseInt(rating);
      if (ratingNum >= 1 && ratingNum <= 5) {
        options.rating = ratingNum;
      }
    }
    if (verifiedOnly) options.verifiedOnly = true;
    if (cursor || limit) {
      options.pagination = { cursor, limit, sort };
    }

    // Call backend API directly with correct URL
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.jewgo.app';
    const queryParams = new URLSearchParams();
    queryParams.append('entity_type', entityType);
    queryParams.append('entity_id', entityIdNum.toString());
    if (rating) queryParams.append('rating', rating.toString());
    if (verifiedOnly) queryParams.append('verified', 'true');
    if (cursor) queryParams.append('cursor', cursor);
    if (limit) queryParams.append('limit', limit.toString());
    if (sort) queryParams.append('sort', sort);

    const backendResponse = await fetch(`${backendUrl}/api/v5/reviews?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch reviews from backend' },
        { status: backendResponse.status }
      );
    }

    const backendData = await backendResponse.json();

    // Add cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600'); // 5 min cache

    return NextResponse.json(backendData, { headers });

  } catch (error) {
    console.error('Get reviews API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/v5/reviews
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authResult = await validateAuthFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const { entity_type, entity_id, ...reviewData } = body;

    // Validate required fields
    if (!entity_type || !entity_id) {
      return NextResponse.json(
        { error: 'entity_type and entity_id are required' },
        { status: 400 }
      );
    }

    if (!isValidEntityType(entity_type)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    const entityIdNum = parseInt(entity_id);
    if (isNaN(entityIdNum) || entityIdNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid entity ID' },
        { status: 400 }
      );
    }

    // Validate review data
    const validationResult = validateReviewData(reviewData);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.errors },
        { status: 400 }
      );
    }

    // Set authentication token
    if (authResult.token) {
      apiClient.setTokens(authResult.token);
    }

    // Call backend API through client
    const response = await apiClient.createReview(
      entity_type as EntityType,
      entityIdNum,
      reviewData,
      {
        idempotencyKey: request.headers.get('idempotency-key') || undefined
      }
    );

    if (!response.success) {
      return NextResponse.json(
        { error: response.data?.error || 'Failed to create review' },
        { status: response.status || 400 }
      );
    }

    return NextResponse.json(response.data, { status: 201 });

  } catch (error) {
    console.error('Create review API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function validateReviewData(data: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];

  // Rating validation
  if (!data.rating || typeof data.rating !== 'number') {
    errors.push('Rating is required and must be a number');
  } else if (data.rating < 1 || data.rating > 5) {
    errors.push('Rating must be between 1 and 5');
  }

  // Content validation
  if (!data.content || typeof data.content !== 'string') {
    errors.push('Review content is required and must be a string');
  } else {
    const content = data.content.trim();
    if (content.length < 10) {
      errors.push('Review content must be at least 10 characters');
    } else if (content.length > 2000) {
      errors.push('Review content must not exceed 2000 characters');
    }
  }

  // Optional field validations
  if (data.title !== undefined) {
    if (typeof data.title !== 'string') {
      errors.push('Review title must be a string');
    } else if (data.title.length > 200) {
      errors.push('Review title must not exceed 200 characters');
    }
  }

  if (data.visit_date !== undefined) {
    if (typeof data.visit_date !== 'string') {
      errors.push('Visit date must be a string');
    } else {
      const date = new Date(data.visit_date);
      if (isNaN(date.getTime())) {
        errors.push('Visit date must be a valid date');
      } else if (date > new Date()) {
        errors.push('Visit date cannot be in the future');
      }
    }
  }

  if (data.tags !== undefined) {
    if (!Array.isArray(data.tags)) {
      errors.push('Tags must be an array');
    } else if (data.tags.length > 10) {
      errors.push('Maximum 10 tags allowed');
    } else {
      for (const tag of data.tags) {
        if (typeof tag !== 'string' || tag.trim().length === 0) {
          errors.push('All tags must be non-empty strings');
          break;
        }
      }
    }
  }

  if (data.would_recommend !== undefined && typeof data.would_recommend !== 'boolean') {
    errors.push('Would recommend must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}