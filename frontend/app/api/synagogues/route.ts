import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '20';
  
  try {
    const search = searchParams.get('search') || '';
    const city = searchParams.get('city') || '';
    const denomination = searchParams.get('denomination') || '';
    const shulType = searchParams.get('shulType') || '';
    const hasDailyMinyan = searchParams.get('hasDailyMinyan') || '';
    const hasShabbatServices = searchParams.get('hasShabbatServices') || '';
    const hasMechitza = searchParams.get('hasMechitza') || '';
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const maxDistanceMi = searchParams.get('maxDistanceMi');
    
    // Build query parameters for backend API
    const queryParams = new URLSearchParams({
      page,
      limit,
    });
    
    // Add search parameter
    if (search) {
      queryParams.append('search', search);
    }
    
    // Add filter parameters
    if (city) {
      queryParams.append('city', city);
    }
    if (denomination) {
      queryParams.append('denomination', denomination);
    }
    if (shulType) {
      queryParams.append('shulType', shulType);
    }
    if (hasDailyMinyan === 'true') {
      queryParams.append('hasDailyMinyan', 'true');
    }
    if (hasShabbatServices === 'true') {
      queryParams.append('hasShabbatServices', 'true');
    }
    if (hasMechitza === 'true') {
      queryParams.append('hasMechitza', 'true');
    }
    
    // Add location parameters
    if (lat) {
      queryParams.append('lat', lat);
    }
    if (lng) {
      queryParams.append('lng', lng);
    }
    if (maxDistanceMi) {
      queryParams.append('maxDistanceMi', maxDistanceMi);
    }
    
    // Use the correct backend URL - fallback to production URL if not set
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.jewgo.app';
    
    // Ensure the backend URL has a protocol
    if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      backendUrl = `https://${backendUrl}`;
    }
    const fullBackendUrl = `${backendUrl}/api/v4/synagogues?${queryParams}`;
    
    // Fetch from backend API
    const backendResponse = await fetch(fullBackendUrl, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!backendResponse.ok) {
      if (backendResponse.status >= 500) {
        const payload = {
          success: false,
          synagogues: [],
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
          message: 'Synagogues service temporarily unavailable'
        };
        return NextResponse.json(payload);
      }
      throw new Error(`Backend API error: ${backendResponse.status}`);
    }
    
    const backendData = await backendResponse.json();
    
    // Transform the backend response to match frontend expectations
    const transformedResponse = {
      synagogues: backendData.synagogues || [],
      total: backendData.total || 0,
      page: backendData.page || parseInt(page),
      limit: backendData.limit || parseInt(limit),
      totalPages: backendData.totalPages || Math.ceil((backendData.total || 0) / parseInt(limit)),
      hasNext: backendData.hasNext || false,
      hasPrev: backendData.hasPrev || false
    };
    
    return NextResponse.json(transformedResponse);
    
  } catch (error) {
    console.error('Error fetching synagogues:', error);
    
    const isNetwork = error instanceof Error && (
      error.name === 'AbortError' ||
      error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('network')
    );
    const payload = {
      success: false,
      synagogues: [],
      total: 0,
      page: parseInt(page || '1'),
      limit: parseInt(limit || '20'),
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
      message: isNetwork ? 'Synagogues service temporarily unavailable' : 'No synagogues available'
    };
    return NextResponse.json(payload);
  }
}
