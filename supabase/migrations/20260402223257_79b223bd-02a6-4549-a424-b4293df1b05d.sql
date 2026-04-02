
DROP VIEW IF EXISTS public.products_showcase;

CREATE OR REPLACE VIEW public.products_showcase
WITH (security_invoker = on) AS
SELECT id, name, selling_price, stock_quantity, image_url, color, size
FROM public.products
WHERE stock_quantity > 0 AND is_archived = false AND is_active = true;

GRANT SELECT ON public.products_showcase TO anon;
GRANT SELECT ON public.products_showcase TO authenticated;

-- We need anon to be able to read products through the view, so add a limited anon SELECT policy
CREATE POLICY "anon_read_products_limited" ON public.products FOR SELECT TO anon
  USING (stock_quantity > 0 AND is_archived = false AND is_active = true);
