import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductImageUpload } from "./ProductImageUpload";
import { toast } from "sonner";

interface AddProductFormProps {
  categories: any[];
  boutiques: any[];
  onSubmit: (data: any) => void;
  loading: boolean;
}

export function AddProductForm({ categories, boutiques, onSubmit, loading }: AddProductFormProps) {
  const [form, setForm] = useState({
    name: "", category_id: "", size: "", color: "",
    purchase_price: "", selling_price: "", stock_quantity: "", boutique_id: "", image_url: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.boutique_id || !form.selling_price) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    const qty = Number(form.stock_quantity) || 0;
    onSubmit({
      ...form,
      purchase_price: Number(form.purchase_price) || 0,
      selling_price: Number(form.selling_price),
      stock_quantity: qty,
      stock_initial: qty,
      category_id: form.category_id || null,
      image_url: form.image_url || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ProductImageUpload
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
