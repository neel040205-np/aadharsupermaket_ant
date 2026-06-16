-- Add is_first_order_only column to coupons table
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS is_first_order_only BOOLEAN NOT NULL DEFAULT false;
