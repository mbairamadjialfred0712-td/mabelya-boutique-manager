import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Download, TrendingUp, ShoppingCart, DollarSign, Package } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import jsPDF from "jspdf";
import "jspdf-autotable";

const COLORS = ["hsl(350,70%,55%)", "hsl(230,75%,55%)", "hsl(152,55%,45%)", "hsl(38,92%,50%)", "hsl(280,60%,55%)"];

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterCountry, setFilterCountry] = useState<string>("all");

  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: salesData } = useQuery({
    queryKey: ["report-sales", dateFrom, dateTo],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("total_amount, created_at, user_id, boutiques(name, country_id, countries(name))")
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
        .select("product_id, quantity, total_price, products(name, selling_price, boutique_id, boutiques(name, country_id, countries(name)))")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");
      if (!data) return [];
      const grouped: Record<string, { name: string; qty: number; revenue: number; boutique: string; country: string; country_id: string }> = {};
      data.forEach((item) => {
        const prod = item.products as any;
        const name = prod?.name ?? "Inconnu";
        const boutique = prod?.boutiques?.name ?? "—";
        const country = prod?.boutiques?.countries?.name ?? "—";
        const country_id = prod?.boutiques?.country_id ?? "";
        if (!grouped[item.product_id]) grouped[item.product_id] = { name, qty: 0, revenue: 0, boutique, country, country_id };
        grouped[item.product_id].qty += item.quantity;
        grouped[item.product_id].revenue += Number(item.total_price);
      });
      return Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
    },
  });

  const filteredSales = salesData?.filter((s) => {
    if (filterCountry === "all") return true;
    return (s.boutiques as any)?.country_id === filterCountry;
  });

  const filteredProducts = topProductsData?.filter((p) => {
    if (filterCountry === "all") return true;
    return p.country_id === filterCountry;
  });

  // Group by country
  const byCountry: Record<string, { sales: number; revenue: number }> = {};
  filteredSales?.forEach((s) => {
    const country = (s.boutiques as any)?.countries?.name ?? "Autre";
    if (!byCountry[country]) byCountry[country] = { sales: 0, revenue: 0 };
    byCountry[country].sales += 1;
    byCountry[country].revenue += Number(s.total_amount);
  });
  const countryData = Object.entries(byCountry).map(([name, d]) => ({ name, ...d }));

  // Group by day
  const byDay: Record<string, number> = {};
  filteredSales?.forEach((s) => {
    const day = s.created_at.split("T")[0];
    byDay[day] = (byDay[day] ?? 0) + Number(s.total_amount);
  });
  const dailyData = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, revenue]) => ({
      date: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      revenue,
    }));

  // Group by boutique
  const byBoutique: Record<string, number> = {};
  filteredSales?.forEach((s) => {
    const boutique = (s.boutiques as any)?.name ?? "Autre";
    byBoutique[boutique] = (byBoutique[boutique] ?? 0) + Number(s.total_amount);
  });
  const boutiqueData = Object.entries(byBoutique).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const totalRevenue = filteredSales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
  const totalSalesCount = filteredSales?.length ?? 0;
  const avgSale = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Rapport de ventes — Mabelya", 14, 22);
    doc.setFontSize(10);
    doc.text(`Période: ${dateFrom} au ${dateTo}`, 14, 30);
    doc.text(`Chiffre d'affaires: ${formatCurrency(totalRevenue)}`, 14, 36);
    doc.text(`Nombre de ventes: ${totalSalesCount}`, 14, 42);

    // Top products
    const rows = (filteredProducts ?? []).slice(0, 20).map((p, i) => [
      i + 1, p.name, p.boutique, p.country, p.qty, formatCurrency(p.revenue),
    ]);
    (doc as any).autoTable({
      startY: 50,
      head: [["#", "Produit", "Boutique", "Pays", "Qté", "CA"]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 50, 80] },
    });

    // Country summary
    const countryRows = countryData.map((c) => [c.name, c.sales, formatCurrency(c.revenue)]);
    (doc as any).autoTable({
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Pays", "Ventes", "CA"]],
      body: countryRows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [50, 80, 200] },
    });

    doc.save(`rapport-mabelya-${dateFrom}-${dateTo}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Rapports</h1>
          <p className="text-muted-foreground text-sm">Analyse détaillée de vos performances</p>
        </div>
        <Button onClick={exportPDF} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" /> Exporter PDF
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Du</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Au</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        <Select value={filterCountry} onValueChange={setFilterCountry}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Tous pays" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous pays</SelectItem>
            {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Chiffre d'affaires</p>
              <p className="text-lg font-display font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Volume de ventes</p>
              <p className="text-lg font-display font-bold">{totalSalesCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Panier moyen</p>
              <p className="text-lg font-display font-bold">{formatCurrency(avgSale)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Produits vendus</p>
              <p className="text-lg font-display font-bold">{filteredProducts?.reduce((s, p) => s + p.qty, 0) ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base font-display">Évolution des ventes</CardTitle></CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-display">Répartition par boutique</CardTitle></CardHeader>
          <CardContent>
            {boutiqueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={boutiqueData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {boutiqueData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>}
          </CardContent>
        </Card>
      </div>

      {/* Country revenue */}
      <Card>
        <CardHeader><CardTitle className="text-base font-display">Ventes par pays</CardTitle></CardHeader>
        <CardContent>
          {countryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={countryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>}
        </CardContent>
      </Card>

      {/* Top products */}
      <Card>
        <CardHeader><CardTitle className="text-base font-display">Top produits</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Produit</TableHead>
                <TableHead className="hidden md:table-cell">Boutique</TableHead>
                <TableHead className="hidden md:table-cell">Pays</TableHead>
                <TableHead className="text-right">Qté vendue</TableHead>
                <TableHead className="text-right">CA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts && filteredProducts.length > 0 ? (
                filteredProducts.slice(0, 20).map((p, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant="secondary">{i + 1}</Badge></TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.boutique}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.country}</TableCell>
                    <TableCell className="text-right">{p.qty}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(p.revenue)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune donnée</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
