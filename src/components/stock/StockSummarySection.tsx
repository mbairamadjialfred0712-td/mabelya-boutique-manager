import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, TrendingDown, CalendarDays, Globe, Store } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStockSummary, type StockPeriodKey } from "@/hooks/useStockSummary";
import { Skeleton } from "@/components/ui/skeleton";

const PERIODS: { value: StockPeriodKey; label: string }[] = [
  { value: "day", label: "Aujourd'hui" },
  { value: "week", label: "7 jours" },
  { value: "month", label: "30 jours" },
  { value: "quarter", label: "Trimestriel" },
  { value: "60days", label: "60 jours" },
  { value: "90days", label: "90 jours" },
  { value: "year", label: "Annuel" },
  { value: "all", label: "Tout" },
];

interface StockSummarySectionProps {
  countryId?: string | null;
  boutiqueId?: string | null;
  countries?: { id: string; name: string }[];
  boutiques?: { id: string; name: string; country_id?: string }[];
  showFilters?: boolean;
}

export function StockSummarySection({ countryId: externalCountryId, boutiqueId: externalBoutiqueId, countries, boutiques, showFilters = true }: StockSummarySectionProps) {
  const [period, setPeriod] = useState<StockPeriodKey>("month");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterBoutique, setFilterBoutique] = useState<string>("all");

  const effectiveCountry = externalCountryId || (filterCountry !== "all" ? filterCountry : undefined);
  const effectiveBoutique = externalBoutiqueId || (filterBoutique !== "all" ? filterBoutique : undefined);

  const { data, isLoading } = useStockSummary(period, effectiveCountry, effectiveBoutique);

  const filteredBoutiques = boutiques?.filter(b => filterCountry === "all" || (b as any).country_id === filterCountry);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-2xl" />;
  if (!data) return null;

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Package className="h-4 w-4" /> Stock Général
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {showFilters && countries && (
              <>
                <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterBoutique("all"); }}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue placeholder="Pays" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous pays</SelectItem>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterBoutique} onValueChange={setFilterBoutique}>
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Boutique" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {filteredBoutiques?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </>
            )}
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              <Select value={period} onValueChange={(v) => setPeriod(v as StockPeriodKey)}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map(p => <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-primary/10 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Stock Total</p>
            <p className="text-xl font-display font-bold text-primary">{data.totalStock.toLocaleString("fr-FR")}</p>
            <p className="text-[10px] text-muted-foreground">{data.totalProducts} articles</p>
          </div>
          <div className="rounded-xl bg-destructive/10 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Stock Vendu</p>
            <p className="text-xl font-display font-bold text-destructive">{data.totalSold.toLocaleString("fr-FR")}</p>
            <p className="text-[10px] text-muted-foreground">unités vendues</p>
          </div>
          <div className="rounded-xl bg-[hsl(152,55%,45%)]/10 p-3 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Stock Restant</p>
            <p className="text-xl font-display font-bold text-[hsl(152,55%,45%)]">{data.totalStock.toLocaleString("fr-FR")}</p>
            <p className="text-[10px] text-muted-foreground">en inventaire</p>
          </div>
        </div>

        {/* Breakdown tabs */}
        <Tabs defaultValue="country" className="w-full">
          <TabsList className="h-8">
            <TabsTrigger value="country" className="text-xs gap-1 px-3 h-7">
              <Globe className="h-3 w-3" /> Par Pays
            </TabsTrigger>
            <TabsTrigger value="boutique" className="text-xs gap-1 px-3 h-7">
              <Store className="h-3 w-3" /> Par Boutique
            </TabsTrigger>
          </TabsList>
          <TabsContent value="country" className="mt-3">
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-semibold">Pays</TableHead>
                    <TableHead className="text-xs text-right">Articles</TableHead>
                    <TableHead className="text-xs text-right">Stock</TableHead>
                    <TableHead className="text-xs text-right">Vendu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byCountry.length > 0 ? data.byCountry.map(c => (
                    <TableRow key={c.name}>
                      <TableCell className="text-sm font-medium">{c.name}</TableCell>
                      <TableCell className="text-sm text-right">{c.products}</TableCell>
                      <TableCell className="text-sm text-right">
                        <Badge variant="secondary">{c.stock.toLocaleString("fr-FR")}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        <Badge variant={c.sold > 0 ? "destructive" : "outline"}>{c.sold.toLocaleString("fr-FR")}</Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground text-sm">Aucune donnée</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          <TabsContent value="boutique" className="mt-3">
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-semibold">Boutique</TableHead>
                    <TableHead className="text-xs">Pays</TableHead>
                    <TableHead className="text-xs text-right">Articles</TableHead>
                    <TableHead className="text-xs text-right">Stock</TableHead>
                    <TableHead className="text-xs text-right">Vendu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byBoutique.length > 0 ? data.byBoutique.map(b => (
                    <TableRow key={b.name}>
                      <TableCell className="text-sm font-medium">{b.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{b.country}</TableCell>
                      <TableCell className="text-sm text-right">{b.products}</TableCell>
                      <TableCell className="text-sm text-right">
                        <Badge variant="secondary">{b.stock.toLocaleString("fr-FR")}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        <Badge variant={b.sold > 0 ? "destructive" : "outline"}>{b.sold.toLocaleString("fr-FR")}</Badge>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-sm">Aucune donnée</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
