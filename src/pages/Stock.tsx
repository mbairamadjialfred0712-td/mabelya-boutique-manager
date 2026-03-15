import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Package, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AddProductForm } from "@/components/stock/AddProductForm";
import { EditProductDialog } from "@/components/stock/EditProductDialog";

export default function Stock() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<any>(null);
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole("super_admin");

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name), boutiques(name, countries(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
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

  const addProduct = useMutation({
    mutationFn: async (product: {
      name: string; category_id: string | null; size: string; color: string;
      purchase_price: number; selling_price: number; stock_quantity: number;
      boutique_id: string; image_url: string | null;
    }) => {
      const { error } = await supabase.from("products").insert(product);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      toast.success("Produit ajouté avec succès");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateProduct = useMutation({
    mutationFn: async (product: any) => {
      const { id, ...updates } = product;
      const { error } = await supabase.from("products").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditProduct(null);
      toast.success("Produit modifié avec succès");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit supprimé");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = products?.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Gestion du stock</h1>
          <p className="text-muted-foreground text-sm">{products?.length ?? 0} produits</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Ajouter un produit</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-display">Nouveau produit</DialogTitle>
            </DialogHeader>
            <AddProductForm
              categories={categories ?? []}
              boutiques={boutiques ?? []}
              onSubmit={(data) => addProduct.mutate(data)}
              loading={addProduct.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                <TableHead className="hidden md:table-cell">Taille</TableHead>
                <TableHead className="hidden lg:table-cell">Boutique</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered && filtered.length > 0 ? (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          {p.color && <p className="text-xs text-muted-foreground">{p.color}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{(p.categories as any)?.name ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.size ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {(p.boutiques as any)?.name}
                      <span className="text-xs text-muted-foreground block">
                        {(p.boutiques as any)?.countries?.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(Number(p.selling_price))}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.stock_quantity < 5 ? "destructive" : "secondary"}>
                        {p.stock_quantity}
                      </Badge>
                    </TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditProduct(p)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Supprimer ce produit ?")) deleteProduct.mutate(p.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun produit trouvé</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editProduct && (
        <EditProductDialog
          product={editProduct}
          categories={categories ?? []}
          open={!!editProduct}
          onOpenChange={(o) => { if (!o) setEditProduct(null); }}
          onSubmit={(data) => updateProduct.mutate(data)}
          loading={updateProduct.isPending}
        />
      )}
    </div>
  );
}
