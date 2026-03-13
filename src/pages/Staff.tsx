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
import { Plus, UserCheck } from "lucide-react";
import { toast } from "sonner";

const roles = ["Vendeur", "Caissier", "Gérant", "Styliste", "Autre"];

export default function Staff() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ boutique_id: "", full_name: "", role: "Vendeur", phone: "", salary: "" });

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
      const { data } = await supabase.from("staff").select("*, boutiques(name, countries(name))").order("full_name");
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

  const totalSalaries = staff?.reduce((sum, s) => sum + Number(s.salary), 0) ?? 0;
  const formatCurrency = (val: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(val) + " FCFA";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Gestion du Personnel</h1>
          <p className="text-sm text-muted-foreground">Équipes, salaires et paiements</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter un employé</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={form.boutique_id} onValueChange={(v) => setForm({ ...form, boutique_id: v })}>
                <SelectTrigger><SelectValue placeholder="Boutique" /></SelectTrigger>
                <SelectContent>{boutiques?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Nom complet" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue placeholder="Poste" /></SelectTrigger>
                <SelectContent>{roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input type="number" placeholder="Salaire (FCFA)" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
              <Button onClick={() => addStaff.mutate()} disabled={!form.boutique_id || !form.full_name} className="w-full rounded-xl">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total employés</p>
                <p className="text-xl font-bold">{staff?.filter(s => s.is_active).length ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-warning/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Masse salariale</p>
                <p className="text-xl font-bold">{formatCurrency(totalSalaries)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Boutique</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead className="text-right">Salaire</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : staff?.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun employé enregistré</TableCell></TableRow>
              ) : (
                staff?.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.full_name}</TableCell>
                    <TableCell className="text-sm">{(s.boutiques as any)?.name}</TableCell>
                    <TableCell><Badge variant="secondary" className="rounded-lg text-xs">{s.role}</Badge></TableCell>
                    <TableCell className="text-sm">{s.phone || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(s.salary))}</TableCell>
                    <TableCell>
                      <Badge className={`rounded-lg text-xs ${s.is_active ? "bg-success/10 text-success border-0" : "bg-muted text-muted-foreground border-0"}`}>
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
