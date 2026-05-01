import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Receipt, Download, FileSpreadsheet } from "lucide-react";
import { exportCSV } from "@/lib/exportCSV";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import jsPDF from "jspdf";
import "jspdf-autotable";

const expenseCategories = ["Loyer", "Facture", "Transport", "Fournitures", "Salaires", "Marketing", "Wifi", "Salubrité", "Électricité", "Eau", "Autre"];

export default function Expenses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterBoutique, setFilterBoutique] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [form, setForm] = useState({ boutique_id: "", category: "Autre", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0] });

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

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data } = await supabase.from("expenses").select("*, boutiques(name, country_id, countries(name))").order("expense_date", { ascending: false });
      return data ?? [];
    },
  });

  const addExpense = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").insert({ ...form, amount: parseFloat(form.amount), user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setOpen(false);
      setForm({ boutique_id: "", category: "Autre", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0] });
      toast.success("Dépense ajoutée");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const filteredBoutiques = boutiques?.filter((b) => filterCountry === "all" || (b as any).country_id === filterCountry);

  const filtered = expenses?.filter((e) => {
    const matchCountry = filterCountry === "all" || (e.boutiques as any)?.country_id === filterCountry;
    const matchBoutique = filterBoutique === "all" || e.boutique_id === filterBoutique;
    const matchCategory = filterCategory === "all" || e.category === filterCategory;
    return matchCountry && matchBoutique && matchCategory;
  });

  const totalExpenses = filtered?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Dépenses — Mabelya", 14, 22);
    doc.setFontSize(10);
    doc.text(`Total: ${formatCurrency(totalExpenses)} — ${new Date().toLocaleDateString("fr-FR")}`, 14, 30);
    const rows = (filtered ?? []).map((e) => [
      new Date(e.expense_date).toLocaleDateString("fr-FR"),
      (e.boutiques as any)?.name ?? "—", (e.boutiques as any)?.countries?.name ?? "—",
      e.category, e.description, formatCurrency(Number(e.amount)),
    ]);
    (doc as any).autoTable({
      startY: 36, head: [["Date", "Boutique", "Pays", "Catégorie", "Description", "Montant"]], body: rows,
      styles: { fontSize: 8 }, headStyles: { fillColor: [200, 50, 80] },
    });
    doc.save("depenses-mabelya.pdf");
  };

  const exportExpenseCSV = () => {
    const headers = ["Date", "Boutique", "Pays", "Catégorie", "Description", "Montant"];
    const rows = (filtered ?? []).map((e) => [
      new Date(e.expense_date).toLocaleDateString("fr-FR"),
      (e.boutiques as any)?.name, (e.boutiques as any)?.countries?.name,
      e.category, e.description, Number(e.amount),
    ]);
    exportCSV("depenses-mabelya.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Gestion des Dépenses</h1>
          <p className="text-sm text-muted-foreground">{filtered?.length ?? 0} dépenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-4 w-4 mr-2" /> PDF</Button>
          <Button variant="outline" size="sm" onClick={exportExpenseCSV}><FileSpreadsheet className="h-4 w-4 mr-2" /> CSV</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nouvelle dépense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter une dépense</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={form.boutique_id} onValueChange={(v) => setForm({ ...form, boutique_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Boutique" /></SelectTrigger>
                  <SelectContent>{boutiques?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                  <SelectContent>{expenseCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Input type="number" placeholder="Montant (FCFA)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
                <Button onClick={() => addExpense.mutate()} disabled={!form.boutique_id || !form.description || !form.amount} className="w-full">Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterBoutique("all"); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Pays" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous pays</SelectItem>
            {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterBoutique} onValueChange={setFilterBoutique}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Boutique" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes boutiques</SelectItem>
            {filteredBoutiques?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {expenseCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card><CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center"><Receipt className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total dépenses</p>
            <p className="text-xl font-bold">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </CardContent></Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Boutique</TableHead>
                <TableHead className="hidden md:table-cell">Pays</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune dépense</TableCell></TableRow>
              ) : (
                filtered?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{new Date(e.expense_date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-sm">{(e.boutiques as any)?.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{(e.boutiques as any)?.countries?.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{e.category}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{e.description}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(e.amount))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
