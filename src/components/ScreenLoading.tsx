import { Spinner } from "@/components/Spinner";

/** Centered loading state for a screen's own content area (below the persistent top nav). */
export function ScreenLoading() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center">
      <Spinner className="size-8" />
    </div>
  );
}
