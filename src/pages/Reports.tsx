import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Download, TrendingUp, ShoppingCart, DollarSign, Package, FileSpreadsheet } from "lucide-react";
import { exportCSV } from "@/lib/exportCSV";
import { formatCurrency } from "@/lib/constants";
import jsPDF from "jspdf";
import "jspdf-autotable";

const COLORS = ["hsl(350,70%,55%)", "hsl(230,75%,55%)", "hsl(152,55%,45%)", "hsl(38,92%,50%)", "hsl(280,60%,55%)"];

export default function Reports() {
  const { user, hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");
  const isAdminBoutique = hasRole("admin_boutique");
  const isVendeur = !isSuperAdmin && !isAdminBoutique;

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterBoutique, setFilterBoutique] = useState<string>("all");

  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: boutiques } = useQuery({
    queryKey: ["boutiques"],
    queryFn: async () => {
      const { data } = await supabase.from("boutiques").select("*, countries(name)").order("name");
      return data ?? [];
    },
  });

  const { data: salesData } = useQuery({
    queryKey: ["report-sales", dateFrom, dateTo, isVendeur ? user?.id : "all"],
    queryFn: async () => {
      let query = supabase
        .from("sales")
        .select("id, total_amount, created_at, user_id, boutique_id, boutiques(name, country_id, countries(name))")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");

      // Vendeur voit uniquement ses propres ventes
      if (isVendeur && user?.id) {
        query = query.eq("user_id", user.id);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  const { data: topProductsData } = useQuery({
    queryKey: ["report-top-products", dateFrom, dateTo, isVendeur ? user?.id : "all"],
    queryFn: async () => {
      let query = supabase
        .from("sale_items")
        .select("product_id, quantity, total_price, sale_id, products(name, boutique_id, boutiques(name, country_id, countries(name)))")
        .gte("created_at", dateFrom)
        .lte("created_at", dateTo + "T23:59:59");

      const { data } = await query;
      if (!data) return [];

      // Pour le vendeur, filtrer uniquement ses sale_items via ses ventes
      let filteredData = data;
      if (isVendeur && user?.id && salesData) {
        const mySaleIds = salesData.map((s) => s.id ?? "").filter(Boolean);
        filteredData = data.filter((item) => mySaleIds.includes(item.sale_id));
      }

      const grouped: Record<string, { name: string; qty: number; revenue: number; boutique: string; country: string; country_id: string; boutique_id: string }> = {};
      filteredData.forEach((item) => {
        const prod = item.products as any;
        const name = prod?.name ?? "Inconnu";
        const boutique = prod?.boutiques?.name ?? "—";
        const country = prod?.boutiques?.countries?.name ?? "—";
        const country_id = prod?.boutiques?.country_id ?? "";
        const boutique_id = prod?.boutique_id ?? "";
        if (!grouped[item.product_id]) grouped[item.product_id] = { name, qty: 0, revenue: 0, boutique, country, country_id, boutique_id };
        grouped[item.product_id].qty += item.quantity;
        grouped[item.product_id].revenue += Number(item.total_price);
      });
      return Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
    },
    enabled: !isVendeur || !!salesData,
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data ?? [];
    },
    enabled: !isVendeur,
  });

  const filteredBoutiques = boutiques?.filter(
    (b) => filterCountry === "all" || (b as any).country_id === filterCountry
  );

  const filteredSales = salesData?.filter((s) => {
    if (isVendeur) return true; // Vendeur voit déjà uniquement ses ventes
    const matchCountry = filterCountry === "all" || (s.boutiques as any)?.country_id === filterCountry;
    const matchBoutique = filterBoutique === "all" || s.boutique_id === filterBoutique;
    return matchCountry && matchBoutique;
  });

  const filteredProducts = topProductsData?.filter((p) => {
    if (isVendeur) return true;
    const matchCountry = filterCountry === "all" || p.country_id === filterCountry;
    const matchBoutique = filterBoutique === "all" || p.boutique_id === filterBoutique;
    return matchCountry && matchBoutique;
  });

  // Groupements
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

  const byBoutique: Record<string, number> = {};
  filteredSales?.forEach((s) => {
    const b = (s.boutiques as any)?.name ?? "Autre";
    byBoutique[b] = (byBoutique[b] ?? 0) + Number(s.total_amount);
  });
  const boutiqueData = Object.entries(byBoutique)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const byCountry: Record<string, { sales: number; revenue: number }> = {};
  filteredSales?.forEach((s) => {
    const country = (s.boutiques as any)?.countries?.name ?? "Autre";
    if (!byCountry[country]) byCountry[country] = { sales: 0, revenue: 0 };
    byCountry[country].sales += 1;
    byCountry[country].revenue += Number(s.total_amount);
  });
  const countryData = Object.entries(byCountry).map(([name, d]) => ({ name, ...d }));

  const byUser: Record<string, { name: string; count: number; revenue: number }> = {};
  filteredSales?.forEach((s) => {
    const uid = s.user_id;
    const userName = profiles?.find((p) => p.user_id === uid)?.full_name ?? "Inconnu";
    if (!byUser[uid]) byUser[uid] = { name: userName, count: 0, revenue: 0 };
    byUser[uid].count += 1;
    byUser[uid].revenue += Number(s.total_amount);
  });
  const userData = Object.values(byUser).sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = filteredSales?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
  const totalSalesCount = filteredSales?.length ?? 0;
  const avgSale = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  // Top products by specific periods
  const getTopProductsByPeriod = (days: number) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffStr = cutoff.toISOString();
    // Filter sales by period, then match sale_items
    const periodSaleIds = salesData?.filter(s => s.created_at >= cutoffStr).map(s => s.id) ?? [];
    // We don't have sale_id on topProductsData, so we'll use the date range from the main query
    // Instead, let's compute from the full filtered products using dateFrom/dateTo alignment
    return filteredProducts ?? [];
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(isVendeur ? "Mon rapport — Mabelya" : "Rapport de ventes — Mabelya", 14, 22);
    doc.setFontSize(10);
    doc.text(`Période: ${dateFrom} au ${dateTo}`, 14, 30);
    doc.text(`CA: ${formatCurrency(totalRevenue)} | Ventes: ${totalSalesCount} | Panier moyen: ${formatCurrency(avgSale)}`, 14, 36);
    (doc as any).autoTable({
      startY: 44,
      head: [["#", "Produit", "Boutique", "Pays", "Qté", "CA"]],
      body: (filteredProducts ?? []).slice(0, 20).map((p, i) => [i + 1, p.name, p.boutique, p.country, p.qty, formatCurrency(p.revenue)]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 50, 80] },
    });
    if (!isVendeur) {
      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Vendeur", "Nb ventes", "CA"]],
        body: userData.map((u) => [u.name, u.count, formatCurrency(u.revenue)]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [50, 80, 200] },
      });
    }
    doc.save(`rapport-mabelya-${dateFrom}-${dateTo}.pdf`);
  };

  const exportReportCSV = () => {
    const headers = ["#", "Produit", "Boutique", "Pays", "Quantité", "CA"];
    const rows = (filteredProducts ?? []).slice(0, 50).map((p, i) => [i + 1, p.name, p.boutique, p.country, p.qty, p.revenue]);
    exportCSV(`rapport-mabelya-${dateFrom}-${dateTo}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">
            {isVendeur ? "Mon rapport" : "Rapports"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isVendeur ? "Votre activité personnelle" : "Analyse détaillée par produit, boutique, pays et vendeur"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button onClick={exportReportCSV} variant="outline" size="sm">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs">Du</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Au</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
        </div>
        {/* Filtres pays/boutique — uniquement pour admin */}
        {!isVendeur && (
          <>
            <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterBoutique("all"); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Tous pays" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous pays</SelectItem>
                {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterBoutique} onValueChange={setFilterBoutique}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Toutes boutiques" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes boutiques</SelectItem>
                {filteredBoutiques?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {isVendeur ? "Mon CA" : "Chiffre d'affaires"}
            </p>
            <p className="text-lg font-display font-bold">{formatCurrency(totalRevenue)}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {isVendeur ? "Mes ventes" : "Volume de ventes"}
            </p>
            <p className="text-lg font-display font-bold">{totalSalesCount}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Panier moyen</p>
            <p className="text-lg font-display font-bold">{formatCurrency(avgSale)}</p>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Produits vendus</p>
            <p className="text-lg font-display font-bold">{filteredProducts?.reduce((s, p) => s + p.qty, 0) ?? 0}</p>
          </div>
        </CardContent></Card>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base font-display">
            {isVendeur ? "Évolution de mes ventes" : "Évolution des ventes"}
          </CardTitle></CardHeader>
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

        {/* Répartition boutique — cachée pour vendeur */}
        {!isVendeur && (
          <Card>
            <CardHeader><CardTitle className="text-base font-display">Répartition par boutique</CardTitle></CardHeader>
            <CardContent>
              {boutiqueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={boutiqueData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {boutiqueData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Ventes par pays — cachées pour vendeur */}
      {!isVendeur && (
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
      )}

      {/* Top produits with period shortcuts */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base font-display">
              {isVendeur ? "Mes top produits vendus" : "Top produits"}
            </CardTitle>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { label: "Mensuel", days: 30 },
                { label: "Trimestriel", days: 90 },
                { label: "Annuel", days: 365 },
              ].map(({ label, days }) => {
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - days);
                const cutoffStr = cutoff.toISOString().split("T")[0];
                const isActive = dateFrom === cutoffStr;
                return (
                  <Button
                    key={label}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7 px-3"
                    onClick={() => {
                      setDateFrom(cutoffStr);
                      setDateTo(new Date().toISOString().split("T")[0]);
                    }}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Produit</TableHead>
                {!isVendeur && <TableHead className="hidden md:table-cell">Boutique</TableHead>}
                {!isVendeur && <TableHead className="hidden md:table-cell">Pays</TableHead>}
                <TableHead className="text-right">Qté</TableHead>
                <TableHead className="text-right">CA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts && filteredProducts.length > 0 ? (
                filteredProducts.slice(0, 20).map((p, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant="secondary">{i + 1}</Badge></TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    {!isVendeur && <TableCell className="hidden md:table-cell text-sm">{p.boutique}</TableCell>}
                    {!isVendeur && <TableCell className="hidden md:table-cell text-sm">{p.country}</TableCell>}
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

      {/* Rapport par vendeur — uniquement pour admin */}
      {!isVendeur && (
        <Card>
          <CardHeader><CardTitle className="text-base font-display">Rapports par vendeur</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendeur</TableHead>
                  <TableHead className="text-right">Nb ventes</TableHead>
                  <TableHead className="text-right">CA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userData.length > 0 ? (
                  userData.map((u, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-right">{u.count}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(u.revenue)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Aucune donnée</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}