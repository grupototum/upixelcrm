import { AppLayout } from "@/components/layout/AppLayout";
import { BroadcastDashboard } from "@/components/whatsapp/broadcast/BroadcastDashboard";
import { BroadcastModal } from "@/components/whatsapp/broadcast/BroadcastModal";
import { ImplementationChecklist } from "@/components/whatsapp/broadcast/ImplementationChecklist";
import { useBroadcast } from "@/hooks/useBroadcast";
import { MessageSquare, Sparkles, LayoutDashboard, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function WhatsAppBroadcastPage() {
  const { credits } = useBroadcast();

  return (
    <AppLayout
      title="Disparos de WhatsApp"
      subtitle="Gerencie campanhas massivas e custos de mensagens oficiais"
      actions={<BroadcastModal />}
    >
      <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Ad-hoc Header for Visual Punch */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 rounded-3xl border border-primary/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="h-24 w-24 text-primary animate-pulse" />
          </div>
          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl font-black font-heading text-foreground tracking-tight">
              Potencialize sua Comunicação 🚀
            </h2>
            <p className="text-sm text-muted-foreground font-medium max-w-md leading-relaxed">
              Utilize a Cloud API da Meta para envios oficiais com alta taxa de entrega ou a nossa rota gratuita via Evolution.
            </p>
          </div>
          <div className="flex items-center gap-6 relative z-10">
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Taxa de Entrega</p>
              <p className="text-2xl font-heading font-black text-foreground">99.8%</p>
            </div>
            <div className="h-10 w-px bg-primary/20" />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Custo Médio</p>
              <p className="text-2xl font-heading font-black text-foreground">R$ 0,50</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="w-full space-y-6">
          <div className="flex items-center justify-between border-b border-border/40 pb-2">
            <TabsList className="bg-transparent h-auto p-0 gap-8">
              <TabsTrigger 
                value="overview" 
                className="bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0 py-2 h-auto text-xs font-bold uppercase tracking-widest gap-2 transition-all"
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Visão Geral
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="bg-transparent border-0 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none px-0 py-2 h-auto text-xs font-bold uppercase tracking-widest gap-2 transition-all"
              >
                <History className="h-3.5 w-3.5" /> Relatórios de Envio
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase">API Meta: Online</span>
            </div>
          </div>

          <TabsContent value="overview" className="space-y-8 mt-0 focus-visible:outline-none">
            <BroadcastDashboard credits={credits} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-card ghost-border rounded-2xl p-6 space-y-4 hover:shadow-card transition-all">
                  <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="text-sm font-black font-heading">Dicas para evitar bloqueios</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    "Mantenha uma proporção alta de respostas dos clientes. Campanhas com muitos bloqueios podem impactar sua reputação na Meta."
                  </p>
                  <button className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline">Saber mais</button>
               </div>
               <ImplementationChecklist />
            </div>
          </TabsContent>

          <TabsContent value="reports" className="mt-0 focus-visible:outline-none">
            <div className="bg-card ghost-border rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-card">
              <div className="h-16 w-16 rounded-full bg-primary/5 flex items-center justify-center">
                <History className="h-8 w-8 text-primary/20" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold">Relatórios Detalhados</h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Os relatórios de entregabilidade por canal serão exibidos aqui em breve.
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
