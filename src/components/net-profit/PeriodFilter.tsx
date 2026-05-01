import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays } from "lucide-react";
import type { PeriodKey } from "@/hooks/useNetProfit";

const PERIODS: { value: PeriodKey; label: string }[] = [
  { value: "day", label: "Journalier" },
  { value: "week", label: "7 jours" },
  { value: "month", label: "30 jours" },
  { value: "quarter", label: "Trimestriel" },
  { value: "60days", label: "60 jours" },
  { value: "90days", label: "90 jours" },
  { value: "year", label: "Annuel" },
  { value: "all", label: "Tout" },
];

export function PeriodFilter({ value, onChange }: { value: PeriodKey; onChange: (v: PeriodKey) => void }) {
  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={(v) => onChange(v as PeriodKey)}>
        <SelectTrigger className="w-[160px] h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p.value} value={p.value} className="text-xs">
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
