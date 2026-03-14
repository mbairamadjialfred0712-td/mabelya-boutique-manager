import { supabase } from "@/integrations/supabase/client";

export async function fetchSalesToday(countryId?: string | null) {
  const today = new Date().toISOString().split("T")[0];
  let query = supabase
    .from("sales")
    .select("total_amount, boutiques!inner(country_id)")
    .gte("created_at", today);
  if (countryId) query = query.eq("boutiques.country_id", countryId);
  const { data, error } = await query;
  if (error) throw error;
  return data?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
}

export async function fetchSalesMonth(countryId?: string | null) {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  let query = supabase
    .from("sales")
    .select("total_amount, boutiques!inner(country_id)")
    .gte("created_at", monthStart);
  if (countryId) query = query.eq("boutiques.country_id", countryId);
  const { data, error } = await query;
  if (error) throw error;
  return data?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
}

export async function fetchTopProducts() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data, error } = await supabase
    .from("sale_items")
    .select("product_id, quantity, products(name)")
    .gte("created_at", monthStart);
  if (error) throw error;
  if (!data) return [];
  const grouped: Record<string, { name: string; total: number }> = {};
  data.forEach((item) => {
    const name = (item.products as any)?.name ?? "Inconnu";
    if (!grouped[item.product_id]) grouped[item.product_id] = { name, total: 0 };
    grouped[item.product_id].total += item.quantity;
  });
  return Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 5);
}

export async function fetchRevenueByCountry() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { data, error } = await supabase
    .from("sales")
    .select("total_amount, boutiques(name, countries(name))")
    .gte("created_at", monthStart);
  if (error) throw error;
  if (!data) return [];
  const grouped: Record<string, number> = {};
  data.forEach((sale) => {
    const country = (sale.boutiques as any)?.countries?.name ?? "Autre";
    grouped[country] = (grouped[country] ?? 0) + Number(sale.total_amount);
  });
  return Object.entries(grouped).map(([name, revenue]) => ({ name, revenue }));
}
