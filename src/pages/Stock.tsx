import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Package, Search } from "lucide-react";
import { toast } from "sonner";

export default function Stock() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

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
      name: string; category_id: string; size: string; color: string;
      purchase_price: number; selling_price: number; stock_quantity: number; boutique_id: string;
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered && filtered.length > 0 ? (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
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
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun produit trouvé</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AddProductForm({
  categories, boutiques, onSubmit, loading,
}: {
  categories: any[];
  boutiques: any[];
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    name: "", category_id: "", size: "", color: "",
    purchase_price: "", selling_price: "", stock_quantity: "", boutique_id: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.boutique_id || !form.selling_price) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    onSubmit({
      ...form,
      purchase_price: Number(form.purchase_price) || 0,
      selling_price: Number(form.selling_price),
      stock_quantity: Number(form.stock_quantity) || 0,
      category_id: form.category_id || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Nom du produit *</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
            <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Boutique *</Label>
          <Select value={form.boutique_id} onValueChange={(v) => setForm({ ...form, boutique_id: v })}>
            <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {boutiques.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name} — {(b.countries as any)?.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Taille</Label>
          <Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="S, M, L..." />
        </div>
        <div className="space-y-2">
          <Label>Couleur</Label>
          <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Prix d'achat</Label>
          <Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Prix de vente *</Label>
          <Input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Quantité en stock</Label>
          <Input type="number" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Ajout en cours..." : "Ajouter le produit"}
      </Button>
    </form>
  );
}
