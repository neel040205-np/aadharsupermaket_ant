import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "My Orders — Aadhar Supermarket" }] }),
  component: OrdersPage,
});

type Order = {
  id: string;
  status: string;
  total: number;
  created_at: string;
  delivery_address: string;
  order_items: { id: string; product_name: string; quantity: number; unit_price: number }[];
};

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("orders")
      .select(
        "id,status,total,created_at,delivery_address,order_items(id,product_name,quantity,unit_price)",
      )
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data ?? []) as any);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">My orders</h1>
        {loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : orders.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">No orders yet.</Card>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <Card key={o.id}>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">Order #{o.id.slice(0, 8)}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={o.status === "delivered" ? "default" : "secondary"}>
                    {o.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {o.order_items.map((i) => (
                      <li key={i.id} className="flex justify-between">
                        <span>
                          {i.product_name} × {i.quantity}
                        </span>
                        <span>₹{(Number(i.unit_price) * i.quantity).toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex justify-between border-t pt-2 font-semibold">
                    <span>Total</span>
                    <span>₹{Number(o.total).toFixed(2)}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Delivery to: {o.delivery_address}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
