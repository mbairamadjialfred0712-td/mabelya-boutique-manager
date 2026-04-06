CREATE POLICY "Super admin can view all staff expenses"
ON public.staff_expenses
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));