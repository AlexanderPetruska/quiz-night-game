import { createContext, useContext } from "react";
import type { Joker } from "@/types";

export type Screen =
  | { name: "myQuizzes" }
  | { name: "jokers" }
  | { name: "quizEditor"; slug: string }
  | { name: "teamSetup"; slug: string }
  | { name: "presentation"; slug: string };

export interface AppContextValue {
  root: FileSystemDirectoryHandle;
  jokers: Joker[];
  refreshJokers: () => Promise<void>;
  navigate: (screen: Screen) => void;
}

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppContext.Provider");
  return ctx;
}
