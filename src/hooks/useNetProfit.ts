import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PeriodType = "mensuel" | "trimestriel" | "annuel";

export interface ProfitRow {
  label: string;
  revenue: number;
  expenses: number;
  salaries: number;
  ads: number;
  totalCharges: number;
  profit: number;
  margin: number; // percentage
}

function getPeriodRange(period: PeriodType): { start: Date; months: number } {
  const now = new Date();
  switch (period) {
    case "mensuel":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), months: 1 };
    case "trimestriel":
      return { start: new Date(now.getFullYear(), now.getMonth() - 2, 1), months: 3 };
    case "annuel":
      return { start: new Date(now.getFullYear(), 0, 1), months: now.getMonth() + 1 };
  }
}

export function useNetProfit(period: PeriodType) {
  return useQuery({
    queryKey: ["net-profit-dashboard", period],
    queryFn: async () => {
      const { start, months } = getPeriodRange(period);
      const startISO = start.toISOString();
      const startDate = startISO.split("T")[0];

      const [salesRes, expensesRes, staffRes, adsRes, boutiquesRes] = await Promise.all([
        supabase.from("sales").select("total_amount, boutique_id, created_at, boutiques(name, country_id, countries(name))").gte("created_at", startISO),
        supabase.from("expenses").select("amount, boutique_id, expense_date, boutiques(name, country_id, countries(name))").gte("expense_date", startDate),
        supabase.from("staff").select("salary, boutique_id, is_active, boutiques(name, country_id, countries(name))").eq("is_active", true),
        supabase.from("ad_campaigns").select("spent, boutique_id, created_at, boutiques(name, country_id, countries(name))").gte("created_at", startISO),
        supabase.from("boutiques").select("id, name, country_id, countries(name)"),
      ]);

      const sales = salesRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const staffList = staffRes.data ?? [];
      const ads = adsRes.data ?? [];
      const boutiques = boutiquesRes.data ?? [];

      // Build per-boutique stats
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
        if (bm) bm.sal += Number(st.salary) * months;
      }

      for (const a of ads) {
        const bm = boutiqueMap[a.boutique_id];
        if (bm) bm.ads += Number(a.spent);
      }

      const toRow = (label: string, rev: number, exp: number, sal: number, ad: number): ProfitRow => {
        const totalCharges = exp + sal + ad;
        const profit = rev - totalCharges;
        return {
          label, revenue: rev, expenses: exp, salaries: sal, ads: ad,
          totalCharges, profit, margin: rev > 0 ? (profit / rev) * 100 : 0,
        };
      };

      // By boutique
      const byBoutique: ProfitRow[] = Object.values(boutiqueMap).map(b =>
        toRow(b.name, b.rev, b.exp, b.sal, b.ads)
      );

      // By country
      const countryAgg: Record<string, { rev: number; exp: number; sal: number; ads: number }> = {};
      for (const b of Object.values(boutiqueMap)) {
        if (!countryAgg[b.country]) countryAgg[b.country] = { rev: 0, exp: 0, sal: 0, ads: 0 };
        const c = countryAgg[b.country];
        c.rev += b.rev; c.exp += b.exp; c.sal += b.sal; c.ads += b.ads;
      }
      const byCountry: ProfitRow[] = Object.entries(countryAgg).map(([name, c]) =>
        toRow(name, c.rev, c.exp, c.sal, c.ads)
      );

      // Global
      const g = byCountry.reduce((acc, c) => ({
        rev: acc.rev + c.revenue, exp: acc.exp + c.expenses, sal: acc.sal + c.salaries, ads: acc.ads + c.ads
      }), { rev: 0, exp: 0, sal: 0, ads: 0 });
      const global = toRow("Global", g.rev, g.exp, g.sal, g.ads);

      return { global, byCountry, byBoutique };
    },
  });
}
