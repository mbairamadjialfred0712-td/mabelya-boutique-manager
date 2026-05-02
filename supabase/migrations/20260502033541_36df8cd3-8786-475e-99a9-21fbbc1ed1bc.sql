-- Allow anon users to SELECT from products so the products_showcase view works on the login page
-- The view already filters to only active, non-archived, in-stock items and excludes purchase_price
CREATE POLICY "anon_read_products_for_showcase"
ON public.products
FOR SELECT
TO anon
USING (
  is_archived = false
  AND is_active = true
  AND stock_quantity > 0
);