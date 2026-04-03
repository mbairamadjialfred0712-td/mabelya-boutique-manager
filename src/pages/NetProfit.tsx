import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, DollarSign, Globe, Store, Wallet, CreditCard, Megaphone, Users } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import { useNetProfit, type ProfitRow } from "@/hooks/useNetProfit";
import { Skeleton } from "@/components/ui/skeleton";

export default function NetProfit() {
  const { data, isLoading } = useNetProfit();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) return null;
  const { global, byCountry, byBoutique } = data;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          Bénéfice Net
        </h1>
        <p className="text-muted-foreground text-sm mt-1 ml-[52px]">
          Résultat financier global après toutes les charges (dépenses, salaires, publicité).
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard
          label="Chiffre d'Affaires"
          value={global.revenue}
          subtitle="Total des ventes"
          icon={<Wallet className="h-5 w-5" />}
          className="bg-[hsl(220,25%,12%)] text-white"
        />
        <SummaryCard
          label="Dépenses"
          value={global.expenses}
          subtitle="Loyers, factures..."
          icon={<CreditCard className="h-5 w-5" />}
          className="bg-[hsl(350,70%,55%)] text-white"
        />
        <SummaryCard
          label="Salaires"
          value={global.salaries}
          subtitle="Masse salariale / mois"
          icon={<Users className="h-5 w-5" />}
          className="bg-[hsl(230,75%,55%)] text-white"
        />
        <SummaryCard
          label="Publicité"
          value={global.ads}
          subtitle="Campagnes dépensées"
          icon={<Megaphone className="h-5 w-5" />}
          className="bg-[hsl(280,60%,50%)] text-white"
        />
        <ProfitCard profit={global.profit} margin={global.margin} />
      </div>

      {/* Breakdown tabs */}
      <Card className="border border-border/50 shadow-sm">
        <Tabs defaultValue="country" className="w-full">
          <CardHeader className="pb-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base font-display">Détail par entité</CardTitle>
              <TabsList className="h-9">
                <TabsTrigger value="global" className="text-xs gap-1.5 px-4 h-8">
                  <DollarSign className="h-3.5 w-3.5" /> Global
                </TabsTrigger>
                <TabsTrigger value="country" className="text-xs gap-1.5 px-4 h-8">
                  <Globe className="h-3.5 w-3.5" /> Par Pays
                </TabsTrigger>
                <TabsTrigger value="boutique" className="text-xs gap-1.5 px-4 h-8">
                  <Store className="h-3.5 w-3.5" /> Par Boutique
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <TabsContent value="global" className="mt-0">
              <ProfitTable rows={[global]} />
            </TabsContent>
            <TabsContent value="country" className="mt-0">
              <ProfitTable rows={byCountry} />
            </TabsContent>
            <TabsContent value="boutique" className="mt-0">
              <ProfitTable rows={byBoutique} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Explanation card */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="pt-5 pb-4">
          <h3 className="text-sm font-display font-semibold mb-2">Comment le bénéfice est calculé ?</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Wallet className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span><strong>Chiffre d'Affaires</strong> — Total de toutes les ventes enregistrées.</span>
            </div>
            <div className="flex items-start gap-2">
              <CreditCard className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
              <span><strong>Dépenses</strong> — Loyers, factures, frais divers par boutique.</span>
            </div>
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 mt-0.5 text-[hsl(230,75%,55%)] shrink-0" />
              <span><strong>Salaires</strong> — Salaire mensuel du personnel actif.</span>
            </div>
            <div className="flex items-start gap-2">
              <Megaphone className="h-4 w-4 mt-0.5 text-[hsl(280,60%,50%)] shrink-0" />
              <span><strong>Publicité</strong> — Budget dépensé sur les campagnes ads.</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 border-t pt-3">
            <strong>Bénéfice Net</strong> = Chiffre d'Affaires − (Dépenses + Salaires + Publicité)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, subtitle, icon, className }: {
  label: string; value: number; subtitle: string; icon: React.ReactNode; className: string;
}) {
  return (
    <div className={`rounded-2xl p-4 transition-transform hover:scale-[1.02] shadow-lg ${className}`}>
      <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-[10px] uppercase tracking-wider opacity-70 font-medium">{label}</p>
      <p className="text-lg font-display font-bold mt-0.5">{formatCurrency(value)}</p>
      <p className="text-[10px] opacity-50 mt-1">{subtitle}</p>
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
  if (!rows.length) return <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée disponible</p>;

  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="text-xs font-semibold">Nom</TableHead>
            <TableHead className="text-xs text-right">Chiffre d'Affaires</TableHead>
            <TableHead className="text-xs text-right">Dépenses</TableHead>
            <TableHead className="text-xs text-right">Salaires</TableHead>
            <TableHead className="text-xs text-right hidden md:table-cell">Publicité</TableHead>
            <TableHead className="text-xs text-right">Total Charges</TableHead>
            <TableHead className="text-xs text-right">Bénéfice</TableHead>
            <TableHead className="text-xs text-right hidden lg:table-cell">Marge</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.label}>
              <TableCell className="text-sm font-medium">{r.label}</TableCell>
              <TableCell className="text-sm text-right font-medium text-primary">{formatCurrency(r.revenue)}</TableCell>
              <TableCell className="text-sm text-right">{formatCurrency(r.expenses)}</TableCell>
              <TableCell className="text-sm text-right">{formatCurrency(r.salaries)}</TableCell>
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
