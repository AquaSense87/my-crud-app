import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Setup failed:", err);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}
