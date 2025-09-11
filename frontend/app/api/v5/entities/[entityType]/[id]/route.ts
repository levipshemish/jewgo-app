/**
 * Consolidated v5 single entity API route.
 * 
 * Handles individual entity operations (GET, PUT, DELETE) for all entity types
 * with unified patterns and comprehensive error handling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiClient } from '@/lib/api/index-v5';
import { isValidEntityType, validateAuthFromRequest } from '@/lib/api/utils-v5';
import type { EntityType } from '@/lib/api/types-v5';

export async function GET(
  request: NextRequest,
  { params }: { params: { entityType: string; id: string } }
) {
  try {
    const { entityType, id } = params;
    
    // Validate entity type
    if (!isValidEntityType(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    // Validate ID
    const entityId = parseInt(id);
    if (isNaN(entityId) || entityId <= 0) {
      return NextResponse.json(
        { error: 'Invalid entity ID' },
        { status: 400 }
      );
    }

    // Parse options
    const searchParams = request.nextUrl.searchParams;
    const enrich = searchParams.get('enrich') !== 'false'; // Default to true

    // Call backend API through client
    const response = await apiClient.getEntity(
      entityType as EntityType,
      entityId,
      { 
        headers: { 
          'X-Enrich': enrich.toString() 
        }
      }
    );

    if (!response.success) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `${entityType.slice(0, -1)} not found` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to fetch entity' },
        { status: 500 }
      );
    }

    // Add cache headers
    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200'); // 10 min cache
    
    if (response.headers?.etag) {
      headers.set('ETag', response.headers.etag);
    }

    return NextResponse.json(response.data, { headers });

  } catch (error) {
    console.error('Get entity API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { entityType: string; id: string } }
) {
  try {
    const { entityType, id } = params;
    
    // Validate entity type
    if (!isValidEntityType(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    // Validate ID
    const entityId = parseInt(id);
    if (isNaN(entityId) || entityId <= 0) {
      return NextResponse.json(
        { error: 'Invalid entity ID' },
        { status: 400 }
      );
    }

    // Validate authentication
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

    // Validate update data
    const validationResult = await validateUpdateData(entityType as EntityType, body);
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
    const response = await apiClient.updateEntity(
      entityType as EntityType,
      entityId,
      body,
      {
        idempotencyKey: request.headers.get('idempotency-key') || undefined
      }
    );

    if (!response.success) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `${entityType.slice(0, -1)} not found` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to update entity' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Entity updated successfully' });

  } catch (error) {
    console.error('Update entity API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { entityType: string; id: string } }
) {
  try {
    const { entityType, id } = params;
    
    // Validate entity type
    if (!isValidEntityType(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 }
      );
    }

    // Validate ID
    const entityId = parseInt(id);
    if (isNaN(entityId) || entityId <= 0) {
      return NextResponse.json(
        { error: 'Invalid entity ID' },
        { status: 400 }
      );
    }

    // Validate authentication (admin permissions required for delete)
    const authResult = await validateAuthFromRequest(request, { requireAdmin: true });
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    // Set authentication token
    if (authResult.token) {
      apiClient.setTokens(authResult.token);
    }

    // Call backend API through client
    const response = await apiClient.deleteEntity(
      entityType as EntityType,
      entityId
    );

    if (!response.success) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: `${entityType.slice(0, -1)} not found` },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to delete entity' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Entity deleted successfully' });

  } catch (error) {
    console.error('Delete entity API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to validate update data
async function validateUpdateData(entityType: EntityType, data: any): Promise<{
  valid: boolean;
  errors?: string[];
}> {
  const errors: string[] = [];

  // Common validations (only validate if fields are provided)
  if (data.name !== undefined && (typeof data.name !== 'string' || !data.name.trim())) {
    errors.push('Name must be a non-empty string');
  }

  if (data.address !== undefined && (typeof data.address !== 'string' || !data.address.trim())) {
    errors.push('Address must be a non-empty string');
  }

  if (data.phone !== undefined && data.phone !== null && typeof data.phone !== 'string') {
    errors.push('Phone must be a string');
  }

  if (data.email !== undefined && data.email !== null) {
    if (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Email must be a valid email address');
    }
  }

  if (data.website !== undefined && data.website !== null) {
    if (typeof data.website !== 'string') {
      errors.push('Website must be a string');
    } else {
      try {
        new URL(data.website);
      } catch {
        errors.push('Website must be a valid URL');
      }
    }
  }

  // Coordinate validation
  if (data.latitude !== undefined) {
    const lat = parseFloat(data.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push('Latitude must be a number between -90 and 90');
    }
  }

  if (data.longitude !== undefined) {
    const lng = parseFloat(data.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push('Longitude must be a number between -180 and 180');
    }
  }

  // Entity-specific validations
  switch (entityType) {
    case 'restaurants':
      if (data.price_range !== undefined && (data.price_range < 1 || data.price_range > 4)) {
        errors.push('Price range must be between 1 and 4');
      }
      
      if (data.cuisine_type !== undefined && typeof data.cuisine_type !== 'string') {
        errors.push('Cuisine type must be a string');
      }
      
      if (data.features !== undefined && !Array.isArray(data.features)) {
        errors.push('Features must be an array');
      }
      break;

    case 'synagogues':
      if (data.denomination !== undefined && typeof data.denomination !== 'string') {
        errors.push('Denomination must be a string');
      }
      
      if (data.services !== undefined && !Array.isArray(data.services)) {
        errors.push('Services must be an array');
      }
      
      if (data.languages !== undefined && !Array.isArray(data.languages)) {
        errors.push('Languages must be an array');
      }
      break;

    case 'mikvahs':
      if (data.appointment_required !== undefined && typeof data.appointment_required !== 'boolean') {
        errors.push('Appointment required must be a boolean');
      }
      
      if (data.supervision !== undefined && typeof data.supervision !== 'string') {
        errors.push('Supervision must be a string');
      }
      break;

    case 'stores':
      if (data.store_type !== undefined && 
          !['marketplace', 'grocery', 'bakery', 'butcher', 'judaica'].includes(data.store_type)) {
        errors.push('Invalid store type');
      }
      
      if (data.specialties !== undefined && !Array.isArray(data.specialties)) {
        errors.push('Specialties must be an array');
      }
      
      if (data.enable_ecommerce !== undefined && typeof data.enable_ecommerce !== 'boolean') {
        errors.push('Enable ecommerce must be a boolean');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}