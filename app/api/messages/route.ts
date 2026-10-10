import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const rows = await sql`
      SELECT id, text, created_at AS "createdAt"
      FROM messages
      ORDER BY created_at ASC
    `;
    return NextResponse.json(rows);
  } catch (err) {
    console.error("GET /api/messages failed:", err);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const [row] = await sql`
      INSERT INTO messages (text)
      VALUES (${text.trim()})
      RETURNING id, text, created_at AS "createdAt"
    `;
    return NextResponse.json(row, { status: 201 });
  } catch (err) {
    console.error("POST /api/messages failed:", err);
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
  }
}
