import { AppLayout } from "@/components/layout/AppLayout";
import { Mail, Calendar, HardDrive, CheckCircle2, XCircle, LogIn, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GmailTab } from "@/components/google/GmailTab";
import { CalendarTab } from "@/components/google/CalendarTab";
import { DriveTab } from "@/components/google/DriveTab";
import { useNavigate } from "react-router-dom";
import { useGoogleIntegration } from "@/hooks/useGoogleIntegration";

export default function GooglePage() {
  const navigate = useNavigate();
  const google = useGoogleIntegration();

  return (
    <AppLayout
      title="Google"
      subtitle={google.connected ? `Conectado como ${google.email}` : "Gmail, Calendar e Drive integrados"}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate("/integrations")}>
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Button>
          {google.loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : google.connected ? (
            <div className="flex items-center gap-2 ml-2">
              <Badge className="bg-success/15 text-success border-success/30 text-[10px] gap-1">
                <CheckCircle2 className="h-3 w-3" /> Conectado
              </Badge>
              <Button size="sm" variant="outline" className="text-xs gap-1" onClick={google.disconnect}>
                <XCircle className="h-3 w-3" /> Desconectar
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              className="text-xs gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground ml-2"
              onClick={google.connect}
            >
              <LogIn className="h-3.5 w-3.5" /> Conectar com Google
            </Button>
          )}
        </div>
      }
    >
      <div className="p-6 animate-fade-in">
        {google.loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !google.connected ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <svg className="h-10 w-10" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">Conecte sua conta Google</h2>
            <p className="text-sm text-muted-foreground max-w-md mb-2">
              Conecte sua conta Google para acessar Gmail, Calendar e Drive diretamente no uPixel.
              Seus dados ficam sincronizados em tempo real.
            </p>
            {!google.credentialsConfigured && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 max-w-md mb-4">
                <p className="text-xs text-destructive font-medium">
                  ⚠️ Credenciais Google não configuradas. Adicione os secrets GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no backend para habilitar a conexão.
                </p>
              </div>
            )}
            <Button
              className="gap-2 bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={google.connect}
              disabled={!google.credentialsConfigured}
            >
              <LogIn className="h-4 w-4" /> Conectar com Google
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="gmail" className="space-y-6">
            <TabsList className="bg-secondary">
              <TabsTrigger value="gmail" className="text-xs gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Gmail
              </TabsTrigger>
              <TabsTrigger value="calendar" className="text-xs gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Calendar
              </TabsTrigger>
              <TabsTrigger value="drive" className="text-xs gap-1.5">
                <HardDrive className="h-3.5 w-3.5" /> Drive
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gmail"><GmailTab /></TabsContent>
            <TabsContent value="calendar"><CalendarTab /></TabsContent>
            <TabsContent value="drive"><DriveTab /></TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
