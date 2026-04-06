import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, LogIn, LogOut, ShoppingCart, Package, UserPlus, Receipt, UserCog, Bell } from "lucide-react";
import { Navigate } from "react-router-dom";

const ACTION_ICONS: Record<string, typeof Activity> = {
  login: LogIn, logout: LogOut, sale: ShoppingCart, product_add: Package,
  user_create: UserPlus, expense_add: Receipt, profile_update: UserCog,
  product_update: Package, product_delete: Package, staff_expense: Receipt,
  restore_product: Package, restore_client: UserPlus,
};

const ACTION_LABELS: Record<string, string> = {
  login: "Connexion", logout: "Déconnexion", sale: "Vente enregistrée",
  product_add: "Produit ajouté", product_update: "Produit modifié",
  product_delete: "Produit supprimé", user_create: "Utilisateur créé",
  expense_add: "Dépense ajoutée", profile_update: "Profil modifié",
  staff_expense: "Dépense personnelle", restore_product: "Produit restauré",
  restore_client: "Client restauré",
};

const ACTION_COLORS: Record<string, string> = {
  login: "bg-green-500/10 text-green-600",
  logout: "bg-muted text-muted-foreground",
  sale: "bg-primary/10 text-primary",
  product_add: "bg-blue-500/10 text-blue-600",
  user_create: "bg-purple-500/10 text-purple-600",
  expense_add: "bg-orange-500/10 text-orange-600",
  profile_update: "bg-cyan-500/10 text-cyan-600",
  staff_expense: "bg-amber-500/10 text-amber-600",
  restore_product: "bg-teal-500/10 text-teal-600",
  restore_client: "bg-teal-500/10 text-teal-600",
};

export default function ActivityLog() {
  const { hasRole } = useAuth();
  const [filterAction, setFilterAction] = useState<string>("all");
  const [realtimeLogs, setRealtimeLogs] = useState<any[]>([]);

  // Logs d'activité standard
  const { data: logs, isLoading } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Ventes réelles depuis la table sales
  const { data: salesData } = useQuery({
    queryKey: ["sales-for-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("id, created_at, user_id, total_amount, customer_name, payment_method")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("activity-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, (payload) => {
        // Éviter les doublons de connexion — on ignore les login qui arrivent en moins de 5 minutes
        setRealtimeLogs((prev) => {
          const newLog = payload.new as any;
          if (newLog.action === "login") {
            const lastLogin = prev.find((l) => l.action === "login" && l.user_id === newLog.user_id);
            if (lastLogin) {
              const diff = new Date(newLog.created_at).getTime() - new Date(lastLogin.created_at).getTime();
              if (diff < 5 * 60 * 1000) return prev; // Ignorer si < 5 minutes
            }
          }
          if (prev.some((l) => l.id === newLog.id)) return prev;
          return [newLog, ...prev];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!hasRole("super_admin")) return <Navigate to="/" replace />;

  // Convertir les ventes en logs d'activité
  const salesAsLogs = (salesData ?? []).map((sale) => ({
    id: `sale-${sale.id}`,
    action: "sale",
    user_id: sale.user_id,
    created_at: sale.created_at,
    details: `${sale.customer_name ? sale.customer_name + " — " : ""}${Number(sale.total_amount).toLocaleString("fr-FR")} FCFA (${
      sale.payment_method === "cash" ? "Espèces" :
      sale.payment_method === "mobile_money" ? "Mobile Money" : "Virement"
    })`,
  }));

  // Dédupliquer les connexions — garder uniquement la première connexion par utilisateur par heure
  const deduplicatedLogs = (logs ?? []).filter((log, index, arr) => {
    if (log.action !== "login") return true;
    const prevLogin = arr.slice(0, index).find(
      (l) => l.action === "login" && l.user_id === log.user_id &&
      Math.abs(new Date(l.created_at).getTime() - new Date(log.created_at).getTime()) < 60 * 60 * 1000
    );
    return !prevLogin;
  });

  const allLogs = [
    ...realtimeLogs.filter((rl) => !deduplicatedLogs.some((l) => l.id === rl.id)),
    ...deduplicatedLogs,
    ...salesAsLogs.filter((sl) => !deduplicatedLogs.some((l) => l.id === sl.id)),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filtered = allLogs.filter((l) => filterAction === "all" || l.action === filterAction);

  const getProfileName = (userId: string) =>
    profiles?.find((p) => p.user_id === userId)?.full_name || "Inconnu";

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    }).format(new Date(date));

  // Stats du jour
  const todayStr = new Date().toISOString().split("T")[0];
  const todayLogs = allLogs.filter((l) => l.created_at.startsWith(todayStr));
  const todayLogins = todayLogs.filter((l) => l.action === "login").length;
  const todaySales = todayLogs.filter((l) => l.action === "sale").length;
  const todaySalesAmount = (salesData ?? [])
    .filter((s) => s.created_at.startsWith(todayStr))
    .reduce((sum, s) => sum + Number(s.total_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" /> Journal d'activités
          </h1>
          <p className="text-muted-foreground text-sm">Suivi en temps réel des activités utilisateurs</p>
        </div>
        {realtimeLogs.length > 0 && (
          <Badge className="bg-green-500/10 text-green-600 border-0 gap-1 animate-pulse">
            <Bell className="h-3 w-3" /> {realtimeLogs.length} nouvelle(s) activité(s)
          </Badge>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Activités aujourd'hui</p>
          <p className="text-2xl font-display font-bold">{todayLogs.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Connexions réelles</p>
          <p className="text-2xl font-display font-bold text-green-600">{todayLogins}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ventes aujourd'hui</p>
          <p className="text-2xl font-display font-bold text-primary">{todaySales}</p>
          {todaySalesAmount > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {todaySalesAmount.toLocaleString("fr-FR")} FCFA
            </p>
          )}
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total activités</p>
          <p className="text-2xl font-display font-bold">{allLogs.length}</p>
        </CardContent></Card>
      </div>

      {/* Filtres */}
      <div className="flex gap-3">
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Toutes les actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
              ) : filtered.length > 0 ? (
                filtered.map((log) => {
                  const Icon = ACTION_ICONS[log.action] || Activity;
                  const colorClass = ACTION_COLORS[log.action] || "bg-muted text-muted-foreground";
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{getProfileName(log.user_id)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={`gap-1 border-0 ${colorClass}`}>
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
                    Aucune activité
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