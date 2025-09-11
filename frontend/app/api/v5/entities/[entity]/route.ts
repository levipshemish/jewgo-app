import { NextRequest } from 'next/server'
import { createEntityRoute } from '@/lib/api/route-factory'

export const dynamic = 'force-dynamic'

export function GET(request: NextRequest, { params }: { params: { entity: string } }) {
  const { entity } = params
  const handler = createEntityRoute(entity as any)
  return handler.GET(request, { params })
}

export async function POST(request: NextRequest, { params }: { params: { entity: string } }) {
  const { entity } = params
  const handler = createEntityRoute(entity as any)
  return handler.POST(request, { params })
}

