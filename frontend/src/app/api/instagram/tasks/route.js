import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "mediatech-automation-secret-token-2026";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/masters/api/instagram/tasks/`, {
      cache: "no-store",
      headers: {
        "X-Internal-Secret": INTERNAL_SECRET,
      },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[instagram tasks GET proxy] Error:", error);
    return NextResponse.json({ error: "Failed to fetch Instagram tasks: " + error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let res;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      res = await fetch(`${BACKEND_URL}/masters/api/instagram/tasks/enqueue/`, {
        method: "POST",
        headers: {
          "X-Internal-Secret": INTERNAL_SECRET,
        },
        body: formData,
      });
    } else {
      const body = await request.json();
      res = await fetch(`${BACKEND_URL}/masters/api/instagram/tasks/enqueue/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_SECRET,
        },
        body: JSON.stringify(body),
      });
    }

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[instagram tasks POST proxy] Error:", error);
    return NextResponse.json(
      { error: "Failed to queue Instagram task: " + error.message },
      { status: 500 }
    );
  }
}

