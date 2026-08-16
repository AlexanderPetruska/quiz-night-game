import type { ReactNode } from "react";

interface SlideFrameProps {
  slideKey: string | number;
  onAdvance: () => void;
  children: ReactNode;
  className?: string;
  /** Set false when clicking the slide background doesn't actually do anything. */
  clickable?: boolean;
}

export function SlideFrame({ slideKey, onAdvance, children, className, clickable = true }: SlideFrameProps) {
  return (
    <div
      key={slideKey}
      className={`animate-in fade-in slide-in-from-bottom-2 flex min-h-svh w-full flex-col items-center justify-center bg-background p-10 text-foreground duration-300 ${clickable ? "cursor-pointer" : ""} ${className ?? ""}`}
      onClick={onAdvance}
    >
      {children}
    </div>
  );
}
