import { NextRequest, NextResponse } from 'next/server';
// PostgreSQL auth - using backend API instead of Supabase
import { oauthLogger } from '@/lib/utils/logger';
import { errorResponses } from '@/lib';
// import { createSuccessResponse } from '@/lib'; // TODO: Implement success response

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(_request: NextRequest) {
  try {
    // PostgreSQL auth - account linking not implemented yet
    oauthLogger.info('Account linking not implemented for PostgreSQL auth');
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Account linking not implemented for PostgreSQL auth' 
      },
      { status: 501 }
    );
    
  } catch (error) {
    oauthLogger.error('Account linking failed', { error });
    return errorResponses.internalError();
  }
}

export async function GET(_request: NextRequest) {
  try {
    // PostgreSQL auth - account linking not implemented yet
    oauthLogger.info('Account linking status check not implemented for PostgreSQL auth');
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Account linking not implemented for PostgreSQL auth' 
      },
      { status: 501 }
    );
    
  } catch (error) {
    oauthLogger.error('Account linking status check failed', { error });
    return errorResponses.internalError();
  }
}