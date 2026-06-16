import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { reviewPayment } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersAdmin,
});

const STATUSES = [
  "pending",
  "verification_pending",
  "confirmed",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "rejected",
  "cancelled",
] as const;

type Order = {
  id: string;
  user_id: string;
  status: string;
  total: number;
  amount_paid: number | null;
  delivery_address: string;
  phone: string;
  payment_method: string | null;
  utr: string | null;
  payment_proof_url: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
  google_maps_url?: string | null;
  order_items: { id: string; product_name: string; quantity: number; unit_price: number }[];
  profiles?: { full_name: string | null } | null;
};

function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});
  const reviewFn = useServerFn(reviewPayment);

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select(
        "id,user_id,status,total,amount_paid,delivery_address,phone,payment_method,utr,payment_proof_url,customer_notes,admin_notes,created_at,order_items(id,product_name,quantity,unit_price),profiles(full_name)",
      )
      .order("created_at", { ascending: false });
    const list = (data ?? []) as unknown as Order[];

    setOrders(list);

    // Sign URLs for payment proofs
    const toSign = list.filter((o) => o.payment_proof_url);
    const entries = await Promise.all(
      toSign.map(async (o) => {
        const { data: s } = await supabase.storage
          .from("payment-proofs")
          .createSignedUrl(o.payment_proof_url!, 60 * 60);
        return [o.id, s?.signedUrl ?? ""] as const;
      }),
    );
    setProofUrls(Object.fromEntries(entries));
  }
  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status: status as Database["public"]["Enums"]["order_status"] })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    load();
  }

  async function review(orderId: string, action: "approve" | "reject") {
    try {
      await reviewFn({ data: { orderId, action } });
      toast.success(action === "approve" ? "Payment approved" : "Payment rejected");
      load();
    } catch (e) {
      const err = e as Error;
      toast.error(err?.message || "Failed");
    }
  }

  const pending = orders.filter((o) => o.status === "verification_pending");
  const all = orders;

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold">Orders</h2>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Verification{" "}
            {pending.length > 0 && <Badge className="ml-2">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="all">All Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-3">
          {pending.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              proofUrl={proofUrls[o.id]}
              showReview
              onApprove={() => review(o.id, "approve")}
              onReject={() => review(o.id, "reject")}
              onSetStatus={(s) => setStatus(o.id, s)}
            />
          ))}
          {pending.length === 0 && (
            <p className="text-center text-muted-foreground">
              No payments waiting for verification
            </p>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-3">
          {all.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              proofUrl={proofUrls[o.id]}
              onSetStatus={(s) => setStatus(o.id, s)}
            />
          ))}
          {all.length === 0 && <p className="text-center text-muted-foreground">No orders yet</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "confirmed" || s === "delivered" || s === "paid") return "default";
  if (s === "rejected" || s === "cancelled") return "destructive";
  return "secondary";
}

function OrderCard({
  order: o,
  proofUrl,
  showReview,
  onApprove,
  onReject,
  onSetStatus,
}: {
  order: Order;
  proofUrl?: string;
  showReview?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onSetStatus: (s: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">
            #{o.id.slice(0, 8)}
            {o.payment_method && (
              <Badge variant="outline" className="ml-2 uppercase">
                {o.payment_method}
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {new Date(o.created_at).toLocaleString()} · ₹{Number(o.total).toFixed(2)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(o.status)}>{o.status.replace("_", " ")}</Badge>
          <Select value={o.status} onValueChange={onSetStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="text-sm">
        <ul className="space-y-1">
          {o.order_items.map((i) => (
            <li key={i.id} className="flex justify-between">
              <span>
                {i.product_name} × {i.quantity}
              </span>
              <span>₹{(Number(i.unit_price) * i.quantity).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        {/* Customer & Delivery Location details */}
        <div className="mt-4 border-t pt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <span className="block text-2xs font-semibold text-muted-foreground uppercase tracking-wide">
                Customer Name
              </span>
              <span className="font-semibold text-foreground">
                {o.profiles?.full_name || "Guest"}
              </span>
            </div>
            <div>
              <span className="block text-2xs font-semibold text-muted-foreground uppercase tracking-wide">
                Phone Number
              </span>
              <a href={`tel:${o.phone}`} className="font-semibold text-primary hover:underline">
                {o.phone}
              </a>
            </div>
          </div>

          <div>
            <span className="block text-2xs font-semibold text-muted-foreground uppercase tracking-wide">
              Delivery Address
            </span>
            <span className="text-foreground">{o.delivery_address}</span>
          </div>
        </div>

        {o.payment_method === "upi" && (
          <div className="mt-3 grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-[1fr_160px]">
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-semibold">UTR:</span> {o.utr || "—"}
              </div>
              <div>
                <span className="font-semibold">Amount paid:</span> ₹
                {o.amount_paid ? Number(o.amount_paid).toFixed(2) : "—"}
              </div>
              {o.customer_notes && (
                <div>
                  <span className="font-semibold">Notes:</span> {o.customer_notes}
                </div>
              )}
            </div>
            {proofUrl ? (
              <a href={proofUrl} target="_blank" rel="noreferrer" className="block">
                <img
                  src={proofUrl}
                  alt="Payment screenshot"
                  className="h-40 w-full rounded border object-cover"
                />
              </a>
            ) : (
              <div className="grid h-40 w-full place-items-center rounded border bg-muted text-xs text-muted-foreground">
                No screenshot
              </div>
            )}
          </div>
        )}

        {showReview && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={onApprove}>
              Approve Payment
            </Button>
            <Button className="flex-1" variant="destructive" onClick={onReject}>
              Reject Payment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
