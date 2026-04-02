
-- 1. Fix products: restrict full CRUD to admins, keep read for all authenticated
DROP POLICY IF EXISTS "allow_auth_all_products" ON public.products;
CREATE POLICY "authenticated_read_products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins_manage_products" ON public.products FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_boutique'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_boutique'::app_role));

-- 2. Fix profiles: restrict SELECT to own profile + admins
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_boutique'::app_role));

-- 3. Fix sales: restrict SELECT to own sales + admins
DROP POLICY IF EXISTS "Authenticated can view sales" ON public.sales;
CREATE POLICY "Users can view relevant sales" ON public.sales FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_boutique'::app_role));

-- 4. Fix sale_items: restrict SELECT to own sale items + admins
DROP POLICY IF EXISTS "Authenticated can view sale items" ON public.sale_items;
CREATE POLICY "Users can view relevant sale_items" ON public.sale_items FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND (sales.user_id = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_boutique'::app_role)))
  );

-- 5. Fix expenses: restrict SELECT to admins only (already admin-managed)
DROP POLICY IF EXISTS "Authenticated can view expenses" ON public.expenses;
CREATE POLICY "Admins can view expenses" ON public.expenses FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_boutique'::app_role));

-- 6. Fix ad_campaigns: restrict SELECT to admins only
DROP POLICY IF EXISTS "Authenticated can view campaigns" ON public.ad_campaigns;
CREATE POLICY "Admins can view campaigns" ON public.ad_campaigns FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_boutique'::app_role));

-- 7. Fix clients: ensure created_by is set on insert
DROP POLICY IF EXISTS "Authenticated can insert clients" ON public.clients;
CREATE POLICY "Authenticated can insert clients" ON public.clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- 8. Fix user-avatars storage: add ownership check on UPDATE
DROP POLICY IF EXISTS "Allow authenticated uploads to user-avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to user-avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads of user-avatars" ON storage.objects;

CREATE POLICY "user_avatars_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "user_avatars_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'user-avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "user_avatars_select" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'user-avatars');

-- 9. Fix product-images: add UPDATE policy for admins
CREATE POLICY "product_images_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND (
    has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_boutique'::app_role)
  ));

-- 10. Fix functions with missing search_path
CREATE OR REPLACE FUNCTION public.decrement_stock(product_id uuid, qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE products 
  SET stock_quantity = stock_quantity - qty,
      updated_at = NOW()
  WHERE id = product_id 
  AND stock_quantity >= qty;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock insuffisant pour le produit %', product_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.invoice_number := 'MFM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$function$;
