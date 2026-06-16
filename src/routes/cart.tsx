import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { useCart, cart, cartTotal } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { QtyStepper } from "@/components/QtyStepper";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { computeBill, MIN_ORDER } from "@/lib/payment-config";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your Cart — Aadhar Supermarket" }] }),
  component: CartPage,
});

type Product = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  unit: string | null;
  stock: number;
};

function CartPage() {
  const items = useCart();
  const itemTotal = cartTotal(items);
  const bill = computeBill(itemTotal);
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [related, setRelated] = useState<Product[]>([]);

  useEffect(() => {
    const ids = items.map((i) => i.productId);
    supabase
      .from("products")
      .select("id,name,price,image_url,unit,stock")
      .eq("is_active", true)
      .limit(20)
      .then(({ data }) => {
        const filtered = (data ?? []).filter((p) => !ids.includes(p.id)).slice(0, 4) as Product[];
        setRelated(filtered);
      });
  }, [items.length]);

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-8">
      <Header />
      <div className="container mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-bold">Your cart</h1>
        {items.length === 0 ? (
          <Card className="grid place-items-center gap-3 p-12 text-center">
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild>
              <Link to="/">Browse products</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((i) => (
              <Card key={i.productId} className="flex items-center gap-3 p-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                  {i.imageUrl && (
                    <img src={i.imageUrl} alt={i.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="line-clamp-1 font-semibold">{i.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    ₹{i.price.toFixed(2)} {i.unit && `/ ${i.unit}`}
                  </p>
                  <div className="mt-1 font-semibold">₹{(i.price * i.quantity).toFixed(2)}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <QtyStepper
                    product={{
                      id: i.productId,
                      name: i.name,
                      price: i.price,
                      image_url: i.imageUrl,
                      unit: i.unit,
                    }}
                    size="sm"
                  />
                  <button onClick={() => cart.remove(i.productId)} aria-label="Remove">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              </Card>
            ))}

            {related.length > 0 && (
              <Card className="p-4">
                <h3 className="mb-3 text-sm font-bold">You may also like</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {related.map((p) => (
                    <div key={p.id} className="rounded-lg border p-2">
                      <div className="aspect-square overflow-hidden rounded bg-muted">
                        {p.image_url && (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="mt-2 line-clamp-1 text-xs font-semibold">{p.name}</div>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-sm font-bold">₹{Number(p.price).toFixed(0)}</span>
                        <QtyStepper product={p} size="sm" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="space-y-2 p-4">
              <h3 className="text-sm font-bold">Bill details</h3>
              <Row label="Item total" value={`₹${bill.itemTotal.toFixed(2)}`} />
              <Row
                label="Delivery charge"
                value={bill.delivery === 0 ? "FREE" : `₹${bill.delivery.toFixed(2)}`}
                positive={bill.delivery === 0}
              />
              <Row label="Handling charge" value={`₹${bill.handling.toFixed(2)}`} />
              <div className="my-2 border-t" />
              <Row label="Grand total" value={`₹${bill.grandTotal.toFixed(2)}`} bold />
              {bill.savings > 0 && (
                <div className="rounded-md bg-primary/10 px-2 py-1.5 text-center text-xs font-semibold text-primary">
                  🎉 Total saving: ₹{bill.savings.toFixed(2)}
                </div>
              )}
              {itemTotal < MIN_ORDER && (
                <p className="text-center text-sm text-destructive">
                  Minimum order ₹{MIN_ORDER}. Add ₹{(MIN_ORDER - itemTotal).toFixed(2)} more.
                </p>
              )}
            </Card>

            {!user ? (
              <Button size="lg" className="w-full" asChild>
                <Link to="/auth">Login to proceed</Link>
              </Button>
            ) : (
              <Button
                size="lg"
                className="w-full"
                disabled={itemTotal < MIN_ORDER}
                onClick={() => navigate({ to: "/checkout" })}
              >
                Proceed to payment · ₹{bill.grandTotal.toFixed(2)}
              </Button>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  positive,
}: {
  label: string;
  value: string;
  bold?: boolean;
  positive?: boolean;
}) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "text-base font-bold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={positive ? "text-primary font-semibold" : ""}>{value}</span>
    </div>
  );
}
