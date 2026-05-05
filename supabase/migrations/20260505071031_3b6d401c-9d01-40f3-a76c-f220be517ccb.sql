-- Fix existing archived products that still have is_active = true
UPDATE public.products SET is_active = false WHERE is_archived = true AND is_active = true;

-- Also fix: ensure is_active = true for non-archived products
UPDATE public.products SET is_active = true WHERE is_archived = false AND is_active = false;