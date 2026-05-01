import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Users, Download, Phone, Mail, Trash2, Archive, ArchiveRestore, TrendingUp, Crown, UserPlus, Filter, Globe, Megaphone, FileSpreadsheet } from "lucide-react";
import { exportCSV } from "@/lib/exportCSV";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import jsPDF from "jspdf";
import "jspdf-autotable";

const AGE_RANGES = ["18-25", "26-35", "36-45", "46-55", "55+", "Non spécifié"];
const GENDERS = ["Homme", "Femme", "Non spécifié"];
const STATUSES = ["Actif", "Inactif", "VIP"];
const ACQUISITION_CHANNELS = [
  { value: "Facebook", label: "Facebook", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  { value: "Instagram", label: "Instagram", color: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300" },
  { value: "TikTok", label: "TikTok", color: "bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300" },
  { value: "WhatsApp", label: "WhatsApp", color: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
  { value: "Google", label: "Google", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  { value: "ADS", label: "ADS (Publicité)", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  { value: "Bouche à oreille", label: "Bouche à oreille", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300" },
  { value: "Autre", label: "Autre", color: "bg-muted text-muted-foreground" },
];

const getChannelStyle = (channel: string | null) => {
  return ACQUISITION_CHANNELS.find((c) => c.value === channel) ?? ACQUISITION_CHANNELS[ACQUISITION_CHANNELS.length - 1];
};

export default function Clients() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterAge, setFilterAge] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const queryClient = useQueryClient();
  const { hasRole, user } = useAuth();

  const isSuperAdmin = hasRole("super_admin");
  const isAdminBoutique = hasRole("admin_boutique");
  const isVendeur = !isSuperAdmin && !isAdminBoutique;

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", country_id: "", boutique_id: "",
    age_range: "Non spécifié", gender: "Non spécifié", status: "Actif", notes: "",
    acquisition_channel: "",
  });

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

  const { data: staffData } = useQuery({
    queryKey: ["staff-vendeur", user?.id],
    enabled: isVendeur && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("staff")
        .select("boutique_id, country_id, boutiques(id, name, country_id)")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .single();
      return data;
    },
  });

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients", isVendeur ? user?.id : "all"],
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*, countries(name), boutiques(name, countries(name))")
        .order("created_at", { ascending: false });
      if (isVendeur) {
        query = query.eq("created_by", user!.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !isVendeur || !!user?.id,
  });

  const addClient = useMutation({
    mutationFn: async (client: typeof form) => {
      const { error } = await supabase.from("clients").insert({
        full_name: client.full_name,
        email: client.email || null,
        phone: client.phone || null,
        country_id: client.country_id || null,
        boutique_id: isVendeur && staffData?.boutique_id
          ? staffData.boutique_id
          : client.boutique_id || null,
        age_range: client.age_range,
        gender: client.gender,
        status: client.status,
        notes: client.notes || null,
        acquisition_channel: client.acquisition_channel || null,
        created_by: user?.id ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setForm({
        full_name: "", email: "", phone: "", country_id: "", boutique_id: "",
        age_range: "Non spécifié", gender: "Non spécifié", status: "Actif", notes: "",
        acquisition_channel: "",
      });
      toast.success("Client ajouté avec succès");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client supprimé");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const archiveClient = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase.from("clients").update({ is_archived: archive } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client mis à jour");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = clients?.filter((c) => {
    const matchSearch =
      c.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email?.toLowerCase().includes(search.toLowerCase()));
    const matchCountry = filterCountry === "all" || c.country_id === filterCountry;
    const matchGender = filterGender === "all" || c.gender === filterGender;
    const matchAge = filterAge === "all" || c.age_range === filterAge;
    const matchChannel = filterChannel === "all" || (c as any).acquisition_channel === filterChannel;
    const matchArchived = showArchived ? (c as any).is_archived === true : (c as any).is_archived !== true;
    return matchSearch && matchCountry && matchGender && matchAge && matchChannel && matchArchived;
  });

  const totalClients = filtered?.length ?? 0;
  const totalSpent = filtered?.reduce((s, c) => s + Number(c.total_spent), 0) ?? 0;
  const vipCount = filtered?.filter((c) => c.status === "VIP").length ?? 0;

  // Channel distribution for stats
  const channelCounts = ACQUISITION_CHANNELS.reduce((acc, ch) => {
    acc[ch.value] = filtered?.filter((c) => (c as any).acquisition_channel === ch.value).length ?? 0;
    return acc;
  }, {} as Record<string, number>);
  const topChannel = Object.entries(channelCounts).sort(([, a], [, b]) => b - a)[0];

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Liste des Clients — Mabelya", 14, 22);
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 30);
    const rows = (filtered ?? []).map((c) => [
      c.full_name, c.phone ?? "—", (c.countries as any)?.name ?? "—",
      c.gender, c.age_range, (c as any).acquisition_channel ?? "—", c.status, formatCurrency(Number(c.total_spent)),
    ]);
    (doc as any).autoTable({
      startY: 36,
      head: [["Nom", "Téléphone", "Pays", "Sexe", "Âge", "Canal", "Statut", "Dépenses"]],
      body: rows,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [200, 50, 80] },
    });
    doc.save("clients-mabelya.pdf");
  };

  const exportClientCSV = () => {
    const headers = ["Nom", "Téléphone", "Pays", "Sexe", "Âge", "Canal", "Statut", "Dépenses"];
    const rows = (filtered ?? []).map((c) => [
      c.full_name, c.phone, (c.countries as any)?.name, c.gender, c.age_range,
      (c as any).acquisition_channel, c.status, Number(c.total_spent),
    ]);
    exportCSV("clients-mabelya.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2.5">
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            {showArchived ? "Clients archivés" : isVendeur ? "Mes clients" : "Gestion des clients"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalClients} client{totalClients > 1 ? "s" : ""}{showArchived ? " archivé(s)" : ""}
            {!showArchived && isVendeur && staffData && ` — ${(staffData.boutiques as any)?.name ?? "ma boutique"}`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={exportPDF} size="sm" className="gap-2">
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={exportClientCSV} size="sm" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> CSV
          </Button>
          {(isSuperAdmin || isAdminBoutique) && (
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className={showArchived ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2" : "gap-2"}
            >
              <Archive className="h-4 w-4" />
              {showArchived ? "Voir actifs" : "Archivés"}
            </Button>
          )}
          {!showArchived && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <UserPlus className="h-4 w-4" /> Nouveau client
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg">Enregistrer un nouveau client</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Renseignez les informations du client pour un suivi optimal.
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => { e.preventDefault(); addClient.mutate(form); }}
                  className="space-y-5"
                >
                  {/* Identity section */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identité</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-sm font-medium">Nom complet *</Label>
                        <Input
                          placeholder="Prénom et nom du client"
                          value={form.full_name}
                          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Téléphone</Label>
                        <Input placeholder="+225 07 00 00 00" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Email</Label>
                        <Input type="email" placeholder="email@exemple.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  {/* Demographics section */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Démographie</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Sexe</Label>
                        <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Tranche d'âge</Label>
                        <Select value={form.age_range} onValueChange={(v) => setForm({ ...form, age_range: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {AGE_RANGES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Location section */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Localisation & boutique</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Pays</Label>
                        <Select value={form.country_id} onValueChange={(v) => setForm({ ...form, country_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Sélectionner un pays" /></SelectTrigger>
                          <SelectContent>
                            {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {!isVendeur && (
                        <div className="space-y-1.5">
                          <Label className="text-sm font-medium">Boutique</Label>
                          <Select value={form.boutique_id} onValueChange={(v) => setForm({ ...form, boutique_id: v })}>
                            <SelectTrigger><SelectValue placeholder="Sélectionner une boutique" /></SelectTrigger>
                            <SelectContent>
                              {boutiques?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Acquisition & Status section */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acquisition & statut</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium flex items-center gap-1.5">
                          <Megaphone className="h-3.5 w-3.5 text-primary" />
                          Canal d'acquisition
                        </Label>
                        <Select value={form.acquisition_channel} onValueChange={(v) => setForm({ ...form, acquisition_channel: v })}>
                          <SelectTrigger><SelectValue placeholder="Comment a-t-il découvert la boutique ?" /></SelectTrigger>
                          <SelectContent>
                            {ACQUISITION_CHANNELS.map((ch) => (
                              <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Statut</Label>
                        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Notes</Label>
                    <Textarea
                      placeholder="Préférences, taille habituelle, remarques..."
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="min-h-[80px] resize-y"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={addClient.isPending}>
                    {addClient.isPending ? "Enregistrement..." : "Enregistrer le client"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* ── Banners ── */}
      {showArchived && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300 flex items-center gap-2">
          📦 Les clients archivés sont conservés pour l'historique. Vous pouvez les restaurer à tout moment.
        </div>
      )}
      {!showArchived && isVendeur && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
          ℹ️ Vous voyez uniquement les clients que vous avez enregistrés.
        </div>
      )}

      {/* ── Filters ── */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filtres</span>
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {!isVendeur && (
              <Select value={filterCountry} onValueChange={setFilterCountry}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Pays" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les pays</SelectItem>
                  {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Select value={filterGender} onValueChange={setFilterGender}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Sexe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterAge} onValueChange={setFilterAge}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Âge" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {AGE_RANGES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterChannel} onValueChange={setFilterChannel}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Canal d'acquisition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les canaux</SelectItem>
                {ACQUISITION_CHANNELS.map((ch) => <SelectItem key={ch.value} value={ch.value}>{ch.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total clients</p>
                <p className="text-3xl font-display font-bold mt-1">{totalClients}</p>
              </div>
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Dépenses totales</p>
                <p className="text-2xl font-display font-bold mt-1 text-green-600 dark:text-green-400">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="h-11 w-11 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Clients VIP</p>
                <p className="text-3xl font-display font-bold mt-1 text-amber-600 dark:text-amber-400">{vipCount}</p>
              </div>
              <div className="h-11 w-11 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Top canal</p>
                <p className="text-lg font-display font-bold mt-1 text-indigo-600 dark:text-indigo-400">
                  {topChannel && topChannel[1] > 0 ? topChannel[0] : "—"}
                </p>
                {topChannel && topChannel[1] > 0 && (
                  <p className="text-xs text-muted-foreground">{topChannel[1]} client{topChannel[1] > 1 ? "s" : ""}</p>
                )}
              </div>
              <div className="h-11 w-11 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Table ── */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            Répertoire clients
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">Client</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold">Téléphone</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold">Pays</TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold">Sexe</TableHead>
                  <TableHead className="hidden lg:table-cell font-semibold">Âge</TableHead>
                  <TableHead className="hidden md:table-cell font-semibold">Canal</TableHead>
                  <TableHead className="text-right font-semibold">Dépenses</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  {(isSuperAdmin || isAdminBoutique) && <TableHead className="text-right font-semibold">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Chargement...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filtered && filtered.length > 0 ? (
                  filtered.map((c) => {
                    const channel = getChannelStyle((c as any).acquisition_channel);
                    return (
                      <TableRow key={c.id} className="hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                              {c.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{c.full_name}</p>
                              {c.email && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3 shrink-0" />{c.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {c.phone
                            ? <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{c.phone}</span>
                            : <span className="text-muted-foreground">—</span>
                          }
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">
                          {(c.countries as any)?.name ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{c.gender}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{c.age_range}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {(c as any).acquisition_channel ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${channel.color}`}>
                              {(c as any).acquisition_channel}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold tabular-nums">
                          {formatCurrency(Number(c.total_spent))}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={c.status === "VIP" ? "default" : c.status === "Actif" ? "secondary" : "outline"}
                            className={c.status === "VIP" ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
                          >
                            {c.status === "VIP" && <Crown className="h-3 w-3 mr-1" />}
                            {c.status}
                          </Badge>
                        </TableCell>
                        {(isSuperAdmin || isAdminBoutique) && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => archiveClient.mutate({ id: c.id, archive: !(c as any).is_archived })}
                                title={(c as any).is_archived ? "Restaurer" : "Archiver"}
                              >
                                {(c as any).is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4 text-muted-foreground" />}
                              </Button>
                              {isSuperAdmin && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Le client « {c.full_name} » sera définitivement supprimé. Cette action est irréversible.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => deleteClient.mutate(c.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-8 w-8 text-muted-foreground/50" />
                        <p>{isVendeur ? "Aucun client enregistré" : "Aucun client trouvé"}</p>
                        <p className="text-xs">Ajustez vos filtres ou créez un nouveau client.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
