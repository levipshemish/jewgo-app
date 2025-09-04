import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || '1';
  const limit = searchParams.get('limit') || '20';
  const offset = searchParams.get('offset');
  
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
      limit,
    });
    
    // Use offset if provided, otherwise fall back to page-based pagination
    if (offset !== null) {
      queryParams.set('offset', offset);
    } else {
      queryParams.set('page', page);
    }
    
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
    
    // Use the correct backend URL - prioritize local development
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
    
    // If no backend URL is set, use local development default
    if (!backendUrl) {
      // Check if we're in development mode
      if (process.env.NODE_ENV === 'development') {
        backendUrl = 'http://localhost:8082'; // Local development
      } else {
        backendUrl = 'https://api.jewgo.app'; // Production fallback
      }
    }
    
    // Ensure the backend URL has a protocol
    if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      backendUrl = `http://${backendUrl}`;
    }
    const fullBackendUrl = `${backendUrl}/api/v4/synagogues?${queryParams}`;
    
    console.log('Backend URL:', fullBackendUrl); // Debug log
    
    // Fetch from backend API with better error handling
    let backendResponse;
    try {
      backendResponse = await fetch(fullBackendUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        // Add timeout and better error handling
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      
      // Handle SSL and network errors gracefully
      const isSSLError = fetchError instanceof Error && 
        (fetchError.message.includes('certificate') || 
         fetchError.message.includes('UNABLE_TO_GET_ISSUER_CERT_LOCALLY'));
      
      const isNetworkError = fetchError instanceof Error && 
        (fetchError.name === 'AbortError' ||
         fetchError.message.toLowerCase().includes('fetch') ||
         fetchError.message.toLowerCase().includes('network') ||
         fetchError.message.toLowerCase().includes('timeout'));
      
      if (isSSLError || isNetworkError) {
        // Return fallback response for SSL/network issues
        const currentOffset = offset ? parseInt(offset) : (parseInt(page) - 1) * parseInt(limit);
        const currentPage = offset ? Math.floor(parseInt(offset) / parseInt(limit)) + 1 : parseInt(page);
        
        const payload = {
          success: false,
          synagogues: [],
          total: 0,
          page: currentPage,
          limit: parseInt(limit),
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
          message: 'Synagogues service temporarily unavailable - please try again later'
        };
        return NextResponse.json(payload);
      }
      
      // Re-throw other errors
      throw fetchError;
    }
    
    if (!backendResponse.ok) {
      if (backendResponse.status >= 500) {
        const payload = {
          success: false,
          synagogues: [],
          total: 0,
          page: offset ? Math.floor(parseInt(offset) / parseInt(limit)) + 1 : parseInt(page),
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
    const currentOffset = offset ? parseInt(offset) : (parseInt(page) - 1) * parseInt(limit);
    const currentPage = offset ? Math.floor(parseInt(offset) / parseInt(limit)) + 1 : parseInt(page);
    
    const transformedResponse = {
      synagogues: backendData.synagogues || [],
      total: backendData.total || 0,
      page: currentPage,
      limit: backendData.limit || parseInt(limit),
      offset: currentOffset,
      totalPages: backendData.totalPages || Math.ceil((backendData.total || 0) / parseInt(limit)),
      hasNext: backendData.hasNext || false,
      hasPrev: backendData.hasPrev || false
    };
    
    return NextResponse.json(transformedResponse);
    
  } catch (error) {
    console.error('Error fetching synagogues:', error);
    
    // Check for SSL and network errors
    const isSSLError = error instanceof Error && 
      (error.message.includes('certificate') || 
       error.message.includes('UNABLE_TO_GET_ISSUER_CERT_LOCALLY'));
    
    const isNetwork = error instanceof Error && (
      error.name === 'AbortError' ||
      error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('timeout')
    );
    
    const currentOffset = offset ? parseInt(offset) : (parseInt(page) - 1) * parseInt(limit);
    const currentPage = offset ? Math.floor(parseInt(offset) / parseInt(limit)) + 1 : parseInt(page);
    
    const payload = {
      success: false,
      synagogues: [],
      total: 0,
      page: currentPage,
      limit: parseInt(limit || '20'),
      offset: currentOffset,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
      message: (isSSLError || isNetwork) ? 'Synagogues service temporarily unavailable - please try again later' : 'No synagogues available'
    };
    return NextResponse.json(payload);
  }
}
