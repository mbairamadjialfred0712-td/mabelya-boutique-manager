
-- Delete countries that are not TG, CI, or GA
-- First delete dependent data (boutiques will cascade to products, sales, etc.)
DELETE FROM public.countries WHERE code NOT IN ('TG', 'CI', 'GA');
