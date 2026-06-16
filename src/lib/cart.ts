import { useSyncExternalStore } from "react";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  unit?: string | null;
};

const KEY = "sm_cart_v1";
let items: CartItem[] = [];
const listeners = new Set<() => void>();

function load() {
  if (typeof window === "undefined") return;
  try {
    items = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    items = [];
  }
}
function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}
load();

export const cart = {
  get: () => items,
  add(item: Omit<CartItem, "quantity">, qty = 1) {
    const existing = items.find((i) => i.productId === item.productId);
    if (existing) existing.quantity += qty;
    else items = [...items, { ...item, quantity: qty }];
    persist();
  },
  setQty(productId: string, qty: number) {
    if (qty <= 0) items = items.filter((i) => i.productId !== productId);
    else items = items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i));
    persist();
  },
  remove(productId: string) {
    items = items.filter((i) => i.productId !== productId);
    persist();
  },
  clear() {
    items = [];
    persist();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useCart() {
  return useSyncExternalStore(
    (l) => cart.subscribe(l),
    () => items,
    () => [] as CartItem[],
  );
}

export function cartTotal(list: CartItem[]) {
  return list.reduce((s, i) => s + i.price * i.quantity, 0);
}
export function cartCount(list: CartItem[]) {
  return list.reduce((s, i) => s + i.quantity, 0);
}
