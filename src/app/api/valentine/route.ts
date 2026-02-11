import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

const VALENTINE_STYLE_PROMPT = `Hazy, motion-blurred, memory-fragment realism. Half-remembered moment mid-movement.
Handheld, imperfect, incidental vantage. Smear, rolling-shutter wobble, accidental framing.
Human presence implied not shown. Partially silhouetted. Face unreadable. Mid-motion. Ambiguous.
Overexposed center, dirty shadows, vignette into murk.
Harsh light bleeding in. Veiling glare. Lifted blacks. Bloom around highlights.
Washed out. Nicotine-tinted. Desaturated. Muted greens yellows grays.
Murky. Dreamlike. Raw. Unpolished.
Background streaks and smears. Unreadable details.
Grit. Soft focus. Film noise. No sharp edges.
Do: overexposure, motion blur, ambiguous figures, grime, grain.
Avoid: clean lighting, sharp focus, vivid color, clarity, polish.`;

export async function POST(request: NextRequest) {
  try {
    const { scene } = await request.json();

    if (!scene) {
      return NextResponse.json({ error: "Scene is required" }, { status: 400 });
    }

    const fullPrompt = `${scene}. ${VALENTINE_STYLE_PROMPT}`;

    const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        input: {
          prompt: fullPrompt,
          aspect_ratio: "16:9",
          output_format: "webp",
          output_quality: 90,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Replicate error:", error);
      return NextResponse.json(
        { error: "Image generation failed to start" },
        { status: 500 }
      );
    }

    const prediction = await response.json();

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
    });
  } catch (error) {
    console.error("Valentine API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${id}`,
      {
        headers: {
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch prediction" },
        { status: 500 }
      );
    }

    const prediction = await response.json();

    return NextResponse.json({
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error,
    });
  } catch (error) {
    console.error("Valentine poll error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
