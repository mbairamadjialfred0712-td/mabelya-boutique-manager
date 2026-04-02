import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Profile {
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchUserData(session.user.id);
        }, 0);
        if (event === "SIGNED_IN") {
          supabase.from("activity_logs").insert({
            user_id: session.user.id,
            action: "login",
            details: "Connexion réussie",
          }).then(() => {});
        }
      } else {
        setRoles([]);
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles")
        .select("full_name, avatar_url, phone")
        .eq("user_id", userId)
        .single() as any as Promise<{ data: Profile | null; error: any }>,
    ]);
    setRoles((rolesRes.data ?? []).map((r) => r.role));
    setProfile(profileRes.data ?? null);
    setLoading(false);
  }

  // Fonction pour recharger le profil après modification
  const refreshProfile = async () => {
    if (!user) return;
    const { data } = await (supabase
      .from("profiles")
      .select("full_name, avatar_url, phone")
      .eq("user_id", user.id)
      .single() as any as Promise<{ data: Profile | null; error: any }>);
    if (data) setProfile(data);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (role: AppRole) => roles.includes(role);

  return (
    <AuthContext.Provider value={{
      session, user, roles, profile, loading,
      signOut, hasRole, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}