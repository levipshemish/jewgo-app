import { NextRequest, NextResponse} from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    // Use production backend URL if environment variable is not set
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://jewgo-app-oyoh.onrender.com';
    
    // Fetch filter options from backend API
    const _backendResponse = await fetch(`${backendUrl}/api/restaurants/filter-options`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!_backendResponse.ok) {
      // Return default options if backend is unavailable
      return NextResponse.json({
        success: true,
        data: {
          agencies: [
            'ORB',
            'Kosher Miami',
            'Other'
          ],
          kosherCategories: [
            'Dairy',
            'Meat',
            'Pareve'
          ],
          listingTypes: [
            'Restaurant',
            'Catering',
            'Food Truck'
          ],
          priceRanges: [
            '$',
            '$$',
            '$$$',
            '$$$$'
          ],
          counts: {
            agencies: {},
            kosherCategories: {},
            listingTypes: {},
            priceRanges: {},
            total: 0
          }
        }
      });
    }
    
    const _data = await _backendResponse.json();
    
    return NextResponse.json({
      success: true,
      data: _data.data || _data
    });
    
  } catch (_error) {
    console.error('Error fetching filter options:', _error);
    
    // Return default options on error
    return NextResponse.json({
      success: true,
      data: {
        agencies: [
          'ORB',
          'Kosher Miami',
          'Other'
        ],
        kosherCategories: [
          'Dairy',
          'Meat',
          'Pareve'
        ],
        listingTypes: [
          'Restaurant',
          'Catering',
          'Food Truck'
        ],
        priceRanges: [
          '$',
          '$$',
          '$$$',
          '$$$$'
        ],
        counts: {
          agencies: {},
          kosherCategories: {},
          listingTypes: {},
          priceRanges: {},
          total: 0
        }
      }
    });
  }
} 