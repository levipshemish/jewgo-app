import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest) {
  // Return hardcoded filter options for mikvahs
  return NextResponse.json({
    success: true,
    data: {
      appointmentRequired: ['true', 'false'],
      statuses: ['active', 'inactive', 'pending'],
      cities: ['Miami', 'Fort Lauderdale', 'Boca Raton'],
      contactPersons: ['Rabbi Smith', 'Rabbi Cohen'],
      facilities: ['appointment_required', 'is_currently_open'],
      accessibility: ['appointment_required'],
      appointmentTypes: ['appointment_required', 'walk_in_available']
    }
  });
}
