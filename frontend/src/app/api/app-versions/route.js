export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request) {
  try {
    const formData = await request.formData();

    const response = await fetch(`${BACKEND_URL}/masters/api/app-versions/`, {
      method: "POST",
      body: formData, // passing formData directly lets fetch set the correct multipart boundaries
    });

    let data;
    try {
      data = await response.json();
    } catch(e) {
      // In case the response is not JSON
      data = { error: "Non-JSON response from server" };
    }

    if (!response.ok) {
        return Response.json(data, { status: response.status });
    }
    return Response.json(data);
  } catch (error) {
    console.error("[app-versions POST proxy] Error:", error);
    return Response.json(
      { success: false, error: "Failed to upload to backend: " + error.message },
      { status: 500 }
    );
  }
}