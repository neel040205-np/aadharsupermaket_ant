import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, categories: 0, orders: 0, revenue: 0 });

  useEffect(() => {
    (async () => {
      const [p, c, o] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total"),
      ]);
      const revenue = (o.data ?? []).reduce((s, r: any) => s + Number(r.total), 0);
      setStats({
        products: p.count ?? 0,
        categories: c.count ?? 0,
        orders: o.data?.length ?? 0,
        revenue,
      });
    })();
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat label="Products" value={stats.products} to="/admin/products" />
      <Stat label="Categories" value={stats.categories} to="/admin/categories" />
      <Stat label="Orders" value={stats.orders} to="/admin/orders" />
      <Stat label="Revenue" value={`₹${stats.revenue.toFixed(2)}`} />
    </div>
  );
}

function Stat({ label, value, to }: { label: string; value: string | number; to?: string }) {
  const card = (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}
