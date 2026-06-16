import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { computeBill } from "./payment-config";

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
        couponCode: z.string().trim().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let discountAmount = 0;
    let finalCouponCode: string | null = null;

    if (data.couponCode) {
      const { data: coupon, error: couponErr } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", data.couponCode.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (coupon && !couponErr) {
        const itemsTotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        if (itemsTotal >= Number(coupon.min_order_amount)) {
          finalCouponCode = coupon.code;
          if (coupon.discount_type === "percent") {
            discountAmount = Math.round(((itemsTotal * Number(coupon.discount_value)) / 100) * 100) / 100;
          } else {
            discountAmount = Number(coupon.discount_value);
          }
        }
      }
    }

    const itemsTotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const calculatedBill = computeBill(itemsTotal, discountAmount);
    if (Math.abs(calculatedBill.grandTotal - data.total) > 0.05) {
      throw new Error(`Order total mismatch. Expected ₹${calculatedBill.grandTotal.toFixed(2)} but received ₹${data.total.toFixed(2)}.`);
    }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        status: "confirmed",
        payment_method: "cod",
        total: data.total,
        delivery_address: data.deliveryAddress,
        phone: data.phone,
        coupon_code: finalCouponCode,
        discount_amount: discountAmount,
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
        couponCode: z.string().trim().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let discountAmount = 0;
    let finalCouponCode: string | null = null;

    if (data.couponCode) {
      const { data: coupon, error: couponErr } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", data.couponCode.toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      if (coupon && !couponErr) {
        const itemsTotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        if (itemsTotal >= Number(coupon.min_order_amount)) {
          finalCouponCode = coupon.code;
          if (coupon.discount_type === "percent") {
            discountAmount = Math.round(((itemsTotal * Number(coupon.discount_value)) / 100) * 100) / 100;
          } else {
            discountAmount = Number(coupon.discount_value);
          }
        }
      }
    }

    const itemsTotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const calculatedBill = computeBill(itemsTotal, discountAmount);
    if (Math.abs(calculatedBill.grandTotal - data.total) > 0.05) {
      throw new Error(`Order total mismatch. Expected ₹${calculatedBill.grandTotal.toFixed(2)} but received ₹${data.total.toFixed(2)}.`);
    }

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
        coupon_code: finalCouponCode,
        discount_amount: discountAmount,
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
