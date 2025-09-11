import { NextRequest, NextResponse } from 'next/server'
import apiClient from '@/lib/api/client-v5'
import { createRoute } from '@/lib/api/route-factory'

export const dynamic = 'force-dynamic'

export const GET = createRoute(async (request: NextRequest, { params, utils }) => {
  const entity = params?.entity as string
  const idParam = params?.id as string
  if (!utils.validateEntity(entity)) {
    return utils.formatError('Invalid entity type', 400)
  }
  const entityId = Number(idParam)
  if (!entityId || Number.isNaN(entityId)) {
    return utils.formatError('Invalid entity id', 400)
  }

  const res = await apiClient.get(`/api/v5/${entity}/${entityId}`)
  if (res.status !== 200) {
    return utils.formatError('Entity not found', res.status || 404)
  }
  return utils.formatResponse(res.data)
})

