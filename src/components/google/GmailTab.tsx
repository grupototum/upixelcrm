import { useState, useEffect } from "react";
import { Mail, Star, Paperclip, Send, Search, RefreshCw, Loader2, Inbox } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface GmailTabProps {
  fetchGmailList: () => Promise<any>;
  sendEmail: (to: string, subject: string, body: string) => Promise<any>;
}

interface ParsedEmail {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  read: boolean;
  hasAttachment: boolean;
}

function parseHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name === name)?.value || "";
}

function parseEmails(messages: any[]): ParsedEmail[] {
  return messages.map((m) => {
    const headers = m.payload?.headers || [];
    const fromRaw = parseHeader(headers, "From");
    const from = fromRaw.replace(/<.*>/, "").trim().replace(/"/g, "") || fromRaw;
    const dateRaw = parseHeader(headers, "Date");
    const dateObj = dateRaw ? new Date(dateRaw) : new Date();
    const isToday = new Date().toDateString() === dateObj.toDateString();
    const date = isToday
      ? dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

    return {
      id: m.id,
      from,
      subject: parseHeader(headers, "Subject") || "(sem assunto)",
      snippet: m.snippet || "",
      date,
      read: !(m.labelIds || []).includes("UNREAD"),
      hasAttachment: (m.payload?.parts || []).some((p: any) => p.filename),
    };
  });
}

export function GmailTab({ fetchGmailList, sendEmail }: GmailTabProps) {
  const [emails, setEmails] = useState<ParsedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchGmailList();
      setEmails(parseEmails(data.messages || []));
    } catch (err: any) {
      toast.error(`Erro ao carregar emails: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) { toast.error("Preencha destinatário e assunto."); return; }
    setSending(true);
    try {
      await sendEmail(to, subject, body);
      toast.success("Email enviado com sucesso!");
      setComposeOpen(false);
      setTo(""); setSubject(""); setBody("");
      load();
    } catch (err: any) {
      toast.error(`Erro ao enviar: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  const filtered = emails.filter(
    (e) => e.from.toLowerCase().includes(search.toLowerCase()) || e.subject.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar emails..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
        </div>
        <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> Sincronizar
        </Button>
        <Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground" onClick={() => setComposeOpen(true)}>
          <Send className="h-3.5 w-3.5" /> Enviar email
        </Button>
      </div>

      <div className="flex gap-3">
        <Badge variant="outline" className="text-[10px]">{emails.filter((e) => !e.read).length} não lidos</Badge>
        <Badge variant="outline" className="text-[10px]">{emails.length} total</Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Inbox className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Nenhum email encontrado</p>
        </div>
      ) : (
        <div className="bg-card ghost-border rounded-xl shadow-card overflow-hidden divide-y divide-border/30">
          {filtered.map((email) => (
            <div
              key={email.id}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-secondary/50 transition-colors ${!email.read ? "bg-primary/[0.03]" : ""}`}
            >
              <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs truncate ${!email.read ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>{email.from}</span>
                  {email.hasAttachment && <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />}
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{email.date}</span>
                </div>
                <p className={`text-xs truncate ${!email.read ? "font-semibold text-foreground" : "text-foreground/70"}`}>{email.subject}</p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{email.snippet}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="text-sm">Novo Email</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Para: email@exemplo.com" className="text-xs h-9" value={to} onChange={(e) => setTo(e.target.value)} />
            <Input placeholder="Assunto" className="text-xs h-9" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <Textarea placeholder="Escreva sua mensagem..." className="text-xs min-h-[120px]" value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setComposeOpen(false)}>Cancelar</Button>
            <Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground" onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
