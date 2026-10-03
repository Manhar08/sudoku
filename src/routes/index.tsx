import { createFileRoute, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sudoku — Private Puzzle Collection" },
      { name: "description", content: "Play 120 original Sudoku puzzles across Easy, Medium and Hard." },
      { property: "og:title", content: "Sudoku — Private Puzzle Collection" },
      { property: "og:description", content: "Play 120 original Sudoku puzzles across Easy, Medium and Hard." },
    ],
  }),
  beforeLoad: async () => {
    const { user } = await getSession();
    throw redirect({ to: user ? "/dashboard" : "/login" });
  },
});
