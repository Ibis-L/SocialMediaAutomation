import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/masters/api/twitter/targets/`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[twitter/targets GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Twitter targets: " + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/masters/api/twitter/targets/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error("[twitter/targets POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create Twitter target: " + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Target ID required" }, { status: 400 });
    }
    const res = await fetch(`${BACKEND_URL}/masters/api/twitter/targets/${id}/`, {
      method: "DELETE",
    });
    return NextResponse.json({ success: res.ok }, { status: res.status });
  } catch (error) {
    console.error("[twitter/targets DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete Twitter target: " + error.message },
      { status: 500 }
    );
  }
}
