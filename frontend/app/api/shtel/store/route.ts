import { NextRequest, NextResponse } from 'next/server';
// import { getBackendUrl } from '@/lib'; // TODO: Implement backend URL
// PostgreSQL auth - using backend API instead of Supabase

export const dynamic = 'force-dynamic';

/**
 * API Route: GET /api/shtel/store
 * Fetches store data from the backend shtel service
 * 
 * @param request - NextRequest object
 * @returns JSON response with store data
 */
export async function GET(_request: NextRequest) {
  try {
    // PostgreSQL auth - shtel store not implemented yet
    return NextResponse.json(
      { 
        success: false, 
        error: 'Shtel store not implemented for PostgreSQL auth' 
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Shtel store error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}