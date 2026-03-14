import { Badge } from "@/components/ui/badge";

interface CountryFilterProps {
  countries: { id: string; code: string; name: string }[];
  selectedCountry: string | null;
  onSelect: (id: string | null) => void;
}

export function CountryFilter({ countries, selectedCountry, onSelect }: CountryFilterProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
          !selectedCountry
            ? "bg-primary text-primary-foreground border-primary shadow-md"
            : "bg-card text-foreground border-border hover:border-primary/50"
        }`}
      >
        Tous
      </button>
      {countries.map((c) => (
        <button
          key={c.id}
          onClick={() => onSelect(c.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            selectedCountry === c.id
              ? "bg-primary text-primary-foreground border-primary shadow-md"
              : "bg-card text-foreground border-border hover:border-primary/50"
          }`}
        >
          <span className="font-bold">{c.code}</span>{" "}
          <span className="hidden sm:inline">{c.name.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}
