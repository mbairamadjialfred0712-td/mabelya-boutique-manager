import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, TrendingUp, Receipt } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import { logActivity } from "@/hooks/useActivityLog";

const categories = [
  { value: "Dépenses boutique", label: "🏪 Dépenses de la boutique", description: "Frais liés au fonctionnement quotidien de la boutique" },
  { value: "Entretien boutique", label: "🔧 Entretien boutique", description: "Nettoyage, réparations, maintenance du local" },
  { value: "Transport", label: "🚗 Transport", description: "Déplacements professionnels, carburant, taxi" },
  { value: "Fournitures", label: "📦 Fournitures", description: "Emballages, sacs, papeterie, consommables" },
  { value: "Communication", label: "📱 Communication", description: "Crédit téléphone, internet, abonnements" },
  { value: "Nourriture", label: "🍽️ Nourriture", description: "Repas, eau, rafraîchissements" },
  { value: "Électricité & Eau", label: "💡 Électricité & Eau", description: "Factures d'énergie et d'eau du local" },
  { value: "Loyer", label: "🏠 Loyer", description: "Loyer mensuel du local commercial" },
  { value: "Sécurité", label: "🔒 Sécurité", description: "Gardiennage, alarmes, caméras" },
  { value: "Marketing local", label: "📢 Marketing local", description: "Flyers, affiches, signalétique" },
  { value: "Impôts & Taxes", label: "📋 Impôts & Taxes", description: "Taxes locales, patentes, licences" },
  { value: "Santé", label: "🏥 Santé", description: "Frais médicaux personnels" },
  { value: "Autre", label: "📝 Autre", description: "Toute autre dépense non catégorisée" },
];

export default function MyExpenses() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    category: "",
    description: "",
    amount: "",
    expense_date: new Date().toISOString().split("T")[0],
  });

  const selectedCat = categories.find((c) => c.value === form.category);

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
      setForm({ category: "", description: "", amount: "", expense_date: new Date().toISOString().split("T")[0] });
      toast.success("Dépense ajoutée avec succès");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const total = expenses?.reduce((s, e) => s + Number(e.amount), 0) ?? 0;
  const thisMonth = expenses
    ?.filter((e) => {
      const d = new Date(e.expense_date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, e) => s + Number(e.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Mes Dépenses</h1>
          <p className="text-sm text-muted-foreground">{expenses?.length ?? 0} dépenses enregistrées</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nouvelle dépense</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-display">Enregistrer une dépense</DialogTitle>
              <p className="text-sm text-muted-foreground">Remplissez les informations de votre dépense. Elle sera visible par l'administration.</p>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.category || !form.description || !form.amount) {
                  toast.error("Veuillez remplir tous les champs");
                  return;
                }
                addExpense.mutate();
              }}
              className="space-y-5 pt-2"
            >
              <div className="space-y-2">
                <Label className="font-semibold">Catégorie de dépense *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Choisir une catégorie..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCat && (
                  <p className="text-xs text-muted-foreground italic">{selectedCat.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Description détaillée *</Label>
                <Textarea
                  placeholder="Décrivez la dépense en détail : objet, raison, fournisseur..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="min-h-[120px] resize-y"
                  required
                />
                <p className="text-xs text-muted-foreground">Soyez précis pour faciliter le suivi administratif</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Montant (FCFA) *</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="h-11 text-lg font-medium"
                    min="0"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Date *</Label>
                  <Input
                    type="date"
                    value={form.expense_date}
                    onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                    className="h-11"
                    required
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p>⚠️ <strong>Important :</strong> Les dépenses enregistrées ne peuvent pas être modifiées ni supprimées.</p>
                <p>📋 Chaque dépense est automatiquement notifiée à l'administration.</p>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={addExpense.isPending || !form.category || !form.description || !form.amount}
              >
                {addExpense.isPending ? "Enregistrement..." : "Enregistrer la dépense"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total général</p>
              <p className="text-xl font-bold">{formatCurrency(total)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-accent/50 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Ce mois-ci</p>
              <p className="text-xl font-bold">{formatCurrency(thisMonth)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center">
              <Receipt className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Nb dépenses</p>
              <p className="text-xl font-bold">{expenses?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
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
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucune dépense enregistrée</TableCell></TableRow>
              ) : (
                expenses?.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{new Date(e.expense_date).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{e.category}</Badge></TableCell>
                    <TableCell className="text-sm max-w-[300px]">{e.description}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(Number(e.amount))}</TableCell>
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
