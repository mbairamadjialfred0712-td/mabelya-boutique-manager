import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Package, Search, Pencil, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import { AddProductForm } from "@/components/stock/AddProductForm";
import { EditProductDialog } from "@/components/stock/EditProductDialog";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function Stock() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [editProduct, setEditProduct] = useState<any>(null);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterBoutique, setFilterBoutique] = useState<string>("all");
  const queryClient = useQueryClient();
  const { hasRole, user } = useAuth();

  const isSuperAdmin = hasRole("super_admin");
  const isAdminBoutique = hasRole("admin_boutique");
  const isVendeur = !isSuperAdmin && !isAdminBoutique;
  const canManage = isSuperAdmin || isAdminBoutique;

  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", isVendeur ? user?.id : "all"],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(name), boutiques(name, country_id, countries(name))")
        .order("created_at", { ascending: false });

      // Vendeur voit uniquement les produits en stock
      if (isVendeur) {
        query = query.gt("stock_quantity", 0);
      }

      const { data, error } = await query;
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
    mutationFn: async (product: any) => {
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

  const filteredBoutiques = boutiques?.filter(
    (b) => filterCountry === "all" || (b as any).country_id === filterCountry
  );

  const filtered = products?.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCountry = filterCountry === "all" || (p.boutiques as any)?.country_id === filterCountry;
    const matchBoutique = filterBoutique === "all" || p.boutique_id === filterBoutique;
    return matchSearch && matchCountry && matchBoutique;
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Gestion du Stock — Mabelya", 14, 22);
    doc.setFontSize(10);
    doc.text(`${filtered?.length ?? 0} produits — ${new Date().toLocaleDateString("fr-FR")}`, 14, 30);
    const rows = (filtered ?? []).map((p) => [
      p.name,
      (p.categories as any)?.name ?? "—",
      formatCurrency(Number(p.selling_price)),
      p.stock_quantity,
      (p.boutiques as any)?.name ?? "—",
      (p.boutiques as any)?.countries?.name ?? "—",
      new Date(p.created_at).toLocaleDateString("fr-FR"),
      p.stock_quantity > 0 ? "En stock" : "Rupture",
    ]);
    (doc as any).autoTable({
      startY: 36,
      head: [["Produit", "Catégorie", "Prix", "Stock", "Boutique", "Pays", "Créé le", "Statut"]],
      body: rows,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [200, 50, 80] },
    });
    doc.save("stock-mabelya.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">
            {isVendeur ? "Produits disponibles" : "Gestion du stock"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {filtered?.length ?? 0} produit{(filtered?.length ?? 0) > 1 ? "s" : ""}
            {isVendeur && " en stock"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
          {/* Bouton ajouter — uniquement pour admin */}
          {canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Ajouter un produit</Button>
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
          )}
        </div>
      </div>

      {/* Message info pour vendeur */}
      {isVendeur && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-700">
          ℹ️ Vous voyez uniquement les produits disponibles en stock. Contactez un administrateur pour ajouter ou modifier des produits.
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterBoutique("all"); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Pays" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous pays</SelectItem>
            {countries?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterBoutique} onValueChange={setFilterBoutique}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Boutique" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes boutiques</SelectItem>
            {filteredBoutiques?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead className="hidden md:table-cell">Catégorie</TableHead>
                <TableHead className="text-right">Prix</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="hidden lg:table-cell">Boutique</TableHead>
                <TableHead className="hidden lg:table-cell">Pays</TableHead>
                {canManage && <TableHead className="hidden xl:table-cell">Créé le</TableHead>}
                <TableHead>Statut</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 9 : 7} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filtered && filtered.length > 0 ? (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                          {p.image_url
                            ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                            : <Package className="h-5 w-5 text-muted-foreground" />
                          }
                        </div>
                        <div>
                          <p className="font-medium text-sm">{p.name}</p>
                          {p.color && (
                            <p className="text-xs text-muted-foreground">
                              {p.color}{p.size ? ` • ${p.size}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {(p.categories as any)?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(Number(p.selling_price))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={p.stock_quantity < 5 ? "destructive" : "secondary"}>
                        {p.stock_quantity}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {(p.boutiques as any)?.name}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {(p.boutiques as any)?.countries?.name}
                    </TableCell>
                    {canManage && (
                      <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("fr-FR")}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge
                        variant={p.stock_quantity > 0 ? "secondary" : "destructive"}
                        className="text-xs"
                      >
                        {p.stock_quantity > 0 ? "En stock" : "Rupture"}
                      </Badge>
                    </TableCell>
                    {/* Actions — uniquement pour admin */}
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditProduct(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
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
                <TableRow>
                  <TableCell colSpan={canManage ? 9 : 7} className="text-center py-8 text-muted-foreground">
                    {isVendeur ? "Aucun produit disponible en stock" : "Aucun produit trouvé"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editProduct && canManage && (
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