import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const MODELS = ["gemini-3.8-flash-lite", "gemini-3.8-flash", "gemini-3.8-flash-preview-05-20"];

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
        return NextResponse.json({ text, model });
      } catch (err: unknown) {
        const status = (err as { status?: number }).status;
        console.warn(`Model ${model} failed (${status}):`, err);
        lastErr = err;
        if (status !== 503 && status !== 404) break; // don't retry non-transient errors
      }
    }
    throw lastErr;
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
