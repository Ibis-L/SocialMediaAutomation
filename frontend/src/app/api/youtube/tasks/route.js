import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "mediatech-automation-secret-token-2026";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/masters/api/youtube/tasks/`, {
      cache: "no-store",
      headers: {
        "X-Internal-Secret": INTERNAL_SECRET,
      },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[youtube tasks GET proxy] Error:", error);
    return NextResponse.json({ error: "Failed to fetch YouTube tasks: " + error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const jsonBody = await request.json();
      const endpoint = jsonBody.device_ids
        ? `${BACKEND_URL}/masters/api/youtube/tasks/enqueue_bulk/`
        : `${BACKEND_URL}/masters/api/youtube/tasks/`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_SECRET,
        },
        body: JSON.stringify(jsonBody),
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    } else {
      const formData = await request.formData();
      const response = await fetch(`${BACKEND_URL}/masters/api/youtube/tasks/`, {
        method: "POST",
        headers: {
          "X-Internal-Secret": INTERNAL_SECRET,
        },
        body: formData,
      });

      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
  } catch (error) {
    console.error("[youtube tasks POST proxy] Error:", error);
    return NextResponse.json(
      { error: "Failed to queue YouTube task: " + error.message },
      { status: 500 }
    );
  }
}
