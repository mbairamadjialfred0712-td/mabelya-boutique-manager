import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import type { ProductProfitRow } from "@/hooks/useNetProfit";

export function ProductProfitTable({
  products, totalRevenue, totalCost, totalGrossProfit
}: {
  products: ProductProfitRow[];
  totalRevenue: number;
  totalCost: number;
  totalGrossProfit: number;
}) {
  if (!products.length) return null;

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          Bénéfice Articles (Brut)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Marge calculée sur chaque article vendu : prix de vente − prix d'achat
        </p>
      </CardHeader>
      <CardContent>
        {/* Summary row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl bg-muted/40 p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-medium">CA Articles</p>
            <p className="text-sm font-bold text-primary">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-medium">Coût d'Achat</p>
            <p className="text-sm font-bold text-destructive">{formatCurrency(totalCost)}</p>
          </div>
          <div className="rounded-xl bg-muted/40 p-3 text-center">
            <p className="text-[10px] uppercase text-muted-foreground font-medium">Bénéfice Brut</p>
            <p className={`text-sm font-bold ${totalGrossProfit >= 0 ? "text-[hsl(152,55%,45%)]" : "text-destructive"}`}>
              {formatCurrency(totalGrossProfit)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs font-semibold">Produit</TableHead>
                <TableHead className="text-xs text-right">Qté vendue</TableHead>
                <TableHead className="text-xs text-right">CA</TableHead>
                <TableHead className="text-xs text-right">Coût</TableHead>
                <TableHead className="text-xs text-right">Bénéfice</TableHead>
                <TableHead className="text-xs text-right hidden md:table-cell">Marge</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.slice(0, 20).map((p) => (
                <TableRow key={p.name}>
                  <TableCell className="text-sm font-medium">{p.name}</TableCell>
                  <TableCell className="text-sm text-right">{p.quantitySold}</TableCell>
                  <TableCell className="text-sm text-right text-primary font-medium">{formatCurrency(p.totalRevenue)}</TableCell>
                  <TableCell className="text-sm text-right">{formatCurrency(p.totalCost)}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={p.grossProfit >= 0 ? "default" : "destructive"}
                      className={`text-xs font-bold ${p.grossProfit >= 0 ? "bg-[hsl(152,55%,45%)] hover:bg-[hsl(152,55%,40%)]" : ""}`}
                    >
                      {formatCurrency(p.grossProfit)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell">
                    <span className={`text-xs font-semibold ${p.margin >= 0 ? "text-[hsl(152,55%,45%)]" : "text-destructive"}`}>
                      {p.margin.toFixed(1)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
