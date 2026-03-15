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
import { UserPlus, Shield, ShieldCheck, Store, Trash2, Camera } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { logActivity } from "@/hooks/useActivityLog";
import type { Database } from "@/integrations/supabase/types";

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
  const { hasRole, session } = useAuth();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: userRoles, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("role");
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

  const users = userRoles?.map((ur) => ({
    ...ur,
    profile: allProfiles?.find((p) => p.user_id === ur.user_id),
  }));

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
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: input,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Upload avatar if provided
      if (input.avatar_url && data?.user_id) {
        await supabase
          .from("profiles")
          .update({ avatar_url: input.avatar_url })
          .eq("user_id", data.user_id);
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

  if (!hasRole("super_admin")) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground text-sm">{users?.length ?? 0} utilisateurs</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" /> Créer un utilisateur</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Nouvel utilisateur</DialogTitle>
            </DialogHeader>
            <CreateUserForm
              onSubmit={(data) => createUser.mutate(data)}
              loading={createUser.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Role descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.entries(ROLE_LABELS) as [AppRole, string][]).map(([role, label]) => {
          const Icon = ROLE_ICONS[role];
          return (
            <Card key={role} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{label}</span>
                </div>
                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : users && users.length > 0 ? (
                users.map((u) => {
                  const RoleIcon = ROLE_ICONS[u.role];
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                            {u.profile?.avatar_url ? (
                              <img src={u.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-primary">
                                {(u.profile?.full_name || "?")[0].toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{u.profile?.full_name || "Utilisateur"}</p>
                            <p className="text-xs text-muted-foreground">{u.user_id.slice(0, 8)}...</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.role === "super_admin" ? "default" : "secondary"} className="gap-1">
                          <RoleIcon className="h-3 w-3" />
                          {ROLE_LABELS[u.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {u.role !== "super_admin" && (
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => deleteRole.mutate(u.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Aucun utilisateur</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CreateUserForm({
  onSubmit, loading,
}: {
  onSubmit: (data: { email: string; password: string; full_name: string; role: AppRole; avatar_url?: string }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "" as AppRole | "" });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name || !form.role) {
      toast.error("Veuillez remplir tous les champs");
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
      const { error: uploadError } = await supabase.storage
        .from("user-avatars")
        .upload(fileName, avatarFile);
      if (uploadError) {
        toast.error("Erreur upload photo: " + uploadError.message);
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("user-avatars").getPublicUrl(fileName);
      avatar_url = urlData.publicUrl;
      setUploading(false);
    }

    onSubmit({
      email: form.email,
      password: form.password,
      full_name: form.full_name,
      role: form.role as AppRole,
      avatar_url,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar upload */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative h-20 w-20 rounded-full bg-muted border-2 border-dashed border-border hover:border-primary transition-colors overflow-hidden flex items-center justify-center"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-6 w-6 text-muted-foreground" />
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>
      <p className="text-xs text-center text-muted-foreground">Photo de profil (optionnel)</p>

      <div className="space-y-2">
        <Label>Nom complet *</Label>
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
        {form.role && (
          <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[form.role as AppRole]}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={loading || uploading}>
        {uploading ? "Upload photo..." : loading ? "Création..." : "Créer l'utilisateur"}
      </Button>
    </form>
  );
}
