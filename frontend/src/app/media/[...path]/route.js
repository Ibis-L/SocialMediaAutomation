export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams?.path;
    const mediaPath = Array.isArray(path) ? path.join('/') : (path || '');
    const targetUrl = `${BACKEND_URL}/media/${mediaPath}`;

    const reqHeaders = {};
    const range = request.headers.get('range');
    if (range) {
      reqHeaders['range'] = range;
    }

    const backendRes = await fetch(targetUrl, {
      method: 'GET',
      headers: reqHeaders,
      cache: 'no-store',
    });

    if (!backendRes.ok) {
      return new Response(backendRes.statusText || 'Not Found', {
        status: backendRes.status,
      });
    }

    const headers = new Headers();
    const copyHeaders = [
      'content-type',
      'content-length',
      'content-disposition',
      'accept-ranges',
      'content-range',
      'last-modified',
      'etag',
      'cache-control',
    ];

    copyHeaders.forEach((h) => {
      const val = backendRes.headers.get(h);
      if (val) headers.set(h, val);
    });

    // Provide proper headers for APK files so mobile browsers download cleanly
    if (mediaPath.endsWith('.apk')) {
      headers.set('content-type', 'application/vnd.android.package-archive');
      headers.set('content-disposition', 'attachment; filename="automation-app.apk"');
    }

    return new Response(backendRes.body, {
      status: backendRes.status,
      headers,
    });
  } catch (error) {
    console.error('[Media Proxy Error]:', error);
    return new Response('Failed to proxy media: ' + error.message, { status: 502 });
  }
}

