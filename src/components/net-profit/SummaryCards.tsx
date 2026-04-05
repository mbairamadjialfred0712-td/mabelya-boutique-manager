import { TrendingUp, TrendingDown, Wallet, CreditCard, Users, Megaphone } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import type { ProfitRow } from "@/hooks/useNetProfit";

export function SummaryCards({ global, totalGrossProfit }: { global: ProfitRow; totalGrossProfit: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
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
      <ProfitCard label="Bénéfice Brut" value={totalGrossProfit} subtitle="Marge sur articles vendus" />
      <ProfitCard label="Bénéfice Net" value={global.profit} subtitle={`Marge: ${global.margin.toFixed(1)}%`} />
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

function ProfitCard({ label, value, subtitle }: { label: string; value: number; subtitle: string }) {
  const isPositive = value >= 0;
  return (
    <div className={`rounded-2xl p-4 transition-transform hover:scale-[1.02] shadow-lg ${
      isPositive ? "bg-[hsl(152,55%,45%)] text-white" : "bg-destructive text-destructive-foreground"
    }`}>
      <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center mb-3">
        {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
      </div>
      <p className="text-[10px] uppercase tracking-wider opacity-70 font-medium">{label}</p>
      <p className="text-lg font-display font-bold mt-0.5">{formatCurrency(value)}</p>
      <p className="text-[10px] opacity-50 mt-1">{subtitle}</p>
    </div>
  );
}
