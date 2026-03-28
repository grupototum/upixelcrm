import { useState } from "react";
import { Mail, Star, Paperclip, Send, Search, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Email {
  id: string;
  from: string;
  fromEmail: string;
  subject: string;
  preview: string;
  date: string;
  read: boolean;
  starred: boolean;
  hasAttachment: boolean;
}

const mockEmails: Email[] = [
  { id: "1", from: "Carlos Silva", fromEmail: "carlos@empresa.com", subject: "Proposta comercial — Plano Enterprise", preview: "Olá, segue a proposta conforme conversamos na reunião de ontem. Os valores estão atualizados para o segundo trimestre...", date: "10:32", read: false, starred: true, hasAttachment: true },
  { id: "2", from: "Ana Beatriz", fromEmail: "ana.beatriz@agencia.com", subject: "Re: Campanha de Março", preview: "Perfeito! Vou ajustar os criativos conforme o briefing. Posso enviar a versão final amanhã até meio-dia...", date: "09:15", read: false, starred: false, hasAttachment: false },
  { id: "3", from: "Google Workspace", fromEmail: "noreply@google.com", subject: "Resumo semanal de atividades", preview: "Aqui está o resumo da sua semana: 47 emails enviados, 12 reuniões, 3 documentos editados...", date: "Ontem", read: true, starred: false, hasAttachment: false },
  { id: "4", from: "Roberto Mendes", fromEmail: "roberto@clientex.com", subject: "Aprovação do orçamento", preview: "Prezados, informamos que o orçamento foi aprovado pela diretoria. Podemos seguir com a implementação...", date: "Ontem", read: true, starred: true, hasAttachment: true },
  { id: "5", from: "Suporte uPixel", fromEmail: "suporte@upixel.com", subject: "Ticket #4521 — Atualização", preview: "Seu ticket foi atualizado. A equipe técnica identificou a causa e uma correção será aplicada até sexta...", date: "25 Mar", read: true, starred: false, hasAttachment: false },
  { id: "6", from: "Fernanda Costa", fromEmail: "fernanda@marketing.io", subject: "Materiais para evento", preview: "Bom dia! Seguem os materiais gráficos para o stand do evento. Precisamos confirmar as dimensões do banner...", date: "24 Mar", read: true, starred: false, hasAttachment: true },
];

export function GmailTab() {
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const filtered = mockEmails.filter(
    (e) =>
      e.from.toLowerCase().includes(search.toLowerCase()) ||
      e.subject.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar emails..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => toast.info("Sincronizando emails...")}>
          <RefreshCw className="h-3.5 w-3.5" /> Sincronizar
        </Button>
        <Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground" onClick={() => setComposeOpen(true)}>
          <Send className="h-3.5 w-3.5" /> Enviar email
        </Button>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <Badge variant="outline" className="text-[10px]">
          {mockEmails.filter((e) => !e.read).length} não lidos
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {mockEmails.length} total
        </Badge>
      </div>

      {/* Email list */}
      <div className="bg-card ghost-border rounded-xl shadow-card overflow-hidden divide-y divide-border/30">
        {filtered.map((email) => (
          <button
            key={email.id}
            onClick={() => toast.info(`Abrir email: ${email.subject}`)}
            className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-secondary/50 transition-colors ${
              !email.read ? "bg-primary/[0.03]" : ""
            }`}
          >
            <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs truncate ${!email.read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>
                  {email.from}
                </span>
                {email.starred && <Star className="h-3 w-3 text-accent fill-accent shrink-0" />}
                {email.hasAttachment && <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />}
                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{email.date}</span>
              </div>
              <p className={`text-xs truncate ${!email.read ? "font-semibold text-foreground" : "text-foreground/70"}`}>
                {email.subject}
              </p>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">{email.preview}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Compose modal */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Novo Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Para: email@exemplo.com" className="text-xs h-9" />
            <Input placeholder="Assunto" className="text-xs h-9" />
            <Textarea placeholder="Escreva sua mensagem..." className="text-xs min-h-[120px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setComposeOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={() => { setComposeOpen(false); toast.success("Email enviado! (Demonstração)"); }}
            >
              <Send className="h-3 w-3" /> Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
