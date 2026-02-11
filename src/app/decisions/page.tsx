"use client";

import { useState } from "react";

type Decision = "porsche" | "save" | "sushi" | null;
type ImageStatus = "idle" | "generating" | "done" | "error";

export default function DecisionsPage() {
  const [selectedDecision, setSelectedDecision] = useState<Decision>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageStatus, setImageStatus] = useState<ImageStatus>("idle");

  const decisions = [
    {
      id: "porsche" as Decision,
      title: "Buy a Porsche",
      description: "Spend it all on a dream car",
      icon: "🚗",
    },
    {
      id: "save" as Decision,
      title: "Save It",
      description: "Put the money away for the future",
      icon: "🏦",
    },
    {
      id: "sushi" as Decision,
      title: "1000 Sushi Dinners",
      description: "Enjoy life one roll at a time",
      icon: "🍣",
    },
  ];

  const pollForImage = async (id: string): Promise<string | null> => {
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));

      const response = await fetch(`/api/decision-image?id=${id}`);
      const prediction = await response.json();

      if (prediction.status === "succeeded" && prediction.output) {
        return Array.isArray(prediction.output)
          ? prediction.output[0]
          : prediction.output;
      } else if (prediction.status === "failed") {
        console.error("Image generation failed:", prediction.error);
        return null;
      }

      attempts++;
    }
    return null;
  };

  const handleDecision = async (decision: Decision) => {
    if (!decision) return;

    setSelectedDecision(decision);
    setImageStatus("generating");
    setImageUrl(null);

    try {
      const response = await fetch("/api/decision-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      if (!response.ok) throw new Error("Failed to start generation");

      const { id } = await response.json();
      const url = await pollForImage(id);

      if (url) {
        setImageUrl(url);
        setImageStatus("done");
      } else {
        setImageStatus("error");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      setImageStatus("error");
    }
  };

  const reset = () => {
    setSelectedDecision(null);
    setImageUrl(null);
    setImageStatus("idle");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-black">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <h1 className="text-lg font-medium tracking-tight text-black dark:text-white">
          life decisions
        </h1>
        {selectedDecision && (
          <button
            onClick={reset}
            className="px-4 py-2 text-sm font-medium rounded-full bg-black/10 dark:bg-white/10 text-black dark:text-white hover:bg-black/20 dark:hover:bg-white/20 transition-colors"
          >
            start over
          </button>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Person Icon */}
        <div className="mb-12">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-24 h-24 text-black dark:text-white"
          >
            <path
              fillRule="evenodd"
              d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        {/* Decision cards or result */}
        {!selectedDecision ? (
          <>
            <p className="text-lg text-black/60 dark:text-white/60 mb-8 text-center">
              You have some money. What do you do?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
              {decisions.map((decision) => (
                <button
                  key={decision.id}
                  onClick={() => handleDecision(decision.id)}
                  className="p-8 rounded-2xl border border-black/10 dark:border-white/10 hover:border-black/30 dark:hover:border-white/30 hover:bg-black/5 dark:hover:bg-white/5 transition-all group"
                >
                  <div className="text-5xl mb-4">{decision.icon}</div>
                  <h2 className="text-xl font-semibold text-black dark:text-white mb-2">
                    {decision.title}
                  </h2>
                  <p className="text-sm text-black/50 dark:text-white/50">
                    {decision.description}
                  </p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="w-full max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-black dark:text-white mb-2">
              {decisions.find((d) => d.id === selectedDecision)?.title}
            </h2>
            <p className="text-black/50 dark:text-white/50 mb-8">
              Here&apos;s the reality of your choice...
            </p>

            {imageStatus === "generating" && (
              <div className="aspect-square max-w-lg mx-auto rounded-2xl border border-black/10 dark:border-white/10 flex items-center justify-center bg-black/5 dark:bg-white/5">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-black/20 dark:border-white/20 border-t-black dark:border-t-white rounded-full mx-auto mb-4"></div>
                  <p className="text-sm text-black/50 dark:text-white/50">
                    Generating your future...
                  </p>
                </div>
              </div>
            )}

            {imageStatus === "done" && imageUrl && (
              <div className="aspect-square max-w-lg mx-auto rounded-2xl overflow-hidden border border-black/10 dark:border-white/10">
                <img
                  src={imageUrl}
                  alt={`Reality of ${selectedDecision}`}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {imageStatus === "error" && (
              <div className="aspect-square max-w-lg mx-auto rounded-2xl border border-red-500/30 flex items-center justify-center bg-red-500/5">
                <p className="text-red-500">
                  Failed to generate image. Try again.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
