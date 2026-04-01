import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Camera, Phone, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, profile, roles, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState((profile as any)?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>((profile as any)?.avatar_url ?? null);
  const [saving, setSaving] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    admin_boutique: "Admin Boutique",
    sales_staff: "Personnel de vente",
  };

  // Sauvegarde infos de base
  const handleSave = async () => {
    if (!user) return;
    if (!fullName.trim()) {
      toast.error("Le nom complet est obligatoire");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      await refreshProfile(); // ✅ Recharge le profil dans le contexte
      toast.success("Profil mis à jour avec succès !");
    }
  };

  // Changement email
  const handleEmailChange = async () => {
    if (!newEmail.trim()) { toast.error("Veuillez entrer un nouvel email"); return; }
    if (newEmail.trim() === user?.email) { toast.error("Ce doit être un email différent"); return; }
    if (!newEmail.includes("@")) { toast.error("Email invalide"); return; }
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setSavingEmail(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Email mis à jour ! Vérifiez votre boîte mail.");
      setNewEmail("");
    }
  };

  // Changement mot de passe
  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) { toast.error("Remplissez tous les champs"); return; }
    if (newPassword.length < 6) { toast.error("Minimum 6 caractères"); return; }
    if (newPassword !== confirmPassword) { toast.error("Les mots de passe ne correspondent pas"); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPwd(false);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Mot de passe changé avec succès !");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  // Upload photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2 Mo"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Format image requis"); return; }

    setUploadingPhoto(true);

    // Affichage local immédiat
    const localUrl = URL.createObjectURL(file);
    setAvatarUrl(localUrl);

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setUploadingPhoto(false);
      toast.error("Erreur upload — vérifiez que le bucket 'avatars' existe dans Supabase Storage");
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = data.publicUrl;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    setUploadingPhoto(false);

    if (updateError) {
      toast.error("Erreur sauvegarde photo");
    } else {
      setAvatarUrl(publicUrl);
      await refreshProfile(); // ✅ Recharge le profil
      toast.success("Photo mise à jour !");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold">Mon Profil</h1>
        <p className="text-sm text-muted-foreground">Gérer vos informations personnelles</p>
      </div>

      {/* Infos de base */}
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border-2 border-primary/20">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Photo" className="h-full w-full object-cover" onError={() => setAvatarUrl(null)} />
                ) : (
                  <User className="h-10 w-10 text-primary" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary/90"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </div>
            <div>
              <p className="font-semibold text-lg">{profile?.full_name || "Utilisateur"}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {uploadingPhoto && <p className="text-xs text-primary mt-1">Upload en cours...</p>}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Rôles */}
          <div>
            <label className="text-sm font-medium mb-2 block">Rôles</label>
            <div className="flex gap-2 flex-wrap">
              {roles.map((r) => (
                <Badge key={r} className="rounded-xl bg-primary/10 text-primary border-0 px-3 py-1">
                  <Shield className="h-3 w-3 mr-1" />
                  {roleLabels[r] ?? r}
                </Badge>
              ))}
            </div>
          </div>

          {/* Nom complet */}
          <div>
            <label className="text-sm font-medium mb-2 block">Nom complet *</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="rounded-xl"
              placeholder="Ex: Aminata Koné"
            />
          </div>

          {/* Téléphone */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Numéro de téléphone</span>
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-xl"
              placeholder="Ex: +228 90 00 00 00"
              type="tel"
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="rounded-xl w-full">
            {saving ? "Enregistrement..." : "Mettre à jour le profil"}
          </Button>
        </CardContent>
      </Card>

      {/* Changer email */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" /> Changer l'adresse email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Email actuel</label>
            <Input value={user?.email ?? ""} disabled className="rounded-xl bg-muted text-muted-foreground" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Nouvel email</label>
            <Input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="rounded-xl"
              placeholder="Entrez votre nouvel email"
              type="email"
              autoComplete="off"
            />
            {newEmail && newEmail === user?.email && (
              <p className="text-xs text-red-500 mt-1">✗ Doit être différent de l'email actuel</p>
            )}
            {newEmail && newEmail !== user?.email && newEmail.includes("@") && (
              <p className="text-xs text-green-600 mt-1">✓ Email valide</p>
            )}
          </div>
          <Button
            onClick={handleEmailChange}
            disabled={savingEmail || !newEmail.trim() || newEmail.trim() === user?.email || !newEmail.includes("@")}
            variant="outline"
            className="rounded-xl w-full"
          >
            {savingEmail ? "Mise à jour..." : "Changer l'email"}
          </Button>
          <p className="text-xs text-muted-foreground">ℹ️ Un email de confirmation sera envoyé.</p>
        </CardContent>
      </Card>

      {/* Changer mot de passe */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> Changer le mot de passe
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Nouveau mot de passe</label>
            <div className="relative">
              <Input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl pr-10"
                placeholder="Minimum 6 caractères"
                type={showNewPwd ? "text" : "password"}
              />
              <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Confirmer le mot de passe</label>
            <div className="relative">
              <Input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl pr-10"
                placeholder="Répétez le mot de passe"
                type={showConfirmPwd ? "text" : "password"}
              />
              <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && (
              <p className={`text-xs mt-1 ${newPassword === confirmPassword ? "text-green-600" : "text-red-500"}`}>
                {newPassword === confirmPassword ? "✓ Les mots de passe correspondent" : "✗ Ne correspondent pas"}
              </p>
            )}
          </div>

          {/* Indicateur force */}
          {newPassword && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Force :</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div key={level} className={`h-1.5 flex-1 rounded-full transition-colors ${
                    newPassword.length >= level * 3
                      ? level <= 1 ? "bg-red-400" : level <= 2 ? "bg-orange-400" : level <= 3 ? "bg-yellow-400" : "bg-green-500"
                      : "bg-muted"
                  }`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {newPassword.length < 6 ? "Trop court" : newPassword.length < 9 ? "Faible" : newPassword.length < 12 ? "Moyen" : "Fort"}
              </p>
            </div>
          )}

          <Button
            onClick={handlePasswordChange}
            disabled={savingPwd || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
            variant="outline"
            className="rounded-xl w-full"
          >
            {savingPwd ? "Mise à jour..." : "Changer le mot de passe"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}