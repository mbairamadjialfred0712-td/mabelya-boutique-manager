import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);

  const { data: salesData } = useQuery({
    queryKey: ["report-sales", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("total_amount, created_at, boutiques(name, countries(name))")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");
      return data ?? [];
    },
  });

  const { data: topProductsData } = useQuery({
    queryKey: ["report-top-products", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("sale_items")
        .select("product_id, quantity, total_price, products(name)")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");
      if (!data) return [];
      const grouped: Record<string, { name: string; qty: number; revenue: number }> = {};
      data.forEach((item) => {
        const name = (item.products as any)?.name ?? "Inconnu";
        if (!grouped[item.product_id]) grouped[item.product_id] = { name, qty: 0, revenue: 0 };
        grouped[item.product_id].qty += item.quantity;
        grouped[item.product_id].revenue += Number(item.total_price);
      });
      return Object.values(grouped).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
    },
  });

  // Group by country
  const byCountry: Record<string, { sales: number; revenue: number }> = {};
  salesData?.forEach((s) => {
    const country = (s.boutiques as any)?.countries?.name ?? "Autre";
    if (!byCountry[country]) byCountry[country] = { sales: 0, revenue: 0 };
    byCountry[country].sales += 1;
    byCountry[country].revenue += Number(s.total_amount);
  });
  const countryData = Object.entries(byCountry).map(([name, d]) => ({ name, ...d }));

  // Group by day
  const byDay: Record<string, number> = {};
  salesData?.forEach((s) => {
    const day = s.created_at.split("T")[0];
    byDay[day] = (byDay[day] ?? 0) + Number(s.total_amount);
  });
  const dailyData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({
      date: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      revenue,
    }));

  const totalRevenue = salesData?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Rapports</h1>
        <p className="text-muted-foreground text-sm">Analyse de vos performances</p>
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <Label>Du</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-2">
          <Label>Au</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <Badge variant="secondary" className="h-9 px-4">
          Total: {formatCurrency(totalRevenue)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Évolution des ventes</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Ventes par pays</CardTitle>
          </CardHeader>
          <CardContent>
            {countryData.length > 0 ? (
              <div className="space-y-3">
                {countryData.sort((a, b) => b.revenue - a.revenue).map((c) => (
                  <div key={c.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.sales} vente{c.sales > 1 ? "s" : ""}</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(c.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display">Top produits</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="text-right">Quantité vendue</TableHead>
                <TableHead className="text-right">Chiffre d'affaires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topProductsData && topProductsData.length > 0 ? (
                topProductsData.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant="secondary">{i + 1}</Badge></TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.qty}</TableCell>
                    <TableCell className="text-right">{formatCurrency(p.revenue)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucune donnée</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
