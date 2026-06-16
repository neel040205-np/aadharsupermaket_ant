import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1).max(200),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});

export const placeCodOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        items: z.array(itemSchema).min(1).max(100),
        deliveryAddress: z.string().trim().min(5).max(500),
        phone: z.string().trim().min(5).max(20),
        total: z.number().positive(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        status: "confirmed",
        payment_method: "cod",
        total: data.total,
        delivery_address: data.deliveryAddress,
        phone: data.phone,
      })
      .select("id")
      .single();
    if (error || !order) throw error ?? new Error("Failed to create order");
    const rows = data.items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      product_name: i.name,
      unit_price: i.price,
      quantity: i.quantity,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(rows);
    if (itemsErr) throw itemsErr;
    return { orderId: order.id };
  });

export const placeUpiOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        items: z.array(itemSchema).min(1).max(100),
        deliveryAddress: z.string().trim().min(5).max(500),
        phone: z.string().trim().min(5).max(20),
        total: z.number().positive(),
        utr: z.string().trim().min(4).max(50),
        paymentProofPath: z.string().trim().min(3).max(500),
        amountPaid: z.number().positive(),
        customerNotes: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        status: "verification_pending",
        payment_method: "upi",
        total: data.total,
        delivery_address: data.deliveryAddress,
        phone: data.phone,
        utr: data.utr,
        payment_proof_url: data.paymentProofPath,
        amount_paid: data.amountPaid,
        customer_notes: data.customerNotes ?? null,
      })
      .select("id")
      .single();
    if (error || !order) throw error ?? new Error("Failed to create order");
    const rows = data.items.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      product_name: i.name,
      unit_price: i.price,
      quantity: i.quantity,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(rows);
    if (itemsErr) throw itemsErr;
    return { orderId: order.id };
  });

export const reviewPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        orderId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        adminNotes: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const status = data.action === "approve" ? "confirmed" : "rejected";
    const { error } = await supabase
      .from("orders")
      .update({
        status,
        verified_by: userId,
        verified_at: new Date().toISOString(),
        admin_notes: data.adminNotes ?? null,
      })
      .eq("id", data.orderId);
    if (error) throw error;
    return { ok: true };
  });
