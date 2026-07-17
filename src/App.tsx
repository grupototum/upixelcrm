import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { TenantProvider, useTenant } from "@/contexts/TenantContext";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Eager: telas de entrada (raiz, login, dashboard) e fallbacks — evita flash de loading.
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import LandingPageEN from "./pages/LandingPageEN";
import SignupPage from "./pages/SignupPage";
import TenantNotFoundPage from "./pages/TenantNotFoundPage";
import WorkspaceLoginPage from "./pages/WorkspaceLoginPage";

// Lazy: páginas internas — code-split por rota.
const InboxPage = lazy(() => import("./pages/InboxPage"));
const CRMPage = lazy(() => import("./pages/CRMPage"));
const TasksPage = lazy(() => import("./pages/TasksPage"));
const AutomationsPage = lazy(() => import("./pages/AutomationsPage"));
const IntelligencePage = lazy(() => import("./pages/IntelligencePage"));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const SLAPage = lazy(() => import("./pages/SLAPage"));
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage"));
const ImportPage = lazy(() => import("./pages/ImportPage"));
const DuplicatesPage = lazy(() => import("./pages/DuplicatesPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const LeadProfilePage = lazy(() => import("./pages/LeadProfilePage"));
const AutomationBuilderPage = lazy(() => import("./pages/AutomationBuilderPage"));
const BotBuilderPage = lazy(() => import("./pages/BotBuilderPage"));
const AutomationRunsPage = lazy(() => import("./pages/AutomationRunsPage"));
const GooglePage = lazy(() => import("./pages/GooglePage"));
const WhatsAppBroadcastPage = lazy(() => import("./pages/WhatsAppBroadcastPage"));
const WhatsAppPage = lazy(() => import("./pages/WhatsAppPage"));
const WhatsAppTemplatesPage = lazy(() => import("./pages/WhatsAppTemplatesPage"));
const InstagramPage = lazy(() => import("./pages/InstagramPage"));
const FacebookPagePage = lazy(() => import("./pages/FacebookPagePage"));
const FacebookOAuthCallbackPage = lazy(() => import("./pages/FacebookOAuthCallbackPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SecurityPage = lazy(() => import("./pages/SecurityPage"));
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const RagDocumentsPage = lazy(() => import("./pages/alexandria/RagDocuments"));
const MetaAdsPage = lazy(() => import("./pages/MetaAdsPage"));
const GoogleAdsPage = lazy(() => import("./pages/GoogleAdsPage"));
const DatabaseBackupPage = lazy(() => import("./pages/DatabaseBackupPage"));
const MasterIntegrationsPage = lazy(() => import("./pages/MasterIntegrationsPage"));

// Privacy Policy / Terms / Data Deletion Status são servidos como HTML estático
// pelo nginx (public/privacy-policy/index.html, etc.) — Meta crawler precisa
// de HTML sem JS pra validar App Review.
import { PwaInstallPrompt } from "./components/pwa/PwaInstallPrompt";
import { useAutomationWorker } from "./hooks/useAutomationWorker";

function RouteFallback() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    },
    mutations: { retry: 1 },
  },
});

function AutomationWorkerRunner() {
  useAutomationWorker();
  return null;
}

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
          {/* Aliases comuns que usuários e CTAs tentam — redireciona pro cadastro real */}
          <Route path="/signup" element={<Navigate to="/cadastro" replace />} />
          <Route path="/sign-up" element={<Navigate to="/cadastro" replace />} />
          <Route path="/register" element={<Navigate to="/cadastro" replace />} />
          {/* /login no domínio raiz não tem tenant no contexto: mostra uma página
              orientando a pessoa a acessar pelo subdomínio da própria empresa
              (com atalho pra digitar o workspace e ir direto). */}
          <Route path="/login" element={<WorkspaceLoginPage />} />
          {/* Páginas legais (/privacy-policy, /terms-of-service, /data-deletion-status)
              são HTMLs estáticos servidos pelo nginx — não passam pelo React. */}
          <Route path="/en" element={<LandingPageEN />} />
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
            <AutomationWorkerRunner />
            <BrowserRouter>
              <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                {/* /dashboard é URL bookmarcável esperada — redireciona pra raiz */}
                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="/inbox" element={<ProtectedRoute><InboxPage /></ProtectedRoute>} />
                <Route path="/crm" element={<ProtectedRoute><CRMPage /></ProtectedRoute>} />
                <Route path="/leads/:id" element={<ProtectedRoute><LeadProfilePage /></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
                <Route path="/automations" element={<ProtectedRoute requiredPermission="automations.view"><AutomationsPage /></ProtectedRoute>} />
                <Route path="/automations/builder/:id" element={<ProtectedRoute requiredPermission="automations.view"><AutomationBuilderPage /></ProtectedRoute>} />
                <Route path="/bots/:id" element={<ProtectedRoute requiredPermission="automations.view"><BotBuilderPage /></ProtectedRoute>} />
                <Route path="/automations/builder/:id/runs" element={<ProtectedRoute requiredPermission="automations.view"><AutomationRunsPage /></ProtectedRoute>} />
                <Route path="/intelligence" element={<ProtectedRoute requiredPermission="intelligence.view"><IntelligencePage /></ProtectedRoute>} />
                <Route path="/campaigns" element={<ProtectedRoute><CampaignsPage /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute requiredPermission="reports.view"><ReportsPage /></ProtectedRoute>} />
                <Route path="/sla" element={<ProtectedRoute requiredPermission="reports.view"><SLAPage /></ProtectedRoute>} />
                <Route path="/integrations" element={<ProtectedRoute requiredPermission="settings.view"><IntegrationsPage /></ProtectedRoute>} />
                <Route path="/google" element={<ProtectedRoute><GooglePage /></ProtectedRoute>} />
                {/* WhatsApp tem 3 entradas — todas usam os MESMOS componentes
                    (WhatsAppManagement / TemplateManager). /integrations renderiza
                    inline via WhatsAppIntegrationPanel; /whatsapp e /whatsapp/templates
                    são wrappers standalone. */}
                <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppPage /></ProtectedRoute>} />
                <Route path="/whatsapp/templates" element={<ProtectedRoute><WhatsAppTemplatesPage /></ProtectedRoute>} />
                <Route path="/instagram" element={<ProtectedRoute><InstagramPage /></ProtectedRoute>} />
                <Route path="/facebook-page" element={<ProtectedRoute><FacebookPagePage /></ProtectedRoute>} />
                <Route path="/auth/facebook/callback" element={<ProtectedRoute><FacebookOAuthCallbackPage /></ProtectedRoute>} />
                <Route path="/whatsapp/broadcast" element={<ProtectedRoute><WhatsAppBroadcastPage /></ProtectedRoute>} />
                <Route path="/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
                <Route path="/duplicates" element={<ProtectedRoute><DuplicatesPage /></ProtectedRoute>} />
                <Route path="/users" element={<ProtectedRoute requiredPermission="users.view"><UsersPage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/settings/:tab" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
                <Route path="/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />
                <Route path="/alexandria/rag" element={<ProtectedRoute><RagDocumentsPage /></ProtectedRoute>} />
                <Route path="/meta-ads" element={<ProtectedRoute><MetaAdsPage /></ProtectedRoute>} />
                <Route path="/google-ads" element={<ProtectedRoute><GoogleAdsPage /></ProtectedRoute>} />
                <Route path="/database" element={<ProtectedRoute requiredPermission="settings.view"><DatabaseBackupPage /></ProtectedRoute>} />
                <Route path="/master/integrations" element={<ProtectedRoute><MasterIntegrationsPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              <PwaInstallPrompt />
            </BrowserRouter>
          </TooltipProvider>
        </QueryClientProvider>
      </AppProvider>
    </AuthProvider>
  );
}

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <TenantProvider>
        <AppRoutes />
      </TenantProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
