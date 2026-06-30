import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "Voice transcription requires an OpenAI API key." }, { status: 503 });
    }

    const formData = await request.formData();
    const audio = formData.get("audio") as File | null;

    if (!audio) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: "whisper-1",
    });

    return NextResponse.json({ transcript: transcription.text });

  } catch (error) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Voice transcription could not finish. Your note is not lost: switch to Type bullet points or retry when the connection is stronger." },
      { status: 500 }
    );
  }
}
