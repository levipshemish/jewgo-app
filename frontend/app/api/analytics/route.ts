import { NextRequest, NextResponse } from 'next/server';

// Lightweight analytics sink
// Accepts POSTs from the client and intentionally discards payloads.
// This prevents noisy 405s until a real analytics provider is integrated.

export async function POST(request: NextRequest) {
  try {
    // Best-effort parse to fully read the stream and avoid hanging connections
    // Do not log contents to avoid persisting PII or sensitive data
    if (request.headers.get('content-type')?.includes('application/json')) {
      await request.json().catch(() => undefined);
    } else {
      await request.text().catch(() => undefined);
    }
  } catch {
    // Intentionally ignore parsing errors; this is a sink endpoint
  }

  // No content returned — acknowledge receipt
  return new NextResponse(null, { status: 204 });
}

// Optional preflight support; mostly unnecessary for same-origin POSTs
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'POST, OPTIONS',
    },
  });
}

