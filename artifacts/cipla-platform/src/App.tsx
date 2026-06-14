import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { AuthGuard } from "@/components/auth-guard";
import { AppLayout } from "@/components/layout/app-layout";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminManagers from "@/pages/admin/managers";
import AdminDoctors from "@/pages/admin/doctors";
import AdminVideos from "@/pages/admin/videos";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminAuditLogs from "@/pages/admin/audit-logs";

// Manager Pages
import ManagerDashboard from "@/pages/manager/dashboard";
import ManagerAddDoctor from "@/pages/manager/add-doctor";
import ManagerDoctors from "@/pages/manager/doctors";
import ManagerVideos from "@/pages/manager/videos";

const queryClient = new QueryClient();

function RootRoute() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return null;
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  if (user.role === "admin") {
    return <Redirect to="/admin/dashboard" />;
  } else {
    return <Redirect to="/manager/dashboard" />;
  }
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={RootRoute} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard">
        <AuthGuard requireRole="admin">
          <AppLayout><AdminDashboard /></AppLayout>
        </AuthGuard>
      </Route>
      <Route path="/admin/managers">
        <AuthGuard requireRole="admin">
          <AppLayout><AdminManagers /></AppLayout>
        </AuthGuard>
      </Route>
      <Route path="/admin/doctors">
        <AuthGuard requireRole="admin">
          <AppLayout><AdminDoctors /></AppLayout>
        </AuthGuard>
      </Route>
      <Route path="/admin/videos">
        <AuthGuard requireRole="admin">
          <AppLayout><AdminVideos /></AppLayout>
        </AuthGuard>
      </Route>
      <Route path="/admin/analytics">
        <AuthGuard requireRole="admin">
          <AppLayout><AdminAnalytics /></AppLayout>
        </AuthGuard>
      </Route>
      <Route path="/admin/audit-logs">
        <AuthGuard requireRole="admin">
          <AppLayout><AdminAuditLogs /></AppLayout>
        </AuthGuard>
      </Route>

      {/* Manager Routes */}
      <Route path="/manager/dashboard">
        <AuthGuard requireRole="manager">
          <AppLayout><ManagerDashboard /></AppLayout>
        </AuthGuard>
      </Route>
      <Route path="/manager/add-doctor">
        <AuthGuard requireRole="manager">
          <AppLayout><ManagerAddDoctor /></AppLayout>
        </AuthGuard>
      </Route>
      <Route path="/manager/doctors">
        <AuthGuard requireRole="manager">
          <AppLayout><ManagerDoctors /></AppLayout>
        </AuthGuard>
      </Route>
      <Route path="/manager/videos">
        <AuthGuard requireRole="manager">
          <AppLayout><ManagerVideos /></AppLayout>
        </AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
