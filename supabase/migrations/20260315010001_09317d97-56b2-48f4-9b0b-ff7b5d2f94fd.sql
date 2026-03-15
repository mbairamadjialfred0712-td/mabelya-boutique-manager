
-- App settings table (single row, managed by super_admin)
CREATE TABLE public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_name text NOT NULL DEFAULT 'Mabelya Fashion Manager',
  welcome_message text NOT NULL DEFAULT 'Bienvenue sur Mabelya Fashion Manager',
  logo_url text DEFAULT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view app settings"
  ON public.app_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Super admin can manage app settings"
  ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default row
INSERT INTO public.app_settings (app_name, welcome_message) VALUES ('Mabelya Fashion Manager', 'Bienvenue sur Mabelya Fashion Manager');

-- Activity logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  details text DEFAULT NULL,
  entity_type text DEFAULT NULL,
  entity_id uuid DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin can view all activity logs"
  ON public.activity_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated can insert activity logs"
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add avatar support to create-user flow (profiles table already has avatar_url)
-- Create storage bucket for user avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'user-avatars');

CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated can update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'user-avatars');
