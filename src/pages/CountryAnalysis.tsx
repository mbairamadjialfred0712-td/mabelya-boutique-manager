import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, TrendingUp, Package, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { StockSummarySection } from "@/components/stock/StockSummarySection";

export default function CountryAnalysis() {
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: boutiques } = useQuery({
    queryKey: ["boutiques-with-countries"],
    queryFn: async () => {
      const { data } = await supabase.from("boutiques").select("*, countries(name, code, currency)");
      return data ?? [];
    },
  });

  const { data: salesByCountry } = useQuery({
    queryKey: ["sales-by-country"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("total_amount, boutiques(country_id, countries(name, code))").gte("created_at", monthStart);
      if (!data) return [];
      const grouped: Record<string, { name: string; code: string; revenue: number; count: number }> = {};
      data.forEach((s) => {
        const country = (s.boutiques as any)?.countries;
        if (!country) return;
        if (!grouped[country.code]) grouped[country.code] = { name: country.name, code: country.code, revenue: 0, count: 0 };
        grouped[country.code].revenue += Number(s.total_amount);
        grouped[country.code].count++;
      });
      return Object.values(grouped);
    },
  });

  const { data: productsByCountry } = useQuery({
    queryKey: ["products-by-country"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("stock_quantity, boutiques(country_id, countries(name, code))");
      if (!data) return [];
      const grouped: Record<string, { name: string; code: string; stock: number; count: number }> = {};
      data.forEach((p) => {
        const country = (p.boutiques as any)?.countries;
        if (!country) return;
        if (!grouped[country.code]) grouped[country.code] = { name: country.name, code: country.code, stock: 0, count: 0 };
        grouped[country.code].stock += p.stock_quantity;
        grouped[country.code].count++;
      });
      return Object.values(grouped);
    },
  });

  const { data: staffByCountry } = useQuery({
    queryKey: ["staff-by-country"],
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("id, is_active, boutiques(countries(name, code))");
      if (!data) return [];
      const grouped: Record<string, { name: string; code: string; total: number; active: number }> = {};
      data.forEach((s) => {
        const country = (s.boutiques as any)?.countries;
        if (!country) return;
        if (!grouped[country.code]) grouped[country.code] = { name: country.name, code: country.code, total: 0, active: 0 };
        grouped[country.code].total++;
        if (s.is_active) grouped[country.code].active++;
      });
      return Object.values(grouped);
    },
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(val) + " FCFA";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Analyse par Pays</h1>
        <p className="text-sm text-muted-foreground">Analyses spécifiques par pays</p>
      </div>

      {/* Country Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {countries?.map((country) => {
          const sales = salesByCountry?.find((s) => s.code === country.code);
          const products = productsByCountry?.find((p) => p.code === country.code);
          const staff = staffByCountry?.find((s) => s.code === country.code);
          return (
            <Card key={country.id} className="rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-display">{country.name}</CardTitle>
                    <Badge variant="secondary" className="text-[10px] rounded-lg">{country.code} · {country.currency}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Revenus mois</span>
                  <span className="font-semibold">{formatCurrency(sales?.revenue ?? 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Produits</span>
                  <span className="font-semibold">{products?.count ?? 0} ({products?.stock ?? 0} unités)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Personnel</span>
                  <span className="font-semibold">{staff?.active ?? 0} actifs / {staff?.total ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base font-display">Revenus par pays ce mois</CardTitle>
        </CardHeader>
        <CardContent>
          {salesByCountry && salesByCountry.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByCountry}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée de ventes</p>
          )}
        </CardContent>
      </Card>

      {/* Stock Général */}
      <StockSummarySection
        countries={countries ?? []}
        boutiques={[]}
        showFilters={true}
      />
    </div>
  );
}
