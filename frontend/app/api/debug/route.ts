import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
      hasBackendUrl: !!process.env.NEXT_PUBLIC_BACKEND_URL,
      backendUrlFallback: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://jewgo-app-oyoh.onrender.com',
    },
    timestamp: new Date().toISOString(),
  });
}
