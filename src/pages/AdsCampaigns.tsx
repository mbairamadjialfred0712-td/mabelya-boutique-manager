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
import { Plus, Megaphone } from "lucide-react";
import { toast } from "sonner";

const platforms = ["Facebook", "Instagram", "TikTok", "Google Ads"];

export default function AdsCampaigns() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ boutique_id: "", platform: "Facebook", campaign_name: "", budget: "", start_date: new Date().toISOString().split("T")[0] });

  const { data: boutiques } = useQuery({
    queryKey: ["boutiques"],
    queryFn: async () => {
      const { data } = await supabase.from("boutiques").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data } = await supabase.from("ad_campaigns").select("*, boutiques(name, countries(name))").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addCampaign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ad_campaigns").insert({ ...form, budget: parseFloat(form.budget) || 0 });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setOpen(false);
      setForm({ boutique_id: "", platform: "Facebook", campaign_name: "", budget: "", start_date: new Date().toISOString().split("T")[0] });
      toast.success("Campagne créée");
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  const totalBudget = campaigns?.reduce((sum, c) => sum + Number(c.budget), 0) ?? 0;
  const totalSpent = campaigns?.reduce((sum, c) => sum + Number(c.spent), 0) ?? 0;
  const formatCurrency = (val: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(val) + " FCFA";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Campagnes Ads</h1>
          <p className="text-sm text-muted-foreground">Budgets Facebook & Instagram</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl"><Plus className="h-4 w-4 mr-2" />Nouvelle campagne</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une campagne</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={form.boutique_id} onValueChange={(v) => setForm({ ...form, boutique_id: v })}>
                <SelectTrigger><SelectValue placeholder="Boutique" /></SelectTrigger>
                <SelectContent>{boutiques?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue placeholder="Plateforme" /></SelectTrigger>
                <SelectContent>{platforms.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Nom de la campagne" value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} />
              <Input type="number" placeholder="Budget (FCFA)" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              <Button onClick={() => addCampaign.mutate()} disabled={!form.boutique_id || !form.campaign_name || !form.budget} className="w-full rounded-xl">Créer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-2xl"><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center"><Megaphone className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Budget total</p><p className="text-xl font-bold">{formatCurrency(totalBudget)}</p></div>
          </div>
        </CardContent></Card>
        <Card className="rounded-2xl"><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center"><Megaphone className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total dépensé</p><p className="text-xl font-bold">{formatCurrency(totalSpent)}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card className="rounded-2xl"><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Campagne</TableHead><TableHead>Plateforme</TableHead><TableHead>Boutique</TableHead>
            <TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Dépensé</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : campaigns?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune campagne</TableCell></TableRow>
            ) : (
              campaigns?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.campaign_name}</TableCell>
                  <TableCell><Badge variant="secondary" className="rounded-lg text-xs">{c.platform}</Badge></TableCell>
                  <TableCell className="text-sm">{(c.boutiques as any)?.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(c.budget))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(c.spent))}</TableCell>
                  <TableCell>
                    <Badge className={`rounded-lg text-xs border-0 ${c.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {c.status === "active" ? "Active" : "Terminée"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
