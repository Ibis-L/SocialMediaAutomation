export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function GET(request) {
  try {
    const response = await fetch(`${BACKEND_URL}/masters/api/app-versions/latest/`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await response.json();
    if (!response.ok) {
        return Response.json(data, { status: response.status });
    }

    // Rewrite the APK URL so the browser can reach it
    if (data.apk_file) {
      const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";

      if (process.env.BACKEND_URL) {
        // k8s: keep only the path, serve it from the public host (ingress routes /media to Django)
        try {
          const u = new URL(data.apk_file, BACKEND_URL);
          const proto = (request.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
          data.apk_file = `${proto}://${host}${u.pathname}`;
        } catch (e) {
          // leave apk_file as returned by the backend
        }
      } else {
        // local dev: original behaviour
        const ip = host.split(":")[0];
        if (ip && ip !== 'localhost') {
          data.apk_file = data.apk_file.replace('127.0.0.1:8000', `${ip}:8000`).replace('localhost:8000', `${ip}:8000`);
        }
      }
    }

    return Response.json(data);
  } catch (error) {
    console.error("[app-versions GET proxy] Error:", error);
    return Response.json(
      { success: false, error: "Failed to fetch from backend: " + error.message },
      { status: 500 }
    );
  }
}