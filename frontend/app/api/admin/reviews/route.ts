import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';

const API_BASE_URL = process.env.ADMIN_API_URL || process.env.BACKEND_URL || 'https://jewgo.onrender.com';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

async function forwardRequest(req: NextRequest, method: 'GET' | 'PUT' | 'DELETE') {
  // Get session server-side
  const session = await getServerSession(authOptions) as any;
  
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!ADMIN_TOKEN) {
    return NextResponse.json({ 
      error: 'ADMIN_TOKEN not configured',
      message: 'Please configure ADMIN_TOKEN in the environment variables'
    }, { status: 500 });
  }

  const url = new URL(req.url);
  const search = url.search || '';
  const target = `${API_BASE_URL}/api/admin/reviews${search}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${ADMIN_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const init: RequestInit = { method, headers };

  if (method !== 'GET') {
    const body = await req.text();
    init.body = body;
  }

  try {
    const res = await fetch(target, init);
    const data = await res.json();
    
    return NextResponse.json(data, { status: res.status });
  } catch (_error) {
    console.error('Error forwarding request:', _error);
    return NextResponse.json({ 
      error: 'Failed to forward request to backend',
      message: 'Unable to connect to the backend server'
    }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  return forwardRequest(req, 'GET');
}

export async function PUT(req: NextRequest) {
  return forwardRequest(req, 'PUT');
}

export async function DELETE(req: NextRequest) {
  return forwardRequest(req, 'DELETE');
}
