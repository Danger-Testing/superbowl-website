import { NextRequest, NextResponse } from "next/server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

// Voice IDs for different character vibes
const VOICE_PRESETS: Record<string, string> = {
  // ElevenLabs premade voices - we'll use these as base
  narrator: "21m00Tcm4TlvDq8ikWAM", // Rachel - good for narration
  deep: "29vD33N1CtxCmqQRPOHJ", // Drew - deep male voice
  energetic: "ErXwobaYiN019PkySvjV", // Antoni - energetic
  wise: "VR6AewLTigWG4xSOukaG", // Arnold - authoritative
  friendly: "pNInz6obpgDQGcFmaJgB", // Adam - friendly male
};

export async function POST(request: NextRequest) {
  try {
    const { text, character } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Pick a voice based on character or default to narrator
    let voiceId = VOICE_PRESETS.narrator;

    const characterLower = (character || "").toLowerCase();
    if (characterLower.includes("rock") || characterLower.includes("vader") || characterLower.includes("batman")) {
      voiceId = VOICE_PRESETS.deep;
    } else if (characterLower.includes("snoop") || characterLower.includes("kevin")) {
      voiceId = VOICE_PRESETS.friendly;
    } else if (characterLower.includes("beyoncé") || characterLower.includes("taylor")) {
      voiceId = VOICE_PRESETS.energetic;
    } else if (characterLower.includes("martha") || characterLower.includes("yoda") || characterLower.includes("groot")) {
      voiceId = VOICE_PRESETS.wise;
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY!,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("ElevenLabs error:", error);
      return NextResponse.json(
        { error: "Voice generation failed" },
        { status: 500 }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("Voice API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
