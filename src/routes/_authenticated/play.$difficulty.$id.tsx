import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eraser, Eye, Flag, Pause, Pencil, Play, Redo2, RotateCcw, Search, Shuffle, Undo2 } from "lucide-react";
import { byDifficulty, DIFF_LABEL, formatTime, getPuzzle, isDifficulty, isValidSolution, pad, peers, type Difficulty, type Puzzle } from "@/lib/sudoku";
import { addCompletion, clearGame, loadGame, saveGame } from "@/lib/progress";

export const Route = createFileRoute("/_authenticated/play/$difficulty/$id")({
  beforeLoad: ({ params }) => {
    if (!isDifficulty(params.difficulty) || !getPuzzle(params.difficulty, Number(params.id))) throw notFound();
  },
  head: ({ params }) => {
    const t = `${params.difficulty[0]?.toUpperCase()}${params.difficulty.slice(1)} — Puzzle ${pad(Number(params.id))} · Sudoku`;
    return { meta: [{ title: t }, { name: "description", content: "Solve this Sudoku puzzle at your own pace." }, { property: "og:title", content: t }, { property: "og:description", content: "Solve this Sudoku puzzle at your own pace." }] };
  },
  notFoundComponent: () => (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-3xl">Puzzle not found</h1>
      <Link to="/dashboard" className="mt-4 inline-block text-primary underline">Back to dashboard</Link>
    </main>
  ),
  component: PlayRoute,
});

function PlayRoute() {
  const { difficulty, id } = Route.useParams();
  const p = getPuzzle(difficulty as Difficulty, Number(id))!;
  return <Game key={`${difficulty}-${id}`} puzzle={p} />;
}

type Snap = { values: number[]; notes: number[][] };
const emptyNotes = () => Array.from({ length: 81 }, () => [] as number[]);

function Game({ puzzle: P }: { puzzle: Puzzle }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<number[]>(() => [...P.puzzle]);
  const [notes, setNotes] = useState<number[][]>(emptyNotes);
  const [past, setPast] = useState<Snap[]>([]);
  const [future, setFuture] = useState<Snap[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState<{ at: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const g = loadGame(P.difficulty, P.id);
    if (g && g.values?.length === 81) {
      setValues(g.values.map((v, i) => (P.puzzle[i] ? P.puzzle[i] : v)));
      setNotes(g.notes?.length === 81 ? g.notes : emptyNotes());
      setTime(g.time || 0);
      setMistakes(g.mistakes || 0);
    }
    setLoaded(true);
  }, [P]);

  useEffect(() => {
    if (!loaded || paused || done || revealed) return;
    const t = setInterval(() => setTime((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [loaded, paused, done, revealed]);

  useEffect(() => {
    if (loaded && !done && !revealed) saveGame(P.difficulty, P.id, { values, notes, time, mistakes });
  }, [values, notes, time, mistakes, loaded, done, revealed, P]);

  const finish = useCallback((vals: number[]) => {
    if (!isValidSolution(vals) || vals.some((v, i) => v !== P.solution[i])) return false;
    const at = new Date().toISOString();
    setDone({ at });
    addCompletion({ difficulty: P.difficulty, id: P.id, time, mistakes, at });
    clearGame(P.difficulty, P.id);
    return true;
  }, [P, time, mistakes]);

  const locked = paused || !!done || revealed;

  const commit = (nv: number[], nn: number[][]) => {
    setPast((h) => [...h.slice(-200), { values, notes }]);
    setFuture([]);
    setValues(nv);
    setNotes(nn);
  };

  const input = (n: number) => {
    if (sel === null || locked || P.puzzle[sel]) return;
    setMsg("");
    if (notesMode && n) {
      if (values[sel]) return;
      const nn = notes.map((x) => x);
      nn[sel] = nn[sel].includes(n) ? nn[sel].filter((x) => x !== n) : [...nn[sel], n].sort();
      return commit(values, nn);
    }
    if (values[sel] === n) return;
    const nv = [...values];
    nv[sel] = n;
    const nn = notes.map((x) => x);
    nn[sel] = [];
    if (n) for (const q of peers(sel)) if (nn[q].includes(n)) nn[q] = nn[q].filter((x) => x !== n);
    if (n && n !== P.solution[sel]) setMistakes((m) => m + 1);
    if (wrong.has(sel)) setWrong((w) => { const s = new Set(w); s.delete(sel); return s; });
    commit(nv, nn);
    if (nv.every((v) => v)) finish(nv) || setMsg("The board is full but something isn't right yet — try Check.");
  };

  const undo = () => {
    if (locked || !past.length) return;
    const last = past[past.length - 1];
    setFuture((f) => [...f, { values, notes }]);
    setPast((h) => h.slice(0, -1));
    setValues(last.values);
    setNotes(last.notes);
  };
  const redo = () => {
    if (locked || !future.length) return;
    const nx = future[future.length - 1];
    setPast((h) => [...h, { values, notes }]);
    setFuture((f) => f.slice(0, -1));
    setValues(nx.values);
    setNotes(nx.notes);
  };
  const restart = () => {
    if (!confirm("Restart this puzzle? Your entries and timer will reset.")) return;
    clearGame(P.difficulty, P.id);
    setValues([...P.puzzle]); setNotes(emptyNotes()); setPast([]); setFuture([]);
    setTime(0); setMistakes(0); setWrong(new Set()); setDone(null); setRevealed(false); setPaused(false); setMsg("");
  };
  const check = () => {
    if (locked) return;
    const w = new Set<number>();
    values.forEach((v, i) => { if (v && !P.puzzle[i] && v !== P.solution[i]) w.add(i); });
    setWrong(w);
    setMsg(w.size ? `${w.size} incorrect ${w.size === 1 ? "entry" : "entries"} highlighted.` : "Everything so far is correct.");
  };
  const submit = () => {
    if (locked) return;
    if (values.some((v) => !v)) return setMsg(`${values.filter((v) => !v).length} cells are still empty.`);
    if (!finish(values)) setMsg("Not quite — some entries are incorrect. Try Check.");
  };
  const reveal = () => {
    if (done || !confirm("Show the full solution? This puzzle won't count as completed.")) return;
    setValues([...P.solution]); setNotes(emptyNotes()); setRevealed(true); setWrong(new Set());
    clearGame(P.difficulty, P.id);
    setMsg("Solution revealed. Restart to try again.");
  };
  const list = byDifficulty(P.difficulty);
  const goRandom = () => {
    const others = list.filter((x) => x.id !== P.id);
    const r = others[Math.floor(Math.random() * others.length)];
    navigate({ to: "/play/$difficulty/$id", params: { difficulty: P.difficulty, id: String(r.id) } });
  };
  const next = () => {
    const n = list[(list.findIndex((x) => x.id === P.id) + 1) % list.length];
    navigate({ to: "/play/$difficulty/$id", params: { difficulty: P.difficulty, id: String(n.id) } });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.altKey) return;
      if ((e.ctrlKey && e.key.toLowerCase() === "z" && e.shiftKey) || (e.ctrlKey && e.key.toLowerCase() === "y")) { e.preventDefault(); return redo(); }
      if (e.ctrlKey && e.key.toLowerCase() === "z") { e.preventDefault(); return undo(); }
      if (e.ctrlKey) return;
      if (/^[1-9]$/.test(e.key)) return input(Number(e.key));
      if (["Backspace", "Delete", "0"].includes(e.key)) return input(0);
      if (e.key.toLowerCase() === "n") return setNotesMode((m) => !m);
      const mv: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 };
      if (e.key in mv) {
        e.preventDefault();
        setSel((s) => {
          if (s === null) return 0;
          const d = mv[e.key];
          if (d === -1 && s % 9 === 0) return s;
          if (d === 1 && s % 9 === 8) return s;
          const t = s + d;
          return t < 0 || t > 80 ? s : t;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const peerSet = useMemo(() => (sel === null ? new Set<number>() : peers(sel)), [sel]);
  const selVal = sel !== null ? values[sel] : 0;
  const counts = useMemo(() => {
    const c = Array(10).fill(0);
    values.forEach((v) => c[v]++);
    return c;
  }, [values]);

  const ctrl = "flex flex-col items-center gap-1 rounded-lg border bg-card px-2 py-2 text-xs font-medium hover:bg-secondary disabled:opacity-40";

  return (
    <main className="mx-auto max-w-5xl px-3 py-5 sm:px-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/puzzles/$difficulty" params={{ difficulty: P.difficulty }} className="text-sm text-muted-foreground hover:text-foreground">← All {DIFF_LABEL[P.difficulty]} puzzles</Link>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{DIFF_LABEL[P.difficulty]} — Puzzle {pad(P.id)}</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span aria-live="off">Mistakes: <b>{mistakes}</b></span>
          <span className="font-display text-xl tabular-nums" aria-label={`Time ${formatTime(time)}`}>Time: {formatTime(time)}</span>
          <button onClick={() => setPaused((p) => !p)} disabled={!!done || revealed} aria-label={paused ? "Resume" : "Pause"} className="grid h-9 w-9 place-items-center rounded-full border bg-card hover:bg-secondary disabled:opacity-40">
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative mx-auto w-full max-w-[560px]">
          <div ref={boardRef} role="grid" aria-label="Sudoku board"
            className="grid aspect-square grid-cols-9 overflow-hidden rounded-lg border-2 border-grid-line bg-grid-line shadow-card">
            {values.map((v, i) => {
              const r = Math.floor(i / 9), c = i % 9;
              const given = !!P.puzzle[i];
              const bg = i === sel ? "bg-cell-selected" : v && v === selVal ? "bg-cell-same" : peerSet.has(i) ? "bg-cell-peer" : "bg-cell";
              const bR = c === 2 || c === 5 ? "border-r-2 border-r-grid-line" : c !== 8 ? "border-r border-r-border" : "";
              const bB = r === 2 || r === 5 ? "border-b-2 border-b-grid-line" : r !== 8 ? "border-b border-b-border" : "";
              return (
                <button key={i} role="gridcell" onClick={() => setSel(i)}
                  aria-label={`Row ${r + 1} column ${c + 1}, ${v ? v : "empty"}${given ? ", given" : ""}`}
                  aria-selected={i === sel}
                  className={`relative grid place-items-center font-display text-[clamp(1rem,5vw,1.9rem)] leading-none outline-none ${bg} ${bR} ${bB} ${given ? "font-semibold text-given" : wrong.has(i) ? "text-destructive" : "text-entry"}`}>
                  {paused ? "" : v ? v : notes[i].length ? (
                    <span className="grid h-full w-full grid-cols-3 p-0.5 font-sans text-[clamp(0.45rem,1.7vw,0.7rem)] text-muted-foreground">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <span key={n} className="grid place-items-center">{notes[i].includes(n) ? n : ""}</span>)}
                    </span>
                  ) : ""}
                  {wrong.has(i) && <span className="absolute inset-1 rounded-sm ring-2 ring-destructive/60" />}
                </button>
              );
            })}
          </div>
          {paused && (
            <div className="absolute inset-0 grid place-items-center rounded-lg bg-background/80 backdrop-blur-sm">
              <button onClick={() => setPaused(false)} className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
                <Play className="h-4 w-4" /> Resume
              </button>
            </div>
          )}
        </div>

        <aside className="mx-auto w-full max-w-[560px] space-y-4">
          <div className="grid grid-cols-9 gap-1.5 lg:grid-cols-3 lg:gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button key={n} onClick={() => input(n)} disabled={locked} aria-label={`Enter ${n}`}
                className="flex aspect-square flex-col items-center justify-center rounded-lg border bg-card font-display text-xl hover:border-primary hover:bg-accent disabled:opacity-40 lg:text-3xl">
                {n}
                <span className="font-sans text-[9px] text-muted-foreground">{Math.max(0, 9 - counts[n])}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2">
            <button className={ctrl} onClick={undo} disabled={locked || !past.length}><Undo2 className="h-4 w-4" />Undo</button>
            <button className={ctrl} onClick={redo} disabled={locked || !future.length}><Redo2 className="h-4 w-4" />Redo</button>
            <button className={ctrl} onClick={() => input(0)} disabled={locked}><Eraser className="h-4 w-4" />Erase</button>
            <button className={`${ctrl} ${notesMode ? "border-primary bg-accent" : ""}`} onClick={() => setNotesMode((m) => !m)} aria-pressed={notesMode}>
              <Pencil className="h-4 w-4" />Notes {notesMode ? "on" : "off"}
            </button>
            <button className={ctrl} onClick={check} disabled={locked}><Search className="h-4 w-4" />Check</button>
            <button className={ctrl} onClick={submit} disabled={locked}><Flag className="h-4 w-4" />Finish</button>
            <button className={ctrl} onClick={restart}><RotateCcw className="h-4 w-4" />Restart</button>
            <button className={ctrl} onClick={reveal} disabled={!!done || revealed}><Eye className="h-4 w-4" />Solution</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={next} className="h-10 rounded-full border bg-card text-sm font-semibold hover:bg-secondary">New Game</button>
            <button onClick={goRandom} className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <Shuffle className="h-4 w-4" /> Random Puzzle
            </button>
          </div>
          <p role="status" className="min-h-5 text-sm text-muted-foreground">{msg}</p>
          <p className="hidden text-xs text-muted-foreground lg:block">Keys: 1–9 enter · arrows move · Backspace erase · N notes · Ctrl+Z / Ctrl+Y undo/redo. No time limit — take as long as you like.</p>
        </aside>
      </div>

      {done && (
        <div role="dialog" aria-modal="true" aria-labelledby="done-title" className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-card">
            <p className="text-4xl" aria-hidden>🎉</p>
            <h2 id="done-title" className="mt-2 font-display text-3xl font-semibold">Puzzle Complete!</h2>
            <dl className="mt-5 grid grid-cols-2 gap-2 text-left text-sm">
              {[["Difficulty", DIFF_LABEL[P.difficulty]], ["Puzzle", pad(P.id)], ["Time", formatTime(time)], ["Mistakes", String(mistakes)]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-muted p-2"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-display text-lg">{v}</dd></div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">Completed {new Date(done.at).toLocaleString()}</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={next} className="h-10 rounded-full bg-primary text-sm font-semibold text-primary-foreground">Next Puzzle</button>
              <button onClick={goRandom} className="h-10 rounded-full border text-sm font-semibold hover:bg-secondary">Random Puzzle</button>
              <button onClick={() => { setValues([...P.puzzle]); setNotes(emptyNotes()); setPast([]); setFuture([]); setTime(0); setMistakes(0); setDone(null); setMsg(""); }} className="h-10 rounded-full border text-sm font-semibold hover:bg-secondary">Replay</button>
              <Link to="/dashboard" className="grid h-10 place-items-center rounded-full border text-sm font-semibold hover:bg-secondary">Dashboard</Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
