import { NextResponse, NextRequest } from 'next/server'

export const runtime = 'nodejs'

// This route is disabled because the project uses Supabase Auth instead of Prisma for user management
export async function POST(_request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    message: 'This endpoint is disabled. Please use Supabase Auth for user registration.' 
  }, { status: 501 })
}


