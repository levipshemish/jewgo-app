import { NextRequest, NextResponse } from 'next/server';
import { handleRoute, json } from '@/lib/server/route-helpers';
import { requireAdminOrThrow } from '@/lib/server/admin-auth';
import { errorResponses } from '@/lib';

// Ensure Node.js runtime for admin auth
export const runtime = 'nodejs';

export async function POST(
  _request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    const admin = await requireAdminOrThrow(_request);
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

      // Fetch website data via backend API
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
      const apiUrl = `${backendUrl}/api/v4/restaurants/${restaurantId}/fetch-website`;
      
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
        message: 'Website data fetched successfully',
        data: result.data || {
          website: null,
          title: null,
          description: null,
          phone: null,
          address: null,
          hours: null,
          updated_at: new Date().toISOString()
        }
      });

    } catch (error) {
      // eslint-disable-next-line no-console
      // // console.error('Error fetching website:', error);
      return NextResponse.json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch website data'
      }, { status: 500 });
    }
  });
} 
