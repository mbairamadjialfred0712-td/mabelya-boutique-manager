import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";

interface StatCardsProps {
  salesToday: number;
  salesMonth: number;
  totalProducts: number;
  lowStockCount: number;
}

export function StatCards({ salesToday, salesMonth, totalProducts, lowStockCount }: StatCardsProps) {
  const dailyGrowth = salesToday > 0 ? "+12.5%" : null;

  return (
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
          <p className="text-xl font-bold mt-1">{formatCurrency(salesToday)}</p>
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
          <p className="text-xl font-bold mt-1">{formatCurrency(salesMonth)}</p>
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
          <p className="text-xl font-bold mt-1">{totalProducts.toLocaleString("fr-FR")}</p>
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
          <p className="text-xl font-bold mt-1">{lowStockCount}</p>
        </CardContent>
      </Card>
    </div>
  );
}
