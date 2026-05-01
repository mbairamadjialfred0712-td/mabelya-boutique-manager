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
import { Plus, Megaphone, Download, Pencil, Square, ImagePlus, Loader2, FileSpreadsheet } from "lucide-react";
import { exportCSV } from "@/lib/exportCSV";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import jsPDF from "jspdf";
import "jspdf-autotable";

const platforms = ["Facebook", "Instagram", "TikTok", "Google Ads"];

export default function AdsCampaigns() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<any>(null);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterBoutique, setFilterBoutique] = useState<string>("all");
  const [form, setForm] = useState({ boutique_id: "", platform: "Facebook", campaign_name: "", budget: "", start_date: new Date().toISOString().split("T")[0] });

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

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const { data } = await supabase.from("ad_campaigns").select("*, boutiques(name, country_id, countries(name))").order("created_at", { ascending: false });
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

  const updateCampaign = useMutation({
    mutationFn: async (data: any) => {
      const { id, ...updates } = data;
      const { error } = await supabase.from("ad_campaigns").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      setEditCampaign(null);
      toast.success("Campagne modifiée");
    },
    onError: () => toast.error("Erreur"),
  });

  const stopCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ad_campaigns").update({ status: "ended", end_date: new Date().toISOString().split("T")[0] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      toast.success("Campagne arrêtée");
    },
  });

  const filteredBoutiques = boutiques?.filter((b) => filterCountry === "all" || (b as any).country_id === filterCountry);

  const filtered = campaigns?.filter((c) => {
    const matchCountry = filterCountry === "all" || (c.boutiques as any)?.country_id === filterCountry;
    const matchBoutique = filterBoutique === "all" || c.boutique_id === filterBoutique;
    return matchCountry && matchBoutique;
  });

  const totalBudget = filtered?.reduce((sum, c) => sum + Number(c.budget), 0) ?? 0;
  const totalSpent = filtered?.reduce((sum, c) => sum + Number(c.spent), 0) ?? 0;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Campagnes ADS — Mabelya", 14, 22);
    doc.setFontSize(10);
    doc.text(`Budget: ${formatCurrency(totalBudget)} | Dépensé: ${formatCurrency(totalSpent)}`, 14, 30);
    const rows = (filtered ?? []).map((c) => [
      c.campaign_name, c.platform, (c.boutiques as any)?.name ?? "—",
      (c.boutiques as any)?.countries?.name ?? "—",
      formatCurrency(Number(c.budget)), formatCurrency(Number(c.spent)),
      c.status === "active" ? "Active" : "Terminée",
    ]);
    (doc as any).autoTable({
      startY: 36, head: [["Campagne", "Plateforme", "Boutique", "Pays", "Budget", "Dépensé", "Statut"]], body: rows,
      styles: { fontSize: 8 }, headStyles: { fillColor: [200, 50, 80] },
    });
    doc.save("campagnes-mabelya.pdf");
  };

  const exportAdsCSV = () => {
    const headers = ["Campagne", "Plateforme", "Boutique", "Pays", "Budget", "Dépensé", "Statut"];
    const rows = (filtered ?? []).map((c) => [
      c.campaign_name, c.platform, (c.boutiques as any)?.name, (c.boutiques as any)?.countries?.name,
      Number(c.budget), Number(c.spent), c.status === "active" ? "Active" : "Terminée",
    ]);
    exportCSV("campagnes-mabelya.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Campagnes Ads</h1>
          <p className="text-sm text-muted-foreground">{filtered?.length ?? 0} campagnes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-4 w-4 mr-2" /> PDF</Button>
          <Button variant="outline" size="sm" onClick={exportAdsCSV}><FileSpreadsheet className="h-4 w-4 mr-2" /> CSV</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nouvelle campagne</Button>
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
                <Button onClick={() => addCampaign.mutate()} disabled={!form.boutique_id || !form.campaign_name || !form.budget} className="w-full">Créer</Button>
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
            <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center"><Megaphone className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Budget total</p><p className="text-xl font-bold">{formatCurrency(totalBudget)}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center"><Megaphone className="h-5 w-5 text-primary" /></div>
            <div><p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total dépensé</p><p className="text-xl font-bold">{formatCurrency(totalSpent)}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Campagne</TableHead><TableHead>Plateforme</TableHead>
            <TableHead className="hidden md:table-cell">Boutique</TableHead>
            <TableHead className="hidden md:table-cell">Pays</TableHead>
            <TableHead className="text-right">Budget</TableHead><TableHead className="text-right">Dépensé</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
            ) : filtered?.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucune campagne</TableCell></TableRow>
            ) : (
              filtered?.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.campaign_name}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{c.platform}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{(c.boutiques as any)?.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{(c.boutiques as any)?.countries?.name}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(c.budget))}</TableCell>
                  <TableCell className="text-right">{formatCurrency(Number(c.spent))}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs border-0 ${c.status === "active" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                      {c.status === "active" ? "Active" : "Terminée"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditCampaign(c)} title="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {c.status === "active" && (
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm("Arrêter cette campagne ?")) stopCampaign.mutate(c.id); }} title="Arrêter">
                          <Square className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Edit dialog */}
      {editCampaign && (
        <Dialog open={!!editCampaign} onOpenChange={(o) => { if (!o) setEditCampaign(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Modifier la campagne</DialogTitle></DialogHeader>
            <EditCampaignForm campaign={editCampaign} onSubmit={(data) => updateCampaign.mutate(data)} loading={updateCampaign.isPending} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EditCampaignForm({ campaign, onSubmit, loading }: { campaign: any; onSubmit: (data: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    campaign_name: campaign.campaign_name,
    budget: String(campaign.budget),
    spent: String(campaign.spent),
    impressions: String(campaign.impressions),
    clicks: String(campaign.clicks),
    conversions: String(campaign.conversions),
  });

  return (
    <div className="space-y-4">
      <Input placeholder="Nom" value={form.campaign_name} onChange={(e) => setForm({ ...form, campaign_name: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <Input type="number" placeholder="Budget" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
        <Input type="number" placeholder="Dépensé" value={form.spent} onChange={(e) => setForm({ ...form, spent: e.target.value })} />
        <Input type="number" placeholder="Impressions" value={form.impressions} onChange={(e) => setForm({ ...form, impressions: e.target.value })} />
        <Input type="number" placeholder="Clics" value={form.clicks} onChange={(e) => setForm({ ...form, clicks: e.target.value })} />
        <Input type="number" placeholder="Conversions" value={form.conversions} onChange={(e) => setForm({ ...form, conversions: e.target.value })} />
      </div>
      <Button className="w-full" disabled={loading} onClick={() => onSubmit({
        id: campaign.id, campaign_name: form.campaign_name,
        budget: parseFloat(form.budget), spent: parseFloat(form.spent),
        impressions: parseInt(form.impressions), clicks: parseInt(form.clicks), conversions: parseInt(form.conversions),
      })}>
        {loading ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </div>
  );
}
