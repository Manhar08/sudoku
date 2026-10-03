import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.functions";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { user } = await getSession();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  return (
    <div className="min-h-screen">
      <AppHeader user={user} />
      <Outlet />
    </div>
  );
}
