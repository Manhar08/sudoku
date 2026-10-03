import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Shuffle } from "lucide-react";
import { byDifficulty, DIFF_LABEL, isDifficulty, pad } from "@/lib/sudoku";
import { loadCompletions } from "@/lib/progress";

export const Route = createFileRoute("/_authenticated/puzzles/$difficulty")({
  beforeLoad: ({ params }) => {
    if (!isDifficulty(params.difficulty)) throw notFound();
  },
  head: ({ params }) => {
    const t = `${params.difficulty[0]?.toUpperCase()}${params.difficulty.slice(1)} puzzles — Sudoku`;
    return { meta: [{ title: t }, { name: "description", content: `Pick a ${params.difficulty} Sudoku puzzle.` }, { property: "og:title", content: t }, { property: "og:description", content: `Pick a ${params.difficulty} Sudoku puzzle.` }] };
  },
  component: Picker,
});

function Picker() {
  const { difficulty } = Route.useParams();
  const d = difficulty as "easy" | "medium" | "hard";
  const list = byDifficulty(d);
  const navigate = useNavigate();
  const [done, setDone] = useState<Set<number>>(new Set());
  useEffect(() => setDone(new Set(loadCompletions().filter((c) => c.difficulty === d).map((c) => c.id))), [d]);

  const random = () => {
    const p = list[Math.floor(Math.random() * list.length)];
    navigate({ to: "/play/$difficulty/$id", params: { difficulty: d, id: String(p.id) } });
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">← Dashboard</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold">{DIFF_LABEL[d]}</h1>
          <p className="text-muted-foreground">{list.length} puzzles · {done.size} completed</p>
        </div>
        <button onClick={random} className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90">
          <Shuffle className="h-4 w-4" /> Random Puzzle
        </button>
      </div>
      <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-8">
        {list.map((p) => (
          <li key={p.id}>
            <Link to="/play/$difficulty/$id" params={{ difficulty: d, id: String(p.id) }}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-lg border bg-card shadow-card transition hover:border-primary ${done.has(p.id) ? "border-primary/50" : ""}`}
              aria-label={`Puzzle ${pad(p.id)}${done.has(p.id) ? ", completed" : ""}`}>
              <span className="text-[10px] tracking-widest text-muted-foreground">PUZZLE</span>
              <span className="font-display text-xl">{pad(p.id)}</span>
              {done.has(p.id) && <Check className="absolute right-1.5 top-1.5 h-4 w-4 text-primary" />}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
