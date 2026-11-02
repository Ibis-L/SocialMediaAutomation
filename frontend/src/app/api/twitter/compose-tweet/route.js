import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function POST(request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/masters/api/twitter/tasks/enqueue_tweet/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[twitter/compose-tweet POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to queue custom tweet: " + error.message },
      { status: 500 }
    );
  }
}
