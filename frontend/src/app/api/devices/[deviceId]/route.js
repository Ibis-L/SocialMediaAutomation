const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function DELETE(request, { params }) {
  try {
    const { deviceId } = await params;

    const response = await fetch(`${BACKEND_URL}/masters/api/devices/${deviceId}/`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
        throw new Error(`Django API returned ${response.status}`);
    }

    // DELETE typically returns 204 No Content with no body, so we return a simple success object
    return Response.json({ success: true });
  } catch (error) {
    console.error("[device DELETE proxy] Error:", error);
    return Response.json(
      { success: false, error: "Failed to delete device from backend: " + error.message },
      { status: 500 }
    );
  }
}