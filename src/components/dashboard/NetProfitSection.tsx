import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, Globe, Store, Calendar, Wallet, CreditCard, Megaphone, Users } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { useNetProfit, type PeriodType, type ProfitRow } from "@/hooks/useNetProfit";
import { Skeleton } from "@/components/ui/skeleton";

const periodLabels: Record<PeriodType, string> = {
  mensuel: "Mensuel",
  trimestriel: "Trimestriel",
  annuel: "Annuel",
};

export function NetProfitSection() {
  const [period, setPeriod] = useState<PeriodType>("mensuel");
  const { data, isLoading } = useNetProfit(period);

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const { global, byCountry, byBoutique } = data;

  return (
    <div className="space-y-5">
      {/* Header with period selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-display font-bold text-foreground">Bénéfice Net</h2>
            <p className="text-xs text-muted-foreground">Résultat après toutes les charges</p>
          </div>
        </div>
        <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl">
          {(["mensuel", "trimestriel", "annuel"] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                period === p
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-background"
              }`}
            >
              <Calendar className="h-3 w-3 inline mr-1.5" />
              {periodLabels[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards - colorful like feature cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SummaryCard
          label="Chiffre d'Affaires"
          value={global.revenue}
          icon={<Wallet className="h-5 w-5" />}
          className="bg-[hsl(220,25%,12%)] text-white"
          iconBg="bg-white/15"
        />
        <SummaryCard
          label="Dépenses"
          value={global.expenses}
          icon={<CreditCard className="h-5 w-5" />}
          className="bg-[hsl(350,70%,55%)] text-white"
          iconBg="bg-white/15"
        />
        <SummaryCard
          label="Salaires"
          value={global.salaries}
          icon={<Users className="h-5 w-5" />}
          className="bg-[hsl(230,75%,55%)] text-white"
          iconBg="bg-white/15"
        />
        <SummaryCard
          label="Publicité"
          value={global.ads}
          icon={<Megaphone className="h-5 w-5" />}
          className="bg-[hsl(280,60%,50%)] text-white"
          iconBg="bg-white/15"
        />
        <ProfitCard profit={global.profit} margin={global.margin} />
      </div>

      {/* Tabs for country / boutique breakdown */}
      <Card className="border border-border/50 shadow-sm">
        <Tabs defaultValue="country" className="w-full">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-display">Détail par entité</CardTitle>
              <TabsList className="h-8">
                <TabsTrigger value="country" className="text-xs gap-1.5 px-3 h-7">
                  <Globe className="h-3 w-3" /> Pays
                </TabsTrigger>
                <TabsTrigger value="boutique" className="text-xs gap-1.5 px-3 h-7">
                  <Store className="h-3 w-3" /> Boutiques
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <TabsContent value="country" className="mt-0">
              <ProfitTable rows={byCountry} />
            </TabsContent>
            <TabsContent value="boutique" className="mt-0">
              <ProfitTable rows={byBoutique} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, icon, className, iconBg }: {
  label: string; value: number; icon: React.ReactNode; className: string; iconBg: string;
}) {
  return (
    <div className={`rounded-2xl p-4 transition-transform hover:scale-[1.02] shadow-lg ${className}`}>
      <div className={`h-9 w-9 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-[10px] uppercase tracking-wider opacity-70 font-medium">{label}</p>
      <p className="text-lg font-display font-bold mt-0.5">{formatCurrency(value)}</p>
    </div>
  );
}

function ProfitCard({ profit, margin }: { profit: number; margin: number }) {
  const isPositive = profit >= 0;
  return (
    <div className={`rounded-2xl p-4 transition-transform hover:scale-[1.02] shadow-lg col-span-2 lg:col-span-1 ${
      isPositive ? "bg-[hsl(152,55%,45%)] text-white" : "bg-destructive text-destructive-foreground"
    }`}>
      <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center mb-3">
        {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
      </div>
      <p className="text-[10px] uppercase tracking-wider opacity-70 font-medium">Bénéfice Net</p>
      <p className="text-lg font-display font-bold mt-0.5">{formatCurrency(profit)}</p>
      <p className="text-xs opacity-80 mt-0.5">Marge: {margin.toFixed(1)}%</p>
    </div>
  );
}

function ProfitTable({ rows }: { rows: ProfitRow[] }) {
  if (!rows.length) return <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée disponible</p>;

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-xs font-semibold">Nom</TableHead>
            <TableHead className="text-xs text-right">CA</TableHead>
            <TableHead className="text-xs text-right hidden sm:table-cell">Dépenses</TableHead>
            <TableHead className="text-xs text-right hidden sm:table-cell">Salaires</TableHead>
            <TableHead className="text-xs text-right hidden md:table-cell">Ads</TableHead>
            <TableHead className="text-xs text-right">Total Charges</TableHead>
            <TableHead className="text-xs text-right">Bénéfice</TableHead>
            <TableHead className="text-xs text-right hidden lg:table-cell">Marge</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell className="text-sm font-medium">{r.label}</TableCell>
              <TableCell className="text-sm text-right font-medium">{formatCurrency(r.revenue)}</TableCell>
              <TableCell className="text-sm text-right hidden sm:table-cell">{formatCurrency(r.expenses)}</TableCell>
              <TableCell className="text-sm text-right hidden sm:table-cell">{formatCurrency(r.salaries)}</TableCell>
              <TableCell className="text-sm text-right hidden md:table-cell">{formatCurrency(r.ads)}</TableCell>
              <TableCell className="text-sm text-right text-destructive font-medium">{formatCurrency(r.totalCharges)}</TableCell>
              <TableCell className="text-right">
                <Badge
                  variant={r.profit >= 0 ? "default" : "destructive"}
                  className={`text-xs font-bold ${r.profit >= 0 ? "bg-[hsl(152,55%,45%)] hover:bg-[hsl(152,55%,40%)]" : ""}`}
                >
                  {formatCurrency(r.profit)}
                </Badge>
              </TableCell>
              <TableCell className="text-right hidden lg:table-cell">
                <span className={`text-xs font-semibold ${r.margin >= 0 ? "text-[hsl(152,55%,45%)]" : "text-destructive"}`}>
                  {r.margin.toFixed(1)}%
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
