import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, Globe, Store } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { useNetProfit } from "@/hooks/useNetProfit";
import { Skeleton } from "@/components/ui/skeleton";

export function NetProfitSection() {
  const { data, isLoading } = useNetProfit();

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { global, byCountry, byBoutique } = data;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          Bénéfice Net — Vue Financière
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Global summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryCard label="CA Mensuel" value={global.revenueMonth} />
          <SummaryCard label="CA Annuel" value={global.revenueYear} />
          <SummaryCard label="Bénéfice Mensuel" value={global.profitMonth} isProfit />
          <SummaryCard label="Bénéfice Annuel" value={global.profitYear} isProfit />
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="country" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="country" className="flex items-center gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5" /> Par Pays
            </TabsTrigger>
            <TabsTrigger value="boutique" className="flex items-center gap-1.5 text-xs">
              <Store className="h-3.5 w-3.5" /> Par Boutique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="country" className="mt-3">
            <ProfitTable rows={byCountry} />
          </TabsContent>
          <TabsContent value="boutique" className="mt-3">
            <ProfitTable rows={byBoutique} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function SummaryCard({ label, value, isProfit }: { label: string; value: number; isProfit?: boolean }) {
  const isPositive = value >= 0;
  return (
    <Card className={isProfit ? (isPositive ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5") : ""}>
      <CardContent className="pt-3 pb-2 px-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-1.5 mt-1">
          {isProfit && (isPositive ? <TrendingUp className="h-3.5 w-3.5 text-green-500" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />)}
          <p className={`text-lg font-display font-bold ${isProfit ? (isPositive ? "text-green-600" : "text-destructive") : ""}`}>
            {formatCurrency(value)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProfitRow {
  label: string;
  revenueMonth: number;
  revenueYear: number;
  expensesMonth: number;
  salariesMonth: number;
  adsMonth: number;
  profitMonth: number;
  profitYear: number;
}

function ProfitTable({ rows }: { rows: ProfitRow[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée</p>;

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="text-xs font-semibold">Nom</TableHead>
            <TableHead className="text-xs text-right">CA Mois</TableHead>
            <TableHead className="text-xs text-right hidden sm:table-cell">Dépenses</TableHead>
            <TableHead className="text-xs text-right hidden sm:table-cell">Salaires</TableHead>
            <TableHead className="text-xs text-right hidden md:table-cell">Ads</TableHead>
            <TableHead className="text-xs text-right">Bénéfice Mois</TableHead>
            <TableHead className="text-xs text-right">Bénéfice An</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell className="text-sm font-medium">{r.label}</TableCell>
              <TableCell className="text-sm text-right">{formatCurrency(r.revenueMonth)}</TableCell>
              <TableCell className="text-sm text-right hidden sm:table-cell">{formatCurrency(r.expensesMonth)}</TableCell>
              <TableCell className="text-sm text-right hidden sm:table-cell">{formatCurrency(r.salariesMonth)}</TableCell>
              <TableCell className="text-sm text-right hidden md:table-cell">{formatCurrency(r.adsMonth)}</TableCell>
              <TableCell className="text-right">
                <Badge variant={r.profitMonth >= 0 ? "default" : "destructive"} className={`text-xs ${r.profitMonth >= 0 ? "bg-green-600 hover:bg-green-700" : ""}`}>
                  {formatCurrency(r.profitMonth)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Badge variant={r.profitYear >= 0 ? "default" : "destructive"} className={`text-xs ${r.profitYear >= 0 ? "bg-green-600 hover:bg-green-700" : ""}`}>
                  {formatCurrency(r.profitYear)}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
