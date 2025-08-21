import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  // Simple connectivity test that doesn't depend on external services
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Frontend connectivity test successful'
  });
}
