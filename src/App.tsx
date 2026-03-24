import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { AppProvider } from "@/contexts/AppContext";

const App = () => (
  <ThemeProvider>
    <AppProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/crm" element={<CRMPage />} />
            <Route path="/leads/:id" element={<LeadProfilePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/automations" element={<AutomationsPage />} />
            <Route path="/intelligence" element={<IntelligencePage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </AppProvider>
  </ThemeProvider>
);

export default App;
