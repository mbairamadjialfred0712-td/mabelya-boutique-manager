import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

function StatCard({ title, value, icon: Icon, description, variant = "default" }: {
  title: string; value: string; icon: any; description?: string;
  variant?: "default" | "success" | "warning" | "accent";
}) {
  const colors = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    accent: "text-accent",
  };
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
          </div>
          <div className={`h-12 w-12 rounded-xl bg-muted flex items-center justify-center ${colors[variant]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const today = new Date().toISOString().split("T")[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const { data: salesToday } = useQuery({
    queryKey: ["sales-today"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("total_amount")
        .gte("created_at", today);
      return data?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
    },
  });

  const { data: salesMonth } = useQuery({
    queryKey: ["sales-month"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("total_amount")
        .gte("created_at", monthStart);
      return data?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;
    },
  });

  const { data: lowStockProducts } = useQuery({
    queryKey: ["low-stock"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, stock_quantity, boutiques(name)")
        .lt("stock_quantity", 5)
        .order("stock_quantity");
      return data ?? [];
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ["top-products"],
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
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground text-sm">Vue d'ensemble de votre activité</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ventes aujourd'hui" value={formatCurrency(salesToday ?? 0)} icon={DollarSign} variant="success" />
        <StatCard title="Ventes ce mois" value={formatCurrency(salesMonth ?? 0)} icon={TrendingUp} variant="accent" />
        <StatCard
          title="Produits en stock faible"
          value={String(lowStockProducts?.length ?? 0)}
          icon={AlertTriangle}
          variant="warning"
          description="< 5 unités"
        />
        <StatCard title="Top produit" value={topProducts?.[0]?.name ?? "—"} icon={Package} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Revenus par pays</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByCountry && revenueByCountry.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueByCountry}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée de ventes</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display">Meilleures ventes du mois</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs font-mono">#{i + 1}</Badge>
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
      </div>

      {lowStockProducts && lowStockProducts.length > 0 && (
        <Card className="border-warning/30">
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Alertes stock faible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      — {(p.boutiques as any)?.name}
                    </span>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {p.stock_quantity} restant{p.stock_quantity > 1 ? "s" : ""}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
