import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { cart, useCart } from "@/lib/cart";

type Props = {
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string | null;
    unit?: string | null;
    stock?: number;
  };
  size?: "sm" | "md";
};

export function QtyStepper({ product, size = "md" }: Props) {
  const items = useCart();
  const item = items.find((i) => i.productId === product.id);
  const qty = item?.quantity ?? 0;
  const dim = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  if (qty === 0) {
    return (
      <Button
        size="sm"
        disabled={product.stock !== undefined && product.stock <= 0}
        onClick={() =>
          cart.add({
            productId: product.id,
            name: product.name,
            price: Number(product.price),
            imageUrl: product.image_url,
            unit: product.unit,
          })
        }
      >
        <Plus className="h-4 w-4" /> Add
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1 rounded-md bg-primary px-1 text-primary-foreground">
      <Button
        size="icon"
        variant="ghost"
        className={`${dim} text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground`}
        onClick={() => cart.setQty(product.id, qty - 1)}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="min-w-5 text-center text-sm font-bold">{qty}</span>
      <Button
        size="icon"
        variant="ghost"
        className={`${dim} text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground`}
        onClick={() => cart.setQty(product.id, qty + 1)}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
