import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const SUPPORTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Photo import is temporarily unavailable. Type the bullet points instead and Aria can still create the note." },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const image = formData.get("image") as File | null;

    if (!image) {
      return NextResponse.json({ error: "Please upload a photo of rough notes." }, { status: 400 });
    }

    if (!SUPPORTED_TYPES.has(image.type)) {
      return NextResponse.json({ error: "Please upload a JPG, PNG, WEBP, HEIC or HEIF image." }, { status: 400 });
    }

    if (image.size > MAX_BYTES) {
      return NextResponse.json({ error: "Photo is too large. Please upload an image under 8MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const dataUrl = `data:${image.type};base64,${buffer.toString("base64")}`;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: "Extract support-worker rough note text from the image. Return only the readable notes as plain text. Do not invent details. If the image is unclear, return the parts you can read and say which parts are unclear.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the rough support note content from this image so it can be turned into a structured draft." },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });

    const text = response.choices[0]?.message?.content?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "Could not read text from this image. Type the key bullet points instead." },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (error) {
    console.error("[ocr-notes] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Photo import failed. Type the bullet points instead." },
      { status: 500 }
    );
  }
}
