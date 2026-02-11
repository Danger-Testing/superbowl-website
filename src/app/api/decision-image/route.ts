import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

const decisionPrompts: Record<string, string> = {
  porsche: `A person sitting alone in a beautiful Porsche 911, parked in a driveway of a modest house. The car is gleaming but the person looks stressed, staring at bills and bank statements scattered on the passenger seat. Empty wallet visible. The contrast between the luxury car and financial stress is palpable. Realistic photography style, cinematic lighting, melancholic mood.`,

  save: `A middle-aged person sitting alone in a sparse, minimalist apartment, staring at a computer screen showing a large bank balance. They look healthy but lonely. No decorations, no photos of friends or family, just bare walls and a single plant. A stack of untouched travel brochures gathering dust. The person has never lived, only saved. Realistic photography style, cold blue lighting, isolated atmosphere.`,

  sushi: `A joyful person at a sushi restaurant surrounded by empty plates, chopsticks in hand, laughing with friends. Photos on the wall behind them show the same person at different sushi restaurants around the world - Tokyo, LA, NYC. They look genuinely happy and fulfilled, with a slightly rounder figure and the biggest smile. Warm golden lighting, vibrant colors, sense of community and joy. Realistic photography style.`,
};

export async function POST(request: NextRequest) {
  try {
    const { decision } = await request.json();

    if (!decision || !decisionPrompts[decision]) {
      return NextResponse.json(
        { error: "Valid decision is required" },
        { status: 400 }
      );
    }

    const prompt = decisionPrompts[decision];

    const response = await fetch(
      "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        },
        body: JSON.stringify({
          input: {
            prompt,
            aspect_ratio: "1:1",
            output_format: "webp",
            output_quality: 90,
          },
        }),
      }
    );

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
    console.error("Decision image API error:", error);
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
    console.error("Decision image poll error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
