
-- 1. Fix products: remove public SELECT, keep authenticated-only
DROP POLICY IF EXISTS "allow_read_products" ON public.products;

-- Create a public view for login showcase (excludes purchase_price)
CREATE OR REPLACE VIEW public.products_showcase
WITH (security_invoker = off) AS
SELECT id, name, selling_price, stock_quantity, image_url, color, size
FROM public.products
WHERE stock_quantity > 0 AND is_archived = false AND is_active = true;

-- Allow anon to read the showcase view
GRANT SELECT ON public.products_showcase TO anon;
GRANT SELECT ON public.products_showcase TO authenticated;

-- 2. Fix boutiques: remove public SELECT, add authenticated-only
DROP POLICY IF EXISTS "read_boutiques" ON public.boutiques;
CREATE POLICY "authenticated_read_boutiques" ON public.boutiques FOR SELECT TO authenticated USING (true);

-- 3. Fix boutiques write policy: restrict to authenticated role properly
DROP POLICY IF EXISTS "write_boutiques" ON public.boutiques;
CREATE POLICY "admins_manage_boutiques" ON public.boutiques FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_boutique'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_boutique'::app_role));

-- 4. Fix clients: restrict SELECT to admins + own records
DROP POLICY IF EXISTS "Authenticated can view clients" ON public.clients;
CREATE POLICY "Users can view relevant clients" ON public.clients FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_boutique'::app_role)
    OR created_by = auth.uid()
  );

-- 5. Fix clients INSERT: scope to authenticated user
DROP POLICY IF EXISTS "Authenticated can insert clients" ON public.clients;
CREATE POLICY "Authenticated can insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Fix avatars storage: remove public upload/update, add authenticated path-scoped
DROP POLICY IF EXISTS "Upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Update avatars" ON storage.objects;

CREATE POLICY "Authenticated upload avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated update avatars" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 7. Fix overly broad sales insert for public role
DROP POLICY IF EXISTS "authenticated_insert_sales" ON public.sales;
DROP POLICY IF EXISTS "authenticated_read_sales" ON public.sales;

-- 8. Fix overly broad sale_items policies for public role
DROP POLICY IF EXISTS "authenticated_read_sale_items" ON public.sale_items;
DROP POLICY IF EXISTS "authenticated_insert_sale_items" ON public.sale_items;
