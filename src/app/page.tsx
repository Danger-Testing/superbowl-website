"use client";

import { useState } from "react";

const brands = [
  "Doritos",
  "Budweiser",
  "Pepsi",
  "Coca-Cola",
  "Nike",
  "Apple",
  "Amazon",
  "Google",
  "Toyota",
  "Hyundai",
  "T-Mobile",
  "Verizon",
  "McDonald's",
  "Uber Eats",
  "DraftKings",
  "Squarespace",
];

const characters = [
  "The Rock",
  "Beyoncé",
  "Tom Brady",
  "Serena Williams",
  "Shrek",
  "SpongeBob",
  "Darth Vader",
  "Batman",
  "Kevin Hart",
  "Taylor Swift",
  "Martha Stewart",
  "Snoop Dogg",
  "Mickey Mouse",
  "Groot",
  "Pikachu",
  "Mario",
];

const storyboardPlaceholders = [
  "WIDE SHOT: Industrial warehouse. Rows of workers stare at screens.",
  "CLOSE UP: A single chip falls in slow motion.",
  "MEDIUM: Character turns dramatically toward camera.",
  "POV: Walking through a crowd of confused onlookers.",
  "WIDE: Character stands alone on mountaintop, holding product.",
  "CLOSE UP: A single tear rolls down cheek.",
  "ACTION: Explosion of color and confetti behind character.",
  "MEDIUM: Character takes a bite / sip / uses product.",
  "FINAL: Logo appears. Slogan fades in. Character winks.",
];

type Tab = "brand" | "character" | "slogan" | "storyboard";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("brand");
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [slogan, setSlogan] = useState("");
  const [storyboard, setStoryboard] = useState<string[]>(Array(9).fill(""));
  const [storyboardImages, setStoryboardImages] = useState<(string | null)[]>(Array(9).fill(null));

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [tiktokAudioUrl, setTiktokAudioUrl] = useState<string | null>(null);
  const [tiktokVideoUrl, setTiktokVideoUrl] = useState<string | null>(null);
  const [isGeneratingTiktok, setIsGeneratingTiktok] = useState(false);

  const canGenerate = selectedBrand && selectedCharacter && slogan;
  const hasStoryboard = storyboard.some((s) => s.trim() !== "");
  const hasStoryboardImages = storyboardImages.some((img) => img !== null);

  const updateStoryboardPanel = (index: number, value: string) => {
    const newStoryboard = [...storyboard];
    newStoryboard[index] = value;
    setStoryboard(newStoryboard);
  };

  const pollForImage = async (id: string): Promise<string | null> => {
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));

      const response = await fetch(`/api/image?id=${id}`);
      const prediction = await response.json();

      if (prediction.status === "succeeded" && prediction.output) {
        // Flux returns an array of URLs
        return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      } else if (prediction.status === "failed") {
        console.error("Image generation failed:", prediction.error);
        return null;
      }

      attempts++;
    }
    return null;
  };

  const generateAd = async () => {
    if (!canGenerate) return;

    setIsGenerating(true);
    setGenerationStatus("Generating storyboard images...");
    setAudioUrl(null);
    setVideoUrl(null);

    try {
      // Generate images for each storyboard panel
      const newImages: (string | null)[] = [...storyboardImages];

      // Generate images in batches of 3 for speed
      for (let batch = 0; batch < 3; batch++) {
        const batchPromises = [];

        for (let i = 0; i < 3; i++) {
          const panelIndex = batch * 3 + i;
          const scene = storyboard[panelIndex].trim() || storyboardPlaceholders[panelIndex];

          setGenerationStatus(`Generating panel ${panelIndex + 1}/9...`);

          batchPromises.push(
            fetch("/api/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                scene,
                character: selectedCharacter,
                brand: selectedBrand,
              }),
            })
              .then((res) => res.json())
              .then(async ({ id }) => {
                if (id) {
                  const imageUrl = await pollForImage(id);
                  newImages[panelIndex] = imageUrl;
                  setStoryboardImages([...newImages]);
                }
              })
          );
        }

        await Promise.all(batchPromises);
      }

      // Generate voice
      setGenerationStatus("Generating voice...");
      const script = `${selectedCharacter} here. Listen up. ${selectedBrand} changed my life.
        You know what I always say? ${slogan}.
        ${selectedBrand}. Get some.`;

      const voiceResponse = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: script,
          character: selectedCharacter,
        }),
      });

      if (voiceResponse.ok) {
        const audioBlob = await voiceResponse.blob();
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      }

      // Generate video
      setGenerationStatus("Generating video (this takes ~2 min)...");

      const storyboardText = storyboard
        .map((panel, i) => panel.trim() || storyboardPlaceholders[i])
        .join(" → ");

      const videoPrompt = `Cinematic Super Bowl commercial. ${selectedCharacter} as spokesperson for ${selectedBrand}.
        Storyboard: ${storyboardText}
        Style: High production value, dramatic lighting, epic feel.
        Slogan: "${slogan}"`;

      const videoResponse = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: videoPrompt }),
      });

      if (videoResponse.ok) {
        const { id } = await videoResponse.json();

        let attempts = 0;
        const maxAttempts = 60;

        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 5000));

          const pollResponse = await fetch(`/api/video?id=${id}`);
          const prediction = await pollResponse.json();

          if (prediction.status === "succeeded" && prediction.output) {
            setVideoUrl(prediction.output);
            break;
          } else if (prediction.status === "failed") {
            console.error("Video generation failed:", prediction.error);
            break;
          }

          attempts++;
          setGenerationStatus(`Generating video... (${attempts * 5}s)`);
        }
      }

      setGenerationStatus("Done!");
    } catch (error) {
      console.error("Generation error:", error);
      setGenerationStatus("Error generating ad");
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTiktok = async () => {
    if (!hasStoryboardImages) return;

    setIsGeneratingTiktok(true);
    setGenerationStatus("Generating TikTok...");
    setTiktokAudioUrl(null);
    setTiktokVideoUrl(null);

    try {
      // Build the storyboard description for the voiceover
      const scenes = storyboard
        .map((panel, i) => panel.trim() || storyboardPlaceholders[i])
        .map((scene, i) => `Panel ${i + 1}: ${scene}`)
        .join(". ");

      const tiktokScript = `Okay hear me out. So ${selectedBrand} drops this Super Bowl ad right? And it's got ${selectedCharacter} in it.
        So it starts with ${storyboard[0] || storyboardPlaceholders[0]}.
        Then boom, ${storyboard[1] || storyboardPlaceholders[1]}.
        And get this - ${storyboard[4] || storyboardPlaceholders[4]}.
        The whole vibe is just... ${slogan}.
        I'm telling you this would break the internet. Like actually viral. Thoughts?`;

      // Generate TikTok voiceover
      setGenerationStatus("Generating TikTok voiceover...");
      const voiceResponse = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: tiktokScript,
          character: "energetic", // Use energetic voice for TikTok vibe
        }),
      });

      if (voiceResponse.ok) {
        const audioBlob = await voiceResponse.blob();
        const url = URL.createObjectURL(audioBlob);
        setTiktokAudioUrl(url);
      }

      // Generate TikTok video
      setGenerationStatus("Generating TikTok video (~2 min)...");

      const tiktokPrompt = `Vertical 9:16 TikTok reaction video format. Main content takes up most of screen showing a dramatic black and white storyboard illustration for a ${selectedBrand} commercial featuring ${selectedCharacter}. Small circular facecam bubble in bottom right corner showing a young excited person reacting and explaining. The person has ring light catchlights, casual clothes, animated expressions, pointing at the main image. Gen-z TikTok creator energy, "okay hear me out" vibes. The storyboard shows: ${storyboard[0] || storyboardPlaceholders[0]}. Split screen layout - art dominates, reactor in corner.`;

      const videoResponse = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: tiktokPrompt }),
      });

      if (videoResponse.ok) {
        const { id } = await videoResponse.json();

        let attempts = 0;
        const maxAttempts = 60;

        while (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 5000));

          const pollResponse = await fetch(`/api/video?id=${id}`);
          const prediction = await pollResponse.json();

          if (prediction.status === "succeeded" && prediction.output) {
            setTiktokVideoUrl(prediction.output);
            break;
          } else if (prediction.status === "failed") {
            console.error("TikTok video generation failed:", prediction.error);
            break;
          }

          attempts++;
          setGenerationStatus(`Generating TikTok video... (${attempts * 5}s)`);
        }
      }

      setGenerationStatus("TikTok done!");
    } catch (error) {
      console.error("TikTok generation error:", error);
      setGenerationStatus("Error generating TikTok");
    } finally {
      setIsGeneratingTiktok(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-black">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <h1 className="text-lg font-medium tracking-tight text-black dark:text-white">
          superbowl admaker
        </h1>
        <div className="flex items-center gap-4">
          {selectedBrand && (
            <span className="text-xs text-black/50 dark:text-white/50">
              {selectedBrand} {selectedCharacter && `× ${selectedCharacter}`}
            </span>
          )}
          <button
            onClick={generateAd}
            disabled={!canGenerate || isGenerating}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
              canGenerate && !isGenerating
                ? "bg-black text-white dark:bg-white dark:text-black hover:opacity-80"
                : "bg-black/10 text-black/30 dark:bg-white/10 dark:text-white/30 cursor-not-allowed"
            }`}
          >
            {isGenerating ? "generating..." : "generate"}
          </button>
        </div>
      </header>

      {/* Generation Status */}
      {isGenerating && (
        <div className="px-6 pb-2">
          <p className="text-sm text-center text-black/60 dark:text-white/60">
            {generationStatus}
          </p>
        </div>
      )}

      {/* Audio/Video Results */}
      {(audioUrl || videoUrl || tiktokAudioUrl || tiktokVideoUrl) && (
        <div className="px-6 pb-4">
          <div className="max-w-2xl mx-auto p-4 rounded-lg border border-black/10 dark:border-white/10">
            {audioUrl && (
              <div className="mb-3">
                <p className="text-xs text-black/40 dark:text-white/40 mb-1">voiceover:</p>
                <audio controls src={audioUrl} className="w-full" />
              </div>
            )}
            {videoUrl && (
              <div className="mb-3">
                <p className="text-xs text-black/40 dark:text-white/40 mb-1">video:</p>
                <video controls src={videoUrl} className="w-full rounded" />
              </div>
            )}
            {(tiktokAudioUrl || tiktokVideoUrl) && (
              <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10">
                <p className="text-xs text-black/40 dark:text-white/40 mb-2">tiktok reaction:</p>
                {tiktokAudioUrl && (
                  <div className="mb-3">
                    <audio controls src={tiktokAudioUrl} className="w-full" />
                  </div>
                )}
                {tiktokVideoUrl && (
                  <div className="flex justify-center">
                    <video controls src={tiktokVideoUrl} className="h-80 rounded" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="flex-1 flex items-center justify-center p-6">
        {(activeTab === "brand" || activeTab === "character") && (
          <div className="grid grid-cols-4 gap-4 w-full max-w-2xl">
            {activeTab === "brand" &&
              brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`aspect-square flex items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                    selectedBrand === brand
                      ? "border-black dark:border-white bg-black/5 dark:bg-white/5 text-black dark:text-white"
                      : "border-black/10 dark:border-white/10 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {brand}
                </button>
              ))}
            {activeTab === "character" &&
              characters.map((character) => (
                <button
                  key={character}
                  onClick={() => setSelectedCharacter(character)}
                  className={`aspect-square flex items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                    selectedCharacter === character
                      ? "border-black dark:border-white bg-black/5 dark:bg-white/5 text-black dark:text-white"
                      : "border-black/10 dark:border-white/10 text-black dark:text-white hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  {character}
                </button>
              ))}
          </div>
        )}
        {activeTab === "slogan" && (
          <input
            type="text"
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder="just do it"
            className="w-full max-w-md text-center text-2xl font-medium bg-transparent border-b border-black/20 dark:border-white/20 text-black dark:text-white placeholder:text-black/30 dark:placeholder:text-white/30 focus:outline-none focus:border-black dark:focus:border-white transition-colors py-2"
          />
        )}
        {activeTab === "storyboard" && (
          <div className="w-full max-w-3xl">
            <div className="grid grid-cols-3 gap-3">
              {storyboard.map((panel, index) => (
                <div key={index} className="relative">
                  <span className="absolute top-2 left-2 text-[10px] font-mono text-black/30 dark:text-white/30 z-10">
                    {index + 1}
                  </span>
                  {storyboardImages[index] ? (
                    <div className="relative aspect-square group">
                      <img
                        src={storyboardImages[index]!}
                        alt={`Panel ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border border-black/10 dark:border-white/10"
                      />
                      {/* Hover overlay with text */}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center p-3">
                        <p className="text-[10px] font-mono text-white/90 leading-tight text-center">
                          {storyboard[index].trim() || storyboardPlaceholders[index]}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const newImages = [...storyboardImages];
                          newImages[index] = null;
                          setStoryboardImages(newImages);
                        }}
                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full text-xs hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <textarea
                      value={panel}
                      onChange={(e) => updateStoryboardPanel(index, e.target.value)}
                      placeholder={storyboardPlaceholders[index]}
                      className="w-full aspect-square p-3 pt-6 text-xs font-mono leading-tight bg-transparent text-black dark:text-white placeholder:text-black/25 dark:placeholder:text-white/25 focus:outline-none resize-none border border-black/10 dark:border-white/10 rounded-lg focus:border-black/30 dark:focus:border-white/30 transition-colors"
                    />
                  )}
                </div>
              ))}
            </div>
            {/* Generate TikTok button */}
            {hasStoryboardImages && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={generateTiktok}
                  disabled={isGeneratingTiktok}
                  className={`px-6 py-3 text-sm font-medium rounded-full transition-all ${
                    !isGeneratingTiktok
                      ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white hover:opacity-90"
                      : "bg-black/10 text-black/30 dark:bg-white/10 dark:text-white/30 cursor-not-allowed"
                  }`}
                >
                  {isGeneratingTiktok ? "generating tiktok..." : "generate tiktok 📱"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom menu */}
      <nav className="p-6">
        <ul className="flex justify-center gap-8 text-sm font-medium text-black dark:text-white">
          {(["brand", "character", "slogan", "storyboard"] as Tab[]).map((tab) => (
            <li key={tab}>
              <button
                onClick={() => setActiveTab(tab)}
                className={`transition-opacity ${
                  activeTab === tab ? "opacity-100" : "opacity-40 hover:opacity-60"
                }`}
              >
                {tab}
                {tab === "brand" && selectedBrand && " ✓"}
                {tab === "character" && selectedCharacter && " ✓"}
                {tab === "slogan" && slogan && " ✓"}
                {tab === "storyboard" && hasStoryboard && " ✓"}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
