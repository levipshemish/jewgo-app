import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib';
// PostgreSQL auth - using backend API instead of Supabase

export const dynamic = 'force-dynamic';

/**
 * API Route: GET /api/shtel/orders
 * Fetches orders from the backend shtel service
 * 
 * @param request - NextRequest object
 * @returns JSON response with orders data
 */
export async function GET(request: NextRequest) {
  try {
    // PostgreSQL auth - shtel orders not implemented yet
    return NextResponse.json(
      { 
        success: false, 
        error: 'Shtel orders not implemented for PostgreSQL auth' 
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Shtel orders error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}