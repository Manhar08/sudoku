import raw from "@/data/puzzles.json";

export type Difficulty = "easy" | "medium" | "hard";
export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const DIFF_LABEL: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
export const DIFF_BLURB: Record<Difficulty, string> = {
  easy: "Gentle starts with plenty of clues.",
  medium: "Fewer clues, more deduction.",
  hard: "Sparse grids for patient solvers.",
};

export interface Puzzle {
  id: number;
  difficulty: Difficulty;
  puzzle: number[];
  solution: number[];
}

export const PUZZLES: Puzzle[] = (raw as { id: number; difficulty: Difficulty; puzzle: string; solution: string }[]).map(
  (p) => ({ ...p, puzzle: [...p.puzzle].map(Number), solution: [...p.solution].map(Number) }),
);

export const byDifficulty = (d: Difficulty) => PUZZLES.filter((p) => p.difficulty === d);
export const getPuzzle = (d: Difficulty, id: number) => PUZZLES.find((p) => p.difficulty === d && p.id === id);
export const pad = (n: number) => String(n).padStart(3, "0");
export const isDifficulty = (s: string): s is Difficulty => (DIFFICULTIES as string[]).includes(s);

export function peers(i: number) {
  const r = Math.floor(i / 9), c = i % 9, br = r - (r % 3), bc = c - (c % 3);
  const s = new Set<number>();
  for (let k = 0; k < 9; k++) {
    s.add(r * 9 + k);
    s.add(k * 9 + c);
    s.add((br + Math.floor(k / 3)) * 9 + bc + (k % 3));
  }
  s.delete(i);
  return s;
}

/** Validates every row, column and box contains 1-9 exactly once. */
export function isValidSolution(g: number[]) {
  if (g.length !== 81) return false;
  for (let u = 0; u < 9; u++) {
    const row = new Set<number>(), col = new Set<number>(), box = new Set<number>();
    for (let k = 0; k < 9; k++) {
      row.add(g[u * 9 + k]);
      col.add(g[k * 9 + u]);
      box.add(g[(Math.floor(u / 3) * 3 + Math.floor(k / 3)) * 9 + (u % 3) * 3 + (k % 3)]);
    }
    for (const s of [row, col, box]) if (s.size !== 9 || s.has(0)) return false;
  }
  return true;
}

export function formatTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
