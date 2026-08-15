import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getProofFileUrl } from "@/lib/store";
import { SlideFrame } from "@/screens/presentation/SlideFrame";
import { stopAdvance } from "@/screens/presentation/interaction";
import type { Question } from "@/types";

interface ProofSlideProps {
  question: Question;
  quizDir: FileSystemDirectoryHandle;
  onAdvance: () => void;
}

export function ProofSlide({ question, quizDir, onAdvance }: ProofSlideProps) {
  const [url, setUrl] = useState<string | undefined>();
  const [needsManualPlay, setNeedsManualPlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;
    async function load() {
      if (!question.proofFile) return;
      const loaded = await getProofFileUrl(quizDir, question.proofFile);
      if (cancelled) return;
      objectUrl = loaded;
      setUrl(loaded);
    }
    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [quizDir, question.proofFile]);

  useEffect(() => {
    if (question.proofType !== "video" || !url) return;
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => setNeedsManualPlay(true));
  }, [url, question.proofType]);

  return (
    <SlideFrame slideKey={`proof-${question.id}`} onAdvance={onAdvance} className="p-0">
      {!url && <p className="text-muted-foreground">Loading proof…</p>}

      {url && question.proofType === "video" && (
        <div className="relative flex h-svh w-full items-center justify-center" onClick={stopAdvance}>
          <video ref={videoRef} src={url} controls className="max-h-svh max-w-full" />
          {needsManualPlay && (
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center bg-black/40"
              onClick={() => {
                videoRef.current?.play();
                setNeedsManualPlay(false);
              }}
            >
              <span className="rounded-full bg-white/90 px-8 py-6 text-4xl">▶</span>
            </button>
          )}
        </div>
      )}

      {url && question.proofType === "image" && (
        <div className="flex h-svh w-full flex-col items-center justify-center gap-6">
          <img src={url} alt="Proof" className="max-h-[80svh] max-w-full object-contain" />
          <Button
            size="lg"
            onClick={(e) => {
              e.stopPropagation();
              onAdvance();
            }}
          >
            Continue
          </Button>
        </div>
      )}
    </SlideFrame>
  );
}
