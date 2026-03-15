import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, LogIn, ShoppingCart, Package, UserPlus } from "lucide-react";
import { Navigate } from "react-router-dom";

const ACTION_ICONS: Record<string, typeof Activity> = {
  login: LogIn,
  sale: ShoppingCart,
  product_add: Package,
  user_create: UserPlus,
};

const ACTION_LABELS: Record<string, string> = {
  login: "Connexion",
  logout: "Déconnexion",
  sale: "Vente enregistrée",
  product_add: "Produit ajouté",
  product_update: "Produit modifié",
  product_delete: "Produit supprimé",
  user_create: "Utilisateur créé",
};

export default function ActivityLog() {
  const { hasRole } = useAuth();

  if (!hasRole("super_admin")) {
    return <Navigate to="/" replace />;
  }

  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*");
      return data ?? [];
    },
  });

  const getProfileName = (userId: string) => {
    return profiles?.find((p) => p.user_id === userId)?.full_name || "Inconnu";
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" /> Journal d'activités
        </h1>
        <p className="text-muted-foreground text-sm">
          Suivi des connexions, ventes et actions des utilisateurs
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : logs && logs.length > 0 ? (
                logs.map((log) => {
                  const Icon = ACTION_ICONS[log.action] || Activity;
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{getProfileName(log.user_id)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="gap-1">
                          <Icon className="h-3 w-3" />
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {log.details || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Aucune activité enregistrée
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
