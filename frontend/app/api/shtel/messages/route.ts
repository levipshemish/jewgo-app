import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib';
// PostgreSQL auth - using backend API instead of Supabase

export const dynamic = 'force-dynamic';

/**
 * API Route: GET /api/shtel/messages
 * Fetches messages from the backend shtel service
 * 
 * @param request - NextRequest object
 * @returns JSON response with messages data
 */
export async function GET(request: NextRequest) {
  try {
    // PostgreSQL auth - shtel messages not implemented yet
    return NextResponse.json(
      { 
        success: false, 
        error: 'Shtel messages not implemented for PostgreSQL auth' 
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Shtel messages error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}