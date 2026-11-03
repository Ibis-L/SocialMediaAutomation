import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET || "mediatech-automation-secret-token-2026";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.toString();
    const url = `${BACKEND_URL}/masters/api/devices/${query ? `?${query}` : ""}`;

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Secret": INTERNAL_SECRET,
      },
    });

    if (!response.ok) {
      throw new Error(`Django API returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[devices GET proxy] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch devices from backend: " + error.message, results: [] },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/masters/api/devices/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[devices POST proxy] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create device: " + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Device ID required" }, { status: 400 });
    }
    const res = await fetch(`${BACKEND_URL}/masters/api/devices/${id}/`, {
      method: "DELETE",
    });
    return NextResponse.json({ success: res.ok }, { status: res.status });
  } catch (error) {
    console.error("[devices DELETE proxy] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete device: " + error.message },
      { status: 500 }
    );
  }
}
