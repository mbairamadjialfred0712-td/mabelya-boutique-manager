
-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country_id UUID REFERENCES public.countries(id),
  age_range TEXT DEFAULT 'Non spécifié',
  gender TEXT DEFAULT 'Non spécifié',
  status TEXT DEFAULT 'Actif',
  total_spent NUMERIC NOT NULL DEFAULT 0,
  visit_count INTEGER NOT NULL DEFAULT 0,
  boutique_id UUID REFERENCES public.boutiques(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated can view clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can update clients" ON public.clients FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin_boutique'));
CREATE POLICY "Super admin can delete clients" ON public.clients FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'));

-- Add updated_at trigger
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Link sales to clients (optional FK)
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);
