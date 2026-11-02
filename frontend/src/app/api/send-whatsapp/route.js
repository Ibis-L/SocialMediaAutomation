/**
 * POST /api/send-whatsapp
 *
 * Proxies WhatsApp task requests to the backend (server-side),
 * avoiding browser CORS restrictions.
 *
 * Body: { tasks: [{ phone: string, message: string }] }
 */
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request) {
  try {
    const body = await request.json();

    const response = await fetch(
      `${BACKEND_URL}/masters/api/tasks/enqueue_bulk/`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const text = await response.text();

    // Try to parse as JSON, fall back to wrapping the text
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Some backends return plain text success responses
      data = { success: response.ok, message: text };
    }

    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("[send-whatsapp proxy] Error:", error);
    return Response.json(
      { success: false, error: "Failed to reach WhatsApp backend: " + error.message },
      { status: 500 }
    );
  }
}