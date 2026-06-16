import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { CartFloatingBar } from "@/components/CartFloatingBar";
import { LocationBar } from "@/components/LocationBar";
import { QtyStepper } from "@/components/QtyStepper";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aadhar Supermarket — Order Now" },
      {
        name: "description",
        content:
          "Order groceries online from Aadhar Supermarket, Lunawada. Fast delivery, fresh produce, daily essentials.",
      },
    ],
  }),
  component: Index,
});

type Category = { id: string; name: string; slug: string; image_url: string | null };
type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  unit: string | null;
  stock: number;
  image_url: string | null;
  category_id: string | null;
  is_active: boolean;
};

function Index() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeCat, setActiveCat] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from("categories").select("*").order("name"),
        supabase.from("products").select("*").eq("is_active", true).order("name"),
      ]);
      setCategories(c.data ?? []);
      setProducts((p.data ?? []) as Product[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (activeCat !== "all" && p.category_id !== activeCat) return false;
        if (query && !p.name.toLowerCase().includes(query.toLowerCase())) return false;
        return true;
      }),
    [products, activeCat, query],
  );

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-8">
      <Header />

      {/* Top: ORDER NOW + Location */}
      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/20">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                <Sparkles className="h-3 w-3" /> ORDER NOW!!
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                Groceries delivered to your door
              </h1>
            </div>
          </div>
          <div className="mt-3">
            <LocationBar />
          </div>

          {/* Search */}
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-11 rounded-full pl-10"
              placeholder="Search for products..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-4" id="categories">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Categories
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")} label="All" />
          {categories.map((c) => (
            <CatChip
              key={c.id}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
              label={c.name}
              image={c.image_url}
            />
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="container mx-auto px-4 py-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Products
        </h2>
        {loading ? (
          <p className="py-12 text-center text-muted-foreground">Loading products...</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
            No products found.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <Card
                key={p.id}
                className="group flex h-full flex-col overflow-hidden p-0 transition-all hover:shadow-md"
              >
                <div className="cursor-pointer flex-1" onClick={() => setSelectedProduct(p)}>
                  <div className="aspect-square overflow-hidden bg-muted">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="p-3 pb-0">
                    <h3 className="line-clamp-2 text-sm font-semibold leading-tight">{p.name}</h3>
                    {p.unit && <p className="mt-0.5 text-xs text-muted-foreground">{p.unit}</p>}
                  </div>
                </div>
                <div className="p-3 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-base font-bold">₹{Number(p.price).toFixed(0)}</span>
                    <QtyStepper product={p} size="sm" />
                  </div>
                  {p.stock <= 0 && <p className="mt-1 text-xs text-destructive">Out of stock</p>}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Product Details Dialog */}
      <Dialog
        open={selectedProduct !== null}
        onOpenChange={(open) => !open && setSelectedProduct(null)}
      >
        {selectedProduct && (
          <DialogContent className="max-w-md w-[92vw] rounded-xl overflow-hidden p-0 gap-0">
            {/* Large Product Image */}
            <div className="aspect-square w-full overflow-hidden bg-muted relative">
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full w-full place-items-center text-muted-foreground text-sm">
                  No image available
                </div>
              )}
            </div>

            {/* Product Details Block */}
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <DialogTitle className="text-lg font-bold leading-snug">
                  {selectedProduct.name}
                </DialogTitle>
                {selectedProduct.unit && (
                  <p className="text-xs text-muted-foreground font-medium">
                    {selectedProduct.unit}
                  </p>
                )}
              </div>

              {/* Price and Add/Qty stepper */}
              <div className="flex items-center justify-between border-t border-b py-3">
                <span className="text-xl font-extrabold text-foreground">
                  ₹{Number(selectedProduct.price).toFixed(0)}
                </span>
                <QtyStepper product={selectedProduct} />
              </div>

              {/* Description Block */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Product Description
                </h4>
                <p className="text-sm text-foreground/80 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-line pr-1">
                  {selectedProduct.description ||
                    "Fresh, high-quality product carefully sourced for you."}
                </p>
              </div>

              {selectedProduct.stock <= 0 && (
                <p className="text-xs font-semibold text-destructive text-center bg-destructive/10 py-2 rounded-lg">
                  Currently Out of Stock
                </p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      <CartFloatingBar />
      <BottomNav />
    </div>
  );
}

function CatChip({
  active,
  onClick,
  label,
  image,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  image?: string | null;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-3 py-2 transition ${
        active ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted"
      }`}
    >
      <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl bg-muted">
        {image ? (
          <img src={image} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg">🛒</span>
        )}
      </div>
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}
