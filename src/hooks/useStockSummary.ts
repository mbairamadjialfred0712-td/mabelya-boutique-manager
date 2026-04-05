import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type StockPeriodKey = "day" | "week" | "month" | "quarter" | "60days" | "90days" | "year" | "all";

function getStockDateFrom(period: StockPeriodKey): string | null {
  if (period === "all") return null;
  const now = new Date();
  const d = new Date();
  switch (period) {
    case "day": d.setDate(now.getDate() - 1); break;
    case "week": d.setDate(now.getDate() - 7); break;
    case "month": d.setMonth(now.getMonth() - 1); break;
    case "quarter": d.setMonth(now.getMonth() - 3); break;
    case "60days": d.setDate(now.getDate() - 60); break;
    case "90days": d.setDate(now.getDate() - 90); break;
    case "year": d.setFullYear(now.getFullYear() - 1); break;
  }
  return d.toISOString();
}

export interface StockSummary {
  totalStock: number;
  totalSold: number;
  totalProducts: number;
  byCountry: { name: string; stock: number; sold: number; products: number }[];
  byBoutique: { name: string; country: string; stock: number; sold: number; products: number }[];
}

export function useStockSummary(period: StockPeriodKey = "all", countryId?: string | null, boutiqueId?: string | null) {
  return useQuery({
    queryKey: ["stock-summary", period, countryId, boutiqueId],
    queryFn: async () => {
      const dateFrom = getStockDateFrom(period);

      // Fetch products with boutique info
      let productsQ = supabase.from("products").select("id, stock_quantity, boutique_id, boutiques!inner(name, country_id, countries(name))").eq("is_archived", false);
      if (countryId) productsQ = productsQ.eq("boutiques.country_id", countryId);
      if (boutiqueId) productsQ = productsQ.eq("boutique_id", boutiqueId);

      // Fetch sold quantities
      let saleItemsQ = supabase.from("sale_items").select("quantity, product_id, sales!inner(created_at, boutique_id, boutiques(country_id, name, countries(name)))");
      if (dateFrom) saleItemsQ = saleItemsQ.gte("sales.created_at", dateFrom);

      const [productsRes, saleItemsRes] = await Promise.all([productsQ, saleItemsQ]);
      const products = productsRes.data ?? [];
      const saleItems = saleItemsRes.data ?? [];

      // Build boutique map for stock
      const boutiqueMap: Record<string, { name: string; country: string; countryId: string; stock: number; sold: number; products: number }> = {};

      for (const p of products) {
        const b = p.boutiques as any;
        const bid = p.boutique_id;
        if (!boutiqueMap[bid]) {
          boutiqueMap[bid] = { name: b?.name ?? "", country: b?.countries?.name ?? "", countryId: b?.country_id ?? "", stock: 0, sold: 0, products: 0 };
        }
        boutiqueMap[bid].stock += p.stock_quantity;
        boutiqueMap[bid].products++;
      }

      // Add sold quantities
      for (const item of saleItems) {
        const sale = item.sales as any;
        const bid = sale?.boutique_id;
        if (!bid) continue;
        // Filter by country/boutique if needed
        if (countryId && sale?.boutiques?.country_id !== countryId) continue;
        if (boutiqueId && bid !== boutiqueId) continue;
        if (!boutiqueMap[bid]) {
          boutiqueMap[bid] = { name: sale?.boutiques?.name ?? "", country: sale?.boutiques?.countries?.name ?? "", countryId: sale?.boutiques?.country_id ?? "", stock: 0, sold: 0, products: 0 };
        }
        boutiqueMap[bid].sold += Number(item.quantity);
      }

      // Aggregate by country
      const countryAgg: Record<string, { name: string; stock: number; sold: number; products: number }> = {};
      for (const b of Object.values(boutiqueMap)) {
        if (!countryAgg[b.country]) countryAgg[b.country] = { name: b.country, stock: 0, sold: 0, products: 0 };
        countryAgg[b.country].stock += b.stock;
        countryAgg[b.country].sold += b.sold;
        countryAgg[b.country].products += b.products;
      }

      const byCountry = Object.values(countryAgg);
      const byBoutique = Object.values(boutiqueMap).map(b => ({ name: b.name, country: b.country, stock: b.stock, sold: b.sold, products: b.products }));
      const totalStock = byCountry.reduce((s, c) => s + c.stock, 0);
      const totalSold = byCountry.reduce((s, c) => s + c.sold, 0);
      const totalProducts = byCountry.reduce((s, c) => s + c.products, 0);

      return { totalStock, totalSold, totalProducts, byCountry, byBoutique } as StockSummary;
    },
  });
}
