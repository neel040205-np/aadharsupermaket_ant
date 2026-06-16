import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { useCart, cartCount, cartTotal } from "@/lib/cart";

export function CartFloatingBar() {
  const items = useCart();
  const count = cartCount(items);
  if (count === 0) return null;
  const total = cartTotal(items);
  return (
    <Link
      to="/cart"
      className="fixed bottom-20 left-1/2 z-40 flex w-[92%] max-w-md -translate-x-1/2 items-center justify-between rounded-full bg-primary px-5 py-3 text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-[1.02] md:bottom-6"
    >
      <div className="flex items-center gap-2">
        <ShoppingCart className="h-4 w-4" />
        <span className="text-sm font-semibold">
          {count} item{count > 1 ? "s" : ""} · ₹{total.toFixed(0)}
        </span>
      </div>
      <span className="text-sm font-bold">View cart →</span>
    </Link>
  );
}
