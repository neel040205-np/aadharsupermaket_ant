
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'verification_pending';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'rejected';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS utr text,
  ADD COLUMN IF NOT EXISTS payment_proof_url text,
  ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2),
  ADD COLUMN IF NOT EXISTS customer_notes text,
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz;
