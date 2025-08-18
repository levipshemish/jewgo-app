import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

const API_BASE_URL = process.env.ADMIN_API_URL || process.env.BACKEND_URL || 'https://jewgo.onrender.com'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '9e7ca8004763f06536ae4e34bf7a1c3abda3e6971508fd867f9296b7f2f23c25'

async function forward(req: NextRequest, method: 'GET' | 'PUT' | 'DELETE', id: string) {
  if (!ADMIN_TOKEN) {
    // console.error('ADMIN_TOKEN not configured')
    return new Response(JSON.stringify({ 
      error: 'ADMIN_TOKEN not configured',
      message: 'Please configure ADMIN_TOKEN in the frontend environment variables'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
  
  const url = new URL(req.url)
  const search = url.search || ''
  const target = `${API_BASE_URL}/api/admin/restaurants/${id}${search}`

  const headers: Record<string, string> = {
    Authorization: `Bearer ${ADMIN_TOKEN || ''}`,
  }

  const contentType = req.headers.get('content-type')
      if (contentType) {
      headers['Content-Type'] = contentType;
    }

  const init: RequestInit = { method, headers }

  if (method !== 'GET') {
    const body = await req.text()
    init.body = body
  }

  try {
    const res = await fetch(target, init)
    const text = await res.text()
    const ct = res.headers.get('content-type') || 'application/json'
    
    if (res.status === 500) {
      return new Response(JSON.stringify({ 
        error: 'Backend server error',
        message: 'The backend server is not properly configured with ADMIN_TOKEN. Please check the backend environment variables.',
        details: text
      }), { status: 503, headers: { 'Content-Type': 'application/json' } })
    }
    
    return new Response(text, { status: res.status, headers: { 'Content-Type': ct } })
  } catch {
    // console.error('Error forwarding request:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to forward request to backend',
      message: 'Unable to connect to the backend server. Please check if the backend is running and accessible.'
    }), { 
      status: 503, 
      headers: { 'Content-Type': 'application/json' } 
    })
  }
}

export async function GET(
  req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return forward(req, 'GET', id)
}

export async function PUT(
  req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return forward(req, 'PUT', id)
}

export async function DELETE(
  req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return forward(req, 'DELETE', id)
}
