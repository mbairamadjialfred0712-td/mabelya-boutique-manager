import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Search, Users, Download, Phone, Mail, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import jsPDF from "jspdf";
import "jspdf-autotable";

const AGE_RANGES = ["18-25", "26-35", "36-45", "46-55", "55+", "Non spécifié"];
const GENDERS = ["Homme", "Femme", "Non spécifié"];
const STATUSES = ["Actif", "Inactif", "VIP"];

export default function Clients() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterAge, setFilterAge] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const queryClient = useQueryClient();
  const { hasRole, user } = useAuth();

  const isSuperAdmin = hasRole("super_admin");
  const isAdminBoutique = hasRole("admin_boutique");
  const isVendeur = !isSuperAdmin && !isAdminBoutique;

  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", country_id: "", boutique_id: "",
    age_range: "Non spécifié", gender: "Non spécifié", status: "Actif", notes: "",
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

  // Récupérer la boutique du vendeur
  const { data: staffData } = useQuery({
    queryKey: ["staff-boutique", user?.id],
    enabled: isVendeur && !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("staff")
        .select("boutique_id, boutiques(id, name)")
        .eq("id", user!.id)
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

      // Vendeur voit uniquement les clients de sa boutique
      if (isVendeur && staffData?.boutique_id) {
        query = query.eq("boutique_id", staffData.boutique_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !isVendeur || !!staffData,
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
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setForm({
        full_name: "", email: "", phone: "", country_id: "", boutique_id: "",
        age_range: "Non spécifié", gender: "Non spécifié", status: "Actif", notes: "",
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
    const matchArchived = showArchived ? (c as any).is_archived === true : (c as any).is_archived !== true;
    return matchSearch && matchCountry && matchGender && matchAge && matchArchived;
  });

  const totalClients = filtered?.length ?? 0;
  const totalSpent = filtered?.reduce((s, c) => s + Number(c.total_spent), 0) ?? 0;
  const vipCount = filtered?.filter((c) => c.status === "VIP").length ?? 0;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Liste des Clients — Mabelya", 14, 22);
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 30);
    const rows = (filtered ?? []).map((c) => [
      c.full_name, c.phone ?? "—", (c.countries as any)?.name ?? "—",
      c.gender, c.age_range, c.status, formatCurrency(Number(c.total_spent)),
    ]);
    (doc as any).autoTable({
      startY: 36,
      head: [["Nom", "Téléphone", "Pays", "Sexe", "Âge", "Statut", "Dépenses"]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 50, 80] },
    });
    doc.save("clients-mabelya.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            {showArchived ? "Clients archivés" : isVendeur ? "Mes clients" : "Clients"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {totalClients} client{totalClients > 1 ? "s" : ""}{showArchived ? " archivé(s)" : ""}
            {!showArchived && isVendeur && staffData && ` — ${(staffData.boutiques as any)?.name ?? "ma boutique"}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPDF} size="sm">
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
          {(isSuperAdmin || isAdminBoutique) && (
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className={showArchived ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              <Archive className="h-4 w-4 mr-2" />
              {showArchived ? "Voir actifs" : "Voir archivés"}
            </Button>
          )}
          {!showArchived && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Nouveau client</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">Nouveau client</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => { e.preventDefault(); addClient.mutate(form); }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label>Nom complet *</Label>
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Téléphone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Pays</Label>
                    <Select value={form.country_id} onValueChange={(v) => setForm({ ...form, country_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Boutique — cachée pour le vendeur (auto-assignée) */}
                  {!isVendeur && (
                    <div className="space-y-1">
                      <Label>Boutique</Label>
                      <Select value={form.boutique_id} onValueChange={(v) => setForm({ ...form, boutique_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                        <SelectContent>
                          {boutiques?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label>Sexe</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Tranche d'âge</Label>
                    <Select value={form.age_range} onValueChange={(v) => setForm({ ...form, age_range: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {AGE_RANGES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Statut</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={addClient.isPending}>
                  {addClient.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Info banner for archived view */}
      {showArchived && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          📦 Les clients archivés sont conservés pour l'historique. Vous pouvez les restaurer à tout moment.
        </div>
      )}

      {/* Message info vendeur */}
      {!showArchived && isVendeur && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          ℹ️ Vous voyez uniquement les clients de votre boutique.
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {!isVendeur && (
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Pays" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous pays</SelectItem>
              {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterGender} onValueChange={setFilterGender}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Sexe" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAge} onValueChange={setFilterAge}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Âge" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {AGE_RANGES.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total clients</p>
          <p className="text-2xl font-display font-bold">{totalClients}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Dépenses totales</p>
          <p className="text-2xl font-display font-bold text-primary">{formatCurrency(totalSpent)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Clients VIP</p>
          <p className="text-2xl font-display font-bold text-warning">{vipCount}</p>
        </CardContent></Card>
      </div>

      {/* Tableau */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                <TableHead className="hidden md:table-cell">Pays</TableHead>
                <TableHead className="hidden lg:table-cell">Sexe</TableHead>
                <TableHead className="hidden lg:table-cell">Âge</TableHead>
                <TableHead className="text-right">Dépenses</TableHead>
                <TableHead>Statut</TableHead>
                {(isSuperAdmin || isAdminBoutique) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filtered && filtered.length > 0 ? (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{c.full_name}</p>
                        {c.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />{c.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {c.phone
                        ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>
                        : "—"
                      }
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {(c.countries as any)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{c.gender}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">{c.age_range}</TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {formatCurrency(Number(c.total_spent))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.status === "VIP" ? "default" : c.status === "Actif" ? "secondary" : "outline"}
                      >
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isVendeur ? "Aucun client dans votre boutique" : "Aucun client trouvé"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}