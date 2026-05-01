import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PeriodKey = "day" | "week" | "month" | "quarter" | "60days" | "90days" | "year" | "all";

export interface ProfitRow {
  label: string;
  revenue: number;
  expenses: number;
  salaries: number;
  ads: number;
  totalCharges: number;
  profit: number;
  margin: number;
}

export interface ProductProfitRow {
  name: string;
  quantitySold: number;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  margin: number;
}

function getDateFrom(period: PeriodKey): string | null {
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

export function useNetProfit(period: PeriodKey = "all") {
  return useQuery({
    queryKey: ["net-profit-all", period],
    queryFn: async () => {
      const dateFrom = getDateFrom(period);

      // Build queries with optional date filter
      let salesQ = supabase.from("sales").select("total_amount, boutique_id, created_at, boutiques(name, country_id, countries(name))");
      let expensesQ = supabase.from("expenses").select("amount, boutique_id, expense_date, boutiques(name, country_id, countries(name))");
      let staffQ = supabase.from("staff").select("salary, boutique_id, is_active, boutiques(name, country_id, countries(name))").eq("is_active", true);
      let adsQ = supabase.from("ad_campaigns").select("spent, budget, boutique_id, start_date, boutiques(name, country_id, countries(name))");
      let saleItemsQ = supabase.from("sale_items").select("quantity, unit_price, total_price, product_id, sale_id, products(name, purchase_price), sales!inner(created_at)");

      if (dateFrom) {
        salesQ = salesQ.gte("created_at", dateFrom);
        expensesQ = expensesQ.gte("expense_date", dateFrom.split("T")[0]);
        adsQ = adsQ.gte("start_date", dateFrom.split("T")[0]);
        saleItemsQ = saleItemsQ.gte("sales.created_at", dateFrom);
      }

      const [salesRes, expensesRes, staffRes, adsRes, boutiquesRes, saleItemsRes] = await Promise.all([
        salesQ,
        expensesQ,
        staffQ,
        adsQ,
        supabase.from("boutiques").select("id, name, country_id, countries(name)"),
        saleItemsQ,
      ]);

      const sales = salesRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const staffList = staffRes.data ?? [];
      const ads = adsRes.data ?? [];
      const boutiques = boutiquesRes.data ?? [];
      const saleItems = saleItemsRes.data ?? [];

      // Boutique aggregation
      const boutiqueMap: Record<string, {
        name: string; country: string;
        rev: number; exp: number; sal: number; ads: number;
      }> = {};

      for (const b of boutiques) {
        const country = (b.countries as any)?.name ?? "Autre";
        boutiqueMap[b.id] = { name: b.name, country, rev: 0, exp: 0, sal: 0, ads: 0 };
      }

      for (const s of sales) {
        const bm = boutiqueMap[s.boutique_id];
        if (bm) bm.rev += Number(s.total_amount);
      }
      for (const e of expenses) {
        const bm = boutiqueMap[e.boutique_id];
        if (bm) bm.exp += Number(e.amount);
      }
      for (const st of staffList) {
        const bm = boutiqueMap[st.boutique_id];
        if (bm) bm.sal += Number(st.salary);
      }
      for (const a of ads) {
        const bm = boutiqueMap[a.boutique_id];
        if (bm) {
          const spent = Number(a.spent);
          const budget = Number((a as any).budget ?? 0);
          bm.ads += spent > 0 ? spent : budget;
        }
      }

      const toRow = (label: string, rev: number, exp: number, sal: number, ad: number): ProfitRow => {
        const totalCharges = exp + sal + ad;
        const profit = rev - totalCharges;
        return {
          label, revenue: rev, expenses: exp, salaries: sal, ads: ad,
          totalCharges, profit, margin: rev > 0 ? (profit / rev) * 100 : 0,
        };
      };

      const byBoutique: ProfitRow[] = Object.values(boutiqueMap).map(b =>
        toRow(b.name, b.rev, b.exp, b.sal, b.ads)
      );

      const countryAgg: Record<string, { rev: number; exp: number; sal: number; ads: number }> = {};
      for (const b of Object.values(boutiqueMap)) {
        if (!countryAgg[b.country]) countryAgg[b.country] = { rev: 0, exp: 0, sal: 0, ads: 0 };
        const c = countryAgg[b.country];
        c.rev += b.rev; c.exp += b.exp; c.sal += b.sal; c.ads += b.ads;
      }
      const byCountry: ProfitRow[] = Object.entries(countryAgg).map(([name, c]) =>
        toRow(name, c.rev, c.exp, c.sal, c.ads)
      );

      const g = byCountry.reduce((acc, c) => ({
        rev: acc.rev + c.revenue, exp: acc.exp + c.expenses, sal: acc.sal + c.salaries, ads: acc.ads + c.ads
      }), { rev: 0, exp: 0, sal: 0, ads: 0 });
      const global = toRow("Global", g.rev, g.exp, g.sal, g.ads);

      // Product profit calculation (Bénéfice Brut Articles)
      const productAgg: Record<string, { name: string; qty: number; rev: number; cost: number }> = {};
      for (const item of saleItems) {
        const pid = item.product_id;
        const productData = item.products as any;
        const purchasePrice = Number(productData?.purchase_price ?? 0);
        const name = productData?.name ?? "Produit inconnu";
        if (!productAgg[pid]) productAgg[pid] = { name, qty: 0, rev: 0, cost: 0 };
        const p = productAgg[pid];
        p.qty += Number(item.quantity);
        p.rev += Number(item.total_price);
        p.cost += purchasePrice * Number(item.quantity);
      }

      const productProfits: ProductProfitRow[] = Object.values(productAgg)
        .map(p => ({
          name: p.name,
          quantitySold: p.qty,
          totalRevenue: p.rev,
          totalCost: p.cost,
          grossProfit: p.rev - p.cost,
          margin: p.rev > 0 ? ((p.rev - p.cost) / p.rev) * 100 : 0,
        }))
        .sort((a, b) => b.grossProfit - a.grossProfit);

      const totalGrossProfit = productProfits.reduce((s, p) => s + p.grossProfit, 0);
      const totalProductRevenue = productProfits.reduce((s, p) => s + p.totalRevenue, 0);
      const totalProductCost = productProfits.reduce((s, p) => s + p.totalCost, 0);

      return {
        global,
        byCountry,
        byBoutique,
        productProfits,
        totalGrossProfit,
        totalProductRevenue,
        totalProductCost,
      };
    },
  });
}
