import { NextRequest, NextResponse } from 'next/server'

// This route is disabled because the project uses Supabase Auth instead of Prisma for user management
export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    message: 'This endpoint is disabled. Please use Supabase Auth for password reset.' 
  }, { status: 501 })
}
