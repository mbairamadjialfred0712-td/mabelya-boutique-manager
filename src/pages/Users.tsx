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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Shield, ShieldCheck, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin_boutique: "Gérant Boutique",
  sales_staff: "Vendeur",
};

const ROLE_ICONS: Record<AppRole, typeof Shield> = {
  super_admin: ShieldCheck,
  admin_boutique: Store,
  sales_staff: Shield,
};

export default function Users() {
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // Only super_admin can access
  if (!hasRole("super_admin")) {
    return <Navigate to="/" replace />;
  }

  const { data: users, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*, profiles!user_roles_user_id_fkey(full_name, avatar_url)")
        .order("role");
      if (error) throw error;
      return data;
    },
  });

  const { data: boutiques } = useQuery({
    queryKey: ["boutiques"],
    queryFn: async () => {
      const { data } = await supabase.from("boutiques").select("*, countries(name)").order("name");
      return data ?? [];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data ?? [];
    },
  });

  const addRole = useMutation({
    mutationFn: async (input: { user_id: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert(input);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setOpen(false);
      toast.success("Rôle attribué avec succès");
    },
    onError: (err: any) => toast.error(err.message),
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground text-sm">{users?.length ?? 0} rôles attribués</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-2" /> Attribuer un rôle</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Attribuer un rôle</DialogTitle>
            </DialogHeader>
            <AssignRoleForm
              profiles={profiles ?? []}
              existingRoles={users ?? []}
              onSubmit={(data) => addRole.mutate(data)}
              loading={addRole.isPending}
            />
          </DialogContent>
        </Dialog>
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
                  const profileData = (u as any).profiles;
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">
                              {(profileData?.full_name || "?")[0].toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{profileData?.full_name || "Utilisateur"}</p>
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
                            variant="ghost"
                            size="icon"
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

function AssignRoleForm({
  profiles, existingRoles, onSubmit, loading,
}: {
  profiles: any[];
  existingRoles: any[];
  onSubmit: (data: { user_id: string; role: AppRole }) => void;
  loading: boolean;
}) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<AppRole | "">("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !role) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    onSubmit({ user_id: userId, role: role as AppRole });
  };

  // Filter out profiles that already have the selected role
  const availableProfiles = profiles.filter(
    (p) => !existingRoles.some((r) => r.user_id === p.user_id && r.role === role)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Utilisateur</Label>
        <Select value={userId} onValueChange={setUserId}>
          <SelectTrigger><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
          <SelectContent>
            {availableProfiles.map((p) => (
              <SelectItem key={p.id} value={p.user_id}>
                {p.full_name || "Sans nom"} ({p.user_id.slice(0, 8)}...)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Rôle</Label>
        <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
          <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin_boutique">Gérant Boutique</SelectItem>
            <SelectItem value="sales_staff">Vendeur</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Attribution..." : "Attribuer le rôle"}
      </Button>
    </form>
  );
}
