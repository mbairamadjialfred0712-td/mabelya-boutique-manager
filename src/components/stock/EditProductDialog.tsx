import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductImageUpload } from "./ProductImageUpload";
import { toast } from "sonner";

interface EditProductDialogProps {
  product: any;
  categories: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  loading: boolean;
}

export function EditProductDialog({ product, categories, open, onOpenChange, onSubmit, loading }: EditProductDialogProps) {
  const [form, setForm] = useState({
    name: "", category_id: "", size: "", color: "",
    purchase_price: "", selling_price: "", stock_quantity: "", image_url: "",
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name ?? "",
        category_id: product.category_id ?? "",
        size: product.size ?? "",
        color: product.color ?? "",
        purchase_price: String(product.purchase_price ?? 0),
        selling_price: String(product.selling_price ?? 0),
        stock_quantity: String(product.stock_quantity ?? 0),
        image_url: product.image_url ?? "",
      });
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.selling_price) {
      toast.error("Nom et prix de vente requis");
      return;
    }
    onSubmit({
      id: product.id,
      name: form.name,
      category_id: form.category_id || null,
      size: form.size || null,
      color: form.color || null,
      purchase_price: Number(form.purchase_price) || 0,
      selling_price: Number(form.selling_price),
      stock_quantity: Number(form.stock_quantity) || 0,
      image_url: form.image_url || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Modifier le produit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ProductImageUpload
            currentUrl={form.image_url}
            onUploaded={(url) => setForm({ ...form, image_url: url })}
          />
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
            {loading ? "Modification..." : "Enregistrer les modifications"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
