import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Aadhar Supermarket" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { user, loading } = useCurrentUser();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        setAllowed(!!data);
        setChecking(false);
      });
  }, [user, loading, navigate]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
          Loading...
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto max-w-xl px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">Admin access required</h1>
          <p className="mt-2 text-muted-foreground">
            Your account doesn't have the admin role. Ask a database admin to grant you the admin
            role in the user_roles table.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-wrap gap-2 border-b pb-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin">Dashboard</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/products">Products</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/categories">Categories</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/orders">Orders</Link>
          </Button>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
