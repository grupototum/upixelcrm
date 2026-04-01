import { useState, useEffect, useMemo } from "react";
import { Mail, Star, Paperclip, Send, Search, RefreshCw, Loader2, Inbox, Archive, Trash2, Filter, ChevronRight, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  fullDate: Date;
  read: boolean;
  hasAttachment: boolean;
  labels: string[];
}

function parseHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name === name)?.value || "";
}

function parseEmails(messages: any[]): ParsedEmail[] {
  return (messages || []).map((m) => {
    const headers = m.payload?.headers || [];
    const fromRaw = parseHeader(headers, "From");
    const from = fromRaw.replace(/<.*>/, "").trim().replace(/"/g, "") || fromRaw;
    const dateRaw = parseHeader(headers, "Date");
    const dateObj = dateRaw ? new Date(dateRaw) : new Date();
    const isToday = new Date().toDateString() === dateObj.toDateString();
    const dateStr = isToday
      ? dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

    return {
      id: m.id,
      from,
      subject: parseHeader(headers, "Subject") || "(sem assunto)",
      snippet: m.snippet || "",
      date: dateStr,
      fullDate: dateObj,
      read: !(m.labelIds || []).includes("UNREAD"),
      hasAttachment: (m.payload?.parts || []).some((p: any) => p.filename),
      labels: m.labelIds || [],
    };
  });
}

export function GmailTab({ fetchGmailList, sendEmail }: GmailTabProps) {
  const [emails, setEmails] = useState<ParsedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "unread" | "read">("all");
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

  const filtered = useMemo(() => {
    return emails.filter((e) => {
      const matchesSearch = e.from.toLowerCase().includes(search.toLowerCase()) || 
                            e.subject.toLowerCase().includes(search.toLowerCase()) ||
                            e.snippet.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = filterType === "all" ? true : 
                           filterType === "unread" ? !e.read : e.read;
      
      return matchesSearch && matchesStatus;
    });
  }, [emails, search, filterType]);

  const unreadCount = useMemo(() => emails.filter(e => !e.read).length, [emails]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Buscar no e-mail..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9 h-10 shadow-sm border-border/40 bg-card rounded-xl text-xs" 
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="w-auto">
            <TabsList className="bg-card/30 border border-border/40 p-1 rounded-xl h-10">
              <TabsTrigger value="all" className="text-[10px] font-bold uppercase rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Todos</TabsTrigger>
              <TabsTrigger value="unread" className="text-[10px] font-bold uppercase rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all relative">
                Não Lidos
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] text-white">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="read" className="text-[10px] font-bold uppercase rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">Lidos</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button size="icon" variant="outline" className="h-10 w-10 shrink-0 rounded-xl border-border/40 bg-card shadow-sm hover:text-primary transition-colors" onClick={load} title="Sincronizar">
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button size="sm" className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold gap-2 shadow-lg shadow-primary/20" onClick={() => setComposeOpen(true)}>
            <Send className="h-3.5 w-3.5" /> Escrever
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border-2 border-dashed border-border/30 bg-secondary/5">
          <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Nenhum e-mail encontrado</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
            Tente ajustar os filtros ou a busca para encontrar o que precisa.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border/40 rounded-2xl shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="divide-y divide-border/30">
            {filtered.map((email) => (
              <div
                key={email.id}
                className={cn(
                  "group relative w-full text-left px-6 py-4 flex items-start gap-4 hover:bg-secondary/40 transition-all duration-200 cursor-pointer",
                  !email.read && "bg-primary/[0.02]"
                )}
              >
                {!email.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                )}
                
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  !email.read ? "bg-primary/20" : "bg-muted"
                )}>
                  <User className={cn("h-5 w-5", !email.read ? "text-primary" : "text-muted-foreground")} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "text-[13px] truncate",
                      !email.read ? "font-bold text-foreground" : "font-medium text-foreground/80"
                    )}>
                      {email.from}
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
                      {email.hasAttachment && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{email.date}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-[12px] truncate",
                      !email.read ? "font-bold text-foreground" : "text-foreground/80"
                    )}>
                      {email.subject}
                    </p>
                  </div>
                  
                  <p className="text-[11px] text-muted-foreground truncate mt-1 group-hover:text-muted-foreground/80">
                    {email.snippet}
                  </p>
                </div>

                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity ml-2 self-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10">
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl border-none shadow-2xl bg-card">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" /> Nova Mensagem
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Input 
                placeholder="Para: email@exemplo.com" 
                className="text-xs h-10 rounded-xl bg-secondary/20 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary" 
                value={to} 
                onChange={(e) => setTo(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <Input 
                placeholder="Assunto" 
                className="text-xs h-10 rounded-xl bg-secondary/20 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
              />
            </div>
            <div className="space-y-1.5">
              <Textarea 
                placeholder="Escreva sua mensagem..." 
                className="text-xs min-h-[180px] rounded-2xl bg-secondary/20 border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary resize-none" 
                value={body} 
                onChange={(e) => setBody(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" className="text-xs rounded-xl h-10" onClick={() => setComposeOpen(false)}>Cancelar</Button>
            <Button size="sm" className="text-xs h-10 px-6 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold gap-2" onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Enviar agora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
