import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { byDifficulty, DIFFICULTIES, DIFF_BLURB, DIFF_LABEL, formatTime, pad, PUZZLES } from "@/lib/sudoku";
import { loadCompletions, stats, type Completion } from "@/lib/progress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Sudoku" },
      { name: "description", content: "Choose a difficulty and track your Sudoku progress." },
      { property: "og:title", content: "Dashboard — Sudoku" },
      { property: "og:description", content: "Choose a difficulty and track your Sudoku progress." },
    ],
  }),
  component: Dashboard,
});

const tone = { easy: "bg-easy", medium: "bg-medium", hard: "bg-hard" } as const;

function Dashboard() {
  const [all, setAll] = useState<Completion[]>([]);
  useEffect(() => setAll(loadCompletions()), []);
  const s = stats(all);
  const pct = Math.round((s.total / PUZZLES.length) * 100);

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-8">
      <section className="grid gap-4 md:grid-cols-3">
        {DIFFICULTIES.map((d) => {
          const n = byDifficulty(d).length;
          return (
            <Link key={d} to="/puzzles/$difficulty" params={{ difficulty: d }}
              className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-card transition hover:-translate-y-0.5">
              <span className={`absolute inset-x-0 top-0 h-1.5 ${tone[d]}`} />
              <p className="text-xs font-bold tracking-[0.2em] text-muted-foreground">{DIFF_LABEL[d].toUpperCase()}</p>
              <p className="mt-3 font-display text-4xl font-semibold">{s[d]}<span className="text-xl text-muted-foreground"> / {n}</span></p>
              <p className="mt-1 text-sm text-muted-foreground">{n} puzzles · {DIFF_BLURB[d]}</p>
              <p className="mt-4 text-sm font-semibold text-primary group-hover:underline">Choose a puzzle →</p>
            </Link>
          );
        })}
      </section>

      <section className="rounded-xl border bg-card p-6 shadow-card">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl font-semibold">Your Progress</h2>
            <p className="text-muted-foreground">{s.total} / {PUZZLES.length} Completed</p>
          </div>
          <p className="font-display text-3xl">{pct}%</p>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Total play time", formatTime(s.playTime)],
            ["Best time", s.best === null ? "—" : formatTime(s.best)],
            ["Current streak", `${s.streak} day${s.streak === 1 ? "" : "s"}`],
            ["Games finished", String(all.length)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg bg-muted p-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-1 font-display text-xl">{v}</dd>
            </div>
          ))}
        </dl>
        <h3 className="mt-8 text-sm font-bold tracking-wide text-muted-foreground">RECENT PUZZLES</h3>
        {s.recent.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No puzzles finished yet — pick one above to begin.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {s.recent.map((c, i) => (
              <li key={i} className="flex items-center justify-between py-2 text-sm">
                <Link to="/play/$difficulty/$id" params={{ difficulty: c.difficulty, id: String(c.id) }} className="font-medium hover:text-primary">
                  {DIFF_LABEL[c.difficulty]} — Puzzle {pad(c.id)}
                </Link>
                <span className="text-muted-foreground">{formatTime(c.time)} · {c.mistakes} mistakes · {new Date(c.at).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
