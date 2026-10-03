import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getSession, login } from "@/lib/auth.functions";
import { ThemeToggle } from "@/components/AppHeader";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Sudoku" },
      { name: "description", content: "Sign in to your private Sudoku puzzle collection." },
      { property: "og:title", content: "Sign in — Sudoku" },
      { property: "og:description", content: "Sign in to your private Sudoku puzzle collection." },
    ],
  }),
  beforeLoad: async () => {
    const { user } = await getSession();
    if (user) throw redirect({ to: "/dashboard" });
  },
  component: LoginPage,
});

function LoginPage() {
  const doLogin = useServerFn(login);
  const navigate = useNavigate();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !password) return setError("Please enter your username and password.");
    setBusy(true);
    try {
      const res = await doLogin({ data: { username, password } });
      if (!res.ok) setError(res.error);
      else {
        await router.invalidate();
        navigate({ to: "/dashboard", replace: true });
      }
    } catch {
      setError("Sign-in is unavailable right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center px-4">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 grid w-24 grid-cols-3 gap-1" aria-hidden>
            {[5, 0, 3, 0, 7, 0, 9, 0, 1].map((n, i) => (
              <div key={i} className="grid aspect-square place-items-center rounded-sm border bg-card font-display text-sm">
                {n || ""}
              </div>
            ))}
          </div>
          <h1 className="font-display text-5xl font-semibold tracking-tight">Sudoku</h1>
          <p className="mt-2 text-muted-foreground">Private Puzzle Collection</p>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-6 shadow-card">
          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium">Username</label>
            <input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={64}
              className="h-11 w-full rounded-md border bg-background px-3 focus:border-ring" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={256}
              className="h-11 w-full rounded-md border bg-background px-3 focus:border-ring" />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <button disabled={busy} className="h-11 w-full rounded-md bg-primary font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy ? "Signing in…" : "Login"}
          </button>
        </form>
      </div>
    </main>
  );
}
