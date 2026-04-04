import { AppLayout } from "@/components/layout/AppLayout";
import { User, Mail, Phone, Building2, Camera, Settings, Bell, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PushNotificationSettings } from "@/components/pwa/PushNotificationSettings";

export default function ProfilePage() {
  return (
    <AppLayout title="Meu Perfil" subtitle="Gerencie suas informações pessoais e preferências">
      <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar / Left Column */}
          <div className="w-full md:w-80 space-y-6">
            <Card className="rounded-2xl ghost-border overflow-hidden bg-card/30 backdrop-blur-xl">
              <div className="h-24 bg-gradient-to-r from-primary/40 to-accent/40" />
              <CardContent className="pt-0 -mt-12 text-center pb-8">
                <div className="relative inline-block group mb-4">
                  <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">JS</AvatarFallback>
                  </Avatar>
                  <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center shadow-lg hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100 duration-200">
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <h2 className="text-xl font-bold text-foreground">João Silva</h2>
                <p className="text-sm text-muted-foreground">Administrador · Grupo Totum</p>
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" className="rounded-xl text-xs h-8">Editar Bio</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl ghost-border bg-card/30 backdrop-blur-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" /> Atalhos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <Button variant="ghost" className="w-full justify-start text-xs h-9 rounded-lg gap-3">
                  <Bell className="h-4 w-4 text-muted-foreground" /> Notificações
                </Button>
                <Button variant="ghost" className="w-full justify-start text-xs h-9 rounded-lg gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" /> Idioma e Região
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content / Right Column */}
          <div className="flex-1 space-y-6">
            <Card className="rounded-2xl ghost-border bg-card/50 backdrop-blur-xl shadow-card">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Informações Básicas</CardTitle>
                <CardDescription className="text-xs">Essas informações são visíveis para outros membros da equipe.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullname" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="fullname" defaultValue="João Silva" className="pl-10 rounded-xl ghost-border bg-secondary/10 h-11 text-sm focus:ring-primary" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">E-mail Corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" defaultValue="joao.silva@grupototum.com" className="pl-10 rounded-xl ghost-border bg-secondary/10 h-11 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" defaultValue="+55 (11) 99999-8888" className="pl-10 rounded-xl ghost-border bg-secondary/10 h-11 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Cargo</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="position" defaultValue="Administrador" className="pl-10 rounded-xl ghost-border bg-secondary/10 h-11 text-sm" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Empresa</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="company" defaultValue="Grupo Totum" className="pl-10 rounded-xl ghost-border bg-secondary/10 h-11 text-sm" />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button className="rounded-xl h-11 px-8 bg-primary hover:bg-primary-hover shadow-lg neon-glow">Salvar Alterações</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl ghost-border bg-card/50 backdrop-blur-xl shadow-card overflow-hidden">
              <CardHeader className="bg-destructive/5">
                <CardTitle className="text-lg font-bold text-destructive">Zona de Perigo</CardTitle>
                <CardDescription className="text-xs">Ações que podem deletar sua conta permanentemente.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Excluir Conta</p>
                    <p className="text-xs text-muted-foreground">Isso apagará todos os seus dados e não poderá ser desfeito.</p>
                  </div>
                  <Button variant="outline" className="rounded-xl h-10 px-6 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">Excluir Conta</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
