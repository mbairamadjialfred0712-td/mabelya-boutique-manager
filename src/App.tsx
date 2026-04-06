import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { RoleGuard } from "@/components/RoleGuard";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Index";
import Stock from "./pages/Stock";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Expenses from "./pages/Expenses";
import Staff from "./pages/Staff";
import AdsCampaigns from "./pages/AdsCampaigns";
import CountryAnalysis from "./pages/CountryAnalysis";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import ActivityLog from "./pages/ActivityLog";
import Clients from "./pages/Clients";
import NetProfit from "./pages/NetProfit";
import MyExpenses from "./pages/MyExpenses";
import StaffExpenses from "./pages/StaffExpenses";
import TrashPage from "./pages/Trash";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
            <Route path="/expenses" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["super_admin", "admin_boutique"]}>
                  <Expenses />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/staff" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["super_admin", "admin_boutique"]}>
                  <Staff />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/ads" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["super_admin", "admin_boutique"]}>
                  <AdsCampaigns />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/country-analysis" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["super_admin"]}>
                  <CountryAnalysis />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
            <Route path="/users" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["super_admin"]}>
                  <Users />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["super_admin"]}>
                  <Settings />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/activity" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["super_admin"]}>
                  <ActivityLog />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/net-profit" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["super_admin"]}>
                  <NetProfit />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/my-expenses" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["sales_staff", "admin_boutique"]}>
                  <MyExpenses />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/staff-expenses" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["super_admin"]}>
                  <StaffExpenses />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/trash" element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={["super_admin"]}>
                  <TrashPage />
                </RoleGuard>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
