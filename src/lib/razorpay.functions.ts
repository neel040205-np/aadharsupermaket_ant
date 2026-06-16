import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(1).max(200),
  price: z.number().nonnegative(),
  quantity: z.number().int().positive(),
});

export const createRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ amount: z.number().positive() }).parse(d))
  .handler(async ({ data }) => {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) throw new Error("Razorpay not configured");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Math.round(data.amount * 100),
        currency: "INR",
        payment_capture: 1,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Razorpay create order failed", res.status, text);
      throw new Error("Failed to create payment order");
    }
    const order = (await res.json()) as { id: string; amount: number; currency: string };
    return { orderId: order.id, amount: order.amount, currency: order.currency, keyId };
  });

export const confirmOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        razorpayOrderId: z.string().min(1),
        razorpayPaymentId: z.string().min(1),
        razorpaySignature: z.string().min(1),
        items: z.array(itemSchema).min(1).max(100),
        deliveryAddress: z.string().trim().min(5).max(500),
        phone: z.string().trim().min(5).max(20),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new Error("Razorpay not configured");

    const expected = createHmac("sha256", keySecret)
      .update(`${data.razorpayOrderId}|${data.razorpayPaymentId}`)
      .digest("hex");
    if (expected !== data.razorpaySignature) {
      throw new Error("Invalid payment signature");
    }

    const { supabase, userId } = context;
    const total = data.items.reduce((s, i) => s + i.price * i.quantity, 0);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        status: "paid",
        total,
        delivery_address: data.deliveryAddress,
        phone: data.phone,
        razorpay_order_id: data.razorpayOrderId,
        razorpay_payment_id: data.razorpayPaymentId,
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

    // Decrement stock (best-effort, ignore failures)
    for (const i of data.items) {
      const { data: prod } = await supabase
        .from("products")
        .select("stock")
        .eq("id", i.productId)
        .maybeSingle();
      if (prod) {
        await supabase
          .from("products")
          .update({ stock: Math.max(0, prod.stock - i.quantity) })
          .eq("id", i.productId);
      }
    }

    return { orderId: order.id };
  });
