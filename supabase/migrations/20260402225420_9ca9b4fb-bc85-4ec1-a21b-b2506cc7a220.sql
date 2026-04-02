
-- Allow super_admin to delete sales
CREATE POLICY "Super admin can delete sales" ON public.sales FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admin to delete sale_items (cascade logic)
CREATE POLICY "Super admin can delete sale_items" ON public.sale_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id
    AND has_role(auth.uid(), 'super_admin'::app_role)
  ));

-- Allow admins to update sales (for archiving)
DROP POLICY IF EXISTS "Admins can manage sales" ON public.sales;
CREATE POLICY "Admins can manage sales" ON public.sales FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_boutique'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_boutique'::app_role));
