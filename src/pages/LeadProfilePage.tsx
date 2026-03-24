import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockLeads, mockColumns, mockTimeline, mockTasks, mockThreads, mockMessages } from "@/lib/mock-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft, Phone, Mail, Building, User, MapPin, Tag,
  Globe, Briefcase, DollarSign, Calendar, Edit3, Trash2,
  Plus, CheckCircle2, Circle, AlertTriangle, Clock,
  MessageSquare, ArrowRight, Zap, ClipboardList, StickyNote,
  MoreHorizontal, Send, ChevronRight,
} from "lucide-react";
import type { Lead, Task, TimelineEvent } from "@/types";

/* ─── Timeline event config ─── */
const timelineConfig: Record<string, { icon: typeof MessageSquare; color: string; label: string }> = {
  message: { icon: MessageSquare, color: "text-primary", label: "Mensagem" },
  stage_change: { icon: ArrowRight, color: "text-accent", label: "Mudança de estágio" },
  note: { icon: StickyNote, color: "text-muted-foreground", label: "Nota" },
  task: { icon: ClipboardList, color: "text-success", label: "Tarefa" },
  automation: { icon: Zap, color: "text-warning", label: "Automação" },
  call: { icon: Phone, color: "text-primary", label: "Ligação" },
};

/* ─── Mock notes ─── */
const mockNotes = [
  { id: "n1", lead_id: "l1", content: "Lead interessada no plano enterprise. Agendar call para segunda.", created_at: "2024-03-20T11:00:00Z", user_name: "Operador" },
  { id: "n2", lead_id: "l1", content: "Possui orçamento aprovado para Q2. Decisor principal.", created_at: "2024-03-19T16:00:00Z", user_name: "Gerente" },
];

export default function LeadProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dados");
  const [newNote, setNewNote] = useState("");

  const lead = useMemo(() => mockLeads.find((l) => l.id === id), [id]);
  const column = useMemo(() => mockColumns.find((c) => c.id === lead?.column_id), [lead]);
  const timeline = useMemo(() => mockTimeline.filter((e) => e.lead_id === id), [id]);
  const tasks = useMemo(() => mockTasks.filter((t) => t.lead_id === id), [id]);
  const threads = useMemo(() => mockThreads.filter((t) => t.lead_id === id), [id]);
  const notes = useMemo(() => mockNotes.filter((n) => n.lead_id === id), [id]);

  if (!lead) {
    return (
      <AppLayout title="Lead não encontrado" subtitle="">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <User className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Este lead não foi encontrado.</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/crm")}>
            <ArrowLeft className="h-3 w-3 mr-1.5" /> Voltar ao CRM
          </Button>
        </div>
      </AppLayout>
    );
  }

  const initials = lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

  const formatDateTime = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const statusIcon = (s: Task["status"]) => {
    if (s === "completed") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (s === "overdue") return <AlertTriangle className="h-4 w-4 text-destructive" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <AppLayout
      title=""
      subtitle=""
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1 h-8" onClick={() => navigate("/crm")}>
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Button>
          <Button variant="outline" size="sm" className="text-xs gap-1 h-8">
            <Edit3 className="h-3 w-3" /> Editar
          </Button>
          <Button variant="ghost" size="sm" className="text-xs gap-1 h-8 text-destructive hover:text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3 w-3" /> Excluir
          </Button>
        </div>
      }
    >
      <div className="p-6 animate-fade-in">
        {/* ─── Header ─── */}
        <div className="flex items-start gap-5 mb-6">
          <div className="h-16 w-16 rounded-xl bg-primary/15 flex items-center justify-center text-xl font-bold text-primary shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-foreground truncate">{lead.name}</h1>
              {column && (
                <Badge variant="outline" className="shrink-0 text-xs gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} />
                  {column.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {lead.company && (
                <span className="flex items-center gap-1"><Building className="h-3 w-3" /> {lead.company}</span>
              )}
              {lead.position && (
                <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {lead.position}</span>
              )}
              {lead.origin && (
                <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {lead.origin}</span>
              )}
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Criado em {formatDate(lead.created_at)}</span>
            </div>
            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {lead.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] gap-1">
                  <Tag className="h-2.5 w-2.5" /> {tag}
                </Badge>
              ))}
            </div>
          </div>
          {/* Value */}
          {lead.value && (
            <div className="text-right shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Valor</p>
              <p className="text-2xl font-bold text-primary">
                R$ {lead.value.toLocaleString("pt-BR")}
              </p>
            </div>
          )}
        </div>

        {/* ─── Quick Actions ─── */}
        <div className="flex items-center gap-2 mb-6">
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8">
            <Plus className="h-3 w-3" /> Criar tarefa
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8">
            <ArrowRight className="h-3 w-3" /> Mover estágio
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8">
            <MessageSquare className="h-3 w-3" /> Enviar mensagem
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8">
            <Tag className="h-3 w-3" /> Adicionar tag
          </Button>
        </div>

        {/* ─── Tabs ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="dados" className="text-xs gap-1.5">
              <User className="h-3 w-3" /> Dados
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs gap-1.5">
              <Clock className="h-3 w-3" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="conversas" className="text-xs gap-1.5">
              <MessageSquare className="h-3 w-3" /> Conversas
            </TabsTrigger>
            <TabsTrigger value="tarefas" className="text-xs gap-1.5">
              <ClipboardList className="h-3 w-3" /> Tarefas
            </TabsTrigger>
            <TabsTrigger value="notas" className="text-xs gap-1.5">
              <StickyNote className="h-3 w-3" /> Notas
            </TabsTrigger>
          </TabsList>

          {/* ─── Dados ─── */}
          <TabsContent value="dados" className="mt-5">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações de contato</h3>
                <div className="space-y-3">
                  <DataRow icon={User} label="Nome" value={lead.name} />
                  <DataRow icon={Phone} label="Telefone" value={lead.phone} />
                  <DataRow icon={Mail} label="Email" value={lead.email} />
                  <DataRow icon={Building} label="Empresa" value={lead.company} />
                  <DataRow icon={Briefcase} label="Cargo" value={lead.position} />
                  <DataRow icon={MapPin} label="Cidade" value={lead.city} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origem e campanha</h3>
                  <DataRow icon={Globe} label="Origem" value={lead.origin} />
                  <DataRow icon={DollarSign} label="Valor" value={lead.value ? `R$ ${lead.value.toLocaleString("pt-BR")}` : undefined} />
                </div>
                <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.tags.length > 0 ? lead.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs gap-1">
                        <Tag className="h-3 w-3" /> {tag}
                      </Badge>
                    )) : (
                      <p className="text-xs text-muted-foreground italic">Nenhuma tag</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs gap-1 text-primary hover:text-primary h-7 px-2">
                    <Plus className="h-3 w-3" /> Adicionar tag
                  </Button>
                </div>
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Pipeline</h3>
                  <div className="flex items-center gap-2">
                    {mockColumns.map((col, i) => (
                      <div key={col.id} className="flex items-center gap-1">
                        <div
                          className={`h-7 px-3 rounded-md text-[10px] font-medium flex items-center gap-1.5 border transition-colors ${
                            col.id === lead.column_id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary/50 text-muted-foreground"
                          }`}
                        >
                          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                          {col.name}
                        </div>
                        {i < mockColumns.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ─── Timeline ─── */}
          <TabsContent value="timeline" className="mt-5">
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="space-y-0">
                {(timeline.length > 0 ? timeline : defaultTimeline(lead, column?.name)).map((ev, i, arr) => {
                  const cfg = timelineConfig[ev.type] || timelineConfig.note;
                  const Icon = cfg.icon;
                  return (
                    <div key={ev.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`mt-0.5 h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0`}>
                          <Icon className={`h-4 w-4 ${cfg.color}`} />
                        </div>
                        {i < arr.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                      </div>
                      <div className="pb-5 pt-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-foreground font-medium">{ev.content}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">{cfg.label}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {ev.user_name} · {formatDateTime(ev.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* ─── Conversas ─── */}
          <TabsContent value="conversas" className="mt-5">
            {threads.length > 0 ? (
              <div className="space-y-3">
                {threads.map((thread) => {
                  const msgs = mockMessages.filter((m) => m.thread_id === thread.id);
                  return (
                    <div
                      key={thread.id}
                      className="bg-card border border-border rounded-lg p-4 hover:border-border-hover transition-colors cursor-pointer"
                      onClick={() => navigate("/inbox")}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{thread.channel}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDateTime(thread.last_message_at)}</span>
                        </div>
                        {thread.unread_count > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] h-5 w-5 p-0 flex items-center justify-center rounded-full">
                            {thread.unread_count}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground truncate">{thread.last_message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{msgs.length} mensagens</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma conversa ainda</p>
                <Button variant="outline" size="sm" className="mt-3 text-xs gap-1">
                  <Send className="h-3 w-3" /> Iniciar conversa
                </Button>
              </div>
            )}
          </TabsContent>

          {/* ─── Tarefas ─── */}
          <TabsContent value="tarefas" className="mt-5">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {tasks.length > 0 ? (
                <div className="divide-y divide-border">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between px-4 py-3 hover:bg-card-hover transition-colors">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={task.status === "completed"} className="h-4 w-4" />
                        <div>
                          <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {task.title}
                          </p>
                          {task.due_date && (
                            <span className={`text-[10px] flex items-center gap-1 mt-0.5 ${task.status === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>
                              <Calendar className="h-2.5 w-2.5" /> {formatDate(task.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      {statusIcon(task.status)}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa vinculada</p>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="mt-3 text-xs gap-1 w-full">
              <Plus className="h-3 w-3" /> Nova Tarefa
            </Button>
          </TabsContent>

          {/* ─── Notas ─── */}
          <TabsContent value="notas" className="mt-5 space-y-4">
            {/* New note */}
            <div className="bg-card border border-border rounded-lg p-4">
              <Textarea
                placeholder="Escreva uma nota sobre este lead..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="text-xs min-h-[80px] resize-none"
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" className="text-xs gap-1" disabled={!newNote.trim()}>
                  <Plus className="h-3 w-3" /> Adicionar nota
                </Button>
              </div>
            </div>

            {/* Notes list */}
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="bg-card border border-border rounded-lg p-4 group">
                    <div className="flex items-start justify-between">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {note.user_name} · {formatDateTime(note.created_at)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <StickyNote className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma nota ainda</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

/* ─── Helper Components ─── */
function DataRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-sm text-foreground truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function defaultTimeline(lead: Lead, columnName?: string): TimelineEvent[] {
  return [
    { id: "dt1", lead_id: lead.id, type: "stage_change", content: `Lead criado e adicionado ao pipeline`, created_at: lead.created_at, user_name: "Sistema" },
    { id: "dt2", lead_id: lead.id, type: "stage_change", content: `Movido para ${columnName ?? "coluna atual"}`, created_at: lead.updated_at, user_name: "Sistema" },
  ];
}
