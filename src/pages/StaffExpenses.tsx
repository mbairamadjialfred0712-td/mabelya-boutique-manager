import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Wallet, Search, Download, Users } from "lucide-react";
import { formatCurrency } from "@/lib/constants";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function StaffExpenses() {
  const [filterCountry, setFilterCountry] = useState("all");
  const [filterBoutique, setFilterBoutique] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [search, setSearch] = useState("");

  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: boutiques } = useQuery({
    queryKey: ["boutiques"],
    queryFn: async () => {
      const { data } = await supabase.from("boutiques").select("*, countries(name)").order("name");
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data ?? [];
    },
  });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["all-staff-expenses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_expenses")
        .select("*")
        .order("expense_date", { ascending: false });
      return data ?? [];
    },
  });

  const filteredBoutiques = boutiques?.filter(
    (b) => filterCountry === "all" || b.country_id === filterCountry
  );

  const filtered = expenses?.filter((e) => {
    const profile = profiles?.find((p) => p.user_id === e.user_id);
    const boutique = boutiques?.find((b) => b.id === e.boutique_id);

    const matchCountry = filterCountry === "all" || boutique?.country_id === filterCountry;
    const matchBoutique = filterBoutique === "all" || e.boutique_id === filterBoutique;
    const matchUser = filterUser === "all" || e.user_id === filterUser;
    const matchSearch =
      !search ||
      (profile?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase());

    return matchCountry && matchBoutique && matchUser && matchSearch;
  });

  const total = filtered?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  // Group by user for summary
  const byUser = filtered?.reduce((acc, e) => {
    const name = profiles?.find((p) => p.user_id === e.user_id)?.full_name || "Inconnu";
    acc[name] = (acc[name] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const uniqueUsers = [...new Set(expenses?.map((e) => e.user_id))].map((uid) => ({
    id: uid,
    name: profiles?.find((p) => p.user_id === uid)?.full_name || "Inconnu",
  }));

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Dépenses Utilisateurs — Mabelya", 14, 20);
    doc.setFontSize(9);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} | Total: ${formatCurrency(total)}`, 14, 28);
    const rows = (filtered ?? []).map((e) => {
      const profile = profiles?.find((p) => p.user_id === e.user_id);
      const boutique = boutiques?.find((b) => b.id === e.boutique_id);
      return [
        new Date(e.expense_date).toLocaleDateString("fr-FR"),
        profile?.full_name || "—",
        boutique?.name || "—",
        e.category,
        e.description,
        formatCurrency(Number(e.amount)),
      ];
    });
    (doc as any).autoTable({
      startY: 34,
      head: [["Date", "Utilisateur", "Boutique", "Catégorie", "Description", "Montant"]],
      body: rows,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [200, 50, 80] },
    });
    doc.save("depenses-utilisateurs-mabelya.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Dépenses Utilisateurs</h1>
          <p className="text-sm text-muted-foreground">{filtered?.length ?? 0} dépenses enregistrées par le personnel</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportPDF}>
          <Download className="h-4 w-4 mr-2" /> PDF
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total dépenses</p>
              <p className="text-lg font-bold">{formatCurrency(total)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/50 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Utilisateurs actifs</p>
              <p className="text-lg font-bold">{Object.keys(byUser ?? {}).length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Top dépensiers</p>
            <div className="space-y-1">
              {Object.entries(byUser ?? {})
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
                .map(([name, amount]) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span className="truncate">{name}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterBoutique("all"); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Pays" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pays</SelectItem>
            {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterBoutique} onValueChange={setFilterBoutique}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Boutique" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les boutiques</SelectItem>
            {filteredBoutiques?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Utilisateur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            {uniqueUsers.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead className="hidden md:table-cell">Boutique</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="hidden lg:table-cell">Description</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune dépense trouvée</TableCell></TableRow>
              ) : (
                filtered?.map((e) => {
                  const profile = profiles?.find((p) => p.user_id === e.user_id);
                  const boutique = boutiques?.find((b) => b.id === e.boutique_id);
                  return (
                    <TableRow key={e.id}>
                      <TableCell className="text-sm">{new Date(e.expense_date).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">{(profile?.full_name || "?")[0].toUpperCase()}</span>
                          </div>
                          <span className="text-sm font-medium">{profile?.full_name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{boutique?.name || "—"}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{e.category}</Badge></TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">{e.description}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(Number(e.amount))}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
