import { logger } from "@/lib/logger";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAppState } from "@/contexts/AppContext";
import * as leadsRepo from "@/services/leads";
import { mockThreads, mockMessages } from "@/lib/mock-data";
import { AddTagModal } from "@/components/crm/AddTagModal";
import { MergeLeadsModal } from "@/components/crm/MergeLeadsModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useCustomFields } from "@/hooks/useCustomFields";
import { useFieldSettings } from "@/hooks/useFieldSettings";
import { DynamicFieldRenderer } from "@/components/crm/DynamicFieldRenderer";
import { CustomFieldsManager } from "@/components/crm/CustomFieldsManager";
import { TagsManager } from "@/components/crm/TagsManager";
import { LeadPhonesSection } from "@/components/crm/LeadPhonesSection";
import { LeadContactsSection } from "@/components/crm/LeadContactsSection";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Phone, Mail, Building, User, MapPin, Tag,
  Globe, Briefcase, DollarSign, Calendar, Edit3, Trash2,
  Plus, CheckCircle2, Circle, AlertTriangle, Clock, ChevronDown,
  MessageSquare, ArrowRight, Zap, ClipboardList, StickyNote,
  MoreHorizontal, Send, ChevronRight, Smartphone, Monitor, X, Check, Settings2,
  Handshake, Target, Merge, CalendarCheck, PhoneMissed
} from "lucide-react";
import type { Lead, Task, TimelineEvent } from "@/types";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";

const timelineConfig: Record<string, { icon: typeof MessageSquare; color: string; label: string }> = {
  message: { icon: MessageSquare, color: "text-primary", label: "Mensagem" },
  stage_change: { icon: ArrowRight, color: "text-accent", label: "Mudança de estágio" },
  note: { icon: StickyNote, color: "text-muted-foreground", label: "Nota" },
  task: { icon: ClipboardList, color: "text-success", label: "Tarefa" },
  automation: { icon: Zap, color: "text-warning", label: "Automação" },
  call: { icon: Phone, color: "text-primary", label: "Ligação" },
  call_attempt: { icon: PhoneMissed, color: "text-warning", label: "Tentativa de ligação" },
  meeting: { icon: CalendarCheck, color: "text-primary", label: "Reunião" },
  field_changed: { icon: Edit3, color: "text-accent", label: "Campo alterado" },
};

interface LeadNote {
  id: string;
  lead_id: string;
  content: string;
  created_at: string;
  user_name: string;
  /** 2.5: só existe depois da primeira edição — marca a nota como "editado". */
  updated_at?: string;
  /** Fase 4: id do autor. Ausente em notas anteriores a esta feature. */
  user_id?: string;
}

export interface LeadDetailProps {
  /** id do lead: vem da rota na página, de ?lead= no Sheet do board. */
  leadId?: string;
  /** Sair do detalhe: volta pro /crm na página, fecha o Sheet no board. */
  onClose?: () => void;
}

/**
 * Conteúdo da tela de detalhe do lead, sem casca de layout.
 *
 * Extraído de LeadProfilePage sem mudança de comportamento — a página continua
 * sendo a mesma tela, só que agora o miolo pode ser montado dentro de um Sheet
 * no board do CRM sem duplicar ~1000 linhas.
 *
 * A barra de ações (Voltar / Mesclar / Excluir) ficou de fora, no irmão
 * `LeadDetailActions`: na página ela mora no header do AppLayout e no Sheet no
 * header do Sheet, então não podia viver aqui dentro.
 */
export function LeadDetail({ leadId, onClose }: LeadDetailProps) {
  const navigate = useNavigate();
  // Alias: este corpo veio da página, onde o id chegava pela rota.
  const id = leadId;
  const { 
    leads, columns, pipelines, tasks, timeline, automations: contextAutomations, 
    toggleBasicAutomation, updateLead, moveLead, addTask, 
    toggleTaskStatus, completeTask, addTimelineEvent 
  } = useAppState();
  
  const { definitions, loading: cfLoading } = useCustomFields();
  const { enabledFields } = useFieldSettings();
  const { hasPermission, canEditLeadCategory, role } = usePermissions();
  const { user } = useAuth();
  const isAdmin = role === "master" || role === "admin" || role === "supervisor";

  const [activeTab, setActiveTab] = useState("dados");
  // Fase 7: registrar ligação/reunião — fonte das métricas calls_made/meetings_done.
  const [logEventType, setLogEventType] = useState<"call" | "call_attempt" | "meeting" | null>(null);
  const [logEventNote, setLogEventNote] = useState("");
  const [newNote, setNewNote] = useState("");
  const [noteToDelete, setNoteToDelete] = useState<LeadNote | null>(null);
  // 2.5: edição inline — id da nota aberta e rascunho do texto.
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteDraft, setEditingNoteDraft] = useState("");
  // 2.6: rascunho do resultado por tarefa + seção de concluídas colapsada.
  const [taskResults, setTaskResults] = useState<Record<string, string>>({});
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [showTagModal, setShowTagModal] = useState(false);
  const [showManageTags, setShowManageTags] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const lead = useMemo(() => leads.find((l) => l.id === id), [id, leads]);
  const column = useMemo(() => columns.find((c) => c.id === lead?.column_id), [lead, columns]);

  // Etapas de todos os funis chegam num array flat (AppContext carrega tudo de
  // uma vez, de propósito). Sem agrupar, o select mostra "Novos Leads" uma vez
  // por funil — todo funil novo nasce com as mesmas 3 etapas — e escolher a
  // errada move o lead pra outro funil sem o usuário perceber.
  const columnsByPipeline = useMemo(() => {
    const byPipeline = new Map<string, { pipeline: (typeof pipelines)[number]; columns: typeof columns }>();
    for (const col of columns) {
      const pipeline = pipelines.find((p) => p.id === col.pipeline_id);
      if (!pipeline) continue; // etapa órfã: sem funil não há grupo onde exibir
      if (!byPipeline.has(pipeline.id)) byPipeline.set(pipeline.id, { pipeline, columns: [] });
      byPipeline.get(pipeline.id)!.columns.push(col);
    }
    for (const group of byPipeline.values()) group.columns.sort((a, b) => a.order - b.order);
    // Funil atual do lead primeiro — é onde ele quase sempre vai querer mexer.
    return Array.from(byPipeline.values()).sort((a, b) =>
      a.pipeline.id === column?.pipeline_id ? -1 : b.pipeline.id === column?.pipeline_id ? 1 : 0
    );
  }, [columns, pipelines, column?.pipeline_id]);

  const leadNotes = useMemo<LeadNote[]>(() => {
    if (!lead?.notes_local) return [];
    try { return JSON.parse(lead.notes_local) as LeadNote[]; } catch { return []; }
  }, [lead?.notes_local]);

  const customFields: Array<{ key: string; value: string }> = useMemo(() => {
    if (!lead?.custom_fields) return [];
    return Array.isArray(lead.custom_fields) 
      ? lead.custom_fields 
      : Object.keys(lead.custom_fields).map(key => ({ key, value: lead.custom_fields![key] }));
  }, [lead?.custom_fields]);

  useEffect(() => {
    if (!lead) return;
    let needsUpdate = false;
    const updateData: any = {};

    try {
      const rawNotes = localStorage.getItem("totum_notes") || localStorage.getItem("upixel_notes");
      if (rawNotes) {
        const localNotes = JSON.parse(rawNotes).filter((n: any) => n.lead_id === id);
        if (localNotes.length > 0 && !lead.notes_local) {
          updateData.notes_local = JSON.stringify(localNotes);
          needsUpdate = true;
        }
        localStorage.removeItem("totum_notes");
        localStorage.removeItem("upixel_notes");
      }
    } catch (e) { logger.error(e); }

    try {
      const fieldKeyT = `totum_custom_fields_${id}`;
      const fieldKeyU = `upixel_custom_fields_${id}`;
      const rawFields = localStorage.getItem(fieldKeyT) || localStorage.getItem(fieldKeyU);
      
      if (rawFields && (!lead.custom_fields || Object.keys(lead.custom_fields).length === 0)) {
        updateData.custom_fields = JSON.parse(rawFields);
        needsUpdate = true;
        localStorage.removeItem(fieldKeyT);
        localStorage.removeItem(fieldKeyU);
      }
    } catch (e) { logger.error(e); }

    if (needsUpdate) {
      updateLead(lead.id, updateData);
    }
  }, [lead, id, updateLead]);

  const leadAutomations = useMemo(() => {
    return contextAutomations.filter(a => {
      if (a.trigger.type !== "time_in_column") return false;
      
      const config = a.trigger.config as any;
      if (config?.target_lead_ids && config.target_lead_ids.length > 0) {
        return config.target_lead_ids.includes(id);
      }
      
      return a.pipeline_id === column?.pipeline_id || a.column_id === column?.id;
    });
  }, [contextAutomations, column, id]);
  const leadTimeline = useMemo(() => timeline.filter((e) => e.lead_id === id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [id, timeline]);

  // listTimelineEvents (usado por `timeline` acima, via AppContext) corta em
  // 100 eventos POR TENANT INTEIRO — um lead ativo perde histórico antigo
  // sem aviso. "Carregar mais" busca páginas adicionais escopadas por
  // lead_id, então não depende desse corte global.
  const [olderEvents, setOlderEvents] = useState<TimelineEvent[]>([]);
  const [loadingMoreTimeline, setLoadingMoreTimeline] = useState(false);
  const [hasMoreTimeline, setHasMoreTimeline] = useState(true);
  const TIMELINE_PAGE_SIZE = 30;

  useEffect(() => {
    // Reseta a paginação ao trocar de lead.
    setOlderEvents([]);
    setHasMoreTimeline(true);
  }, [id]);

  const handleLoadMoreTimeline = useCallback(async () => {
    if (!id || loadingMoreTimeline || !hasMoreTimeline) return;
    setLoadingMoreTimeline(true);
    try {
      const combined = [...leadTimeline, ...olderEvents];
      const oldestSoFar = combined.length > 0
        ? combined.reduce((min, e) => (e.created_at < min ? e.created_at : min), combined[0].created_at)
        : undefined;
      const page = await leadsRepo.listLeadTimelineEventsPage(id, oldestSoFar, TIMELINE_PAGE_SIZE);
      setOlderEvents((prev) => [...prev, ...(page as unknown as TimelineEvent[])]);
      setHasMoreTimeline(page.length === TIMELINE_PAGE_SIZE);
    } catch (err) {
      logger.error("[LeadProfilePage] loadMoreTimeline", err);
    } finally {
      setLoadingMoreTimeline(false);
    }
  }, [id, loadingMoreTimeline, hasMoreTimeline, leadTimeline, olderEvents]);

  // Mensagens do lead, unidas na timeline SEM gravar 1 evento por mensagem em
  // timeline_events — isso dobraria a escrita de todo o inbox só pra
  // alimentar esta aba. A união acontece aqui, no client.
  const { data: leadMessages = [] } = useQuery({
    queryKey: ["lead-timeline-messages", id],
    queryFn: () => leadsRepo.listLeadMessagesForTimeline(id!),
    enabled: !!id && activeTab === "timeline",
    staleTime: 60_000,
  });

  const mergedTimeline = useMemo<TimelineEvent[]>(() => {
    const messageEvents: TimelineEvent[] = leadMessages.map((m) => ({
      id: `msg_${m.id}`,
      lead_id: id!,
      type: "message",
      content: m.type === "text" ? m.content : `[${m.type}] ${m.content}`.slice(0, 120),
      created_at: m.created_at,
      user_name: m.direction === "outbound" ? "Você" : (m.sender_name || "Lead"),
    }));
    const byId = new Map<string, TimelineEvent>();
    [...leadTimeline, ...olderEvents, ...messageEvents].forEach((e) => byId.set(e.id, e));
    return Array.from(byId.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [leadTimeline, olderEvents, leadMessages, id]);
  const leadTasks = useMemo(() => tasks.filter((t) => t.lead_id === id), [id, tasks]);
  const pendingTasks = useMemo(() => leadTasks.filter((t) => t.status !== "completed"), [leadTasks]);
  const completedTasks = useMemo(() => leadTasks.filter((t) => t.status === "completed"), [leadTasks]);

  const handleCompleteTask = useCallback(async (taskId: string) => {
    await completeTask(taskId, taskResults[taskId]);
    setTaskResults((prev) => { const next = { ...prev }; delete next[taskId]; return next; });
  }, [completeTask, taskResults]);
  const threads = useMemo(() => mockThreads.filter((t) => t.lead_id === id), [id]);

  const handleAddNote = useCallback(async () => {
    if (!newNote.trim() || !id || !lead) return;
    const note: LeadNote = {
      id: `n_${Date.now()}`,
      lead_id: id,
      content: newNote,
      created_at: new Date().toISOString(),
      user_name: user?.name || "Você",
      user_id: user?.id,
    };
    const updated = [note, ...leadNotes];
    await updateLead(lead.id, { notes_local: JSON.stringify(updated) });
    await addTimelineEvent({ lead_id: id, type: "note", content: `Nota adicionada: "${newNote.slice(0, 50)}..."`, user_name: user?.name || "Você" });
    setNewNote("");
  }, [newNote, id, lead, leadNotes, addTimelineEvent, updateLead, user]);

  // Notas legadas (sem user_id) ficam editáveis por todos — backfill de
  // autoria fora de escopo (decisão 2026-08-13).
  const canEditNote = useCallback(
    (note: LeadNote) => !note.user_id || note.user_id === user?.id || isAdmin,
    [user?.id, isAdmin]
  );

  const handleStartEditNote = useCallback((note: LeadNote) => {
    if (!canEditNote(note)) return;
    setEditingNoteId(note.id);
    setEditingNoteDraft(note.content);
  }, [canEditNote]);

  const handleCancelEditNote = useCallback(() => {
    setEditingNoteId(null);
    setEditingNoteDraft("");
  }, []);

  const handleSaveNote = useCallback(async () => {
    const trimmed = editingNoteDraft.trim();
    if (!editingNoteId || !trimmed || !lead) return;
    const original = leadNotes.find((n) => n.id === editingNoteId);
    // Sem mudança real, não grava nem marca como editado.
    if (!original || original.content === trimmed) { handleCancelEditNote(); return; }

    const updated = leadNotes.map((n) =>
      n.id === editingNoteId ? { ...n, content: trimmed, updated_at: new Date().toISOString() } : n
    );
    await updateLead(lead.id, { notes_local: JSON.stringify(updated) });
    await addTimelineEvent({
      lead_id: lead.id,
      type: "note",
      content: `Nota editada: "${trimmed.slice(0, 50)}..."`,
      user_name: "Você",
    });
    handleCancelEditNote();
  }, [editingNoteId, editingNoteDraft, lead, leadNotes, updateLead, addTimelineEvent, handleCancelEditNote]);

  const handleDeleteNote = useCallback(async () => {
    if (!noteToDelete || !id || !lead) return;
    const updated = leadNotes.filter((n) => n.id !== noteToDelete.id);
    await updateLead(lead.id, { notes_local: JSON.stringify(updated) });
    await addTimelineEvent({
      lead_id: id,
      type: "note",
      content: `Nota removida: "${noteToDelete.content.slice(0, 50)}..."`,
      user_name: "Você",
    });
    setNoteToDelete(null);
  }, [noteToDelete, id, lead, leadNotes, addTimelineEvent, updateLead]);

  const handleLogEvent = useCallback(async () => {
    if (!logEventType || !id) return;
    const label = logEventType === "call" ? "Ligação registrada" : logEventType === "call_attempt" ? "Tentativa de ligação registrada" : "Reunião registrada";
    await addTimelineEvent({
      lead_id: id,
      type: logEventType,
      content: logEventNote.trim() || label,
      user_name: user?.name || "Você",
      user_id: user?.id,
    });
    setLogEventType(null);
    setLogEventNote("");
  }, [logEventType, logEventNote, id, addTimelineEvent, user]);

  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim() || !id) return;
    await addTask({ title: newTaskTitle, lead_id: id, due_date: newTaskDue || undefined });
    setNewTaskTitle("");
    setNewTaskDue("");
    setShowNewTask(false);
  }, [newTaskTitle, newTaskDue, id, addTask]);
  if (!lead) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <User className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Este lead não foi encontrado.</p>
          <Button variant="outline" size="sm" onClick={onClose}>
            <ArrowLeft className="h-3 w-3 mr-1.5" /> Voltar ao CRM
          </Button>
        </div>
      </>
    );
  }

  const initials = lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const formatDateTime = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const statusIcon = (s: Task["status"]) => {
    if (s === "completed") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (s === "overdue") return <AlertTriangle className="h-4 w-4 text-destructive" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <>
      <div className="p-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start gap-5 mb-6">
          <div className="h-16 w-16 rounded-xl bg-primary/15 flex items-center justify-center text-xl font-bold text-primary shrink-0">{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-foreground truncate">{lead.name}</h1>
              <Select
                value={lead.category || "lead"}
                onValueChange={(val: string) => {
                  if (hasPermission("lead.change_category")) updateLead(lead.id, { category: val as Lead["category"] });
                }}
                disabled={!hasPermission("lead.change_category")}
              >
                <SelectTrigger className="w-auto h-7 text-[10px] uppercase font-bold tracking-wider px-3 rounded-lg border-[hsl(var(--border-strong))] bg-primary/5 text-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-[hsl(var(--border-strong))] bg-card">
                  <SelectItem value="lead" className="text-[10px] font-bold">LEAD</SelectItem>
                  <SelectItem value="partner" className="text-[10px] font-bold">PARCEIRO</SelectItem>
                  <SelectItem value="collaborator" className="text-[10px] font-bold">COLABORADOR</SelectItem>
                </SelectContent>
              </Select>
              {column && lead.category === "lead" && (
                <Badge variant="outline" className="shrink-0 text-xs gap-1.5">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: column.color }} />
                  {column.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {lead.company && <span className="flex items-center gap-1"><Building className="h-3 w-3" /> {lead.company}</span>}
              {lead.position && <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {lead.position}</span>}
              {lead.origin && <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {lead.origin}</span>}
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Criado em {formatDate(lead.created_at)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {lead.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] gap-1"><Tag className="h-2.5 w-2.5" /> {tag}</Badge>
              ))}
            </div>
          </div>
          {lead.value && hasPermission("lead.view_sensitive") && (
            <div className="text-right shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Valor</p>
              <p className="text-2xl font-bold text-primary">R$ {lead.value.toLocaleString("pt-BR")}</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 mb-6">
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8" onClick={() => setShowNewTask(true)}>
            <Plus className="h-3 w-3" /> Criar tarefa
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 h-8"
            onClick={() => {
              // Abre o Inbox JÁ COM o lead selecionado. Se não houver conversa,
              // o Inbox detecta lead_id sem conversa e abre o modal "Nova conversa"
              // pré-preenchido com o phone do lead.
              const params = new URLSearchParams({ lead_id: lead.id });
              if (lead.phone) params.set("phone", lead.phone);
              navigate(`/inbox?${params.toString()}`);
            }}
          >
            <MessageSquare className="h-3 w-3" /> Enviar mensagem
          </Button>
          <Button size="sm" variant="outline" className="text-xs gap-1.5 h-8" onClick={() => setShowTagModal(true)}>
            <Tag className="h-3 w-3" /> Adicionar tag
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="dados" className="text-xs gap-1.5"><User className="h-3 w-3" /> Dados</TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs gap-1.5"><Clock className="h-3 w-3" /> Timeline</TabsTrigger>
            <TabsTrigger value="conversas" className="text-xs gap-1.5"><MessageSquare className="h-3 w-3" /> Conversas</TabsTrigger>
            <TabsTrigger value="tarefas" className="text-xs gap-1.5"><ClipboardList className="h-3 w-3" /> Tarefas</TabsTrigger>
            <TabsTrigger value="notas" className="text-xs gap-1.5"><StickyNote className="h-3 w-3" /> Notas</TabsTrigger>
            <TabsTrigger value="automacoes" className="text-xs gap-1.5"><Zap className="h-3 w-3" /> Ações Automáticas</TabsTrigger>
          </TabsList>

          {/* Dados */}
          <TabsContent value="dados" className="mt-5">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações de contato</h3>
                <div className="space-y-3">
                  <EditableDataRow icon={User} label="Nome" value={lead.name} onSave={(v) => updateLead(lead.id, { name: v })} />
                  <EditableDataRow icon={Phone} label="Telefone" value={lead.phone} onSave={(v) => updateLead(lead.id, { phone: v })} />
                  <EditableDataRow icon={Mail} label="Email" value={lead.email} onSave={(v) => updateLead(lead.id, { email: v })} />
                  <EditableDataRow icon={Building} label="Empresa" value={lead.company} onSave={(v) => updateLead(lead.id, { company: v })} />
                  <EditableDataRow icon={Briefcase} label="Cargo" value={lead.position} onSave={(v) => updateLead(lead.id, { position: v })} />
                  {/* Campos configuráveis (settings/lead-fields): só os habilitados aparecem. */}
                  {enabledFields
                    .filter((f) => ["city", "state", "neighborhood", "address", "zip_code", "segmento"].includes(f.key))
                    .map((f) => (
                      <EditableDataRow
                        key={f.key}
                        icon={f.key === "segmento" ? Building : MapPin}
                        label={f.label}
                        value={lead[f.key] as string | undefined}
                        onSave={(v) => updateLead(lead.id, { [f.key]: v })}
                      />
                    ))}
                </div>
              </div>
              <div className="space-y-4">
                <LeadPhonesSection leadId={lead.id} />
                <LeadContactsSection leadId={lead.id} />
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Origem e campanha</h3>
                  {enabledFields.some((f) => f.key === "origin") && (
                    <EditableDataRow icon={Globe} label="Origem" value={lead.origin} onSave={(v) => updateLead(lead.id, { origin: v })} />
                  )}
                  {hasPermission("lead.view_sensitive") && (
                    <EditableDataRow icon={DollarSign} label="Valor" value={lead.value ? String(lead.value) : undefined} onSave={(v) => updateLead(lead.id, { value: parseFloat(v) || 0 })} />
                  )}
                  {(lead.utm_campaign || lead.ad_campaign_id) && (
                    <div className="space-y-1.5 pt-2 border-t border-[hsl(var(--border-strong))]">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Atribuição de Anúncio</p>
                      {lead.utm_campaign && <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Campanha</span><span className="text-[11px] font-medium truncate max-w-[160px]">{lead.utm_campaign}</span></div>}
                      {lead.utm_medium && <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Meio</span><span className="text-[11px] font-medium">{lead.utm_medium}</span></div>}
                      {lead.utm_source && <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Fonte</span><span className="text-[11px] font-medium">{lead.utm_source}</span></div>}
                      {lead.utm_content && <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Conteúdo</span><span className="text-[11px] font-medium truncate max-w-[160px]">{lead.utm_content}</span></div>}
                      {lead.fbclid && <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Meta Click ID</span><span className="text-[11px] font-mono text-muted-foreground truncate max-w-[120px]">{lead.fbclid.slice(0, 12)}…</span></div>}
                      {lead.gclid && <div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Google Click ID</span><span className="text-[11px] font-mono text-muted-foreground truncate max-w-[120px]">{lead.gclid.slice(0, 12)}…</span></div>}
                    </div>
                  )}
                </div>
                <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tags</h3>
                    <Dialog open={showManageTags} onOpenChange={setShowManageTags}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold">
                          <Settings2 className="h-3 w-3 mr-1" /> Gerenciar Tags
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Gerenciador de Tags</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <TagsManager />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {lead.tags.length > 0 ? lead.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs gap-1"><Tag className="h-3 w-3" /> {tag}</Badge>
                    )) : <p className="text-xs text-muted-foreground italic">Nenhuma tag</p>}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Funil de vendas</h3>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Etapas do Funil</Label>
                    {/* moveLead, não updateLead: mudar de etapa por aqui gravava
                        um "Lead atualizado" genérico em vez de stage_change, e
                        não disparava as automações de entrada na coluna — o
                        mesmo lead arrastado no board tinha comportamento
                        diferente do lead movido por este select. */}
                    <Select value={lead.column_id} onValueChange={async (val) => { await moveLead(lead.id, val); }}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione uma etapa" />
                      </SelectTrigger>
                      <SelectContent>
                        {columnsByPipeline.map(({ pipeline, columns: cols }) => (
                          <SelectGroup key={pipeline.id}>
                            <SelectLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">
                              {pipeline.name}
                            </SelectLabel>
                            {cols.map((col) => (
                              <SelectItem key={col.id} value={col.id} className="text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color }} />
                                  {col.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                </div>

                {/* Custom fields tab/section */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campos Personalizados</h3>
                    <Dialog open={showAddField} onOpenChange={setShowAddField}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold">
                          <Settings2 className="h-3 w-3 mr-1" /> Gerenciar Campos
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Gerenciador de Campos Personalizados</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <CustomFieldsManager />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {cfLoading ? (
                    <div className="py-4 text-center text-[10px] text-muted-foreground">Carregando campos...</div>
                  ) : definitions.length > 0 ? (
                    <div className="space-y-1">
                      {definitions.map((def) => {
                        // Apenas mostra campos visíveis no pipeline atual, ou se for vazio mostra em todos
                        if (def.visible_pipelines && def.visible_pipelines.length > 0) {
                          if (column && !def.visible_pipelines.includes(column.pipeline_id)) return null;
                        }
                        
                        const val = lead.custom_fields?.[def.slug];
                        return (
                          <DynamicFieldRenderer
                            key={def.id}
                            definition={def}
                            value={val}
                            onChange={(slug, newValue) => {
                              const updatedFields = { ...(lead.custom_fields as object), [slug]: newValue };
                              updateLead(lead.id, { custom_fields: updatedFields });
                            }}
                            readOnly={!canEditLeadCategory(lead.category)}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-4 text-center space-y-2">
                      <p className="text-xs text-muted-foreground italic">Nenhum campo personalizado definido.</p>
                      <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setShowAddField(true)}>
                        Criar primeiro campo
                      </Button>
                    </div>
                  )}
                </div>

                {/* Device/Browser info */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dispositivo / Navegador</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <Monitor className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground">Navegador</p>
                        <p className="text-sm text-foreground">Chrome 122 / Windows 11</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground">Dispositivo</p>
                        <p className="text-sm text-foreground">Desktop • 1920×1080</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground">IP / Localização</p>
                        <p className="text-sm text-foreground">189.xxx.xx.xx • São Paulo, BR</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Timeline */}
          <TabsContent value="timeline" className="mt-5">
            <div className="flex justify-end gap-2 mb-3">
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setLogEventType("call")}>
                <Phone className="h-3.5 w-3.5" /> Registrar ligação
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setLogEventType("call_attempt")}>
                <PhoneMissed className="h-3.5 w-3.5" /> Tentativa
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => setLogEventType("meeting")}>
                <CalendarCheck className="h-3.5 w-3.5" /> Registrar reunião
              </Button>
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="space-y-0">
                {(mergedTimeline.length > 0 ? mergedTimeline : defaultTimeline(lead, column?.name)).map((ev, i, arr) => {
                  const cfg = timelineConfig[ev.type] || timelineConfig.note;
                  const Icon = cfg.icon;
                  return (
                    <div key={ev.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="mt-0.5 h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                          <Icon className={`h-4 w-4 ${cfg.color}`} />
                        </div>
                        {i < arr.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
                      </div>
                      <div className="pb-5 pt-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-foreground font-medium">{ev.content}</p>
                          <Badge variant="outline" className="text-[10px] shrink-0">{cfg.label}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{ev.user_name} · {formatDateTime(ev.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {mergedTimeline.length > 0 && hasMoreTimeline && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5"
                    onClick={handleLoadMoreTimeline}
                    disabled={loadingMoreTimeline}
                  >
                    {loadingMoreTimeline ? "Carregando..." : "Carregar mais"}
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Conversas */}
          <TabsContent value="conversas" className="mt-5">
            {threads.length > 0 ? (
              <div className="space-y-3">
                {threads.map((thread) => {
                  const msgs = mockMessages.filter((m) => m.thread_id === thread.id);
                  return (
                    <div key={thread.id} className="bg-card border border-border rounded-lg p-4 hover:border-[#ff9500]/30 transition-colors cursor-pointer" onClick={() => navigate("/inbox")}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] capitalize">{thread.channel}</Badge>
                          <span className="text-xs text-muted-foreground">{formatDateTime(thread.last_message_at)}</span>
                        </div>
                        {thread.unread_count > 0 && (
                          <Badge className="bg-primary text-primary-foreground text-[10px] h-5 w-5 p-0 flex items-center justify-center rounded-full">{thread.unread_count}</Badge>
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
              </div>
            )}
          </TabsContent>

          {/* Tarefas */}
          <TabsContent value="tarefas" className="mt-5">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {leadTasks.length > 0 ? (
                <div className="divide-y divide-border">
                  {/* 2.6: pendentes ganham campo de resultado + botão de conclusão. */}
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="px-4 py-3 hover:bg-card-hover transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={false} onCheckedChange={() => toggleTaskStatus(task.id)} className="h-4 w-4" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{task.title}</p>
                            {task.due_date && (
                              <span className={`text-[10px] flex items-center gap-1 mt-0.5 ${task.status === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>
                                <Calendar className="h-2.5 w-2.5" /> {formatDate(task.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                        {statusIcon(task.status)}
                      </div>
                      <div className="mt-2 pl-7 space-y-2">
                        <Textarea
                          placeholder="Adicionar resultado..."
                          value={taskResults[task.id] ?? ""}
                          onChange={(e) => setTaskResults((prev) => ({ ...prev, [task.id]: e.target.value }))}
                          className="text-xs min-h-[56px] resize-none"
                        />
                        <div className="flex justify-end">
                          <Button size="sm" className="text-xs gap-1" onClick={() => handleCompleteTask(task.id)}>
                            <CheckCircle2 className="h-3 w-3" /> Tarefa concluída
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {completedTasks.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowCompletedTasks((v) => !v)}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:bg-card-hover transition-colors"
                        aria-expanded={showCompletedTasks}
                      >
                        <ChevronDown className={`h-3 w-3 transition-transform ${showCompletedTasks ? "" : "-rotate-90"}`} />
                        Concluídas ({completedTasks.length})
                      </button>
                      {showCompletedTasks && completedTasks.map((task) => (
                        <div key={task.id} className="px-4 py-3 border-t border-border">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox checked onCheckedChange={() => toggleTaskStatus(task.id)} className="h-4 w-4" />
                              <div>
                                <p className="text-sm font-medium line-through text-muted-foreground">{task.title}</p>
                                {task.completed_at && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <CheckCircle2 className="h-2.5 w-2.5" /> {formatDateTime(task.completed_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {statusIcon(task.status)}
                          </div>
                          {task.result && (
                            <p className="mt-2 pl-7 text-xs text-foreground whitespace-pre-wrap">{task.result}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <ClipboardList className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Nenhuma tarefa vinculada</p>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="mt-3 text-xs gap-1 w-full" onClick={() => setShowNewTask(true)}>
              <Plus className="h-3 w-3" /> Nova Tarefa
            </Button>
          </TabsContent>

          {/* Notas */}
          <TabsContent value="notas" className="mt-5 space-y-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <Textarea placeholder="Escreva uma nota sobre este lead..." value={newNote} onChange={(e) => setNewNote(e.target.value)} className="text-xs min-h-[80px] resize-none" />
              <div className="flex justify-end mt-2">
                <Button size="sm" className="text-xs gap-1" disabled={!newNote.trim()} onClick={handleAddNote}>
                  <Plus className="h-3 w-3" /> Adicionar nota
                </Button>
              </div>
            </div>
            {leadNotes.length > 0 ? (
              <div className="space-y-3">
                {leadNotes.map((note) => (
                  <div key={note.id} className="bg-card border border-border rounded-lg p-4 group relative">
                    {editingNoteId === note.id ? (
                      /* 2.5: edição inline — textarea no lugar do texto. */
                      <div className="space-y-2">
                        <Textarea
                          value={editingNoteDraft}
                          onChange={(e) => setEditingNoteDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Escape") handleCancelEditNote(); }}
                          className="text-xs min-h-[80px] resize-none"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" className="text-xs" onClick={handleCancelEditNote}>
                            Cancelar
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs"
                            disabled={!editingNoteDraft.trim() || editingNoteDraft.trim() === note.content}
                            onClick={handleSaveNote}
                          >
                            Salvar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {canEditNote(note) && (
                          <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleStartEditNote(note)}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Editar nota"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setNoteToDelete(note)}
                              className="text-muted-foreground hover:text-destructive"
                              aria-label="Excluir nota"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        <p
                          className={`text-sm text-foreground whitespace-pre-wrap pr-12 ${canEditNote(note) ? "cursor-text" : ""}`}
                          onDoubleClick={() => handleStartEditNote(note)}
                        >
                          {note.content}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-2">
                          {note.user_name} · {formatDateTime(note.created_at)}
                          {note.updated_at && <span className="ml-1 italic">(editado)</span>}
                        </p>
                      </>
                    )}
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

          {/* Ações Temporais */}
          <TabsContent value="automacoes" className="mt-5 space-y-4">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-secondary/50 border-b border-border flex items-center justify-between">
                <p className="text-xs font-semibold">Rotinas Temporais Adicionadas</p>
                <Button variant="outline" size="sm" className="text-xs gap-1 h-7" onClick={() => navigate("/automations", { state: { tab: "time_actions", lead_id: id } })}><Plus className="h-3 w-3" /> Nova regra</Button>
              </div>
              {leadAutomations.map((auto) => {
                let friendlyTrigger = "Gatilho customizado";
                if (auto.trigger.type === "card_entered") friendlyTrigger = "Ao entrar na coluna";
                if (auto.trigger.type === "time_in_column") friendlyTrigger = `Após ${auto.trigger.config?.hours || 24}h na coluna`;
                if (auto.trigger.type === "stage_changed") friendlyTrigger = "Ao mudar de estágio";

                return (
                  <div key={auto.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0 hover:bg-card-hover transition-colors">
                    <div className="flex items-center gap-3">
                      <Zap className={`h-4 w-4 ${auto.active ? "text-warning" : "text-muted-foreground"}`} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{auto.name}</p>
                        <p className="text-[10px] text-muted-foreground">{friendlyTrigger}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] ${auto.active ? "border-success/40 text-success" : "border-border text-muted-foreground"}`}>
                        {auto.active ? "Ativa" : "Inativa"}
                      </Badge>
                      <button 
                        className="h-5 w-9 rounded-full transition-colors relative flex items-center px-0.5" 
                        style={{ backgroundColor: auto.active ? "hsl(var(--success))" : "hsl(var(--secondary))" }}
                        onClick={() => toggleBasicAutomation(auto.id)}
                      >
                        <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${auto.active ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {leadAutomations.length === 0 && (
                 <div className="p-6 text-center text-muted-foreground">
                   <Zap className="h-6 w-6 mx-auto mb-2 opacity-30" />
                   <p className="text-xs font-medium">Nenhuma rotina temporal agendada.</p>
                 </div>
              )}
            </div>
            <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">Automações avançadas em breve</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Webhooks, integração com IA, sequências multi-etapas e regras condicionais.</p>
              </div>
              <Badge variant="outline" className="text-[10px] border-accent/40 text-accent shrink-0">Em breve</Badge>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* New Task Dialog */}
      <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Tarefa</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Título *</Label>
              <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Descreva a tarefa" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Prazo</Label>
              <Input type="date" value={newTaskDue} onChange={(e) => setNewTaskDue(e.target.value)} min={new Date().toISOString().split("T")[0]} className="mt-1" />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowNewTask(false)}>Cancelar</Button>
            <Button onClick={handleCreateTask} disabled={!newTaskTitle.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Tag Modal */}
      {id && (
        <AddTagModal open={showTagModal} onOpenChange={setShowTagModal} leadId={id} />
      )}

      {/* Confirmação de exclusão de nota */}
      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir esta nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A nota será removida permanentemente do lead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!logEventType} onOpenChange={(open) => { if (!open) { setLogEventType(null); setLogEventNote(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{logEventType === "call" ? "Registrar ligação" : logEventType === "call_attempt" ? "Registrar tentativa de ligação" : "Registrar reunião"}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="O que foi conversado? (opcional)"
            value={logEventNote}
            onChange={(e) => setLogEventNote(e.target.value)}
            className="text-xs min-h-[80px] resize-none"
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setLogEventType(null); setLogEventNote(""); }}>Cancelar</Button>
            <Button onClick={handleLogEvent}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Barra de ações do detalhe do lead. Auto-contida de propósito: resolve o lead
 * pelo id e carrega o próprio MergeLeadsModal, para poder ser montada tanto no
 * header do AppLayout quanto no header de um Sheet.
 */
export function LeadDetailActions({ leadId, onClose }: LeadDetailProps) {
  const navigate = useNavigate();
  const { leads, deleteLead, mergeLeads } = useAppState();
  const { hasPermission } = usePermissions();
  const [showMergeModal, setShowMergeModal] = useState(false);
  const lead = useMemo(() => leads.find((l) => l.id === leadId), [leadId, leads]);

  const handleDelete = useCallback(async () => {
    if (!leadId) return;
    await deleteLead(leadId);
    onClose?.();
  }, [leadId, deleteLead, onClose]);

  if (!lead) return null;

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="text-xs gap-1 h-8" onClick={onClose}>
        <ArrowLeft className="h-3 w-3" /> Voltar
      </Button>
      {hasPermission("crm.delete") && (
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 h-8"
          onClick={() => setShowMergeModal(true)}
        >
          <Merge className="h-3 w-3" /> Mesclar
        </Button>
      )}
      {hasPermission("crm.delete") && (
        <Button variant="ghost" size="sm" className="text-xs gap-1 h-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete}>
          <Trash2 className="h-3 w-3" /> Excluir
        </Button>
      )}

      <MergeLeadsModal
        open={showMergeModal}
        onOpenChange={setShowMergeModal}
        sourceLead={lead}
        onMerge={async (sourceId, targetId) => {
          await mergeLeads(sourceId, targetId);
          navigate(`/leads/${targetId}`);
        }}
      />
    </div>
  );
}

function EditableDataRow({ icon: Icon, label, value, onSave }: { icon: typeof User; label: string; value?: string; onSave?: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");

  const save = () => {
    if (onSave && draft !== (value || "")) onSave(draft);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 group">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
            className="h-7 text-sm mt-0.5"
          />
        ) : (
          <p className="text-sm text-foreground truncate">{value || "—"}</p>
        )}
      </div>
      {!editing && onSave && (
        <button className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setDraft(value || ""); setEditing(true); }}>
          <Edit3 className="h-3 w-3 text-muted-foreground hover:text-primary" />
        </button>
      )}
    </div>
  );
}

function defaultTimeline(lead: Lead, columnName?: string): TimelineEvent[] {
  return [
    { id: "dt1", lead_id: lead.id, type: "stage_change", content: "Lead criado e adicionado ao pipeline", created_at: lead.created_at, user_name: "Sistema" },
    { id: "dt2", lead_id: lead.id, type: "stage_change", content: `Movido para ${columnName ?? "coluna atual"}`, created_at: lead.updated_at, user_name: "Sistema" },
  ];
}
