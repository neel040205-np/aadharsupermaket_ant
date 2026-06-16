import { Link } from "@tanstack/react-router";
import { Home, RotateCcw, LayoutGrid, Sparkles } from "lucide-react";

export function BottomNav() {
  const items = [
    { to: "/" as const, hash: undefined, icon: Home, label: "Home" },
    { to: "/orders" as const, hash: undefined, icon: RotateCcw, label: "Order Again" },
    { to: "/" as const, hash: "categories", icon: LayoutGrid, label: "Categories" },
    { to: "/services" as const, hash: undefined, icon: Sparkles, label: "Services" },
  ] as const;
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-border bg-background/95 backdrop-blur md:hidden">
      {items.map((i) => (
        <Link
          key={i.label}
          to={i.to}
          hash={i.hash}
          className="flex flex-col items-center gap-0.5 py-2 text-xs text-muted-foreground [&.active]:text-primary"
          activeProps={{ className: "text-primary" }}
          activeOptions={{ exact: true }}
        >
          <i.icon className="h-5 w-5" />
          <span>{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
