import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ProfitRow {
  label: string;
  revenueMonth: number;
  revenueYear: number;
  expensesMonth: number;
  expensesYear: number;
  salariesMonth: number;
  adsMonth: number;
  adsYear: number;
  profitMonth: number;
  profitYear: number;
}

export function useNetProfit() {
  return useQuery({
    queryKey: ["net-profit-dashboard"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();

      // Fetch all data in parallel
      const [salesRes, expensesRes, staffRes, adsRes, boutiquesRes] = await Promise.all([
        supabase.from("sales").select("total_amount, boutique_id, created_at, boutiques(name, country_id, countries(name))").gte("created_at", yearStart),
        supabase.from("expenses").select("amount, boutique_id, expense_date, boutiques(name, country_id, countries(name))").gte("expense_date", yearStart.split("T")[0]),
        supabase.from("staff").select("salary, boutique_id, is_active, boutiques(name, country_id, countries(name))").eq("is_active", true),
        supabase.from("ad_campaigns").select("spent, boutique_id, created_at, boutiques(name, country_id, countries(name))").gte("created_at", yearStart),
        supabase.from("boutiques").select("id, name, country_id, countries(name)"),
      ]);

      const sales = salesRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const staffList = staffRes.data ?? [];
      const ads = adsRes.data ?? [];
      const boutiques = boutiquesRes.data ?? [];

      const isThisMonth = (dateStr: string) => dateStr >= monthStart;

      // Build per-boutique stats
      const boutiqueMap: Record<string, {
        name: string; country: string;
        revM: number; revY: number;
        expM: number; expY: number;
        salM: number;
        adsM: number; adsY: number;
      }> = {};

      for (const b of boutiques) {
        const country = (b.countries as any)?.name ?? "Autre";
        boutiqueMap[b.id] = { name: b.name, country, revM: 0, revY: 0, expM: 0, expY: 0, salM: 0, adsM: 0, adsY: 0 };
      }

      for (const s of sales) {
        const bm = boutiqueMap[s.boutique_id];
        if (!bm) continue;
        const amt = Number(s.total_amount);
        bm.revY += amt;
        if (isThisMonth(s.created_at)) bm.revM += amt;
      }

      for (const e of expenses) {
        const bm = boutiqueMap[e.boutique_id];
        if (!bm) continue;
        const amt = Number(e.amount);
        bm.expY += amt;
        if (e.expense_date >= monthStart.split("T")[0]) bm.expM += amt;
      }

      for (const st of staffList) {
        const bm = boutiqueMap[st.boutique_id];
        if (!bm) continue;
        bm.salM += Number(st.salary);
      }

      for (const a of ads) {
        const bm = boutiqueMap[a.boutique_id];
        if (!bm) continue;
        const amt = Number(a.spent);
        bm.adsY += amt;
        if (isThisMonth(a.created_at)) bm.adsM += amt;
      }

      // Aggregate by boutique
      const byBoutique: ProfitRow[] = Object.values(boutiqueMap).map((b) => {
        const totalExpM = b.expM + b.salM + b.adsM;
        const totalExpY = b.expY + (b.salM * new Date().getMonth() + b.salM) + b.adsY; // approx annual salaries
        const salY = b.salM * (now.getMonth() + 1);
        return {
          label: b.name,
          revenueMonth: b.revM,
          revenueYear: b.revY,
          expensesMonth: b.expM,
          expensesYear: b.expY,
          salariesMonth: b.salM,
          adsMonth: b.adsM,
          adsYear: b.adsY,
          profitMonth: b.revM - totalExpM,
          profitYear: b.revY - (b.expY + salY + b.adsY),
        };
      });

      // Aggregate by country
      const countryMap: Record<string, ProfitRow> = {};
      for (const b of Object.values(boutiqueMap)) {
        if (!countryMap[b.country]) {
          countryMap[b.country] = { label: b.country, revenueMonth: 0, revenueYear: 0, expensesMonth: 0, expensesYear: 0, salariesMonth: 0, adsMonth: 0, adsYear: 0, profitMonth: 0, profitYear: 0 };
        }
        const c = countryMap[b.country];
        c.revenueMonth += b.revM;
        c.revenueYear += b.revY;
        c.expensesMonth += b.expM;
        c.expensesYear += b.expY;
        c.salariesMonth += b.salM;
        c.adsMonth += b.adsM;
        c.adsYear += b.adsY;
      }
      const byCountry: ProfitRow[] = Object.values(countryMap).map((c) => ({
        ...c,
        profitMonth: c.revenueMonth - (c.expensesMonth + c.salariesMonth + c.adsMonth),
        profitYear: c.revenueYear - (c.expensesYear + c.salariesMonth * (now.getMonth() + 1) + c.adsYear),
      }));

      // Global
      const global: ProfitRow = {
        label: "Global",
        revenueMonth: byCountry.reduce((s, c) => s + c.revenueMonth, 0),
        revenueYear: byCountry.reduce((s, c) => s + c.revenueYear, 0),
        expensesMonth: byCountry.reduce((s, c) => s + c.expensesMonth, 0),
        expensesYear: byCountry.reduce((s, c) => s + c.expensesYear, 0),
        salariesMonth: byCountry.reduce((s, c) => s + c.salariesMonth, 0),
        adsMonth: byCountry.reduce((s, c) => s + c.adsMonth, 0),
        adsYear: byCountry.reduce((s, c) => s + c.adsYear, 0),
        profitMonth: 0,
        profitYear: 0,
      };
      global.profitMonth = global.revenueMonth - (global.expensesMonth + global.salariesMonth + global.adsMonth);
      global.profitYear = global.revenueYear - (global.expensesYear + global.salariesMonth * (now.getMonth() + 1) + global.adsYear);

      return { global, byCountry, byBoutique };
    },
  });
}
