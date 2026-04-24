import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import DashboardPage from "./pages/DashboardPage";
import InboxPage from "./pages/InboxPage";
import CRMPage from "./pages/CRMPage";
import TasksPage from "./pages/TasksPage";
import AutomationsPage from "./pages/AutomationsPage";
import IntelligencePage from "./pages/IntelligencePage";
import CampaignsPage from "./pages/CampaignsPage";
import ReportsPage from "./pages/ReportsPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import ImportPage from "./pages/ImportPage";
import UsersPage from "./pages/UsersPage";
import LeadProfilePage from "./pages/LeadProfilePage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import AutomationBuilderPage from "./pages/AutomationBuilderPage";
import GooglePage from "./pages/GooglePage";
import WhatsAppBroadcastPage from "./pages/WhatsAppBroadcastPage";
import WhatsAppPage from "./pages/WhatsAppPage";
import InstagramPage from "./pages/InstagramPage";
import ProfilePage from "./pages/ProfilePage";
import SecurityPage from "./pages/SecurityPage";
import ContactsPage from "./pages/ContactsPage";
import LandingPage from "./pages/LandingPage";
import SignupPage from "./pages/SignupPage";
import TenantNotFoundPage from "./pages/TenantNotFoundPage";
import RagDocumentsPage from "./pages/alexandria/RagDocuments";
import MetaAdsPage from "./pages/MetaAdsPage";
import GoogleAdsPage from "./pages/GoogleAdsPage";
import { PwaInstallPrompt } from "./components/pwa/PwaInstallPrompt";

const queryClient = new QueryClient();

function AppRoutes() {
  const { tenant, subdomain, isLoading, notFound } = useTenant();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Subdomínio informado mas não encontrado no banco
  if (notFound) {
    return <TenantNotFoundPage />;
  }

  // Domínio raiz — landing institucional em / e cadastro protegido em /cadastro
  if (!subdomain || !tenant) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/cadastro" element={<SignupPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Subdomínio válido — app completo com auth
  return (
    <AuthProvider>
      <AppProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
                <Route path="/crm" element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />
                <Route path="/leads/:id" element={<ProtectedRoute><LeadProfilePage /></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
                <Route path="/automations" element={<ProtectedRoute requiredPermission="automations.view"><AutomationsPage /></ProtectedRoute>} />
                <Route path="/automations/builder/:id" element={<ProtectedRoute requiredPermission="automations.view"><AutomationBuilderPage /></ProtectedRoute>} />
                <Route path="/intelligence" element={<ProtectedRoute requiredPermission="intelligence.view"><IntelligencePage /></ProtectedRoute>} />
                <Route path="/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute requiredPermission="reports.view"><ReportsPage /></ProtectedRoute>} />
                <Route path="/integrations" element={<ProtectedRoute requiredPermission="settings.view"><IntegrationsPage /></ProtectedRoute>} />
                <Route path="/google" element={<ProtectedRoute><GooglePage /></ProtectedRoute>} />
                <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppPage /></ProtectedRoute>} />
                <Route path="/instagram" element={<ProtectedRoute><InstagramPage /></ProtectedRoute>} />
                <Route path="/whatsapp/broadcast" element={<ProtectedRoute><WhatsAppBroadcastPage /></ProtectedRoute>} />
                <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute requiredPermission="users.view"><UsersPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
                <Route path="/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
                <Route path="/alexandria/rag" element={<ProtectedRoute><RagDocumentsPage /></ProtectedRoute>} />
                <Route path="/meta-ads" element={<ProtectedRoute><MetaAdsPage /></ProtectedRoute>} />
                <Route path="/google-ads" element={<ProtectedRoute><GoogleAdsPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <PwaInstallPrompt />
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </AppProvider>
    </AuthProvider>
  );
}

const App = () => (
  <ThemeProvider>
    <TenantProvider>
      <AppRoutes />
    </TenantProvider>
  </ThemeProvider>
);

export default App;
