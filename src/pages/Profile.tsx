import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Shield } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, profile, roles } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success("Profil mis à jour");
    }
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    admin_boutique: "Admin Boutique",
    sales_staff: "Personnel de vente",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Mon Profil</h1>
        <p className="text-sm text-muted-foreground">Gérer vos informations personnelles</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{profile?.full_name || "Utilisateur"}</CardTitle>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Rôles</label>
            <div className="flex gap-2 flex-wrap">
              {roles.map((r) => (
                <Badge key={r} className="rounded-xl bg-primary/10 text-primary border-0 px-3 py-1">
                  <Shield className="h-3 w-3 mr-1" />
                  {roleLabels[r] ?? r}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Nom complet</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <Input value={user?.email ?? ""} disabled className="rounded-xl bg-muted" />
          </div>

          <Button onClick={handleSave} disabled={saving} className="rounded-xl">
            {saving ? "Enregistrement..." : "Mettre à jour"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
