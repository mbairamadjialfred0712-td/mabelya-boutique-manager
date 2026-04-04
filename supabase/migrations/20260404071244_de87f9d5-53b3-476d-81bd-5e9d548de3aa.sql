-- Allow sales_staff to read their own staff record (needed for country/boutique filtering)
CREATE POLICY "staff_can_view_own_record"
ON public.staff
FOR SELECT
TO authenticated
USING (user_id = auth.uid());