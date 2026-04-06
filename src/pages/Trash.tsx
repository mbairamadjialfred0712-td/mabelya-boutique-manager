import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw, Package, UserRound } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import { logActivity } from "@/hooks/useActivityLog";

export default function TrashPage() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  if (!hasRole("super_admin")) return <Navigate to="/" replace />;

  const { data: archivedProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ["trash-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, boutiques(name, countries(name))")
        .eq("is_archived", true)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: archivedClients, isLoading: loadingClients } = useQuery({
    queryKey: ["trash-clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("*, boutiques(name), countries(name)")
        .eq("is_archived", true)
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const restoreProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").update({ is_archived: false }).eq("id", id);
      if (error) throw error;
      await logActivity("restore_product", `Produit restauré depuis la corbeille`, "products", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit restauré");
    },
  });

  const restoreClient = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").update({ is_archived: false }).eq("id", id);
      if (error) throw error;
      await logActivity("restore_client", `Client restauré depuis la corbeille`, "clients", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trash-clients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client restauré");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-destructive" /> Corbeille
        </h1>
        <p className="text-sm text-muted-foreground">Récupérez les stocks et clients supprimés</p>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" /> Produits ({archivedProducts?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="clients" className="gap-2">
            <UserRound className="h-4 w-4" /> Clients ({archivedClients?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Boutique</TableHead>
                    <TableHead className="hidden md:table-cell">Pays</TableHead>
                    <TableHead className="text-right">Prix vente</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingProducts ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                  ) : archivedProducts?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Corbeille vide</TableCell></TableRow>
                  ) : (
                    archivedProducts?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-sm">{(p.boutiques as any)?.name}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{(p.boutiques as any)?.countries?.name}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(p.selling_price)}</TableCell>
                        <TableCell className="text-right text-sm">{p.stock_quantity}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => restoreProduct.mutate(p.id)}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Restaurer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead className="hidden md:table-cell">Pays</TableHead>
                    <TableHead className="text-right">Total dépensé</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingClients ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
                  ) : archivedClients?.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Corbeille vide</TableCell></TableRow>
                  ) : (
                    archivedClients?.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.full_name}</TableCell>
                        <TableCell className="text-sm">{c.phone ?? "—"}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{(c.countries as any)?.name ?? "—"}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(c.total_spent)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => restoreClient.mutate(c.id)}>
                            <RotateCcw className="h-4 w-4 mr-1" /> Restaurer
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
