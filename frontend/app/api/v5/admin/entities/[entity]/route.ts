import { NextRequest } from 'next/server'
import { createEntityRoute } from '@/lib/api/route-factory'

export const dynamic = 'force-dynamic'

const adminConfig = {
  auth: { required: true, requireAdmin: true },
}

export function GET(request: NextRequest, { params }: { params: { entity: string } }) {
  const handler = createEntityRoute(params.entity as any, adminConfig)
  return handler.GET(request, { params })
}

export async function POST(request: NextRequest, { params }: { params: { entity: string } }) {
  const handler = createEntityRoute(params.entity as any, adminConfig)
  return handler.POST(request, { params })
}

