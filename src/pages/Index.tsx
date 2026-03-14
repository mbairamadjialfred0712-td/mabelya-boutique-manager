import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Receipt, UserCheck, Megaphone, Globe } from "lucide-react";
import { CountryFilter } from "@/components/dashboard/CountryFilter";
import { FeatureCards } from "@/components/dashboard/FeatureCards";
import { StatCards } from "@/components/dashboard/StatCards";
import { TopProductsChart, RevenueByCountryChart } from "@/components/dashboard/DashboardCharts";
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
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const { data: countries } = useCountries();
  const { data: salesToday } = useSalesToday(selectedCountry);
  const { data: salesMonth } = useSalesMonth(selectedCountry);
  const { data: totalProducts } = useTotalProducts(selectedCountry);
  const { data: lowStockCount } = useLowStockCount(selectedCountry);
  const { data: topProducts } = useTopProducts();
  const { data: revenueByCountry } = useRevenueByCountry();

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
        <CountryFilter
          countries={countries ?? []}
          selectedCountry={selectedCountry}
          onSelect={setSelectedCountry}
        />
      </div>

      {/* Feature Cards */}
      <FeatureCards cards={featureCards} />

      {/* Stat Cards */}
      <StatCards
        salesToday={salesToday ?? 0}
        salesMonth={salesMonth ?? 0}
        totalProducts={totalProducts ?? 0}
        lowStockCount={lowStockCount ?? 0}
      />

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsChart topProducts={topProducts ?? []} />
        <RevenueByCountryChart data={revenueByCountry ?? []} />
      </div>
    </div>
  );
}
