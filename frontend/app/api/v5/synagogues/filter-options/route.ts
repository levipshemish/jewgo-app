import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  // Return hardcoded filter options for synagogues
  return NextResponse.json({
    success: true,
    data: {
      denominations: ['orthodox', 'conservative', 'reform', 'reconstructionist'],
      shulTypes: ['traditional', 'chabad', 'orthodox', 'sephardic'],
      shulCategories: ['ashkenazi', 'chabad', 'sephardic'],
      cities: ['Miami', 'Fort Lauderdale', 'Boca Raton', 'Hollywood', 'Aventura'],
      states: ['FL'],
      ratings: [5.0, 4.5, 4.0, 3.5, 3.0, 2.5, 2.0, 1.5, 1.0],
      accessibility: ['has_disabled_access', 'has_parking'],
      services: ['has_daily_minyan', 'has_shabbat_services', 'has_holiday_services'],
      facilities: ['has_parking', 'has_kiddush_facilities', 'has_social_hall', 'has_library', 'has_hebrew_school']
    }
  });
}
