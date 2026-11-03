const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "mediatech-automation-secret-token-2026";

export async function POST(request, { params }) {
  try {
    const { deviceId } = await params;
    const body = await request.json();

    const response = await fetch(`${BACKEND_URL}/masters/api/devices/${deviceId}/add_contact/`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_SECRET,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    console.error("[devices contact POST proxy] Error:", error);
    return Response.json(
      { success: false, error: "Failed to add contact: " + error.message },
      { status: 500 }
    );
  }
}