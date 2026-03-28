import { useState } from "react";
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
import { Plus, ShoppingCart, Trash2, Download } from "lucide-react";
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
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("*").order("name");
      return data ?? [];
    },
  });

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, boutiques(name, country_id, countries(name)), sale_items(quantity, unit_price, products(name))")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-for-sale"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, selling_price, stock_quantity, boutique_id, boutiques(id, name)")
        .gt("stock_quantity", 0)
        .order("name");
      return data ?? [];
    },
  });

  const { data: boutiques } = useQuery({
    queryKey: ["boutiques"],
    queryFn: async () => {
      const { data } = await supabase.from("boutiques").select("id, name, country_id, countries(name)").order("name");
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

      // Vérification stock avant insertion
      for (const item of saleData.items) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity, name")
          .eq("id", item.product_id)
          .single();
        if (!product || product.stock_quantity < item.quantity) {
          throw new Error(`Stock insuffisant pour "${product?.name ?? item.product_id}"`);
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

      // Décrémentation du stock
      for (const item of saleData.items) {
        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.product_id)
          .single();
        if (product) {
          await supabase
            .from("products")
            .update({ stock_quantity: product.stock_quantity - item.quantity })
            .eq("id", item.product_id);
        }
      }
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

  const filteredBoutiques = boutiques?.filter(
    (b) => filterCountry === "all" || (b as any).country_id === filterCountry
  );

  const filtered = sales?.filter((s) => {
    const matchCountry = filterCountry === "all" || (s.boutiques as any)?.country_id === filterCountry;
    const matchBoutique = filterBoutique === "all" || s.boutique_id === filterBoutique;
    return matchCountry && matchBoutique;
  });

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Ventes — Mabelya", 14, 22);
    doc.setFontSize(10);
    doc.text(
      `${filtered?.length ?? 0} ventes — ${new Date().toLocaleDateString("fr-FR")}`,
      14,
      30
    );
    const rows = (filtered ?? []).map((s) => [
      s.invoice_number,
      (s.boutiques as any)?.name ?? "—",
      s.customer_name ?? "—",
      s.payment_method,
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
    doc.save("ventes-mabelya.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Ventes</h1>
          <p className="text-muted-foreground text-sm">{filtered?.length ?? 0} ventes</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
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
                boutiques={boutiques ?? []}
                onSubmit={(data) => createSale.mutate(data)}
                loading={createSale.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filterCountry}
          onValueChange={(v) => {
            setFilterCountry(v);
            setFilterBoutique("all");
          }}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Pays" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous pays</SelectItem>
            {countries?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterBoutique} onValueChange={setFilterBoutique}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Boutique" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes boutiques</SelectItem>
            {filteredBoutiques?.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facture</TableHead>
                <TableHead className="hidden md:table-cell">Boutique</TableHead>
                <TableHead className="hidden lg:table-cell">Pays</TableHead>
                <TableHead className="hidden md:table-cell">Client</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : filtered && filtered.length > 0 ? (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoice_number}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {(s.boutiques as any)?.name}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {(s.boutiques as any)?.countries?.name}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {s.customer_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {s.payment_method === "cash"
                          ? "Espèces"
                          : s.payment_method === "mobile_money"
                          ? "Mobile Money"
                          : "Virement"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      {formatCurrency(Number(s.total_amount))}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune vente
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

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    const qtyNum = Number(qty);
    if (qtyNum <= 0) { toast.error("La quantité doit être supérieure à 0"); return; }
    if (qtyNum > product.stock_quantity) { toast.error(`Stock insuffisant — seulement ${product.stock_quantity} disponible(s)`); return; }
    const existing = cart.find((c) => c.product_id === selectedProduct);
    if (existing) {
      const newQty = existing.quantity + qtyNum;
      if (newQty > product.stock_quantity) { toast.error(`Stock insuffisant — seulement ${product.stock_quantity} disponible(s)`); return; }
      setCart(cart.map((c) => c.product_id === selectedProduct ? { ...c, quantity: newQty } : c));
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          quantity: qtyNum,
          unit_price: Number(product.selling_price),
        },
      ]);
    }
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
      {/* Boutique & Paiement */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Boutique *</Label>
          <Select value={boutiqueId} onValueChange={setBoutiqueId}>
            <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {boutiques.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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

      {/* Client */}
      <div className="space-y-2">
        <Label>Nom du client (optionnel)</Label>
        <Input
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder="Ex: Aminata Koné"
        />
      </div>

      {/* Panier */}
      <div className="border border-border rounded-lg p-3 space-y-3">
        <Label className="text-sm font-semibold">Ajouter des produits</Label>

        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Produit</Label>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger><SelectValue placeholder="Choisir un produit" /></SelectTrigger>
              <SelectContent>
                {products.length === 0 ? (
                  <SelectItem value="__empty__" disabled>Aucun produit en stock</SelectItem>
                ) : (
                  products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {formatCurrency(Number(p.selling_price))} (stock: {p.stock_quantity})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="w-20 space-y-1">
            <Label className="text-xs text-muted-foreground">Qté</Label>
            <Input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={addToCart}
            disabled={!selectedProduct}
            className="whitespace-nowrap"
          >
            + Ajouter
          </Button>
        </div>

        {/* Message si panier vide */}
        {cart.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2 border border-dashed border-border rounded-md">
            Sélectionnez un produit puis cliquez sur "+ Ajouter"
          </p>
        )}

        {/* Articles dans le panier */}
        {cart.length > 0 && (
          <div className="space-y-2">
            {cart.map((item) => (
              <div
                key={item.product_id}
                className="flex items-center justify-between text-sm bg-muted rounded-md px-3 py-2"
              >
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCurrency(item.quantity * item.unit_price)}</span>
                  <button
                    type="button"
                    onClick={() => setCart(cart.filter((c) => c.product_id !== item.product_id))}
                    className="hover:opacity-70 transition-opacity"
                  >
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

      {/* Bouton enregistrer */}
      <Button
        type="submit"
        className="w-full"
        disabled={loading || cart.length === 0 || !boutiqueId || !paymentMethod}
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        {loading ? "Enregistrement..." : `Enregistrer — ${formatCurrency(total)}`}
      </Button>
    </form>
  );
}