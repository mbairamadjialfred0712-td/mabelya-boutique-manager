import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  LogOut,
  Users,
  Receipt,
  UserCheck,
  Megaphone,
  Globe,
  User,
  Settings,
  Activity,
  UserRound,
  TrendingUp,
  Wallet,
  WalletCards,
  Trash2,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import mabelyaLogo from "@/assets/mabelya-logo.jpg";
import type { Database } from "@/integrations/supabase/types";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

type AppRole = Database["public"]["Enums"]["app_role"];

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  allowedRoles?: AppRole[];
}

const navItems: NavItem[] = [
  { title: "Tableau de Bord", url: "/", icon: LayoutDashboard },
  { title: "Gestion Stock", url: "/stock", icon: Package },
  { title: "Ventes", url: "/sales", icon: ShoppingCart },
  { title: "Dépenses", url: "/expenses", icon: Receipt, allowedRoles: ["super_admin", "admin_boutique"] },
  { title: "Clients", url: "/clients", icon: UserRound },
  { title: "Personnel", url: "/staff", icon: UserCheck, allowedRoles: ["super_admin", "admin_boutique"] },
  { title: "Ads Campaigns", url: "/ads", icon: Megaphone, allowedRoles: ["super_admin", "admin_boutique"] },
  { title: "Analyse Pays", url: "/country-analysis", icon: Globe, allowedRoles: ["super_admin"] },
  { title: "Bénéfice Net", url: "/net-profit", icon: TrendingUp, allowedRoles: ["super_admin"] },
  { title: "Rapports", url: "/reports", icon: BarChart3 },
  { title: "Utilisateurs", url: "/users", icon: Users, allowedRoles: ["super_admin"] },
  { title: "Mes Dépenses", url: "/my-expenses", icon: Wallet, allowedRoles: ["sales_staff", "admin_boutique"] },
  { title: "Dépenses Utilisateurs", url: "/staff-expenses", icon: WalletCards, allowedRoles: ["super_admin"] },
  { title: "Activités", url: "/activity", icon: Activity, allowedRoles: ["super_admin"] },
  { title: "Corbeille", url: "/trash", icon: Trash2, allowedRoles: ["super_admin"] },
  { title: "Paramètres", url: "/settings", icon: Settings, allowedRoles: ["super_admin"] },
  { title: "Mon Profil", url: "/profile", icon: User },
];

const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  admin_boutique: "Admin Boutique",
  sales_staff: "Vendeur",
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, roles, signOut } = useAuth();

  const visibleNavItems = navItems.filter((item) => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.some((r) => roles.includes(r));
  });

  const primaryRole = roles[0];
  const roleLabel = primaryRole ? roleLabels[primaryRole] ?? primaryRole : "";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full overflow-hidden shrink-0 ring-2 ring-primary/20">
            <img src={mabelyaLogo} alt="Mabelya Fashion" className="h-full w-full object-cover" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-display font-bold text-sidebar-foreground">Mabelya</h2>
              <p className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/50">Fashion Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className={`rounded-xl transition-all ${isActive ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted"}`}
                        activeClassName="bg-primary text-primary-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && profile && (
          <div className="mb-2 px-2">
            <p className="text-xs text-sidebar-foreground/60 truncate">{profile.full_name || "Utilisateur"}</p>
            {roleLabel && (
              <p className="text-[10px] font-medium text-primary/70 uppercase tracking-wider">{roleLabel}</p>
            )}
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="hover:bg-destructive/10 hover:text-destructive rounded-xl">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Déconnexion</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}