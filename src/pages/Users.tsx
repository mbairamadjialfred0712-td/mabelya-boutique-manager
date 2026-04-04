import { useState, useRef } from "react";
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
import { UserPlus, Shield, ShieldCheck, Store, Trash2, Camera, Search, Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { logActivity } from "@/hooks/useActivityLog";
import { formatCurrency } from "@/lib/constants";
import jsPDF from "jspdf";
import "jspdf-autotable";
import type { Database } from "@/integrations/supabase/types";
import { EditUserDialog } from "@/components/users/EditUserDialog";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin_boutique: "Gérant Boutique",
  sales_staff: "Vendeuse",
};

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  super_admin: "Accès total — Gestion utilisateurs, paramètres, stock, ventes",
  admin_boutique: "Gestion boutique — Dépenses, personnel, stock (lecture)",
  sales_staff: "Vendeuse — Enregistrer ventes et clients uniquement",
};

const ROLE_ICONS: Record<AppRole, typeof Shield> = {
  super_admin: ShieldCheck,
  admin_boutique: Store,
  sales_staff: Shield,
};

export default function Users() {
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [editUser, setEditUser] = useState<{ userId: string; name: string; role: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: userRoles, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*").order("role");
      if (error) throw error;
      return data;
    },
  });

  const { data: allProfiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data ?? [];
    },
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

  const users = userRoles?.map((ur) => ({
    ...ur,
    profile: allProfiles?.find((p) => p.user_id === ur.user_id),
  }));

  const filtered = users?.filter((u) => {
    const matchSearch = !search || (u.profile?.full_name || "").toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("Rôle supprimé");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const createUser = useMutation({
    mutationFn: async (input: { email: string; password: string; full_name: string; role: AppRole; avatar_url?: string }) => {
      const { data, error } = await supabase.functions.invoke("create-user", { body: input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (input.avatar_url && data?.user_id) {
        await supabase.from("profiles").update({ avatar_url: input.avatar_url }).eq("user_id", data.user_id);
      }
      await logActivity("user_create", `Créé: ${input.full_name} (${ROLE_LABELS[input.role]})`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users", "all-profiles"] });
      setOpen(false);
      toast.success("Utilisateur créé avec succès");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Liste des Utilisateurs — Mabelya", 14, 22);
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, 14, 30);
    const rows = (filtered ?? []).map((u) => [
      u.profile?.full_name || "—",
      u.user_id.slice(0, 12) + "...",
      ROLE_LABELS[u.role],
    ]);
    (doc as any).autoTable({
      startY: 36,
      head: [["Nom", "ID Utilisateur", "Rôle"]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 50, 80] },
    });
    doc.save("utilisateurs-mabelya.pdf");
  };

  if (!hasRole("super_admin")) return <Navigate to="/" replace />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground text-sm">{filtered?.length ?? 0} utilisateurs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-4 w-4 mr-2" /> PDF</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><UserPlus className="h-4 w-4 mr-2" /> Créer un utilisateur</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Nouvel utilisateur</DialogTitle>
              </DialogHeader>
              <CreateUserForm
                boutiques={boutiques ?? []}
                countries={countries ?? []}
                onSubmit={(data) => createUser.mutate(data)}
                loading={createUser.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Role cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.entries(ROLE_LABELS) as [AppRole, string][]).map(([role, label]) => {
          const Icon = ROLE_ICONS[role];
          const count = users?.filter((u) => u.role === role).length ?? 0;
          return (
            <Card key={role} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{label}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{ROLE_DESCRIPTIONS[role]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Rôle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            {(Object.entries(ROLE_LABELS) as [AppRole, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead className="hidden md:table-cell">ID</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered && filtered.length > 0 ? (
                filtered.map((u) => {
                  const RoleIcon = ROLE_ICONS[u.role];
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                            {u.profile?.avatar_url ? (
                              <img src={u.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-primary">{(u.profile?.full_name || "?")[0].toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{u.profile?.full_name || "Utilisateur"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{u.user_id.slice(0, 12)}...</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === "super_admin" ? "default" : "secondary"} className="gap-1">
                          <RoleIcon className="h-3 w-3" />
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {u.role !== "super_admin" && (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setEditUser({ userId: u.user_id, name: u.profile?.full_name || "Utilisateur", role: u.role })} title="Modifier l'affectation">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteRole.mutate(u.id)} className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun utilisateur</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {editUser && (
        <EditUserDialog
          open={!!editUser}
          onOpenChange={(v) => { if (!v) setEditUser(null); }}
          userId={editUser.userId}
          userName={editUser.name}
          userRole={editUser.role}
        />
      )}
    </div>
  );
}

function CreateUserForm({
  onSubmit, loading, boutiques, countries,
}: {
  onSubmit: (data: { email: string; password: string; full_name: string; role: AppRole; avatar_url?: string }) => void;
  loading: boolean;
  boutiques: any[];
  countries: any[];
}) {
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "" as AppRole | "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast.error("L'image ne doit pas dépasser 10 Mo"); return; }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name || !form.role) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    let avatar_url: string | undefined;
    if (avatarFile) {
      setUploading(true);
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("user-avatars").upload(fileName, avatarFile);
      if (uploadError) { toast.error("Erreur upload photo: " + uploadError.message); setUploading(false); return; }
      const { data: urlData } = supabase.storage.from("user-avatars").getPublicUrl(fileName);
      avatar_url = urlData.publicUrl;
      setUploading(false);
    }

    onSubmit({ email: form.email, password: form.password, full_name: form.full_name, role: form.role as AppRole, avatar_url });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative h-24 w-24 rounded-full bg-muted border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden flex items-center justify-center"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-7 w-7 text-muted-foreground" />
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>
      <p className="text-xs text-center text-muted-foreground">Photo de profil (max 10 Mo)</p>

      <div className="space-y-2">
        <Label>Nom et prénom *</Label>
        <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Email *</Label>
        <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Mot de passe *</Label>
        <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Rôle *</Label>
        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
          <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin_boutique">Gérant Boutique</SelectItem>
            <SelectItem value="sales_staff">Vendeuse</SelectItem>
          </SelectContent>
        </Select>
        {form.role && <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[form.role as AppRole]}</p>}
      </div>
      <Button type="submit" className="w-full" disabled={loading || uploading}>
        {uploading ? "Upload photo..." : loading ? "Création..." : "Créer l'utilisateur"}
      </Button>
    </form>
  );
}
