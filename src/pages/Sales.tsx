import { useState, useEffect } from "react";
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, ShoppingCart, Trash2, Download, Archive, ArchiveRestore, FileSpreadsheet } from "lucide-react";
import { exportCSV } from "@/lib/exportCSV";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface CartItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export default function Sales() {
  const [open, setOpen] = useState(false);
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterBoutique, setFilterBoutique] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const queryClient = useQueryClient();
  const { user, hasRole, userBoutiqueId, userCountryId, loading: authLoading } = useAuth();

  const isSuperAdmin = hasRole("super_admin");
  const isAdminBoutique = hasRole("admin_boutique");
  const isVendeur = !isSuperAdmin && !isAdminBoutique;

  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales", isVendeur ? user?.id : "all"],
    queryFn: async () => {
      let query = supabase
        .from("sales")
        .select("*, boutiques(name, country_id, countries(name)), sale_items(quantity, unit_price, products(name))")
        .order("created_at", { ascending: false })
        .limit(100);

      // Vendeur voit uniquement ses propres ventes
      if (isVendeur && user?.id) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-for-sale", userBoutiqueId, userCountryId],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, selling_price, purchase_price, stock_quantity, boutique_id, is_active, is_archived, boutiques(id, name, country_id)")
        .eq("is_archived", false)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .order("name");

      if (isSuperAdmin) {
        // super_admin voit tous les produits
      } else if (isAdminBoutique && userCountryId) {
        // admin_boutique voit tous les produits de son pays
        query = query.eq("boutiques.country_id", userCountryId);
      } else if (userBoutiqueId) {
        // vendeur voit uniquement les produits de sa boutique
        query = query.eq("boutique_id", userBoutiqueId);
      }

      const { data, error } = await query;
      if (error) return [];

      // Filtre côté client pour admin_boutique (le join filter ne fonctionne pas toujours côté Supabase)
      if (!isSuperAdmin && isAdminBoutique && userCountryId) {
        return (data ?? []).filter((p: any) => p.boutiques?.country_id === userCountryId);
      }

      return data ?? [];
    },
    enabled: !authLoading && (isSuperAdmin || (isAdminBoutique && !!userCountryId) || !!userBoutiqueId),
  });

  const { data: boutiques } = useQuery({
    queryKey: ["boutiques"],
    queryFn: async () => {
      const { data } = await supabase
        .from("boutiques")
        .select("id, name, country_id, countries(name)")
        .order("name");
      return data ?? [];
    },
  });

  const createSale = useMutation({
    mutationFn: async (saleData: {
      boutique_id: string;
      customer_name: string;
      payment_method: string;
      items: CartItem[];
    }) => {
      const total = saleData.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

      for (const item of saleData.items) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity, name, is_archived, is_active, boutique_id")
          .eq("id", item.product_id)
          .single();
        if (!product || product.is_archived || !product.is_active || product.boutique_id !== saleData.boutique_id) {
          throw new Error(`"${product?.name ?? item.product_id}" n'est plus disponible pour cette boutique`);
        }
        if (!product || product.stock_quantity < item.quantity) {
          throw new Error(`Stock insuffisant pour "${product?.name ?? item.product_id}" — seulement ${product?.stock_quantity ?? 0} disponible(s)`);
        }
      }

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          boutique_id: saleData.boutique_id,
          user_id: user!.id,
          customer_name: saleData.customer_name || null,
          payment_method: saleData.payment_method,
          total_amount: total,
        })
        .select()
        .single();
      if (saleError) throw saleError;

      const items = saleData.items.map((i) => ({
        sale_id: sale.id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.quantity * i.unit_price,
      }));
      const { error: itemsError } = await supabase.from("sale_items").insert(items);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-for-sale"] });
      setOpen(false);
      toast.success("Vente enregistrée avec succès !");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const archiveSale = useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase.from("sales").update({ status: archive ? "archived" : "pending" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Vente mise à jour");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteSale = useMutation({
    mutationFn: async (id: string) => {
      const { error: itemsErr } = await supabase.from("sale_items").delete().eq("sale_id", id);
      if (itemsErr) throw itemsErr;
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Vente supprimée");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredBoutiques = boutiques?.filter(
    (b) => filterCountry === "all" || (b as any).country_id === filterCountry
  );

  const filtered = sales?.filter((s) => {
    const matchCountry = filterCountry === "all" || (s.boutiques as any)?.country_id === filterCountry;
    const matchBoutique = filterBoutique === "all" || s.boutique_id === filterBoutique;
    const matchArchived = showArchived ? s.status === "archived" : s.status !== "archived";
    return matchCountry && matchBoutique && matchArchived;
  });

  // Stats vendeur
  const totalVentes = filtered?.length ?? 0;
  const totalMontant = filtered?.reduce((sum, s) => sum + Number(s.total_amount), 0) ?? 0;

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(isVendeur ? "Mes ventes — Mabelya" : "Ventes — Mabelya", 14, 22);
    doc.setFontSize(10);
    doc.text(`${filtered?.length ?? 0} ventes — ${new Date().toLocaleDateString("fr-FR")}`, 14, 30);
    const rows = (filtered ?? []).map((s) => [
      s.invoice_number,
      (s.boutiques as any)?.name ?? "—",
      s.customer_name ?? "—",
      s.payment_method === "cash" ? "Espèces" : s.payment_method === "mobile_money" ? "Mobile Money" : "Virement",
      formatCurrency(Number(s.total_amount)),
      new Date(s.created_at).toLocaleDateString("fr-FR"),
    ]);
    (doc as any).autoTable({
      startY: 36,
      head: [["Facture", "Boutique", "Client", "Paiement", "Montant", "Date"]],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 50, 80] },
    });
    doc.save(isVendeur ? "mes-ventes-mabelya.pdf" : "ventes-mabelya.pdf");
  };

  const exportSalesCSV = () => {
    const headers = ["Facture", "Boutique", "Client", "Paiement", "Montant", "Date"];
    const rows = (filtered ?? []).map((s) => [
      s.invoice_number, (s.boutiques as any)?.name, s.customer_name,
      s.payment_method === "cash" ? "Espèces" : s.payment_method === "mobile_money" ? "Mobile Money" : "Virement",
      Number(s.total_amount), new Date(s.created_at).toLocaleDateString("fr-FR"),
    ]);
    exportCSV(isVendeur ? "mes-ventes-mabelya.csv" : "ventes-mabelya.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">
            {showArchived ? "Ventes archivées" : isVendeur ? "Mes ventes" : "Ventes"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {totalVentes} vente{totalVentes > 1 ? "s" : ""}{showArchived ? " archivée(s)" : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={exportSalesCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" /> CSV
          </Button>
          {(isSuperAdmin || isAdminBoutique) && (
            <Button
              variant={showArchived ? "default" : "outline"}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className={showArchived ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              <Archive className="h-4 w-4 mr-2" />
              {showArchived ? "Voir actives" : "Voir archivées"}
            </Button>
          )}
          {!showArchived && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" /> Nouvelle vente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-display">Enregistrer une vente</DialogTitle>
              </DialogHeader>
              <NewSaleForm
                products={products ?? []}
                boutiques={
                  isSuperAdmin
                    ? (boutiques ?? [])
                    : isAdminBoutique && userCountryId
                    ? (boutiques ?? []).filter((b: any) => b.country_id === userCountryId)
                    : (boutiques ?? []).filter((b) => b.id === userBoutiqueId)
                }
                onSubmit={(data) => createSale.mutate(data)}
                loading={createSale.isPending}
              />
            </DialogContent>
          </Dialog>
          )}
        </div>
      </div>

      {/* Info banner for archived view */}
      {showArchived && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
          📦 Les ventes archivées sont conservées pour l'historique. Vous pouvez les restaurer à tout moment.
        </div>
      )}

      {/* Stats rapides pour vendeur */}
      {isVendeur && (
        <div className="grid grid-cols-2 gap-4">
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Mes ventes</p>
            <p className="text-2xl font-display font-bold">{totalVentes}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Mon chiffre d'affaires</p>
            <p className="text-2xl font-display font-bold text-primary">{formatCurrency(totalMontant)}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Filtres — cachés pour vendeur */}
      {!isVendeur && (
        <div className="flex flex-wrap gap-3">
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
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facture</TableHead>
                <TableHead className="hidden md:table-cell">Boutique</TableHead>
                {!isVendeur && <TableHead className="hidden lg:table-cell">Pays</TableHead>}
                <TableHead className="hidden md:table-cell">Client</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
                {(isSuperAdmin || isAdminBoutique) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : filtered && filtered.length > 0 ? (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoice_number}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{(s.boutiques as any)?.name}</TableCell>
                    {!isVendeur && <TableCell className="hidden lg:table-cell text-sm">{(s.boutiques as any)?.countries?.name}</TableCell>}
                    <TableCell className="hidden md:table-cell text-sm">{s.customer_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {s.payment_method === "cash" ? "Espèces" : s.payment_method === "mobile_money" ? "Mobile Money" : "Virement"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">{formatCurrency(Number(s.total_amount))}</TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    {(isSuperAdmin || isAdminBoutique) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => archiveSale.mutate({ id: s.id, archive: s.status !== "archived" })}
                            title={s.status === "archived" ? "Restaurer" : "Archiver"}
                          >
                            {s.status === "archived" ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4 text-muted-foreground" />}
                          </Button>
                          {isSuperAdmin && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer cette vente ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    La vente {s.invoice_number} sera définitivement supprimée. Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteSale.mutate(s.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {isVendeur ? "Vous n'avez pas encore enregistré de vente" : "Aucune vente"}
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

function NewSaleForm({
  products,
  boutiques,
  onSubmit,
  loading,
}: {
  products: any[];
  boutiques: any[];
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const [boutiqueId, setBoutiqueId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [qty, setQty] = useState("1");
  const availableProducts = products.filter((product) => (
    product.is_archived === false &&
    product.is_active === true &&
    Number(product.stock_quantity) > 0
  ));
  const productsForSelectedBoutique = boutiqueId
    ? availableProducts.filter((product) => product.boutique_id === boutiqueId)
    : availableProducts;

  // Auto-sélectionner la boutique si une seule disponible
  useEffect(() => {
    if (boutiques.length === 1 && !boutiqueId) {
      setBoutiqueId(boutiques[0].id);
    }
  }, [boutiques]);

  const getPrice = (product: any): number => {
    const price = Number(product.selling_price ?? product.purchase_price ?? 0);
    return isNaN(price) ? 0 : price;
  };

  useEffect(() => {
    setSelectedProduct("");
    setCart([]);
  }, [boutiqueId]);

  const addToCart = () => {
    const product = productsForSelectedBoutique.find((p) => p.id === selectedProduct);
    if (!product) { toast.error("Veuillez sélectionner un produit"); return; }
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) { toast.error("La quantité doit être supérieure à 0"); return; }
    if (qtyNum > product.stock_quantity) {
      toast.error(`Stock insuffisant — seulement ${product.stock_quantity} disponible(s)`);
      return;
    }
    const unitPrice = getPrice(product);
    const existing = cart.find((c) => c.product_id === selectedProduct);
    if (existing) {
      const newQty = existing.quantity + qtyNum;
      if (newQty > product.stock_quantity) {
        toast.error(`Stock insuffisant — seulement ${product.stock_quantity} disponible(s)`);
        return;
      }
      setCart((prev) => prev.map((c) =>
        c.product_id === selectedProduct ? { ...c, quantity: newQty } : c
      ));
    } else {
      setCart((prev) => [...prev, {
        product_id: product.id,
        name: product.name,
        quantity: qtyNum,
        unit_price: unitPrice,
      }]);
    }
    toast.success(`${product.name} ajouté au panier !`);
    setSelectedProduct("");
    setQty("1");
  };

  const total = cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boutiqueId) { toast.error("Veuillez sélectionner une boutique"); return; }
    if (!paymentMethod) { toast.error("Veuillez sélectionner un mode de paiement"); return; }
    if (cart.length === 0) { toast.error("Veuillez ajouter au moins un produit au panier"); return; }
    onSubmit({ boutique_id: boutiqueId, customer_name: customerName, payment_method: paymentMethod, items: cart });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Boutique *</Label>
          <Select value={boutiqueId} onValueChange={setBoutiqueId} disabled={boutiques.length === 1}>
            <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {boutiques.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {boutiques.length === 1 && (
            <p className="text-xs text-muted-foreground">Boutique assignée automatiquement</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Paiement *</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Espèces</SelectItem>
              <SelectItem value="mobile_money">Mobile Money</SelectItem>
              <SelectItem value="bank_transfer">Virement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nom du client (optionnel)</Label>
        <Input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Ex: Aminata Koné"
        />
      </div>

      <div className="border border-border rounded-lg p-3 space-y-3">
        <Label className="text-sm font-semibold">
          Ajouter des produits
          <span className="text-xs font-normal text-muted-foreground ml-2">
            ({productsForSelectedBoutique.length} en stock)
          </span>
        </Label>
        <Select value={selectedProduct} onValueChange={setSelectedProduct} disabled={!boutiqueId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={boutiqueId ? "Choisir un produit" : "Choisir d'abord une boutique"} />
          </SelectTrigger>
          <SelectContent>
            {!boutiqueId ? (
              <SelectItem value="__no_boutique__" disabled>Choisir d'abord une boutique</SelectItem>
            ) : productsForSelectedBoutique.length === 0 ? (
              <SelectItem value="__empty__" disabled>Aucun produit en stock</SelectItem>
            ) : (
              productsForSelectedBoutique.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(getPrice(p))} (stock: {p.stock_quantity})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-24" placeholder="Qté" />
          <Button type="button" onClick={addToCart} disabled={!selectedProduct} className="flex-1">
            <Plus className="h-4 w-4 mr-1" /> Ajouter au panier
          </Button>
        </div>
        {cart.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-3 border border-dashed border-border rounded-md">
            Sélectionnez un produit puis cliquez "Ajouter au panier"
          </p>
        )}
        {cart.length > 0 && (
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.product_id} className="flex items-center justify-between text-sm bg-muted rounded-md px-3 py-2">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(item.quantity * item.unit_price)}</span>
                  <button type="button" onClick={() => setCart((prev) => prev.filter((c) => c.product_id !== item.product_id))} className="hover:opacity-70 transition-opacity">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
            <div className="text-right font-bold text-sm pt-2 border-t border-border">
              Total : {formatCurrency(total)}
            </div>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading || cart.length === 0 || !boutiqueId || !paymentMethod}>
        <ShoppingCart className="h-4 w-4 mr-2" />
        {loading ? "Enregistrement..." : `Enregistrer — ${formatCurrency(total)}`}
      </Button>
    </form>
  );
}