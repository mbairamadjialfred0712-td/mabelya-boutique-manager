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
import { Plus, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import { logActivity } from "@/hooks/useActivityLog";

const categories = ["Transport", "Nourriture", "Communication", "Santé", "Logement", "Vêtements", "Loisirs", "Autre"];

export default function MyExpenses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: "Autre", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0] });

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["my-expenses", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_expenses")
        .select("*")
        .eq("user_id", user!.id)
        .order("expense_date", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const addExpense = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount);
      const { error } = await supabase.from("staff_expenses").insert({
        user_id: user!.id,
        category: form.category,
        description: form.description,
        amount,
        expense_date: form.expense_date,
      });
      if (error) throw error;

      await logActivity(
        "staff_expense",
        `Dépense personnelle: ${form.category} — ${form.description} — ${formatCurrency(amount)}`,
        "staff_expenses"
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-expenses"] });
      setOpen(false);
      setForm({ category: "Autre", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0] });
      toast.success("Dépense ajoutée");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const total = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Mes Dépenses</h1>
          <p className="text-sm text-muted-foreground">{expenses?.length ?? 0} dépenses enregistrées</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nouvelle dépense</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Ajouter une dépense personnelle</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input type="number" placeholder="Montant (FCFA)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              <Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
              <Button onClick={() => addExpense.mutate()} disabled={!form.description || !form.amount} className="w-full">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center"><Wallet className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total mes dépenses</p>
            <p className="text-xl font-bold">{formatCurrency(total)}</p>
          </div>
        </div>
      </CardContent></Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : expenses?.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucune dépense</TableCell></TableRow>
              ) : (
                expenses?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{new Date(e.expense_date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{e.category}</Badge></TableCell>
                    <TableCell className="text-sm">{e.description}</TableCell>
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
