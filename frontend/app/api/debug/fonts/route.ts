import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const file = searchParams.get('file') || 'Nunito-Regular.woff2';

    // Basic validation: only allow paths under /fonts and no path traversal
    if (file.includes('..') || file.includes('/') || file.startsWith('.')) {
      return NextResponse.json({ error: 'Invalid file parameter' }, { status: 400 });
    }

    const fontUrl = `${origin}/fonts/${file}`;

    // Try HEAD first to read headers without body
    let res: Response | null = null;
    let usedMethod: 'HEAD' | 'GET' = 'HEAD';
    try {
      res = await fetch(fontUrl, { method: 'HEAD', redirect: 'manual', cache: 'no-store' });
      // Some servers might not support HEAD properly (405/4xx), fallback to GET
      if (!res.ok) {
        usedMethod = 'GET';
        res = await fetch(fontUrl, { method: 'GET', redirect: 'manual', cache: 'no-store' });
      }
    } catch {
      // Fallback to GET on network errors
      usedMethod = 'GET';
      res = await fetch(fontUrl, { method: 'GET', redirect: 'manual', cache: 'no-store' });
    }

    const headersToReport = [
      'content-type',
      'content-length',
      'cache-control',
      'etag',
      'last-modified',
      'access-control-allow-origin',
      'x-vercel-cache',
      'cf-cache-status',
      'age',
    ];

    const headerReport: Record<string, string | null> = {};
    for (const h of headersToReport) {
      headerReport[h] = res.headers.get(h);
    }

    // Optionally inspect first 4 bytes to verify WOFF/WOFF2 signature
    let signature: string | null = null;
    if (usedMethod === 'GET' && res.ok) {
      try {
        const ab = await res.arrayBuffer();
        // Avoid iteration over TypedArray for compatibility with older TS targets
        const view = new DataView(ab);
        const b0 = view.byteLength > 0 ? view.getUint8(0) : 0;
        const b1 = view.byteLength > 1 ? view.getUint8(1) : 0;
        const b2 = view.byteLength > 2 ? view.getUint8(2) : 0;
        const b3 = view.byteLength > 3 ? view.getUint8(3) : 0;
        signature = String.fromCharCode(b0, b1, b2, b3);
      } catch {
        signature = null;
      }
    }

    const payload = {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      url: fontUrl,
      methodUsed: usedMethod,
      redirected: res.redirected,
      headers: headerReport,
      // Known valid signatures: 'wOFF' (WOFF), 'wOF2' (WOFF2)
      signature,
      signatureLooksValid: signature === 'wOFF' || signature === 'wOF2',
    };

    // Log on server for quick inspection
    // eslint-disable-next-line no-console
    console.log('[fonts-debug]', payload);

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error('[fonts-debug] error', err?.message || err);
    return NextResponse.json({ error: 'Debug check failed', message: err?.message }, { status: 500 });
  }
}
