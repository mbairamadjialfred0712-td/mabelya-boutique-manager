import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Save, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";

const CURRENCIES = ["XOF", "XAF", "EUR", "USD", "GBP", "MAD", "GNF", "CDF"];

export default function Settings() {
  const { hasRole, user } = useAuth();
  const queryClient = useQueryClient();
  const [appName, setAppName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [currency, setCurrency] = useState("XOF");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setAppName(settings.app_name);
      setWelcomeMessage(settings.welcome_message);
      setLogoUrl(settings.logo_url);
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Fichier image requis"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file);
    if (error) { toast.error("Erreur upload"); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    setLogoUrl(data.publicUrl);
    setUploading(false);
  };

  const updateSettings = useMutation({
    mutationFn: async () => {
      if (!settings) return;
      const { error } = await supabase
        .from("app_settings")
        .update({
          app_name: appName,
          welcome_message: welcomeMessage,
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      toast.success("Paramètres mis à jour !");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!hasRole("super_admin")) return <Navigate to="/" replace />;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-2">
          <SettingsIcon className="h-6 w-6" /> Paramètres de l'application
        </h1>
        <p className="text-muted-foreground text-sm">Modifier les informations générales de l'application</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de l'application</Label>
              <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="Nom de l'application" />
            </div>
            <div className="space-y-2">
              <Label>Message d'accueil personnel</Label>
              <Textarea
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Message affiché sur le tableau de bord"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Devise par défaut</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateSettings.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-display">Logo de l'application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-full w-full object-contain rounded-xl p-4" />
              ) : uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm">Cliquez pour ajouter un logo</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
            </label>
            {logoUrl && (
              <Button variant="outline" size="sm" onClick={() => setLogoUrl(null)} className="w-full">
                Supprimer le logo
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
