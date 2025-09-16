import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  try {
    // Make direct call to backend to get filter options
    const url = 'https://api.jewgo.app/api/v5/synagogues?limit=1&include_filter_options=true';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Extract filter options from backend response
    const filterOptions = data.filterOptions || {};

    return NextResponse.json({
      success: true,
      data: filterOptions
    });

  } catch (error) {
    console.error('Synagogue filter options API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
