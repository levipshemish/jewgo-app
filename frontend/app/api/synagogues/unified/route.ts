import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedSynagogueData } from '@/lib/utils/unified-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract all parameters
    const params: Record<string, any> = {};
    
    // Pagination parameters
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset');
    
    if (offset !== null) {
      params.offset = offset;
    } else {
      params.page = page;
    }
    params.limit = limit;
    
    // Search and filter parameters
    const search = searchParams.get('search');
    if (search) params.search = search;
    
    const city = searchParams.get('city');
    if (city) params.city = city;
    
    const denomination = searchParams.get('denomination');
    if (denomination) params.denomination = denomination;
    
    const shulType = searchParams.get('shulType');
    if (shulType) params.shulType = shulType;
    
    const hasDailyMinyan = searchParams.get('hasDailyMinyan');
    if (hasDailyMinyan === 'true') params.hasDailyMinyan = 'true';
    
    const hasShabbatServices = searchParams.get('hasShabbatServices');
    if (hasShabbatServices === 'true') params.hasShabbatServices = 'true';
    
    const hasMechitza = searchParams.get('hasMechitza');
    if (hasMechitza === 'true') params.hasMechitza = 'true';
    
    // Location parameters
    const lat = searchParams.get('lat');
    if (lat) params.lat = lat;
    
    const lng = searchParams.get('lng');
    if (lng) params.lng = lng;
    
    const maxDistanceMi = searchParams.get('maxDistanceMi');
    if (maxDistanceMi) params.maxDistanceMi = maxDistanceMi;
    
    // Call the backend API directly (same logic as regular synagogues endpoint)
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, value.toString());
      }
    });

    // Use the correct backend URL - always use production API
    let backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://api.jewgo.app';
    
    // Ensure the backend URL has a protocol
    if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
      backendUrl = `https://${backendUrl}`;
    }
    const fullBackendUrl = `${backendUrl}/api/v4/synagogues?${queryParams}`;
    
    console.log('Unified synagogues backend URL:', fullBackendUrl);
    
    // Fetch from backend API with better error handling
    let backendResponse;
    try {
      backendResponse = await fetch(fullBackendUrl, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(8000), // 8 second timeout
      });
    } catch (fetchError) {
      console.error('Unified synagogues fetch error:', fetchError);
      throw fetchError;
    }
    
    if (!backendResponse.ok) {
      if (backendResponse.status >= 500) {
        throw new Error('Backend service temporarily unavailable');
      }
      throw new Error(`Backend API error: ${backendResponse.status}`);
    }
    
    const backendData = await backendResponse.json();
    
    const result = {
      success: true,
      data: backendData,
      cached: false,
      performance: { requestTime: 0, cacheHit: false, retryCount: 0 }
    };
    
    if (!result.success) {
      // Return fallback response for errors
      const currentOffset = offset ? parseInt(offset) : (parseInt(page) - 1) * parseInt(limit);
      const currentPage = offset ? Math.floor(parseInt(offset) / parseInt(limit)) + 1 : parseInt(page);
      
      return NextResponse.json({
        success: false,
        synagogues: [],
        total: 0,
        page: currentPage,
        limit: parseInt(limit),
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
        message: 'Synagogues service temporarily unavailable',
        cached: false,
        performance: result.performance
      });
    }
    
    const responseData = result.data;
    
    // Transform the backend response to match frontend expectations
    const currentOffset = offset ? parseInt(offset) : (parseInt(page) - 1) * parseInt(limit);
    const currentPage = offset ? Math.floor(parseInt(offset) / parseInt(limit)) + 1 : parseInt(page);
    const total = responseData.total || 0;
    const limitNum = parseInt(limit);
    const totalPages = Math.ceil(total / limitNum);
    
    const transformedResponse = {
      success: responseData.success !== false,
      synagogues: responseData.synagogues || [],
      total: total,
      page: currentPage,
      limit: limitNum,
      totalPages: totalPages,
      hasNext: currentOffset + limitNum < total,
      hasPrev: currentOffset > 0,
      message: responseData.message || 'Synagogues retrieved successfully',
      cached: result.cached,
      performance: result.performance
    };
    
    return NextResponse.json(transformedResponse);
    
  } catch (error) {
    console.error('Error in unified synagogues endpoint:', error);
    
    // Return fallback response
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    
    return NextResponse.json({
      success: false,
      synagogues: [],
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
      message: 'Synagogues service temporarily unavailable'
    });
  }
}
