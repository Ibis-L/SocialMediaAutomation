import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "mediatech-automation-secret-token-2026";

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let res;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      res = await fetch(`${BACKEND_URL}/masters/api/twitter/tasks/enqueue_tweet/`, {
        method: "POST",
        headers: {
          "X-Internal-Secret": INTERNAL_SECRET,
        },
        body: formData,
      });
    } else {
      const body = await request.json();
      res = await fetch(`${BACKEND_URL}/masters/api/twitter/tasks/enqueue_tweet/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_SECRET,
        },
        body: JSON.stringify(body),
      });
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[twitter/compose-tweet POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to queue custom tweet: " + error.message },
      { status: 500 }
    );
  }
}
