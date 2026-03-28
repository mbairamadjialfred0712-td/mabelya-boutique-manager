import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/constants";

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

  // 🔥 FETCH SALES
  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // 🔥 CREATE SALE
  const createSale = useMutation({
    mutationFn: async (saleData: any) => {
      const total = saleData.items.reduce(
        (sum: number, i: any) => sum + i.quantity * i.unit_price,
        0
      );

      const { data: sale, error } = await supabase
        .from("sales")
        .insert({
          boutique_id: saleData.boutique_id,
          user_id: user!.id,
          customer_name: saleData.customer_name || null,
          payment_method: saleData.payment_method,
          total_amount: total,
          status: "pending", // 🔥 IMPORTANT
        })
        .select()
        .single();

      if (error) throw error;

      const items = saleData.items.map((i: any) => ({
        sale_id: sale.id,
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.quantity * i.unit_price,
      }));

      const { error: itemError } = await supabase
        .from("sale_items")
        .insert(items);

      if (itemError) throw itemError;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Vente créée ✅");
      setOpen(false);
    },

    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  // 🔥 VALIDATE SALE
  const validateSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sales")
        .update({ status: "validated" })
        .eq("id", id);

      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast.success("Vente validée ✅");
    },

    onError: (err: any) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Ventes</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle vente
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouvelle vente</DialogTitle>
            </DialogHeader>

            <NewSaleForm
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
                <TableHead>Client</TableHead>
                <TableHead>Paiement</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>Chargement...</TableCell>
                </TableRow>
              ) : sales?.length ? (
                sales.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.customer_name || "—"}</TableCell>

                    <TableCell>{s.payment_method}</TableCell>

                    <TableCell>
                      {formatCurrency(Number(s.total_amount))}
                    </TableCell>

                    {/* STATUS */}
                    <TableCell>
                      <Badge
                        variant={
                          s.status === "validated"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {s.status === "validated"
                          ? "Validée"
                          : "En attente"}
                      </Badge>
                    </TableCell>

                    {/* ACTION */}
                    <TableCell>
                      {s.status !== "validated" && (
                        <Button
                          size="sm"
                          onClick={() => validateSale.mutate(s.id)}
                        >
                          Valider
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5}>Aucune vente</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// 🔥 FORMULAIRE SIMPLE
function NewSaleForm({
  onSubmit,
  loading,
}: {
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const [customer, setCustomer] = useState("");
  const [payment, setPayment] = useState("");

  const handleSubmit = (e: any) => {
    e.preventDefault();

    onSubmit({
      boutique_id: "demo", // ⚠️ adapte si besoin
      customer_name: customer,
      payment_method: payment,
      items: [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Client"
        value={customer}
        onChange={(e) => setCustomer(e.target.value)}
      />

      <Select value={payment} onValueChange={setPayment}>
        <SelectTrigger>
          <SelectValue placeholder="Paiement" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cash">Cash</SelectItem>
          <SelectItem value="mobile">Mobile</SelectItem>
        </SelectContent>
      </Select>

      <Button type="submit" disabled={loading}>
        {loading ? "..." : "Créer vente"}
      </Button>
    </form>
  );
}