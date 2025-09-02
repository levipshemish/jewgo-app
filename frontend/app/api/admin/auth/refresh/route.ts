import { NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/route-helpers';

export const runtime = 'nodejs';

export async function POST() {
  return handleRoute(async () => {
    // Placeholder for invalidating any server-side caches if added in the future
    return NextResponse.json({ success: true });
  });
}

