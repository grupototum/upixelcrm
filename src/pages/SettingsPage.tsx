import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Shield, Users, Upload, Database, Plug, ArrowRight, ListChecks } from "lucide-react";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { SecuritySettings } from "@/components/settings/SecuritySettings";
import { LeadFieldSettings } from "@/components/settings/LeadFieldSettings";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

type TabId = "profile" | "security" | "team" | "data" | "integrations" | "lead-fields";

const VALID_TABS: TabId[] = ["profile", "security", "team", "data", "integrations", "lead-fields"];

export default function SettingsPage() {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const { user } = useAuth();
  const { canAccessModule } = usePermissions();

  // Metas virou página própria (/metas/configurar) — link antigo (bookmark,
  // atalho salvo) continua funcionando via redirect.
  useEffect(() => {
    if (params.tab === "goals") navigate("/metas/configurar", { replace: true });
  }, [params.tab, navigate]);

  const tab: TabId = useMemo(() => {
    const raw = params.tab as TabId | undefined;
    if (raw && VALID_TABS.includes(raw)) return raw;
    return "profile";
  }, [params.tab]);

  const handleTabChange = (value: string) => {
    navigate(`/settings/${value}`);
  };

  const isMaster = user?.role === "master";
  const canSeeTeam = canAccessModule("/users");
  const canSeeData = canAccessModule("/import") || (canAccessModule("/database") && isMaster);

  return (
    <AppLayout title="Configurações" subtitle="Perfil, segurança, equipe e dados em um só lugar">
      <div className="p-6 max-w-6xl mx-auto animate-fade-in">
        <Tabs value={tab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="bg-card border border-border h-auto p-1 flex-wrap">
            <TabsTrigger value="profile" className="gap-2 text-xs">
              <User className="h-3.5 w-3.5" /> Perfil
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 text-xs">
              <Shield className="h-3.5 w-3.5" /> Segurança
            </TabsTrigger>
            {canSeeTeam && (
              <TabsTrigger value="team" className="gap-2 text-xs">
                <Users className="h-3.5 w-3.5" /> Equipe
              </TabsTrigger>
            )}
            <TabsTrigger value="integrations" className="gap-2 text-xs">
              <Plug className="h-3.5 w-3.5" /> Integrações
            </TabsTrigger>
            <TabsTrigger value="lead-fields" className="gap-2 text-xs">
              <ListChecks className="h-3.5 w-3.5" /> Campos do Lead
            </TabsTrigger>
            {canSeeData && (
              <TabsTrigger value="data" className="gap-2 text-xs">
                <Database className="h-3.5 w-3.5" /> Dados
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile" className="mt-0">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="security" className="mt-0">
            <SecuritySettings />
          </TabsContent>

          {canSeeTeam && (
            <TabsContent value="team" className="mt-0">
              <div className="px-4">
                <Card className="rounded-card ghost-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      Equipe e usuários
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Gestão de membros, papéis e permissões da organização.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      A página de gestão de equipe abre em um espaço dedicado por causa do volume
                      de informações (membros, organizações, audit log).
                    </p>
                    <Button
                      onClick={() => navigate("/users")}
                      className="gap-2 bg-primary hover:bg-[#e08300] text-white"
                    >
                      Abrir gestão de equipe <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          <TabsContent value="integrations" className="mt-0">
            <div className="px-4">
              <Card className="rounded-card ghost-border bg-card shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg font-bold flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Plug className="h-5 w-5 text-primary" />
                    </div>
                    Canais e Integrações
                  </CardTitle>
                  <CardDescription className="text-xs">
                    WhatsApp, Instagram, Facebook, Google, Meta Ads e mais.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Conecte canais de atendimento e ferramentas externas. Cada canal pode ser
                    configurado individualmente.
                  </p>
                  <Button
                    onClick={() => navigate("/integrations")}
                    className="gap-2 bg-primary hover:bg-[#e08300] text-white"
                  >
                    Abrir Integrações <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="lead-fields" className="mt-0">
            <LeadFieldSettings />
          </TabsContent>

          {canSeeData && (
            <TabsContent value="data" className="mt-0">
              <div className="px-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="rounded-card ghost-border bg-card shadow-card">
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Upload className="h-4 w-4 text-primary" />
                      Importação
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Importe leads via CSV ou XLSX com mapeamento de colunas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/import")}
                      className="w-full gap-2 text-xs"
                    >
                      Abrir importação <ArrowRight className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>

                {isMaster && (
                  <Card className="rounded-card ghost-border bg-card shadow-card">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Database className="h-4 w-4 text-primary" />
                        Banco de dados
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Backup e restauração da base. Disponível apenas para master.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/database")}
                        className="w-full gap-2 text-xs"
                      >
                        Abrir backup <ArrowRight className="h-3 w-3" />
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
