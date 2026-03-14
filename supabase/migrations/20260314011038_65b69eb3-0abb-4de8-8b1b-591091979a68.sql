
-- Allow all authenticated users to insert and update products (for adding photos, modifying stock)
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Admins can delete products"
ON public.products FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_boutique'));

CREATE POLICY "Authenticated can insert products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update products"
ON public.products FOR UPDATE TO authenticated
USING (true);
