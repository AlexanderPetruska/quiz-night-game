import type { ReactNode } from "react";

interface SlideFrameProps {
  slideKey: string | number;
  onAdvance: () => void;
  children: ReactNode;
  className?: string;
}

export function SlideFrame({ slideKey, onAdvance, children, className }: SlideFrameProps) {
  return (
    <div
      key={slideKey}
      className={`animate-in fade-in slide-in-from-bottom-2 flex min-h-svh w-full flex-col items-center justify-center bg-background p-10 text-foreground duration-300 ${className ?? ""}`}
      onClick={onAdvance}
    >
      {children}
    </div>
  );
}
