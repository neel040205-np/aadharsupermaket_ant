-- Add location fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS google_maps_url text;

-- Add location fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS latitude double precision;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS longitude double precision;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS google_maps_url text;
