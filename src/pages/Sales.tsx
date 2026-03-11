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
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export default function Sales() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, boutiques(name, countries(name)), sale_items(quantity, unit_price, products(name))")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-for-sale"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name, selling_price, stock_quantity, boutiques(id, name)")
        .gt("stock_quantity", 0)
        .order("name");
      return data ?? [];
    },
  });

  const { data: boutiques } = useQuery({
    queryKey: ["boutiques"],
    queryFn: async () => {
      const { data } = await supabase.from("boutiques").select("id, name").order("name");
      return data ?? [];
    },
  });

  const createSale = useMutation({
    mutationFn: async (saleData: {
      boutique_id: string; customer_name: string; payment_method: string; items: CartItem[];
    }) => {
      const total = saleData.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Ventes</h1>
          <p className="text-muted-foreground text-sm">{sales?.length ?? 0} ventes récentes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Nouvelle vente</Button>
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facture</TableHead>
                <TableHead className="hidden md:table-cell">Boutique</TableHead>
                <TableHead className="hidden md:table-cell">Client</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="hidden lg:table-cell">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell></TableRow>
              ) : sales && sales.length > 0 ? (
                sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.invoice_number}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{(s.boutiques as any)?.name}</TableCell>
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
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune vente</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NewSaleForm({
  products, boutiques, onSubmit, loading,
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

  const filteredProducts = products.filter(
    (p) => !boutiqueId || (p.boutiques as any)?.id === boutiqueId
  );

  const addToCart = () => {
    const product = products.find((p) => p.id === selectedProduct);
    if (!product) return;
    if (Number(qty) > product.stock_quantity) {
      toast.error("Stock insuffisant");
      return;
    }
    const existing = cart.find((c) => c.product_id === selectedProduct);
    if (existing) {
      setCart(cart.map((c) =>
        c.product_id === selectedProduct ? { ...c, quantity: c.quantity + Number(qty) } : c
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        quantity: Number(qty),
        unit_price: Number(product.selling_price),
      }]);
    }
    setSelectedProduct("");
    setQty("1");
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((c) => c.product_id !== productId));
  };

  const total = cart.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!boutiqueId || !paymentMethod || cart.length === 0) {
      toast.error("Veuillez remplir tous les champs et ajouter des produits");
      return;
    }
    onSubmit({ boutique_id: boutiqueId, customer_name: customerName, payment_method: paymentMethod, items: cart });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(val);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Boutique *</Label>
          <Select value={boutiqueId} onValueChange={setBoutiqueId}>
            <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
            <SelectContent>
              {boutiques.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
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
      <div className="space-y-2">
        <Label>Nom du client (optionnel)</Label>
        <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nom du client" />
      </div>

      <div className="border border-border rounded-lg p-3 space-y-3">
        <Label className="text-sm font-semibold">Ajouter des produits</Label>
        <div className="flex gap-2">
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Produit" /></SelectTrigger>
            <SelectContent>
              {filteredProducts.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} (stock: {p.stock_quantity})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-20"
          />
          <Button type="button" variant="secondary" onClick={addToCart} disabled={!selectedProduct}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {cart.length > 0 && (
          <div className="space-y-2">
            {cart.map((item) => (
              <div key={item.product_id} className="flex items-center justify-between text-sm bg-muted rounded-md px-3 py-2">
                <div>
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{formatCurrency(item.quantity * item.unit_price)}</span>
                  <button type="button" onClick={() => removeFromCart(item.product_id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
            <div className="text-right font-bold text-sm pt-2 border-t border-border">
              Total: {formatCurrency(total)}
            </div>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={loading || cart.length === 0}>
        <ShoppingCart className="h-4 w-4 mr-2" />
        {loading ? "Enregistrement..." : `Enregistrer la vente — ${formatCurrency(total)}`}
      </Button>
    </form>
  );
}
