
-- Revoke product update from all authenticated, restrict to super_admin only
DROP POLICY IF EXISTS "Authenticated can update products" ON public.products;
DROP POLICY IF EXISTS "Authenticated can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

-- Super admin can fully manage products (insert, update, delete)
CREATE POLICY "Super admin can manage products"
ON public.products FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- All authenticated users can still view products
-- (already exists: "Authenticated can view products")

-- Staff can insert products (add new items)
CREATE POLICY "Staff can insert products"
ON public.products FOR INSERT TO authenticated
WITH CHECK (true);
