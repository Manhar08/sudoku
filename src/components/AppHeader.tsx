import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { logout } from "@/lib/auth.functions";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("sudoku.theme", next ? "dark" : "light");
  };
  return (
    <button onClick={toggle} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} className="grid h-9 w-9 place-items-center rounded-full border bg-card hover:bg-secondary">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function AppHeader({ user }: { user: string }) {
  const doLogout = useServerFn(logout);
  const navigate = useNavigate();
  const router = useRouter();
  return (
    <header className="border-b bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/dashboard" className="font-display text-2xl font-semibold tracking-tight">
          Sudoku<span className="text-primary">.</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">Welcome, {user}</span>
          <ThemeToggle />
          <button
            onClick={async () => {
              await doLogout();
              await router.invalidate();
              navigate({ to: "/login", replace: true });
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-card px-3 text-sm hover:bg-secondary"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </header>
  );
}
