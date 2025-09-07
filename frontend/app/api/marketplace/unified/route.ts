import { NextRequest, NextResponse } from 'next/server';
import { getUnifiedMarketplaceData } from '@/lib/utils/unified-api';

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
    
    const category = searchParams.get('category');
    if (category) params.category = category;
    
    const subcategory = searchParams.get('subcategory');
    if (subcategory) params.subcategory = subcategory;
    
    const kind = searchParams.get('kind');
    if (kind) params.kind = kind;
    
    const condition = searchParams.get('condition');
    if (condition) params.condition = condition;
    
    const minPrice = searchParams.get('minPrice');
    if (minPrice) params.minPrice = minPrice;
    
    const maxPrice = searchParams.get('maxPrice');
    if (maxPrice) params.maxPrice = maxPrice;
    
    const city = searchParams.get('city');
    if (city) params.city = city;
    
    const region = searchParams.get('region');
    if (region) params.region = region;
    
    // Location parameters
    const lat = searchParams.get('lat');
    if (lat) params.lat = lat;
    
    const lng = searchParams.get('lng');
    if (lng) params.lng = lng;
    
    const maxDistanceMi = searchParams.get('maxDistanceMi');
    if (maxDistanceMi) params.maxDistanceMi = maxDistanceMi;
    
    // Use unified API call
    const result = await getUnifiedMarketplaceData(params);
    
    if (!result.success) {
      // Return fallback response for errors
      const currentOffset = offset ? parseInt(offset) : (parseInt(page) - 1) * parseInt(limit);
      const currentPage = offset ? Math.floor(parseInt(offset) / parseInt(limit)) + 1 : parseInt(page);
      
      return NextResponse.json({
        success: false,
        products: [],
        total: 0,
        page: currentPage,
        limit: parseInt(limit),
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
        message: 'Marketplace service temporarily unavailable',
        cached: false,
        performance: result.performance
      });
    }
    
    const backendData = result.data;
    
    // Transform the backend response to match frontend expectations
    const currentOffset = offset ? parseInt(offset) : (parseInt(page) - 1) * parseInt(limit);
    const currentPage = offset ? Math.floor(parseInt(offset) / parseInt(limit)) + 1 : parseInt(page);
    const total = backendData.total || 0;
    const limitNum = parseInt(limit);
    const totalPages = Math.ceil(total / limitNum);
    
    const transformedResponse = {
      success: backendData.success !== false,
      products: backendData.products || backendData.listings || [],
      total: total,
      page: currentPage,
      limit: limitNum,
      totalPages: totalPages,
      hasNext: currentOffset + limitNum < total,
      hasPrev: currentOffset > 0,
      message: backendData.message || 'Marketplace data retrieved successfully',
      cached: result.cached,
      performance: result.performance
    };
    
    return NextResponse.json(transformedResponse);
    
  } catch (error) {
    console.error('Error in unified marketplace endpoint:', error);
    
    // Return fallback response
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';
    
    return NextResponse.json({
      success: false,
      products: [],
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
      message: 'Marketplace service temporarily unavailable'
    });
  }
}
