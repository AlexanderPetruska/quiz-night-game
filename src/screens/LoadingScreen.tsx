import { Spinner } from "@/components/Spinner";

export function LoadingScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Spinner className="size-8" />
    </div>
  );
}
