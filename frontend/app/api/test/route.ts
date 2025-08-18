import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      message: 'API is working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  } catch (_error) {
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'API error',
        error: _error instanceof Error ? _error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 