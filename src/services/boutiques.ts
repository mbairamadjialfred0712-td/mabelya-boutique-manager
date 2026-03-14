import { supabase } from "@/integrations/supabase/client";

export async function fetchBoutiques() {
  const { data, error } = await supabase
    .from("boutiques")
    .select("*, countries(name, code, currency)")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export async function fetchCountries() {
  const { data, error } = await supabase.from("countries").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}
