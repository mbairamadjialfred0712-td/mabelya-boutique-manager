import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";

interface TopProductsChartProps {
  topProducts: { name: string; total: number }[];
}

export function TopProductsChart({ topProducts }: TopProductsChartProps) {
  const navigate = useNavigate();

  return (
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
        {topProducts.length > 0 ? (
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
  );
}

interface RevenueByCountryChartProps {
  data: { name: string; revenue: number }[];
}

export function RevenueByCountryChart({ data }: RevenueByCountryChartProps) {
  return (
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
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data}>
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
  );
}
