import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Lock, ArrowLeft, Package, ShoppingBag, Eye, EyeOff } from "lucide-react";
import mabelyaLogo from "@/assets/mabelya-logo.jpg";

interface PublicProduct {
  id: string;
  name: string;
  selling_price: number;
  stock_quantity: number;
  image_url: string | null;
  color: string | null;
  size: string | null;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [products, setProducts] = useState<PublicProduct[]>([]);

  useEffect(() => {
    supabase
      .from("products_showcase" as any)
      .select("id, name, selling_price, stock_quantity, image_url, color, size")
      .order("selling_price", { ascending: false })
      .limit(12)
      .then(({ data }: any) => {
        if (data) setProducts(data as PublicProduct[]);
      });
  }, []);

  const formatPrice = (val: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(val) + " FCFA";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Email ou mot de passe incorrect");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error("Veuillez entrer votre adresse email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setResetSent(true);
      toast.success("Un email de réinitialisation a été envoyé !");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left — Product Showcase */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative z-10 flex flex-col w-full p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-full overflow-hidden ring-2 ring-primary/20">
              <img src={mabelyaLogo} alt="Mabelya" className="h-full w-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-foreground">Mabelya</h2>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Fashion Collection</p>
            </div>
          </div>

          <h3 className="text-xl font-display font-semibold text-foreground mb-1">
            Nos produits disponibles
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Découvrez notre sélection de produits en boutique
          </p>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto flex-1 pr-2 pb-4" style={{ maxHeight: "calc(100vh - 200px)" }}>
            {products.map((p) => (
              <div
                key={p.id}
                className="group bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <Badge
                    variant={p.stock_quantity < 5 ? "destructive" : "secondary"}
                    className="absolute top-2 right-2 text-[10px] font-medium"
                  >
                    {p.stock_quantity} en stock
                  </Badge>
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {p.color && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{p.color}</span>
                    )}
                    {p.size && (
                      <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">{p.size}</span>
                    )}
                  </div>
                  <p className="text-primary font-bold text-sm mt-2">{formatPrice(p.selling_price)}</p>
                </div>
              </div>
            ))}
            {products.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ShoppingBag className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Aucun produit disponible</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 lg:px-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-14 w-14 rounded-2xl overflow-hidden ring-2 ring-primary/20 shadow-lg">
                <img src={mabelyaLogo} alt="Mabelya" className="h-full w-full object-cover" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-display font-bold text-foreground">Mabelya</h1>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Fashion Manager</p>
              </div>
            </div>
            {!forgotMode && (
              <p className="text-muted-foreground text-sm mt-2">
                Connectez-vous pour accéder à votre espace de gestion
              </p>
            )}
          </div>

          {forgotMode ? (
            <Card className="border-border/50 shadow-xl">
              <CardHeader className="pb-4">
                <h2 className="text-xl font-display font-semibold text-center">
                  {resetSent ? "Email envoyé" : "Mot de passe oublié"}
                </h2>
              </CardHeader>
              <CardContent>
                {resetSent ? (
                  <div className="text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Mail className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Un email de réinitialisation a été envoyé à <strong>{resetEmail}</strong>.
                      Vérifiez votre boîte de réception.
                    </p>
                    <Button variant="outline" onClick={() => { setForgotMode(false); setResetSent(false); }} className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Retour à la connexion
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Entrez votre adresse email pour recevoir un lien de réinitialisation.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="resetEmail">Adresse email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="resetEmail"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="votre.email@gmail.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Envoi..." : "Envoyer le lien"}
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setForgotMode(false)} className="w-full">
                      <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 shadow-xl">
              <CardHeader className="pb-4">
                <h2 className="text-xl font-display font-semibold text-center">Connexion</h2>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email / Identifiant</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vous@exemple.com"
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-10 pr-10 h-11"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
                    {loading ? "Connexion..." : "Se connecter"}
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setForgotMode(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Contactez votre Super Admin pour obtenir vos identifiants de connexion.
          </p>

          {/* Mobile product preview */}
          <div className="lg:hidden">
            <p className="text-sm font-display font-semibold text-foreground mb-3">Aperçu des produits</p>
            <div className="flex gap-3 overflow-x-auto pb-3 -mx-4 px-4">
              {products.slice(0, 6).map((p) => (
                <div key={p.id} className="shrink-0 w-36 bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
                  <div className="aspect-square bg-muted overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    <p className="text-primary font-bold text-xs mt-1">{formatPrice(p.selling_price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
