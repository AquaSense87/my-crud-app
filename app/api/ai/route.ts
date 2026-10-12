import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";
import { sql } from "@/lib/db";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3.8-flash"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    let lastErr: unknown;
    for (const model of MODELS) {
      try {
        const response = await genai.models.generateContent({
          model,
          contents: prompt.trim(),
        });
        const text = response.text ?? "";
        console.log(`Gemini responded using model: ${model}`);

        // Log to Postgres (non-blocking — failure doesn't affect response)
        sql`
          INSERT INTO chat_logs (user_email, prompt, response, model)
          VALUES (${session.user?.email ?? "unknown"}, ${prompt.trim()}, ${text}, ${model})
        `.catch(err => console.error("chat_logs insert failed:", err));

        return NextResponse.json({ text, model });
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        console.warn(`Model ${model} failed (${status}):`, err);
        lastErr = err;
        if (status !== 503 && status !== 404) break;
      }
    }
    throw lastErr;
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
