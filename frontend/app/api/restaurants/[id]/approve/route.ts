import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const restaurantId = parseInt(id);
    
    if (isNaN(restaurantId)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid restaurant ID'
      }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    // Update restaurant status in database via backend API
    const backendUrl = process.env["NEXT_PUBLIC_BACKEND_URL"] || 'https://jewgo.onrender.com';
    const apiUrl = `${backendUrl}/api/restaurants/${restaurantId}/approve`;
    
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      }
    
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env["ADMIN_TOKEN"] || ''}`,
      },
      body: JSON.stringify({ status: status || 'approved' }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Backend API error: ${response.status}`);
    }
    
    const result = await response.json();
    // Send notification email to restaurant owner (if email is available)
    if (process.env.NODE_ENV === 'production' && result.data?.owner_email) {
      try {
        await fetch('/api/notifications/restaurant-approved', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant: result.data,
            approvedBy: 'Admin',
          }),
        });
      } catch (_emailError) {
        // eslint-disable-next-line no-console
        }
    }

    return NextResponse.json({
      success: true,
      message: 'Restaurant approved successfully',
      data: result.data || {
        id: restaurantId,
        status: 'approved',
        updated_at: new Date().toISOString()
      }
    });

  } catch {
    // eslint-disable-next-line no-console
    // // console.error('Error approving restaurant:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to approve restaurant'
    }, { status: 500 });
  }
} 