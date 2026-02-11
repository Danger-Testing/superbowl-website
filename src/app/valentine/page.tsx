"use client";

import { useState, useEffect, useCallback } from "react";

const defaultScenes = [
  "Sitting in a parked car at night, engine off, streetlight bleeding through the windshield",
  "Walking through a gas station parking lot, fluorescent lights overhead, late night",
  "Leaning against a chain link fence, city in the background, smoking",
  "Riding in the back of an uber, face lit by phone glow, buildings streaking past",
  "Standing alone at a crosswalk, waiting, headlights washing over",
  "Sitting on the curb outside a liquor store, looking at nothing",
];

interface Scene {
  description: string;
  images: (string | null)[];
  imageIds: (string | null)[];
}

export default function ValentinePage() {
  const [scenes, setScenes] = useState<Scene[]>(
    defaultScenes.map((desc) => ({
      description: desc,
      images: [null, null, null],
      imageIds: [null, null, null],
    }))
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBlack, setShowBlack] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const allImages = scenes.flatMap((scene) => scene.images.filter((img): img is string => img !== null));

  const updateSceneDescription = (index: number, description: string) => {
    const newScenes = [...scenes];
    newScenes[index] = { ...newScenes[index], description };
    setScenes(newScenes);
  };

  const pollForImage = async (id: string): Promise<string | null> => {
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));

      const response = await fetch(`/api/valentine?id=${id}`);
      const prediction = await response.json();

      if (prediction.status === "succeeded" && prediction.output) {
        return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      } else if (prediction.status === "failed") {
        console.error("Image generation failed:", prediction.error);
        return null;
      }

      attempts++;
    }
    return null;
  };

  const generateImages = async () => {
    setIsGenerating(true);
    setGenerationStatus("Starting generation...");

    const newScenes = [...scenes];

    try {
      for (let sceneIndex = 0; sceneIndex < scenes.length; sceneIndex++) {
        const scene = scenes[sceneIndex];
        setGenerationStatus(`Generating scene ${sceneIndex + 1}/${scenes.length}...`);

        // Generate 3 images per scene in parallel
        const imagePromises = [];

        for (let imgIndex = 0; imgIndex < 3; imgIndex++) {
          const response = await fetch("/api/valentine", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ scene: scene.description }),
          });

          const { id } = await response.json();
          if (id) {
            imagePromises.push(
              pollForImage(id).then((imageUrl) => {
                newScenes[sceneIndex].images[imgIndex] = imageUrl;
                setScenes([...newScenes]);
                return imageUrl;
              })
            );
          }
        }

        await Promise.all(imagePromises);
      }

      setGenerationStatus("Done!");
      // Auto-play movie when generation completes
      setTimeout(() => {
        setIsPlaying(true);
        setCurrentImageIndex(0);
        setShowBlack(false);
      }, 500);
    } catch (error) {
      console.error("Generation error:", error);
      setGenerationStatus("Error generating images");
    } finally {
      setIsGenerating(false);
    }
  };

  const playMovie = useCallback(() => {
    if (allImages.length === 0) return;
    setIsPlaying(true);
    setCurrentImageIndex(0);
    setShowBlack(false);
  }, [allImages.length]);

  const stopMovie = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Movie playback effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setShowBlack((prev) => {
        if (prev) {
          // Currently showing black, show next image
          setCurrentImageIndex((idx) => {
            const nextIdx = idx + 1;
            if (nextIdx >= allImages.length) {
              return 0; // Loop back to start
            }
            return nextIdx;
          });
          return false;
        } else {
          // Currently showing image, show black
          return true;
        }
      });
    }, 200); // Quick flash timing - shows image then black

    return () => clearInterval(interval);
  }, [isPlaying, allImages.length]);

  // Handle escape key to exit movie mode or zoomed view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isPlaying) stopMovie();
        if (zoomedImage) setZoomedImage(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, stopMovie, zoomedImage]);

  // Zoomed image view
  if (zoomedImage) {
    return (
      <div
        className="fixed inset-0 bg-black z-50 cursor-pointer flex items-center justify-center"
        onClick={() => setZoomedImage(null)}
      >
        <img
          src={zoomedImage}
          alt=""
          className="max-w-full max-h-full object-contain"
        />
      </div>
    );
  }

  // Fullscreen movie mode
  if (isPlaying) {
    return (
      <div
        className="fixed inset-0 bg-black z-50 cursor-pointer"
        onClick={stopMovie}
      >
        {showBlack ? (
          <div className="w-full h-full bg-black" />
        ) : (
          <img
            src={allImages[currentImageIndex]}
            alt=""
            className="w-full h-full object-contain"
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-white/10">
        <h1 className="text-lg font-medium tracking-tight">valentine</h1>
        <div className="flex gap-3">
          {allImages.length > 0 && (
            <button
              onClick={playMovie}
              className="px-4 py-2 text-sm font-medium rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              play movie
            </button>
          )}
          <button
            onClick={generateImages}
            disabled={isGenerating}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
              !isGenerating
                ? "bg-white text-black hover:opacity-80"
                : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
          >
            {isGenerating ? "generating..." : "generate"}
          </button>
        </div>
      </header>

      {/* Generation Status */}
      {isGenerating && (
        <div className="px-6 py-3 text-center text-sm text-white/60">
          {generationStatus}
        </div>
      )}

      {/* Storyboard */}
      <main className="p-6">
        <div className="space-y-8">
          {scenes.map((scene, sceneIndex) => (
            <div key={sceneIndex} className="space-y-3">
              {/* Scene description */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-white/30">
                  {String(sceneIndex + 1).padStart(2, "0")}
                </span>
                <input
                  type="text"
                  value={scene.description}
                  onChange={(e) => updateSceneDescription(sceneIndex, e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/30 focus:outline-none border-b border-white/10 focus:border-white/30 py-1 transition-colors"
                  placeholder="Describe the scene..."
                />
              </div>

              {/* Scene images (3 per scene) */}
              <div className="grid grid-cols-3 gap-2 pl-8">
                {scene.images.map((img, imgIndex) => (
                  <div
                    key={imgIndex}
                    className={`aspect-video bg-white/5 rounded-lg overflow-hidden border border-white/10 ${img ? 'cursor-pointer hover:border-white/30 transition-colors' : ''}`}
                    onClick={() => img && setZoomedImage(img)}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={`Scene ${sceneIndex + 1}, frame ${imgIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-white/20 font-mono">
                          {imgIndex + 1}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add scene button */}
        <button
          onClick={() =>
            setScenes([
              ...scenes,
              {
                description: "",
                images: [null, null, null],
                imageIds: [null, null, null],
              },
            ])
          }
          className="mt-8 w-full py-3 border border-dashed border-white/20 rounded-lg text-sm text-white/40 hover:text-white/60 hover:border-white/40 transition-colors"
        >
          + add scene
        </button>
      </main>

      {/* Footer hint */}
      {allImages.length > 0 && (
        <footer className="fixed bottom-0 left-0 right-0 p-4 text-center text-xs text-white/30">
          {allImages.length} frames ready • click &quot;play movie&quot; to watch all • press ESC or click to exit
        </footer>
      )}
    </div>
  );
}
