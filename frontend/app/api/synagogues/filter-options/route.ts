import { NextRequest, NextResponse } from 'next/server';

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'synagogue-filter-options';

export async function GET(_request: NextRequest) {
  try {
    // Check cache first
    const cached = cache.get(CACHE_KEY);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes browser cache
          'CDN-Cache-Control': 'public, max-age=300',
          'Vercel-CDN-Cache-Control': 'public, max-age=300'
        }
      });
    }

    // Use production backend URL if environment variable is not set
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:5000';
    
    // Fetch filter options from backend API
    const backendResponse = await fetch(`${backendUrl}/api/v4/synagogues/filter-options`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!backendResponse.ok) {
      // Return default options if backend is unavailable
      const defaultOptions = {
        cities: ['Miami', 'Miami Beach', 'Boca Raton', 'Hollywood', 'Fort Lauderdale'],
        states: ['FL', 'NY', 'CA', 'NJ', 'IL'],
        denominations: ['Orthodox', 'Conservative', 'Reform', 'Reconstructionist', 'Chabad'],
        shulTypes: ['Synagogue', 'Chabad House', 'Community Center', 'Shtiebel'],
        shulCategories: ['Traditional', 'Modern', 'Hasidic', 'Sephardic', 'Ashkenazi'],
        booleanOptions: {
          hasDailyMinyan: 'Has Daily Minyan',
          hasShabbatServices: 'Has Shabbat Services',
          hasHolidayServices: 'Has Holiday Services',
          hasWomenSection: 'Has Women Section',
          hasMechitza: 'Has Mechitza',
          hasSeparateEntrance: 'Has Separate Entrance',
          hasParking: 'Has Parking',
          hasDisabledAccess: 'Has Disabled Access',
          hasKiddushFacilities: 'Has Kiddush Facilities',
          hasSocialHall: 'Has Social Hall',
          hasLibrary: 'Has Library',
          hasHebrewSchool: 'Has Hebrew School',
          hasAdultEducation: 'Has Adult Education',
          hasYouthPrograms: 'Has Youth Programs',
          hasSeniorPrograms: 'Has Senior Programs',
          acceptsVisitors: 'Accepts Visitors',
          membershipRequired: 'Membership Required'
        }
      };
      
      // Cache the default options
      cache.set(CACHE_KEY, {
        data: defaultOptions,
        timestamp: Date.now()
      });
      
      return NextResponse.json({
        success: true,
        data: defaultOptions,
        message: 'Using default filter options (backend unavailable)',
        cached: false
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'CDN-Cache-Control': 'public, max-age=300',
          'Vercel-CDN-Cache-Control': 'public, max-age=300'
        }
      });
    }
    
    const backendData = await backendResponse.json();
    
    if (backendData.success && backendData.data) {
      // Cache the successful response
      cache.set(CACHE_KEY, {
        data: backendData.data,
        timestamp: Date.now()
      });
      
      return NextResponse.json({
        success: true,
        data: backendData.data,
        message: 'Filter options retrieved successfully',
        cached: false
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300',
          'CDN-Cache-Control': 'public, max-age=300',
          'Vercel-CDN-Cache-Control': 'public, max-age=300'
        }
      });
    } else {
      throw new Error('Invalid response format from backend');
    }
    
  } catch (error) {
    console.error('Error fetching synagogue filter options:', error);
    
    // Return default options on error
    const defaultOptions = {
      cities: ['Miami', 'Miami Beach', 'Boca Raton', 'Hollywood', 'Fort Lauderdale'],
      states: ['FL', 'NY', 'CA', 'NJ', 'IL'],
      denominations: ['Orthodox', 'Conservative', 'Reform', 'Reconstructionist', 'Chabad'],
      shulTypes: ['Synagogue', 'Chabad House', 'Community Center', 'Shtiebel'],
      shulCategories: ['Traditional', 'Modern', 'Hasidic', 'Sephardic', 'Ashkenazi'],
      booleanOptions: {
        hasDailyMinyan: 'Has Daily Minyan',
        hasShabbatServices: 'Has Shabbat Services',
        hasHolidayServices: 'Has Holiday Services',
        hasWomenSection: 'Has Women Section',
        hasMechitza: 'Has Mechitza',
        hasSeparateEntrance: 'Has Separate Entrance',
        hasParking: 'Has Parking',
        hasDisabledAccess: 'Has Disabled Access',
        hasKiddushFacilities: 'Has Kiddush Facilities',
        hasSocialHall: 'Has Social Hall',
        hasLibrary: 'Has Library',
        hasHebrewSchool: 'Has Hebrew School',
        hasAdultEducation: 'Has Adult Education',
        hasYouthPrograms: 'Has Youth Programs',
        hasSeniorPrograms: 'Has Senior Programs',
        acceptsVisitors: 'Accepts Visitors',
        membershipRequired: 'Membership Required'
      }
    };
    
    return NextResponse.json({
      success: true,
      data: defaultOptions,
      message: 'Using default filter options due to error',
      cached: false
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        'CDN-Cache-Control': 'public, max-age=300',
        'Vercel-CDN-Cache-Control': 'public, max-age=300'
      }
    });
  }
}
