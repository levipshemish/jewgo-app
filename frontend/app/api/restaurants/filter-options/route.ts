import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Fetch filter options from backend API
    const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v4/restaurants/filter-options`, {
      headers: {
        'Authorization': `Bearer ${process.env.BACKEND_API_KEY}`,
      },
    });
    
    if (!backendResponse.ok) {
      // Return default options if backend is unavailable
      return NextResponse.json({
        success: true,
        data: {
          agencies: [
            'ORB',
            'OU',
            'Star-K',
            'CRC',
            'Kof-K',
            'OK Kosher',
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
            'Bakery',
            'Catering',
            'Cafe',
            'Deli',
            'Food Truck',
            'Grocery Store',
            'Other'
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
    
    const data = await backendResponse.json();
    
    return NextResponse.json({
      success: true,
      data: data.data || data
    });
    
  } catch (error) {
    console.error('Error fetching filter options:', error);
    
    // Return default options on error
    return NextResponse.json({
      success: true,
      data: {
        agencies: [
          'ORB',
          'OU',
          'Star-K',
          'CRC',
          'Kof-K',
          'OK Kosher',
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
          'Bakery',
          'Catering',
          'Cafe',
          'Deli',
          'Food Truck',
          'Grocery Store',
          'Other'
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