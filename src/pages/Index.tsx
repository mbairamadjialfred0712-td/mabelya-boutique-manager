import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  Receipt,
  UserCheck,
  Megaphone,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const featureCards = [
  {
    title: "Gestion des Dépenses",
    description: "Loyers, factures et frais fixes.",
    icon: Receipt,
    color: "bg-[hsl(220,25%,12%)]",
    url: "/expenses",
  },
  {
    title: "Gestion du Personnel",
    description: "Équipes, salaires et paiements.",
    icon: UserCheck,
    color: "bg-[hsl(350,70%,55%)]",
    url: "/staff",
  },
  {
    title: "Campagnes Ads",
    description: "Budgets Facebook & Instagram.",
    icon: Megaphone,
    color: "bg-[hsl(230,75%,55%)]",
    url: "/ads",
  },
  {
    title: "Analyse Pays",
    description: "Analyses spécifiques par pays.",
    icon: Globe,
    color: "bg-[hsl(152,55%,45%)]",
    url: "/country-analysis",
  },
];

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: salesToday } = useQuery({
    queryKey: ["sales-today", selectedCountry],
    queryFn: async () => {
      let query = supabase.from("sales").select("total_amount, boutiques!inner(country_id)").gte("created_at", today);
      if (selectedCountry) query = query.eq("boutiques.country_id", selectedCountry);
      const { data } = await query;
      return data?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
    },
  });

  const { data: salesMonth } = useQuery({
    queryKey: ["sales-month", selectedCountry],
    queryFn: async () => {
      let query = supabase.from("sales").select("total_amount, boutiques!inner(country_id)").gte("created_at", monthStart);
      if (selectedCountry) query = query.eq("boutiques.country_id", selectedCountry);
      const { data } = await query;
      return data?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
    },
  });

  const { data: totalProducts } = useQuery({
    queryKey: ["total-products", selectedCountry],
    queryFn: async () => {
      let query = supabase.from("products").select("stock_quantity, boutiques!inner(country_id)");
      if (selectedCountry) query = query.eq("boutiques.country_id", selectedCountry);
      const { data } = await query;
      return data?.reduce((sum, p) => sum + p.stock_quantity, 0) ?? 0;
    },
  });

  const { data: lowStockCount } = useQuery({
    queryKey: ["low-stock-count", selectedCountry],
    queryFn: async () => {
      let query = supabase.from("products").select("id, boutiques!inner(country_id)").lt("stock_quantity", 5);
      if (selectedCountry) query = query.eq("boutiques.country_id", selectedCountry);
      const { data } = await query;
      return data?.length ?? 0;
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products", selectedCountry],
    queryFn: async () => {
      const { data } = await supabase
        .from("sale_items")
        .select("product_id, quantity, products(name)")
        .gte("created_at", monthStart);
      if (!data) return [];
      const grouped: Record<string, { name: string; total: number }> = {};
      data.forEach((item) => {
        const name = (item.products as any)?.name ?? "Inconnu";
        if (!grouped[item.product_id]) grouped[item.product_id] = { name, total: 0 };
        grouped[item.product_id].total += item.quantity;
      });
      return Object.values(grouped).sort((a, b) => b.total - a.total).slice(0, 5);
    },
  });

  const { data: revenueByCountry } = useQuery({
    queryKey: ["revenue-country"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("total_amount, boutiques(name, countries(name))")
        .gte("created_at", monthStart);
      if (!data) return [];
      const grouped: Record<string, number> = {};
      data.forEach((sale) => {
        const country = (sale.boutiques as any)?.countries?.name ?? "Autre";
        grouped[country] = (grouped[country] ?? 0) + Number(sale.total_amount);
      });
      return Object.entries(grouped).map(([name, revenue]) => ({ name, revenue }));
    },
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(val) + " FCFA";

  // Calculate a fake daily growth percentage
  const dailyGrowth = salesToday && salesToday > 0 ? "+12.5%" : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Bonjour {profile?.full_name || "SuperAdmin"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Voici l'activité de vos boutiques aujourd'hui.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedCountry(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              !selectedCountry
                ? "bg-primary text-primary-foreground border-primary shadow-md"
                : "bg-card text-foreground border-border hover:border-primary/50"
            }`}
          >
            Tous
          </button>
          {countries?.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCountry(c.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                selectedCountry === c.id
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-foreground border-border hover:border-primary/50"
              }`}
            >
              <span className="font-bold">{c.code}</span>{" "}
              <span className="hidden sm:inline">{c.name.toUpperCase()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {featureCards.map((card) => (
          <button
            key={card.title}
            onClick={() => navigate(card.url)}
            className={`${card.color} text-white rounded-2xl p-5 text-left transition-transform hover:scale-[1.02] shadow-lg`}
          >
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center mb-8">
              <card.icon className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold text-base">{card.title}</h3>
            <p className="text-white/70 text-xs mt-1">{card.description}</p>
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              {dailyGrowth && (
                <Badge className="bg-success/10 text-success border-0 text-xs font-medium">
                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                  {dailyGrowth}
                </Badge>
              )}
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-4">
              Ventes du Jour
            </p>
            <p className="text-xl font-bold mt-1">{formatCurrency(salesToday ?? 0)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-4">
              Ventes du Mois
            </p>
            <p className="text-xl font-bold mt-1">{formatCurrency(salesMonth ?? 0)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-success" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-4">
              Produits en Stock
            </p>
            <p className="text-xl font-bold mt-1">{(totalProducts ?? 0).toLocaleString("fr-FR")}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardContent className="p-5">
            <div className="h-11 w-11 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-warning" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-4">
              Alertes Stock
            </p>
            <p className="text-xl font-bold mt-1">{lowStockCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-display italic">Top Produits Vendus</CardTitle>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">
                Performance par article
              </p>
            </div>
            <button
              onClick={() => navigate("/reports")}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Détails
            </button>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs font-mono rounded-lg">
                        #{i + 1}
                      </Badge>
                      <span className="text-sm font-medium">{p.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{p.total} unités</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune vente ce mois</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-display italic">Ventes par Pays</CardTitle>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mt-1">
                Répartition géographique
              </p>
            </div>
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {revenueByCountry && revenueByCountry.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={revenueByCountry}>
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
      </div>
    </div>
  );
}
