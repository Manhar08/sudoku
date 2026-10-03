import type { Difficulty } from "./sudoku";

export interface Completion {
  difficulty: Difficulty;
  id: number;
  time: number;
  mistakes: number;
  at: string;
}
export interface SavedGame {
  values: number[];
  notes: number[][];
  time: number;
  mistakes: number;
}

const KEY = "sudoku.progress.v1";
const gameKey = (d: Difficulty, id: number) => `sudoku.game.${d}.${id}`;

export function loadCompletions(): Completion[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
export function addCompletion(c: Completion) {
  const all = loadCompletions();
  all.push(c);
  localStorage.setItem(KEY, JSON.stringify(all));
}
export function loadGame(d: Difficulty, id: number): SavedGame | null {
  try {
    const s = localStorage.getItem(gameKey(d, id));
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
export function saveGame(d: Difficulty, id: number, g: SavedGame) {
  localStorage.setItem(gameKey(d, id), JSON.stringify(g));
}
export function clearGame(d: Difficulty, id: number) {
  localStorage.removeItem(gameKey(d, id));
}

export function stats(all: Completion[]) {
  const solved = new Set(all.map((c) => `${c.difficulty}-${c.id}`));
  const count = (d: Difficulty) => [...solved].filter((k) => k.startsWith(d)).length;
  const days = new Set(all.map((c) => new Date(c.at).toDateString()));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return {
    solved,
    total: solved.size,
    easy: count("easy"),
    medium: count("medium"),
    hard: count("hard"),
    playTime: all.reduce((a, c) => a + c.time, 0),
    best: all.length ? Math.min(...all.map((c) => c.time)) : null,
    streak,
    recent: [...all].reverse().slice(0, 6),
  };
}
