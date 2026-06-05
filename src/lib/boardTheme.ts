import { useEffect, useState } from "react";

// Board colour themes. The choice is global (one setting, applied to every board
// — viewer, trainers, evidence, puzzles) and persisted to localStorage.
export interface BoardTheme {
  key: string;
  name: string;
  dark: string;
  light: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { key: "green", name: "Green", dark: "#7e9a64", light: "#ecefd6" },
  { key: "blue", name: "Ice", dark: "#5b7fa6", light: "#dce6f0" },
  { key: "wood", name: "Wood", dark: "#b58863", light: "#f0d9b5" },
  { key: "slate", name: "Slate", dark: "#6b7280", light: "#e8eaed" },
  { key: "coral", name: "Coral", dark: "#c0512b", light: "#f4ded4" },
  { key: "ink", name: "Mono", dark: "#3f4145", light: "#d8dad0" },
];

const KEY = "strategem.boardtheme.v1";
const EVT = "strategem-board-theme";

function readKey(): string {
  try {
    return localStorage.getItem(KEY) || "green";
  } catch {
    return "green";
  }
}

export function setBoardTheme(key: string): void {
  try {
    localStorage.setItem(KEY, key);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVT));
}

// Current theme; re-renders any board when the theme changes (via a window event
// so all mounted boards stay in sync).
export function useBoardTheme(): BoardTheme {
  const [key, setKey] = useState(readKey);
  useEffect(() => {
    const onChange = () => setKey(readKey());
    window.addEventListener(EVT, onChange);
    return () => window.removeEventListener(EVT, onChange);
  }, []);
  return BOARD_THEMES.find((t) => t.key === key) ?? BOARD_THEMES[0];
}
