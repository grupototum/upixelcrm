import { AppLayout } from "@/components/layout/AppLayout";
import { BroadcastDashboard } from "@/components/whatsapp/broadcast/BroadcastDashboard";
import { BroadcastConfigModal } from "@/components/whatsapp/broadcast/BroadcastConfigModal";
import { TemplateManager } from "@/components/whatsapp/broadcast/TemplateManager";
import { ImplementationChecklist } from "@/components/whatsapp/broadcast/ImplementationChecklist";
import { useBroadcast } from "@/hooks/useBroadcast";
import { MessageSquare, Sparkles, LayoutDashboard, History, FileText, Bot } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export default function WhatsAppBroadcastPage() {
  const { credits, loadingCredits } = useBroadcast();

  return (
    <AppLayout
      title="Disparos de WhatsApp"
      subtitle="Gerencie campanhas massivas e modelos oficiais da Meta"
      actions={<BroadcastConfigModal />}
    >
      <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Ad-hoc Header for Visual Punch */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-card border border-[hsl(var(--border-strong))] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="h-24 w-24 text-primary animate-pulse" />
          </div>
          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl font-black font-heading text-foreground tracking-tight">
              Aumente seu ROI com Envios Oficiais 🚀
            </h2>
            <p className="text-sm text-muted-foreground font-medium max-w-md leading-relaxed">
              Crie modelos persuasivos, envie para aprovação e acompanhe o desempenho das suas campanhas.
            </p>
          </div>
          <div className="flex items-center gap-6 relative z-10">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">API Meta Status</p>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                <p className="text-2xl font-heading font-black text-foreground">Operacional</p>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full space-y-6">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border-strong))] pb-2">
            <TabsList className="bg-transparent h-auto p-0 gap-8">
              <TabsTrigger 
                value="overview" 
                className="bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0 py-2 h-auto text-xs font-bold uppercase tracking-widest gap-2 transition-all"
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Dashboard
              </TabsTrigger>
              <TabsTrigger 
                value="templates" 
                className="bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0 py-2 h-auto text-xs font-bold uppercase tracking-widest gap-2 transition-all"
              >
                <FileText className="h-3.5 w-3.5" /> Gestão de Templates
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0 py-2 h-auto text-xs font-bold uppercase tracking-widest gap-2 transition-all"
              >
                <History className="h-3.5 w-3.5" /> Histórico
              </TabsTrigger>
            </TabsList>
            <div className="hidden sm:flex items-center gap-2 bg-muted/30 px-3 py-1 rounded-full border border-[hsl(var(--border-strong))]">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Rate Card: Brasil</span>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-8 mt-0 focus-visible:outline-none">
            <BroadcastDashboard credits={credits} loadingCredits={loadingCredits} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <div className="bg-card ghost-border rounded-card p-6 space-y-4 hover:shadow-card transition-all relative overflow-hidden group">
                  <div className="h-12 w-12 rounded-card bg-accent/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-sm font-black font-heading">Dicas e Melhores Práticas</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    "Mantenha uma proporção alta de respostas dos clientes. Campanhas com muitos bloqueios podem impactar sua reputação na Meta."
                  </p>
                  <button className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline flex items-center gap-1 group-hover:gap-2 transition-all">
                    Acessar Central de Ajuda
                  </button>
               </div>

               {/* Typebot Integration Foundation Card */}
               <div className="bg-card ghost-border rounded-card p-6 space-y-4 hover:shadow-card transition-all relative overflow-hidden group border-[hsl(var(--border-strong))] bg-gradient-to-br from-card to-primary/5">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 rounded-card bg-primary/10 flex items-center justify-center">
                      <Bot className="h-6 w-6 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-primary/5 border-[hsl(var(--border-strong))] text-primary">Soon</Badge>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-black font-heading">Integração Typebot</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Conecte seus fluxos de atendimento automático. O sistema está preparado para acionar bots após o envio.
                    </p>
                  </div>
                  <button className="w-full h-9 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    Configurar Webhook
                  </button>
               </div>

               <ImplementationChecklist />
            </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-0 focus-visible:outline-none">
            <TemplateManager />
          </TabsContent>

          <TabsContent value="reports" className="mt-0 focus-visible:outline-none">
            <div className="bg-card ghost-border rounded-card p-16 flex flex-col items-center justify-center text-center space-y-4 shadow-card">
              <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center">
                <History className="h-10 w-10 text-primary/20" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold">Relatórios Detalhados</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Os relatórios de entregabilidade e taxas de leitura por canal serão exibidos aqui conforme os envios forem processados.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
