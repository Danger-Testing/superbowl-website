import { NextRequest, NextResponse } from "next/server";

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

const STYLE_PROMPT = `High-contrast monochrome ink look: heavy blacks carved out of bright white space, minimal midtones. Expressive, scratchy linework: dry-brush streaks, jittery hatching, and visible stroke direction. Strong line-weight variation: thick-to-thin contours that snap between delicate detail and bold outline. Graphic poster sensibility: simplified shapes, readable silhouettes, and flat shadow masses. Comic/storyboard finish: confident panel-border geometry, bold framing language, and print-ready clarity. Analog/print imperfections: uneven fills, rough edges, slight bleed/ghosting like photocopy or risograph. Controlled limited-palette feel: primarily black/white with restrained gray/blue wash and rare accent hits. Cinematic contrast design: dramatic cropping, deep blacks for depth, and lighting implied via negative space. Texture-forward surfaces: layered hatching, scumbled blacks, and paper grain showing through. Overall mood: stark, gritty, dystopian tone created purely through contrast, density, and abrasion.`;

export async function POST(request: NextRequest) {
  try {
    const { scene, character, brand } = await request.json();

    if (!scene) {
      return NextResponse.json({ error: "Scene is required" }, { status: 400 });
    }

    const fullPrompt = `${scene}. Character: ${character || "mysterious figure"}. Brand: ${brand || "product"} visible in scene. ${STYLE_PROMPT}`;

    // Using Flux Schnell for fast image generation
    const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        input: {
          prompt: fullPrompt,
          aspect_ratio: "1:1",
          output_format: "webp",
          output_quality: 80,
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
    console.error("Image API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Poll for image completion
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
    console.error("Image poll error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
