import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "mediatech-automation-secret-token-2026";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/masters/api/tasks/unified_queue/`, {
      cache: "no-store",
      headers: {
        "X-Internal-Secret": INTERNAL_SECRET,
      },
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}