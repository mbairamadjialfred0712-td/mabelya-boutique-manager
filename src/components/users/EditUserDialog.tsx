import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userRole: string;
}

export function EditUserDialog({ open, onOpenChange, userId, userName, userRole }: EditUserDialogProps) {
  const queryClient = useQueryClient();
  const [countryId, setCountryId] = useState<string>("");
  const [boutiqueId, setBoutiqueId] = useState<string>("");

  const { data: countries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const { data } = await supabase.from("countries").select("*").order("name");
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

  // Load existing staff record for this user
  const { data: staffRecord, isLoading: loadingStaff } = useQuery({
    queryKey: ["staff-record", userId],
    enabled: open && !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("staff")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      return data;
    },
  });

  useEffect(() => {
    if (staffRecord) {
      setCountryId(staffRecord.country_id ?? "");
      setBoutiqueId(staffRecord.boutique_id ?? "");
    } else {
      setCountryId("");
      setBoutiqueId("");
    }
  }, [staffRecord, open]);

  const filteredBoutiques = boutiques?.filter(b => !countryId || b.country_id === countryId) ?? [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!countryId || !boutiqueId) {
        throw new Error("Veuillez sélectionner un pays et une boutique");
      }

      if (staffRecord) {
        // Update existing
        const { error } = await supabase
          .from("staff")
          .update({ country_id: countryId, boutique_id: boutiqueId, updated_at: new Date().toISOString() })
          .eq("id", staffRecord.id);
        if (error) throw error;
      } else {
        // Create new staff record
        const { error } = await supabase
          .from("staff")
          .insert({
            user_id: userId,
            full_name: userName,
            country_id: countryId,
            boutique_id: boutiqueId,
            role: userRole === "admin_boutique" ? "Gérant" : "Vendeur",
            salary: 0,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-record", userId] });
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      toast.success("Affectation mise à jour avec succès");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Modifier l'affectation — {userName}</DialogTitle>
        </DialogHeader>

        {loadingStaff ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Chargement...</p>
        ) : (
          <div className="space-y-4">
            {staffRecord && (
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                Affectation actuelle : <strong>{staffRecord.country_id ? "Configurée" : "Non configurée"}</strong>
              </div>
            )}

            <div className="space-y-2">
              <Label>Pays *</Label>
              <Select value={countryId} onValueChange={(v) => { setCountryId(v); setBoutiqueId(""); }}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un pays" /></SelectTrigger>
                <SelectContent>
                  {countries?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Boutique *</Label>
              <Select value={boutiqueId} onValueChange={setBoutiqueId} disabled={!countryId}>
                <SelectTrigger><SelectValue placeholder={countryId ? "Sélectionner une boutique" : "Choisir d'abord un pays"} /></SelectTrigger>
                <SelectContent>
                  {filteredBoutiques.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !countryId || !boutiqueId}
            >
              {saveMutation.isPending ? "Enregistrement..." : "Enregistrer l'affectation"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
