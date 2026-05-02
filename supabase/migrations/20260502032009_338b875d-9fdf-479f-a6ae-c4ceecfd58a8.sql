
-- 1. Remove anon access to products (exposes purchase_price)
DROP POLICY IF EXISTS "anon_read_products_limited" ON public.products;

-- 2. Remove activity_logs from realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'activity_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_logs;
  END IF;
END $$;

-- 3. Fix admin_read_staff policy: public -> authenticated
DROP POLICY IF EXISTS "admin_read_staff" ON public.staff;
CREATE POLICY "admin_read_staff" ON public.staff
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_boutique'::app_role)
  );

-- 3b. Fix vendeur_own_expenses policy: public -> authenticated
DROP POLICY IF EXISTS "vendeur_own_expenses" ON public.staff_expenses;
CREATE POLICY "vendeur_own_expenses" ON public.staff_expenses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Remove overly broad storage policies for user-avatars
DROP POLICY IF EXISTS "Authenticated can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update own avatar" ON storage.objects;

-- 5. Revoke EXECUTE from anon on SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrease_stock_on_sale() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_invoice_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
