import type { MouseEvent } from "react";

export function stopAdvance(e: MouseEvent) {
  e.stopPropagation();
}
