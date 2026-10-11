import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { GoogleGenAI } from "@google/genai";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

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

    const response = await genai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt.trim(),
    });

    const text = response.text ?? "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("Gemini error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
