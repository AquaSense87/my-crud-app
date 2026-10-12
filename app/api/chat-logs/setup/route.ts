import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  await sql`
    CREATE TABLE IF NOT EXISTS chat_logs (
      id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_email  TEXT        NOT NULL,
      prompt      TEXT        NOT NULL,
      response    TEXT        NOT NULL,
      model       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  return NextResponse.json({ ok: true });
}
