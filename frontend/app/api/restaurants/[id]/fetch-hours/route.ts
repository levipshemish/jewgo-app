import { NextRequest, NextResponse } from 'next/server';
import { handleRoute } from '@/lib/server/route-helpers';
import { requireAdminOrThrow } from '@/lib/server/admin-auth';

// Ensure Node.js runtime for admin auth
export const runtime = 'nodejs';

export async function POST(
  __request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const admin = await requireAdminOrThrow(__request);
    const token = admin?.token || '';

    try {
      const { id } = await params;
      const restaurantId = parseInt(id);
      
      if (isNaN(restaurantId)) {
        return NextResponse.json({
          success: false,
          message: 'Invalid restaurant ID'
        }, { status: 400 });
      }

      // Fetch hours data via backend API
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      const apiUrl = `${backendUrl}/api/restaurants/${restaurantId}/fetch-hours`;
      
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Backend API error: ${response.status}`);
      }
      
      const result = await response.json();
      // Log the fetched data for debugging
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        }

      return NextResponse.json({
        success: true,
        message: 'Hours data fetched successfully',
        data: result.data || {
          hours: null,
          timezone: 'America/New_York',
          updated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      // eslint-disable-next-line no-console
      // // console.error('Error fetching hours:', error);
      return NextResponse.json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch hours data'
      }, { status: 500 });
    }
  });
} 
