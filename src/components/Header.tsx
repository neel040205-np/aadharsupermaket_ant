import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, LogOut, User as UserIcon, ShieldCheck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart, cartCount } from "@/lib/cart";
import { useCurrentUser } from "@/hooks/use-current-user";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function Header() {
  const items = useCart();
  const { user, isAdmin, profileName } = useCurrentUser();
  const navigate = useNavigate();
  const count = cartCount(items);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground font-bold">
            A
          </div>
          <span className="text-lg font-bold tracking-tight">Aadhar Supermarket</span>
        </Link>
        <nav className="flex items-center gap-1">
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin">
                <ShieldCheck className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/orders">
                <Package className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Orders</span>
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild className="relative">
            <Link to="/cart">
              <ShoppingCart className="h-4 w-4" />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-xs font-bold text-accent-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
          {user && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="max-w-[110px] sm:max-w-[180px] px-2 sm:px-3"
            >
              <Link to="/profile" className="flex items-center gap-1 font-medium">
                <span className="text-base" role="img" aria-label="user">
                  👤
                </span>
                <span className="truncate">
                  {profileName === null ? "..." : profileName || "Complete Profile"}
                </span>
              </Link>
            </Button>
          )}
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Signed out");
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link to="/auth">
                <UserIcon className="mr-1 h-4 w-4" />
                Sign in
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
