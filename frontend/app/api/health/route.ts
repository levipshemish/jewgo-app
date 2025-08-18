import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({ 
      ok: true, 
      ts: Date.now(),
      status: 'healthy',
      runtime: process.env.NEXT_RUNTIME || 'unknown'
    });
  } catch {
    return NextResponse.json({ 
      ok: false, 
      ts: Date.now(),
      error: 'Health check failed',
      runtime: process.env.NEXT_RUNTIME || 'unknown'
    }, { status: 500 });
  }
}
