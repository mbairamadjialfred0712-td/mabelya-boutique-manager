import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, UserCheck, Megaphone, Globe, ShoppingCart, Clock, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { StockSummarySection } from "@/components/stock/StockSummarySection";
import { CountryFilter } from "@/components/dashboard/CountryFilter";
import { FeatureCards } from "@/components/dashboard/FeatureCards";
import { StatCards } from "@/components/dashboard/StatCards";
import { TopProductsChart, RevenueByCountryChart } from "@/components/dashboard/DashboardCharts";
import { AcquisitionChannelChart } from "@/components/dashboard/AcquisitionChannelChart";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/constants";
import {
  useCountries,
  useSalesToday,
  useSalesMonth,
  useTotalProducts,
  useLowStockCount,
  useTopProducts,
  useRevenueByCountry,
} from "@/hooks/useDashboardData";

const featureCards = [
  { title: "Gestion des Dépenses", description: "Loyers, factures et frais fixes.", icon: Receipt, color: "bg-[hsl(220,25%,12%)]", url: "/expenses" },
  { title: "Gestion du Personnel", description: "Équipes, salaires et paiements.", icon: UserCheck, color: "bg-[hsl(350,70%,55%)]", url: "/staff" },
  { title: "Campagnes Ads", description: "Budgets Facebook & Instagram.", icon: Megaphone, color: "bg-[hsl(230,75%,55%)]", url: "/ads" },
  { title: "Analyse Pays", description: "Analyses spécifiques par pays.", icon: Globe, color: "bg-[hsl(152,55%,45%)]", url: "/country-analysis" },
  { title: "Bénéfice Net", description: "CA, charges et rentabilité.", icon: TrendingUp, color: "bg-[hsl(280,60%,50%)]", url: "/net-profit" },
];

export default function Dashboard() {
  const { profile, user, hasRole } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const isSuperAdmin = hasRole("super_admin");
  const isAdminBoutique = hasRole("admin_boutique");
  const isVendeur = !isSuperAdmin && !isAdminBoutique;

  // Données admin
  const { data: countries } = useCountries();
  const { data: salesToday } = useSalesToday(selectedCountry);
  const { data: salesMonth } = useSalesMonth(selectedCountry);
  const { data: totalProducts } = useTotalProducts(selectedCountry);
  const { data: lowStockCount } = useLowStockCount(selectedCountry);
  const { data: topProducts } = useTopProducts();
  const { data: revenueByCountry } = useRevenueByCountry();

  // Ventes récentes admin
  const { data: recentSales } = useQuery({
    queryKey: ["recent-sales-dashboard", isVendeur ? user?.id : "all"],
    queryFn: async () => {
      let query = supabase
        .from("sales")
        .select("id, invoice_number, total_amount, payment_method, customer_name, created_at, boutiques(name)")
        .order("created_at", { ascending: false })
        .limit(8);

      // Vendeur voit uniquement ses propres ventes
      if (isVendeur && user?.id) {
        query = query.eq("user_id", user.id);
      }

      const { data } = await query;
      return data ?? [];
    },
  });

  // Stats vendeur personnelles
  const { data: vendeurStats } = useQuery({
    queryKey: ["vendeur-stats", user?.id],
    enabled: isVendeur && !!user?.id,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const firstDayMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [todayRes, monthRes, clientsRes] = await Promise.all([
        supabase.from("sales").select("total_amount").eq("user_id", user!.id).gte("created_at", today),
        supabase.from("sales").select("total_amount").eq("user_id", user!.id).gte("created_at", firstDayMonth),
        supabase.from("clients").select("id", { count: "exact", head: true }).eq("created_by", user!.id),
      ]);

      const todayTotal = todayRes.data?.reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;
      const monthTotal = monthRes.data?.reduce((s, r) => s + Number(r.total_amount), 0) ?? 0;
      const todayCount = todayRes.data?.length ?? 0;
      const monthCount = monthRes.data?.length ?? 0;
      const clientsCount = clientsRes.count ?? 0;

      return { todayTotal, monthTotal, todayCount, monthCount, clientsCount };
    },
  });

  const { data: todaySalesCount } = useQuery({
    queryKey: ["today-sales-count", isVendeur ? user?.id : "all"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      let query = supabase.from("sales").select("id", { count: "exact", head: true }).gte("created_at", today);
      if (isVendeur && user?.id) query = query.eq("user_id", user.id);
      const { count } = await query;
      return count ?? 0;
    },
  });

  // =====================
  // DASHBOARD VENDEUR
  // =====================
  if (isVendeur) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Bonjour {profile?.full_name || "Vendeur"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Voici votre activité personnelle aujourd'hui.</p>
        </div>

        {/* Stats personnelles vendeur */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mes ventes aujourd'hui</p>
              <p className="text-2xl font-display font-bold">{vendeurStats?.todayCount ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mon CA aujourd'hui</p>
              <p className="text-2xl font-display font-bold text-primary">{formatCurrency(vendeurStats?.todayTotal ?? 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mon CA ce mois</p>
              <p className="text-2xl font-display font-bold text-primary">{formatCurrency(vendeurStats?.monthTotal ?? 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Mes clients</p>
              <p className="text-2xl font-display font-bold">{vendeurStats?.clientsCount ?? 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Raccourcis vendeur */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = "/sales"}
            className="bg-[hsl(350,70%,55%)] text-white rounded-2xl p-5 text-left transition-transform hover:scale-[1.02] shadow-lg"
          >
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center mb-4">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold text-base">Nouvelle vente</h3>
            <p className="text-white/70 text-xs mt-1">Enregistrer une vente</p>
          </button>
          <button
            onClick={() => window.location.href = "/clients"}
            className="bg-[hsl(230,75%,55%)] text-white rounded-2xl p-5 text-left transition-transform hover:scale-[1.02] shadow-lg"
          >
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center mb-4">
              <UserCheck className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold text-base">Mes clients</h3>
            <p className="text-white/70 text-xs mt-1">Gérer votre clientèle</p>
          </button>
          <button
            onClick={() => window.location.href = "/my-expenses"}
            className="bg-[hsl(220,25%,12%)] text-white rounded-2xl p-5 text-left transition-transform hover:scale-[1.02] shadow-lg"
          >
            <div className="h-10 w-10 rounded-xl bg-white/15 flex items-center justify-center mb-4">
              <Receipt className="h-5 w-5" />
            </div>
            <h3 className="font-display font-bold text-base">Mes dépenses</h3>
            <p className="text-white/70 text-xs mt-1">Déplacement, Wifi, etc.</p>
          </button>
        </div>

        {/* Dernières ventes du vendeur */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-display flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Mes dernières ventes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facture</TableHead>
                  <TableHead className="hidden md:table-cell">Client</TableHead>
                  <TableHead className="hidden md:table-cell">Boutique</TableHead>
                  <TableHead>Paiement</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="hidden lg:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSales && recentSales.length > 0 ? (
                  recentSales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-sm font-mono">{s.invoice_number}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{s.customer_name ?? "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{(s.boutiques as any)?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {s.payment_method === "cash" ? "Espèces" : s.payment_method === "mobile_money" ? "Mobile Money" : "Virement"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">{formatCurrency(Number(s.total_amount))}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Vous n'avez pas encore de ventes aujourd'hui</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // =====================
  // DASHBOARD ADMIN / SUPER ADMIN
  // =====================
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
            Bonjour {profile?.full_name || "SuperAdmin"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Voici l'activité de vos boutiques aujourd'hui.</p>
        </div>
        <CountryFilter countries={countries ?? []} selectedCountry={selectedCountry} onSelect={setSelectedCountry} />
      </div>

      <FeatureCards cards={featureCards} />
      <StatCards
        salesToday={salesToday ?? 0}
        salesMonth={salesMonth ?? 0}
        totalProducts={totalProducts ?? 0}
        lowStockCount={lowStockCount ?? 0}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ventes aujourd'hui</p>
              <p className="text-xl font-display font-bold">{todaySalesCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CA Journalier</p>
              <p className="text-xl font-display font-bold">{formatCurrency(salesToday ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
              <Clock className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CA Mensuel</p>
              <p className="text-xl font-display font-bold">{formatCurrency(salesMonth ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsChart topProducts={topProducts ?? []} />
        <RevenueByCountryChart data={revenueByCountry ?? []} />
      </div>

      <AcquisitionChannelChart />

      {/* Stock Général */}
      <StockSummarySection
        countries={countries ?? []}
        boutiques={[]}
        showFilters={true}
      />




      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" /> Dernières ventes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facture</TableHead>
                <TableHead className="hidden md:table-cell">Client</TableHead>
                <TableHead className="hidden md:table-cell">Boutique</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales && recentSales.length > 0 ? (
                recentSales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm font-mono">{s.invoice_number}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{s.customer_name ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{(s.boutiques as any)?.name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {s.payment_method === "cash" ? "Espèces" : s.payment_method === "mobile_money" ? "Mobile Money" : "Virement"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">{formatCurrency(Number(s.total_amount))}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Aucune vente récente</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}