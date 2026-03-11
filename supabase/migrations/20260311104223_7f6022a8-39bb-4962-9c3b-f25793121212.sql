
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin_boutique', 'sales_staff');

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create user_roles table FIRST (before has_role function)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking (after user_roles exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Countries table
CREATE TABLE public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'XOF',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view countries" ON public.countries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can manage countries" ON public.countries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- Boutiques table
CREATE TABLE public.boutiques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.boutiques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view boutiques" ON public.boutiques FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage boutiques" ON public.boutiques FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_boutique')
);

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_boutique')
);

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  size TEXT,
  color TEXT,
  purchase_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  boutique_id UUID NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_boutique')
);

-- Sales table
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE DEFAULT '',
  boutique_id UUID NOT NULL REFERENCES public.boutiques(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  customer_name TEXT,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'mobile_money', 'bank_transfer')),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view sales" ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage sales" ON public.sales FOR ALL TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_boutique')
);

-- Sale items table
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view sale items" ON public.sale_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can create sale items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);

-- Invoice number trigger
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.invoice_number := 'MFM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON public.sales FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
  EXECUTE FUNCTION public.generate_invoice_number();

-- Stock decrease trigger
CREATE OR REPLACE FUNCTION public.decrease_stock_on_sale()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.products SET stock_quantity = stock_quantity - NEW.quantity, updated_at = now() WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER decrease_stock_trigger
  AFTER INSERT ON public.sale_items FOR EACH ROW
  EXECUTE FUNCTION public.decrease_stock_on_sale();

-- Timestamps triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_boutiques_updated_at BEFORE UPDATE ON public.boutiques FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Seed countries
INSERT INTO public.countries (name, code, currency) VALUES
  ('Côte d''Ivoire', 'CI', 'XOF'),
  ('Sénégal', 'SN', 'XOF'),
  ('Cameroun', 'CM', 'XAF'),
  ('Congo RDC', 'CD', 'CDF'),
  ('Mali', 'ML', 'XOF'),
  ('Burkina Faso', 'BF', 'XOF');

-- Seed categories
INSERT INTO public.categories (name) VALUES
  ('Robes'), ('Chemises'), ('Pantalons'), ('Jupes'), ('Accessoires'), ('Chaussures'), ('Sacs');
