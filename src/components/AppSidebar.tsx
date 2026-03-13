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
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import mabelyaLogo from "@/assets/mabelya-logo.jpg";
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

const navItems = [
  { title: "Tableau de Bord", url: "/", icon: LayoutDashboard },
  { title: "Gestion Stock", url: "/stock", icon: Package },
  { title: "Ventes", url: "/sales", icon: ShoppingCart },
  { title: "Dépenses", url: "/expenses", icon: Receipt },
  { title: "Personnel", url: "/staff", icon: UserCheck },
  { title: "Ads Campaigns", url: "/ads", icon: Megaphone },
  { title: "Analyse Pays", url: "/country-analysis", icon: Globe },
  { title: "Rapports", url: "/reports", icon: BarChart3 },
  { title: "Utilisateurs", url: "/users", icon: Users, adminOnly: true },
  { title: "Mon Profil", url: "/profile", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { profile, signOut, hasRole } = useAuth();

  const visibleNavItems = navItems.filter(
    (item) => !(item as any).adminOnly || hasRole("super_admin")
  );

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
          <p className="text-xs text-sidebar-foreground/60 mb-2 truncate px-2">
            {profile.full_name || "Utilisateur"}
          </p>
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
