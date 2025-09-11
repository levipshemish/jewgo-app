/**
 * Consolidated v5 entities API route - handles all entity types.
 * 
 * This single route file handles CRUD operations for all entity types
 * (restaurants, synagogues, mikvahs, stores) with unified patterns.
 * Replaces: multiple individual entity route files
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';
import { isValidEntityType, validateAuthFromRequest } from '@/lib/api/utils-v5';
import type { EntityType, EntityFilters, PaginationOptions } from '@/lib/api/types-v5';

export async function GET(
  request: NextRequest,
  { params }: { params: { entityType: string } }
) {
  try {
    const { entityType } = params;
    
    // Validate entity type
    if (!isValidEntityType(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    // Parse search parameters
    const searchParams = request.nextUrl.searchParams;
    const filters: EntityFilters = {};
    const pagination: PaginationOptions = {};

    // Extract filters
    if (searchParams.get('search')) filters.search = searchParams.get('search')!;
    if (searchParams.get('status')) filters.status = searchParams.get('status')!;
    if (searchParams.get('category')) filters.category = searchParams.get('category')!;
    if (searchParams.get('created_after')) filters.createdAfter = searchParams.get('created_after')!;
    if (searchParams.get('updated_after')) filters.updatedAfter = searchParams.get('updated_after')!;

    // Location filters
    const latitude = searchParams.get('latitude');
    const longitude = searchParams.get('longitude');
    const radius = searchParams.get('radius');
    
    if (latitude && longitude) {
      filters.location = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: radius ? parseFloat(radius) : undefined
      };
    }

    // Entity-specific filters
    if (entityType === 'restaurants') {
      if (searchParams.get('cuisine')) filters.cuisine_type = searchParams.get('cuisine')!;
      if (searchParams.get('price_range')) filters.price_range = parseInt(searchParams.get('price_range')!);
      if (searchParams.get('kosher_cert')) filters.kosher_certification = searchParams.get('kosher_cert')!;
    } else if (entityType === 'synagogues') {
      if (searchParams.get('denomination')) filters.denomination = searchParams.get('denomination')!;
      if (searchParams.get('services')) filters.services = searchParams.get('services')!;
    } else if (entityType === 'stores') {
      if (searchParams.get('store_type')) filters.store_type = searchParams.get('store_type')!;
      if (searchParams.get('specialties')) filters.specialties = searchParams.get('specialties')!;
    }

    // Pagination
    if (searchParams.get('cursor')) pagination.cursor = searchParams.get('cursor')!;
    if (searchParams.get('limit')) pagination.limit = parseInt(searchParams.get('limit')!);
    if (searchParams.get('sort')) pagination.sort = searchParams.get('sort')! as any;

    // Call backend API through client
    const response = await apiClient.getEntities(
      entityType as EntityType,
      filters,
      pagination
    );

    if (!response || !response.data) {
      return NextResponse.json(
        { error: 'Failed to fetch entities' },
        { status: 500 }
      );
    }

    // Add cache headers for GET requests
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    // ETag would need to be passed from backend
    // if (response.headers?.etag) {
    //   headers.set('ETag', response.headers.etag);
    // }

    return NextResponse.json(response.data, { headers });

  } catch (error) {
    console.error('Entities API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { entityType: string } }
) {
  try {
    const { entityType } = params;
    
    // Validate entity type
    if (!isValidEntityType(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    // Validate authentication for write operations
    const authResult = await validateAuthFromRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Parse request body
    const body = await request.json();
    if (!body) {
      return NextResponse.json(
        { error: 'Request body required' },
        { status: 400 }
      );
    }

    // Entity-specific validation
    const validationResult = await validateEntityData(entityType as EntityType, body);
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.errors },
        { status: 400 }
      );
    }

    // Set authentication token for backend call
    if (authResult.token) {
      apiClient.setTokens(authResult.token);
    }

    // Call backend API through client
    const response = await apiClient.createEntity(
      entityType as EntityType,
      body,
      {
        idempotencyKey: request.headers.get('idempotency-key') || undefined
      }
    );

    if (!response.success) {
      return NextResponse.json(
        { error: 'Failed to create entity' },
        { status: 400 }
      );
    }

    return NextResponse.json(response.data, { status: 201 });

  } catch (error) {
    console.error('Create entity API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to validate entity data
async function validateEntityData(entityType: EntityType, data: any): Promise<{
  valid: boolean;
  errors?: string[];
}> {
  const errors: string[] = [];

  // Common validations
  if (!data.name || typeof data.name !== 'string') {
    errors.push('Name is required and must be a string');
  }

  if (!data.address || typeof data.address !== 'string') {
    errors.push('Address is required and must be a string');
  }

  // Entity-specific validations
  switch (entityType) {
    case 'restaurants':
      if (data.price_range && (data.price_range < 1 || data.price_range > 4)) {
        errors.push('Price range must be between 1 and 4');
      }
      break;

    case 'synagogues':
      if (data.denomination && typeof data.denomination !== 'string') {
        errors.push('Denomination must be a string');
      }
      break;

    case 'mikvahs':
      if (data.appointment_required !== undefined && typeof data.appointment_required !== 'boolean') {
        errors.push('Appointment required must be a boolean');
      }
      break;

    case 'stores':
      if (data.store_type && !['marketplace', 'grocery', 'bakery', 'butcher', 'judaica'].includes(data.store_type)) {
        errors.push('Invalid store type');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}