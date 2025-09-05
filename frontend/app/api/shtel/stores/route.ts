import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib';
// PostgreSQL auth - using backend API instead of Supabase

export const dynamic = 'force-dynamic';

/**
 * API Route: POST /api/shtel/stores
 * Creates a new store in the backend shtel service
 * 
 * @param request - NextRequest object
 * @returns JSON response with store creation result
 */
export async function POST(request: NextRequest) {
  try {
    // PostgreSQL auth - shtel stores not implemented yet
    return NextResponse.json(
      { 
        success: false, 
        error: 'Shtel stores not implemented for PostgreSQL auth' 
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Shtel stores error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}