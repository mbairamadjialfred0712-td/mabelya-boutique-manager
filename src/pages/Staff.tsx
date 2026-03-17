import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, UserCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import jsPDF from "jspdf";
import "jspdf-autotable";

const roles = ["Vendeur", "Caissier", "Gérant", "Styliste", "Autre"];

export default function Staff() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterBoutique, setFilterBoutique] = useState<string>("all");
  const [form, setForm] = useState({ boutique_id: "", full_name: "", role: "Vendeur", phone: "", salary: "" });

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

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("*, boutiques(name, country_id, countries(name))").order("full_name");
      return data ?? [];
    },
  });

  const addStaff = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("staff").insert({ ...form, salary: parseFloat(form.salary) || 0 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      setOpen(false);
      setForm({ boutique_id: "", full_name: "", role: "Vendeur", phone: "", salary: "" });
      toast.success("Personnel ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const filteredBoutiques = boutiques?.filter((b) => filterCountry === "all" || (b as any).country_id === filterCountry);

  const filtered = staff?.filter((s) => {
    const matchCountry = filterCountry === "all" || (s.boutiques as any)?.country_id === filterCountry;
    const matchBoutique = filterBoutique === "all" || s.boutique_id === filterBoutique;
    return matchCountry && matchBoutique;
  });

  const totalSalaries = filtered?.reduce((sum, s) => sum + Number(s.salary), 0) ?? 0;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Personnel — Mabelya", 14, 22);
    doc.setFontSize(10);
    doc.text(`${filtered?.length ?? 0} employés — ${new Date().toLocaleDateString("fr-FR")}`, 14, 30);
    const rows = (filtered ?? []).map((s) => [
      s.full_name, s.role, formatCurrency(Number(s.salary)),
      (s.boutiques as any)?.name ?? "—", (s.boutiques as any)?.countries?.name ?? "—",
      s.phone || "—", s.is_active ? "Actif" : "Inactif",
    ]);
    (doc as any).autoTable({
      startY: 36, head: [["Nom", "Rôle", "Salaire", "Boutique", "Pays", "Téléphone", "Statut"]], body: rows,
      styles: { fontSize: 8 }, headStyles: { fillColor: [200, 50, 80] },
    });
    doc.save("personnel-mabelya.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Gestion du Personnel</h1>
          <p className="text-sm text-muted-foreground">{filtered?.length ?? 0} employés</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-4 w-4 mr-2" /> PDF</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter un employé</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Select value={form.boutique_id} onValueChange={(v) => setForm({ ...form, boutique_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Boutique" /></SelectTrigger>
                  <SelectContent>{boutiques?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Nom et prénom" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger><SelectValue placeholder="Poste" /></SelectTrigger>
                  <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
                <Input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input type="number" placeholder="Salaire (FCFA)" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
                <Button onClick={() => addStaff.mutate()} disabled={!form.boutique_id || !form.full_name} className="w-full">Enregistrer</Button>
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
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center"><UserCheck className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total employés actifs</p>
              <p className="text-xl font-bold">{filtered?.filter((s) => s.is_active).length ?? 0}</p>
            </div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-warning/10 flex items-center justify-center"><UserCheck className="h-5 w-5 text-warning" /></div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Masse salariale</p>
              <p className="text-xl font-bold">{formatCurrency(totalSalaries)}</p>
            </div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom et prénom</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Salaire</TableHead>
                <TableHead className="hidden md:table-cell">Boutique</TableHead>
                <TableHead className="hidden md:table-cell">Pays</TableHead>
                <TableHead className="hidden lg:table-cell">Téléphone</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun employé</TableCell></TableRow>
              ) : (
                filtered?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{s.role}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(s.salary))}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{(s.boutiques as any)?.name}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{(s.boutiques as any)?.countries?.name}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{s.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs border-0 ${s.is_active ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                        {s.is_active ? "Actif" : "Inactif"}
                      </Badge>
                    </TableCell>
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
