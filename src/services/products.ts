import { supabase } from "@/integrations/supabase/client";

export async function fetchTotalProducts(countryId?: string | null) {
  let query = supabase.from("products").select("stock_quantity, boutiques!inner(country_id)");
  if (countryId) query = query.eq("boutiques.country_id", countryId);
  const { data, error } = await query;
  if (error) throw error;
  return data?.reduce((sum, p) => sum + p.stock_quantity, 0) ?? 0;
}

export async function fetchLowStockCount(countryId?: string | null) {
  let query = supabase.from("products").select("id, boutiques!inner(country_id)").lt("stock_quantity", 5);
  if (countryId) query = query.eq("boutiques.country_id", countryId);
  const { data, error } = await query;
  if (error) throw error;
  return data?.length ?? 0;
}
