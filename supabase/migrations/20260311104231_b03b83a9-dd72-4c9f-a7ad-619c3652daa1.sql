
-- Fix overly permissive sale_items INSERT policy
DROP POLICY "Staff can create sale items" ON public.sale_items;
CREATE POLICY "Staff can create sale items" ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.sales WHERE id = sale_id AND user_id = auth.uid())
  );
