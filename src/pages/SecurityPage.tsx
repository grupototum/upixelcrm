import { AppLayout } from "@/components/layout/AppLayout";
import { Shield, Key, Tablet, HardDrive, Smartphone, Monitor, LogOut, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export default function SecurityPage() {
  return (
    <AppLayout title="Segurança" subtitle="Proteja sua conta e monitore acessos recentes">
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Autenticação em Duas Etapas */}
          <Card className="rounded-2xl ghost-border overflow-hidden bg-card/30 backdrop-blur-xl border-primary/20">
            <CardHeader className="bg-primary/5 pb-6">
              <CardTitle className="text-lg font-bold flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                Autenticação em Duas Etapas (2FA)
              </CardTitle>
              <CardDescription className="text-xs">
                Adicione uma camada extra de segurança à sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl ghost-border bg-secondary/10 group hover:bg-secondary/20 transition-all cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <DeviceMobile className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">App de Autenticação</h4>
                    <p className="text-[11px] text-muted-foreground">Use Google Authenticator ou Authy.</p>
                  </div>
                </div>
                <Switch checked={false} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl ghost-border bg-secondary/10 group hover:bg-secondary/20 transition-all cursor-pointer opacity-60">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-success/20 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">SMS (Recuperação)</h4>
                    <p className="text-[11px] text-muted-foreground">Receba códigos via mensagem de texto.</p>
                  </div>
                </div>
                <Switch checked={false} disabled />
              </div>

              <div className="pt-2 text-center">
                <p className="text-[11px] text-muted-foreground max-w-[280px] mx-auto italic">
                  Recomendamos o uso de aplicativos de autenticação por serem mais seguros que SMS.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Alterar Senha */}
          <Card className="rounded-2xl ghost-border bg-card/30 backdrop-blur-xl shadow-card h-full">
            <CardHeader className="pb-6">
              <CardTitle className="text-lg font-bold flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Key className="h-5 w-5 text-accent" />
                </div>
                Alterar Senha
              </CardTitle>
              <CardDescription className="text-xs">
                Sua senha deve ter pelo menos 8 caracteres e incluir símbolos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Senha Atual</Label>
                <Input type="password" placeholder="••••••••" className="rounded-xl ghost-border bg-secondary/10 h-11 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Nova Senha</Label>
                <Input type="password" placeholder="••••••••" className="rounded-xl ghost-border bg-secondary/10 h-11 text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground pl-1">Confirmar Nova Senha</Label>
                <Input type="password" placeholder="••••••••" className="rounded-xl ghost-border bg-secondary/10 h-11 text-sm" />
              </div>
              <div className="pt-4">
                <Button className="w-full rounded-xl h-11 bg-accent hover:bg-accent/80 text-white shadow-lg shadow-accent/20">Atualizar Senha</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dispositivos Conectados */}
        <Card className="rounded-2xl ghost-border bg-card/50 backdrop-blur-xl shadow-card overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">Dispositivos Conectados</CardTitle>
                <CardDescription className="text-xs">Sessões ativas que acessaram sua conta recentemente.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl text-xs h-9 bg-destructive/5 text-destructive hover:bg-destructive shadow-sm hover:text-white transition-all">Sair de todas as sessões</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/20">
              <SessionItem 
                icon={Monitor} 
                device="Chrome no Windows 11" 
                location="São Paulo, Brasil" 
                status="Atual" 
                active 
              />
              <SessionItem 
                icon={Smartphone} 
                device="App iPhone 15 Pro" 
                location="São Paulo, Brasil" 
                status="Há 2 horas" 
              />
              <SessionItem 
                icon={Monitor} 
                device="Safari no MacBook Pro" 
                location="Rio de Janeiro, Brasil" 
                status="Há 3 dias" 
              />
            </div>
          </CardContent>
        </Card>

      </div>
    </AppLayout>
  );
}

function SessionItem({ 
  icon: Icon, device, location, status, active 
}: { 
  icon: any; device: string; location: string; status: string; active?: boolean 
}) {
  return (
    <div className="flex items-center justify-between p-6 group hover:bg-secondary/10 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${active ? "bg-primary/20" : "bg-muted"}`}>
          <Icon className={`h-6 w-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground">{device}</h4>
            {active && <Badge className="bg-success/20 text-success border-none text-[10px] h-4">Sessão Atual</Badge>}
          </div>
          <p className="text-[11px] text-muted-foreground">{location} · {status}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="rounded-lg h-9 w-9 text-muted-foreground hover:text-destructive transition-colors">
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
