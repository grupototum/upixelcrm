import { logger } from "@/lib/logger";
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as leadsRepo from "@/services/leads";
import * as automationsRepo from "@/services/automations";
import { listActiveAgents } from "@/services/users";
import { reassignConversationsToLead } from "@/services/inbox";
import { reconcileLeads } from "@/lib/reconcile-leads";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Lead, Pipeline, PipelineColumn, Task, Automation, TimelineEvent, ComplexAutomation } from "@/types";
import type { Node, Edge } from "reactflow";
import { toast } from "sonner";

// Maps AppContext basic-rule trigger types → complex automation visual-builder trigger types.
// Module-scoped: stable across renders, no need to memoize or list in hook deps.
const complexTriggerMap: Record<string, string[]> = {
  stage_changed: ["status_change"],
  card_entered:  ["status_change"],
  new_lead:      ["new_lead"],
  tag_added:     ["tag_added"],
};

interface AppState {
  leads: Lead[];
  pipelines: Pipeline[];
  columns: PipelineColumn[];
  currentPipelineId: string;
  tasks: Task[];
  automations: Automation[];
  complexAutomations: ComplexAutomation[];
  timeline: TimelineEvent[];
  globalTags: string[];
  leadCountByPipeline: Record<string, number>;
  loading: boolean;

  setPipeline: (id: string) => void;
  addPipeline: (name: string) => Promise<void>;
  addLead: (data: Partial<Lead>, columnId: string) => Promise<Lead | null>;
  /** UI-PATTERNS: retorna false em erro para o modal decidir se fecha. */
  updateLead: (id: string, data: Partial<Lead>) => Promise<boolean>;
  deleteLead: (id: string) => Promise<void>;
  /** UI-PATTERNS: retorna false em erro para o modal decidir se fecha. */
  moveLead: (id: string, toColumnId: string) => Promise<boolean>;
  moveLeadToPipeline: (id: string, toPipelineId: string) => Promise<void>;
  mergeLeads: (sourceLeadId: string, targetLeadId: string) => Promise<void>;

  addTask: (data: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;
  /** 2.6: conclui uma tarefa pendente, gravando o resultado. Retorna false em erro. */
  completeTask: (id: string, result?: string) => Promise<boolean>;
  /** 2.6: edita o resultado de uma tarefa já concluída, sem mexer em status/completed_at. */
  updateTaskResult: (id: string, result?: string) => Promise<boolean>;

  addColumn: (name: string, color: string) => Promise<void>;
  /** UI-PATTERNS: retorna false em erro para o modal decidir se fecha. */
  updateColumn: (id: string, data: Partial<PipelineColumn>) => Promise<boolean>;
  /** UI-PATTERNS: retorna false em erro para o modal decidir se fecha. */
  deleteColumn: (id: string) => Promise<boolean>;
  reorderColumns: (orderedIds: string[]) => Promise<void>;

  addTimelineEvent: (event: Omit<TimelineEvent, "id" | "created_at">) => Promise<void>;

  createAutomation: (name: string) => Promise<string | null>;
  updateAutomationNodes: (id: string, nodes: Node[], edges: Edge[]) => Promise<void>;
  deleteAutomation: (id: string) => Promise<void>;
  toggleComplexAutomation: (id: string) => Promise<void>;
  
  toggleBasicAutomation: (id: string) => Promise<void>;
  deleteBasicAutomation: (id: string) => Promise<void>;
  addBasicAutomation: (data: Partial<Automation>) => Promise<void>;
  updateBasicAutomation: (id: string, data: Partial<Automation>) => Promise<void>;

  addGlobalTag: (tag: string) => Promise<void>;
  deleteGlobalTag: (tag: string) => Promise<void>;

  updatePipeline: (id: string, data: Partial<Pipeline>) => Promise<void>;
  deletePipeline: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  // FIX-07: Use client_id from the AuthContext profile (profiles table) instead of
  // mutable user_metadata. The previous fallback "c1" could silently scope all queries
  // to the wrong tenant when user_metadata was missing, causing data leakage/loss.
  const { user } = useAuth();

  const [leads, setLeads] = useState<Lead[]>([]);
  // Espelha `leads` sem entrar em dependências de useCallback — leads muda a
  // cada drag/realtime, e updateLead é passado pra baixo em muitos lugares;
  // colocar `leads` na dep array desestabilizaria a identidade da função.
  const leadsRef = useRef<Lead[]>([]);
  useEffect(() => { leadsRef.current = leads; }, [leads]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [currentPipelineId, setCurrentPipelineId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [complexAutomations, setComplexAutomations] = useState<ComplexAutomation[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [globalTags, setGlobalTags] = useState<string[]>(["Hot", "Warm", "Cold", "Enterprise", "Agência"]);
  const [leadCountByPipeline, setLeadCountByPipeline] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const { tenant } = useTenant();

  // Master view: master user no subdomínio "master" vê dados de TODOS os tenants (RLS permite)
  const isMasterView = user?.role === "master" && tenant?.subdomain === "master";

  // Em master view, tenant.id é a string "master" (sentinela, não UUID).
  // Para inserts em colunas tenant_id (UUID), só inclui se for UUID válido.
  // Memoizado por tenant?.id para manter referência estável entre renders —
  // permite incluir nas deps de useCallback sem causar re-render infinito.
  const tenantIdForInsert = useMemo(() => {
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return tenant?.id && UUID_RE.test(tenant.id) ? { tenant_id: tenant.id } : {};
  }, [tenant?.id]);

  const executeAutomationsRef = useRef<((leadId: string, triggerType: Automation["trigger"]["type"], columnId?: string) => Promise<void>) | null>(null);

  // A carga de leads roda em background (FASE 3) com a UI já interativa. Sem
  // rastrear o que o usuário mexeu nesse meio-tempo, o snapshot do servidor
  // sobrescrevia a mutação otimista: card voltava de coluna, lead criado sumia,
  // deletado ressuscitava. O gen invalida a carga anterior numa troca de tenant.
  const leadsFetchGen = useRef(0);
  const leadsFetchActive = useRef(false);
  const dirtyLeadIds = useRef(new Set<string>());

  /** Marca um lead alterado localmente enquanto a carga em background acontece. */
  const markLeadDirty = useCallback((id: string) => {
    if (leadsFetchActive.current) dirtyLeadIds.current.add(id);
  }, []);

  const fetchAll = useCallback(async () => {
    // Return early (and clear loading) if auth has not resolved a valid client_id yet.
    // Master view bypassa o filtro por client_id, então só precisa de user autenticado.
    const clientId = tenant?.id ?? user?.client_id ?? "";
    if (!clientId && !isMasterView) { setLoading(false); return; }

    const gen = ++leadsFetchGen.current;
    leadsFetchActive.current = true;
    dirtyLeadIds.current.clear();

    try {
      // FASE 1: estruturas + count rápido (libera UI em ~500ms)
      // Carrega pipelines, columns, tasks, automations e SÓ os column_ids
      // de todos os leads para calcular contagens. UI fica pronta antes
      // de baixar os dados completos dos leads.
      // Falha em um recurso não derruba os demais (o original checava
      // res.data por recurso) — por isso o .catch(() => null) individual.
      const PAGE = 1000;

      const [pipeData, colData, taskData, tlData, autoData, rulesData, totalCount] = await Promise.all([
        leadsRepo.listPipelines(clientId, isMasterView).catch(() => null),
        leadsRepo.listPipelineColumns(clientId, isMasterView).catch(() => null),
        leadsRepo.listTasks(clientId, isMasterView).catch(() => null),
        leadsRepo.listTimelineEvents(clientId, isMasterView).catch(() => null),
        automationsRepo.listComplexAutomations(clientId, isMasterView).catch(() => null),
        automationsRepo.listAutomationRules(clientId, isMasterView).catch(() => null),
        leadsRepo.countLeads(clientId, isMasterView).catch(() => null),
      ]);

      // Aplica estruturas imediatamente (CRM já fica navegável)
      if (pipeData) {
        setPipelines(pipeData.map((p) => mapPipeline(p as unknown as Record<string, unknown>)));
        if (pipeData.length > 0 && !currentPipelineId) {
          setCurrentPipelineId(pipeData[0].id);
        }
      }
      if (colData) setColumns(colData.map((c) => mapColumn(c as unknown as Record<string, unknown>)));
      if (taskData) setTasks(taskData.map((t) => mapTask(t as unknown as Record<string, unknown>)));
      if (tlData) setTimeline(tlData.map((t) => mapTimeline(t as unknown as Record<string, unknown>)));
      if (autoData) setComplexAutomations(autoData.map((a) => mapComplexAutomation(a as unknown as Record<string, unknown>)));
      if (rulesData) setAutomations(rulesData.map((r) => mapAutomationRule(r as unknown as Record<string, unknown>)));

      // FASE 2: contagens por pipeline via column_id-only (rápido — só UUIDs)
      // Permite mostrar quantos leads tem cada funil ANTES de baixar tudo
      const total = totalCount ?? 0;
      if (total > 0) {
        const colToPipeline = new Map<string, string>();
        if (colData) {
          colData.forEach((c: any) => colToPipeline.set(c.id, c.pipeline_id));
        }
        const counts: Record<string, number> = {};
        const pageCount = Math.ceil(total / PAGE);
        const colIdRequests = Array.from({ length: pageCount }, (_, page) => {
          const from = page * PAGE;
          const to = from + PAGE - 1;
          // Página com erro é pulada, como no original
          return leadsRepo.listLeadColumnIdsPage(clientId, isMasterView, from, to).catch(() => null);
        });

        // Paraleliza paginations leves (só column_id)
        const BATCH = 5;
        for (let i = 0; i < colIdRequests.length; i += BATCH) {
          const batch = colIdRequests.slice(i, i + BATCH);
          const results = await Promise.all(batch);
          for (const rows of results) {
            if (!rows) continue;
            for (const row of rows) {
              const cid = (row as any).column_id;
              if (!cid) continue;
              const pid = colToPipeline.get(cid);
              if (!pid) continue;
              counts[pid] = (counts[pid] ?? 0) + 1;
            }
          }
        }
        setLeadCountByPipeline(counts);

        // Auto-switch para o pipeline com mais leads — APENAS na primeira carga,
        // quando o user ainda não fez escolha. Se rodasse em toda carga, o usuário
        // não conseguiria selecionar funis vazios (esse useEffect dispara em mudança
        // de currentPipelineId, daí o efeito de "sempre volta pro principal").
        const isFirstLoad = !currentPipelineId;
        if (isFirstLoad) {
          const activePid = pipeData?.[0]?.id ?? "";
          if (activePid && (counts[activePid] ?? 0) === 0) {
            const bestPid = Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0];
            if (bestPid && bestPid !== activePid) {
              setCurrentPipelineId(bestPid);
            }
          }
        }
      }

      // Libera o loading principal — UI fica navegável agora
      setLoading(false);

      // FASE 3 (em background): baixa leads completos
      // Não bloqueia o render. Quando chegar, atualiza estado.
      if (total > 0) {
        const pageCount = Math.ceil(total / PAGE);
        const pageRequests = Array.from({ length: pageCount }, (_, page) => {
          const from = page * PAGE;
          const to = from + PAGE - 1;
          // Página com erro loga e segue, como no original
          return leadsRepo.listLeadsPage(clientId, isMasterView, from, to).catch((err) => {
            logger.error("fetchAllLeads page error:", err);
            return null;
          });
        });

        const BATCH = 5;
        const all: any[] = [];
        for (let i = 0; i < pageRequests.length; i += BATCH) {
          const batch = pageRequests.slice(i, i + BATCH);
          const results = await Promise.all(batch);
          for (const rows of results) {
            if (rows) all.push(...rows);
          }
          if (i === 0 && all.length > 0) {
            logger.info("First lead from DB:", { name: all[0].name, custom_fields: all[0].custom_fields });
          }
          // Carga obsoleta (troca de tenant/master view): quem manda é o fetch novo.
          if (gen !== leadsFetchGen.current) return;
          // Atualiza progressivamente: cada batch já aparece nos cards, sem
          // atropelar o que o usuário mexeu enquanto os batches chegavam.
          const mapped = all.map(mapLead);
          setLeads((prev) => reconcileLeads(prev, mapped, dirtyLeadIds.current));
        }
      } else if (gen === leadsFetchGen.current) {
        setLeads((prev) => reconcileLeads(prev, [], dirtyLeadIds.current));
      }
    } catch (err) {
      logger.error("Error fetching data:", err);
      toast.error("Erro ao carregar dados");
      setLoading(false);
    } finally {
      // setLoading(false) já é chamado dentro do try após FASE 1.
      // Garantimos aqui caso ocorra erro antes.
      // Encerra o rastreamento — salvo se um fetch mais novo já assumiu o estado.
      if (leadsFetchGen.current === gen) {
        leadsFetchActive.current = false;
        dirtyLeadIds.current.clear();
      }
    }
    // currentPipelineId NÃO entra nas deps: o fetchAll filtra por client_id/tenant,
    // não por pipeline. Re-buscar tudo a cada troca de funil é desperdício
    // (era o que causava re-fetchs constantes ao trocar entre funis).
    // O auto-switch initial usa isFirstLoad (currentPipelineId vazio) e roda 1x.
  }, [tenant?.id, user?.client_id, isMasterView]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addTimelineEvent = useCallback(async (event: Omit<TimelineEvent, "id" | "created_at">) => {
    const clientId = tenant?.id ?? user?.client_id;
    if (!clientId) { logger.error(new Error("addTimelineEvent sem client_id")); return; }
    let data: Awaited<ReturnType<typeof leadsRepo.insertTimelineEvent>>;
    try {
      data = await leadsRepo.insertTimelineEvent({
        lead_id: event.lead_id || null,
        type: event.type,
        content: event.content,
        user_name: event.user_name,
        user_id: event.user_id ?? user?.id ?? null,
        client_id: clientId,
        ...tenantIdForInsert,
      });
    } catch (error) {
      logger.error(error); return;
    }
    if (data) setTimeline((prev) => [mapTimeline(data as unknown as Record<string, unknown>), ...prev]);
  }, [tenant?.id, user?.client_id, user?.id, tenantIdForInsert]);

  const updateLead = useCallback(async (id: string, data: Partial<Lead>): Promise<boolean> => {
    // Capturado ANTES do update, pra poder comparar valor antigo x novo.
    const before = leadsRef.current.find((l) => l.id === id);
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.company !== undefined) updateData.company = data.company || null;
    if (data.position !== undefined) updateData.position = data.position || null;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.value !== undefined) updateData.value = data.value ?? null;
    if (data.responsible_id !== undefined) updateData.responsible_id = data.responsible_id || null;
    if (data.segmento !== undefined) updateData.segmento = data.segmento || null;
    if (data.faturamento_mensal !== undefined) updateData.faturamento_mensal = data.faturamento_mensal ?? null;
    if (data.origin !== undefined) updateData.origin = data.origin || null;
    if (data.category !== undefined) updateData.category = data.category || null;
    if (data.column_id !== undefined) updateData.column_id = data.column_id;
    if (data.notes_local !== undefined) updateData.notes_local = data.notes_local || null;
    if (data.custom_fields !== undefined) updateData.custom_fields = data.custom_fields || {};

    try {
      await leadsRepo.updateLead(id, updateData);
    } catch (error) {
      logger.error(error); toast.error("Erro ao atualizar lead"); return false;
    }

    markLeadDirty(id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l));

    // Edição de nota já grava seu próprio evento específico ("Nota
    // adicionada/editada/removida") — duplicar aqui infla a métrica
    // contacts_made das metas (conta eventos type=note). Responsável mudou:
    // evento específico com os nomes, em vez do genérico "Lead atualizado"
    // que não dizia o que de fato mudou.
    const onlyNotesChanged = Object.keys(updateData).length === 1 && "notes_local" in updateData;
    if (onlyNotesChanged) {
      // nada — evento específico já foi gravado por quem chamou updateLead.
    } else if (data.responsible_id !== undefined && data.responsible_id !== before?.responsible_id) {
      const clientId = tenant?.id ?? user?.client_id;
      const ids = [before?.responsible_id, data.responsible_id].filter((v): v is string => !!v);
      const agents = clientId && ids.length > 0 ? await listActiveAgents(clientId).catch(() => []) : [];
      const nameOf = (agentId?: string | null) => agentId ? (agents.find((a) => a.id === agentId)?.name ?? agentId) : "Ninguém";
      await addTimelineEvent({
        lead_id: id,
        type: "note",
        content: `Responsável alterado: de ${nameOf(before?.responsible_id)} para ${nameOf(data.responsible_id)}`,
        user_name: "Usuário",
      });
    } else {
      await addTimelineEvent({ lead_id: id, type: "note", content: "Lead atualizado", user_name: "Usuário" });
    }
    return true;
  }, [addTimelineEvent, markLeadDirty, tenant?.id, user?.client_id]);

  const addTask = useCallback(async (data: Partial<Task>): Promise<Task | null> => {
    const clientId = tenant?.id ?? user?.client_id;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return null; }

    let row: Awaited<ReturnType<typeof leadsRepo.insertTaskReturning>>;
    try {
      row = await leadsRepo.insertTaskReturning({
        title: data.title ?? "",
        lead_id: data.lead_id || null,
        due_date: data.due_date || null,
        assigned_to: data.assigned_to || "Você",
        // Sem seletor de responsável na UI hoje — "Você" (acima) é sempre o
        // criador, então o dono real da tarefa é quem está logado.
        assigned_to_id: data.assigned_to_id || user?.id || null,
        priority: data.priority || undefined,
        description: data.description || null,
        client_id: clientId,
        ...tenantIdForInsert,
      });
    } catch (error) {
      logger.error(error); toast.error("Erro ao criar tarefa"); return null;
    }
    const newTask = mapTask(row as unknown as Record<string, unknown>);
    setTasks((prev) => [newTask, ...prev]);

    if (newTask.lead_id) {
      await addTimelineEvent({
        lead_id: newTask.lead_id,
        type: "task",
        content: `Tarefa criada: ${newTask.title}`,
        user_name: "Usuário",
      });
    }

    toast.success("Tarefa criada");
    return newTask;
  }, [addTimelineEvent, user?.id, user?.client_id, tenant?.id, tenantIdForInsert]);

  const moveLead = useCallback(async (id: string, toColumnId: string): Promise<boolean> => {
    const lead = leads.find((l) => l.id === id);
    // Já está na coluna destino: nada a fazer, mas não é erro.
    if (!lead || lead.column_id === toColumnId) return true;

    const fromCol = columns.find((c) => c.id === lead.column_id);
    const toCol = columns.find((c) => c.id === toColumnId);

    // Optimistic update
    markLeadDirty(id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, column_id: toColumnId, updated_at: new Date().toISOString() } : l));

    try {
      await leadsRepo.updateLead(id, { column_id: toColumnId });
    } catch (error) {
      logger.error(error);
      // Rollback
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, column_id: lead.column_id } : l));
      toast.error("Erro ao mover lead");
      return false;
    }

    // Etapa de outro funil: sem nomear o funil, o timeline vira "movido de
    // Qualificação para Qualificação" — todo funil novo nasce com as mesmas
    // 3 etapas, então só o nome da coluna não diz o que aconteceu.
    const crossPipeline =
      !!fromCol && !!toCol && fromCol.pipeline_id !== toCol.pipeline_id;
    const pipeName = (pipelineId?: string) =>
      pipelines.find((p) => p.id === pipelineId)?.name ?? "?";
    await addTimelineEvent({
      lead_id: id,
      type: "stage_change",
      content: crossPipeline
        ? `"${lead.name}" movido de ${fromCol?.name ?? "?"} (funil "${pipeName(fromCol?.pipeline_id)}") para ${toCol?.name ?? "?"} (funil "${pipeName(toCol?.pipeline_id)}")`
        : `"${lead.name}" movido de ${fromCol?.name ?? "?"} para ${toCol?.name ?? "?"}`,
      user_name: "Usuário",
    });

    // Trigger automations for transition
    if (executeAutomationsRef.current) {
      await executeAutomationsRef.current(id, "stage_changed", toColumnId);
      await executeAutomationsRef.current(id, "card_entered", toColumnId);
    }
    return true;
  }, [leads, columns, pipelines, addTimelineEvent, markLeadDirty]);

  const moveLeadToPipeline = useCallback(async (id: string, toPipelineId: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return;

    const targetPipelineColumns = columns.filter(c => c.pipeline_id === toPipelineId);
    if (targetPipelineColumns.length === 0) {
      toast.error("Funil de destino não possui colunas");
      return;
    }

    const firstColumnOfNewPipeline = targetPipelineColumns.sort((a, b) => a.order - b.order)[0];
    const fromPipeline = pipelines.find(p => columns.find(c => c.id === lead.column_id)?.pipeline_id === p.id);
    const toPipeline = pipelines.find(p => p.id === toPipelineId);

    // Optimistic update
    markLeadDirty(id);
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, column_id: firstColumnOfNewPipeline.id, updated_at: new Date().toISOString() } : l));

    try {
      await leadsRepo.updateLead(id, { column_id: firstColumnOfNewPipeline.id });
    } catch (error) {
      logger.error(error);
      // Rollback
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, column_id: lead.column_id } : l));
      toast.error("Erro ao mover lead entre funis");
      return;
    }

    toast.success(`Lead movido de "${fromPipeline?.name}" para "${toPipeline?.name}"`);

    await addTimelineEvent({
      lead_id: id,
      type: "stage_change",
      content: `"${lead.name}" movido do funil "${fromPipeline?.name ?? "?"}" para "${toPipeline?.name ?? "?"}"`,
      user_name: "Usuário",
    });
  }, [leads, columns, pipelines, addTimelineEvent, markLeadDirty]);

  const addLead = useCallback(async (data: Partial<Lead>, columnId: string): Promise<Lead | null> => {
    const clientId = tenant?.id ?? user?.client_id;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return null; }

    let row: Awaited<ReturnType<typeof leadsRepo.insertLead>>;
    try {
      row = await leadsRepo.insertLead({
        name: data.name ?? "",
        phone: data.phone || null,
        email: data.email || null,
        company: data.company || null,
        position: data.position || null,
        city: data.city || null,
        origin: data.origin || "Manual",
        tags: data.tags ?? [],
        column_id: columnId,
        value: data.value ?? null,
        responsible_id: data.responsible_id || null,
        segmento: data.segmento || null,
        faturamento_mensal: data.faturamento_mensal ?? null,
        client_id: clientId,
        utm_source: data.utm_source || null,
        utm_medium: data.utm_medium || null,
        utm_campaign: data.utm_campaign || null,
        utm_content: data.utm_content || null,
        utm_term: data.utm_term || null,
        ad_campaign_id: data.ad_campaign_id || null,
        ad_adset_id: data.ad_adset_id || null,
        ad_id: data.ad_id || null,
        fbclid: data.fbclid || null,
        gclid: data.gclid || null,
        ...tenantIdForInsert,
      });
    } catch (error) {
      logger.error(error); toast.error("Erro ao criar lead"); return null;
    }
    const newLead = mapLead(row as unknown as Record<string, unknown>);
    markLeadDirty(newLead.id);
    setLeads((prev) => [newLead, ...prev]);

    await addTimelineEvent({
      lead_id: newLead.id,
      type: "stage_change",
      content: `Lead "${newLead.name}" criado e adicionado ao pipeline`,
      user_name: "Sistema",
    });

    toast.success("Lead criado com sucesso");

    // Trigger automations for entry and new lead
    if (executeAutomationsRef.current) {
      await executeAutomationsRef.current(newLead.id, "card_entered", columnId);
      await executeAutomationsRef.current(newLead.id, "new_lead" as any);
    }

    return newLead;
  }, [addTimelineEvent, user?.client_id, tenant?.id, tenantIdForInsert, markLeadDirty]);


  const deleteLead = useCallback(async (id: string) => {
    try {
      await leadsRepo.bulkDeleteLeads([id]);
    } catch (error) {
      logger.error(error); toast.error("Erro ao excluir lead"); return;
    }
    markLeadDirty(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTasks((prev) => prev.filter((t) => t.lead_id !== id));
    toast.success("Lead excluído");
  }, [markLeadDirty]);

  const mergeLeads = useCallback(async (sourceLeadId: string, targetLeadId: string) => {
    try {
      // Erro em conversations aborta, como no original
      await reassignConversationsToLead(sourceLeadId, targetLeadId);

      // Se tasks/timeline não forem reapontados, NÃO deleta o lead de origem —
      // antes o delete rodava mesmo assim e os dados sumiam por cascade.
      await leadsRepo.reassignTasksToLead(sourceLeadId, targetLeadId);
      await leadsRepo.reassignTimelineToLead(sourceLeadId, targetLeadId);

      await leadsRepo.bulkDeleteLeads([sourceLeadId]);

      markLeadDirty(sourceLeadId);
      setLeads((prev) => prev.filter((l) => l.id !== sourceLeadId));
      toast.success("Leads mesclados com sucesso.");
    } catch (err: any) {
      logger.error(err);
      toast.error(`Erro ao mesclar leads: ${err.message}`);
    }
  }, [markLeadDirty]);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    try {
      await leadsRepo.updateTaskRow(id, data);
    } catch (error) {
      logger.error(error); return;
    }
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await leadsRepo.deleteTaskById(id);
    } catch (error) {
      logger.error(error); toast.error("Erro ao excluir tarefa"); return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tarefa excluída");
  }, []);

  // 2.6: conclusão com resultado. Só age em tarefa pendente — reconcluir uma
  // tarefa já fechada sobrescreveria o resultado anterior em silêncio.
  const completeTask = useCallback(async (id: string, result?: string): Promise<boolean> => {
    const task = tasks.find((t) => t.id === id);
    if (!task || task.status === "completed") return false;

    const completedAt = new Date().toISOString();
    const trimmedResult = result?.trim() || null;
    const patch = { status: "completed" as const, result: trimmedResult, completed_at: completedAt };

    setTasks((prev) => prev.map((t) => t.id === id
      ? { ...t, status: "completed", result: patch.result ?? undefined, completed_at: completedAt }
      : t));

    try {
      const ok = await leadsRepo.completeTaskRpc(id, patch.result);
      if (!ok) throw new Error("Nenhuma tarefa concluída (fora do tenant ou já concluída)");
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao concluir tarefa");
      setTasks((prev) => prev.map((t) => t.id === id ? task : t));
      return false;
    }

    if (task.lead_id) {
      await addTimelineEvent({
        lead_id: task.lead_id,
        type: "note",
        content: trimmedResult
          ? `✅ Tarefa concluída: "${task.title}" — ${trimmedResult}`
          : `✅ Tarefa concluída: "${task.title}"`,
        user_name: "Usuário",
      });
    }
    return true;
  }, [tasks, addTimelineEvent]);

  // 2.6: edita o resultado de uma tarefa já concluída, sem tocar status/completed_at.
  const updateTaskResult = useCallback(async (id: string, result?: string): Promise<boolean> => {
    const trimmedResult = result?.trim() || null;
    const previous = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, result: trimmedResult ?? undefined } : t));
    try {
      const ok = await leadsRepo.updateTaskResultRpc(id, trimmedResult);
      if (!ok) throw new Error("Resultado não salvo (tarefa não está concluída ou fora do tenant)");
    } catch (error) {
      logger.error(error); toast.error("Erro ao salvar resultado");
      if (previous) setTasks((prev) => prev.map((t) => t.id === id ? previous : t));
      return false;
    }
    return true;
  }, [tasks]);

  const toggleTaskStatus = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "completed" ? "pending" : "completed";

    // Reabrir limpa completed_at (no banco e aqui): tarefa pendente com data de
    // conclusão contaria como concluída na métrica de metas.
    setTasks((prev) => prev.map((t) => t.id === id
      ? { ...t, status: newStatus, completed_at: newStatus === "completed" ? new Date().toISOString() : undefined }
      : t));

    try {
      const ok = newStatus === "completed"
        ? await leadsRepo.completeTaskRpc(id)
        : await leadsRepo.reopenTaskRpc(id);
      if (!ok) throw new Error("Status da tarefa não mudou");
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao alterar status da tarefa");
      setTasks((prev) => prev.map((t) => t.id === id ? task : t));
    }
  }, [tasks]);

  const addPipeline = useCallback(async (name: string) => {
    const clientId = tenant?.id ?? user?.client_id;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return; }

    let row: Awaited<ReturnType<typeof leadsRepo.insertPipeline>>;
    try {
      row = await leadsRepo.insertPipeline({ name, client_id: clientId, ...tenantIdForInsert });
    } catch (error) {
      logger.error(error); toast.error("Erro ao criar funil"); return;
    }
    if (row) {
      const newPipe = mapPipeline(row as unknown as Record<string, unknown>);
      setPipelines((prev) => [...prev, newPipe]);
      setCurrentPipelineId(newPipe.id);

      // Criar colunas padrão para o novo funil (erro era ignorado no original — preservado)
      const defaultCols = [
        { name: "Novos Leads", color: "#3b82f6", order: 0, pipeline_id: newPipe.id, client_id: clientId, ...tenantIdForInsert },
        { name: "Qualificação", color: "#f59e0b", order: 1, pipeline_id: newPipe.id, client_id: clientId, ...tenantIdForInsert },
        { name: "Fechamento", color: "#22c55e", order: 2, pipeline_id: newPipe.id, client_id: clientId, ...tenantIdForInsert },
      ];

      const colRows = await leadsRepo.insertPipelineColumns(defaultCols).catch(() => null);
      if (colRows) setColumns((prev) => [...prev, ...colRows.map((c) => mapColumn(c as unknown as Record<string, unknown>))]);

      toast.success("Funil criado com sucesso");
    }
  }, [user?.client_id, tenant?.id, tenantIdForInsert]);

  const updatePipeline = useCallback(async (id: string, data: Partial<Pipeline>) => {
    try {
      await leadsRepo.updatePipeline(id, data);
    } catch (error) {
      logger.error(error); toast.error("Erro ao atualizar funil"); return;
    }
    setPipelines((prev) => prev.map((p) => p.id === id ? { ...p, ...data } : p));
    toast.success("Funil atualizado");
  }, []);

  const deletePipeline = useCallback(async (id: string) => {
    // Delete columns first to be safe (cascade should handle this but let's be explicitly).
    // Erro só era logado no original — preservado
    await leadsRepo.deleteColumnsByPipeline(id).catch((colError) => { logger.error(colError); });

    try {
      await leadsRepo.deletePipelineById(id);
    } catch (error) {
      logger.error(error); toast.error("Erro ao excluir funil"); return;
    }

    setPipelines((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      if (currentPipelineId === id && filtered.length > 0) {
        setCurrentPipelineId(filtered[0].id);
      }
      return filtered;
    });
    setColumns((prev) => prev.filter((c) => c.pipeline_id !== id));
    toast.success("Funil excluído com sucesso");
  }, [currentPipelineId]);

  const addColumn = useCallback(async (name: string, color: string) => {
    if (!currentPipelineId) { toast.error("Selecione um funil primeiro"); return; }

    const clientId = tenant?.id ?? user?.client_id;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return; }

    // Get max order for current pipeline
    const pipelineCols = columns.filter(c => c.pipeline_id === currentPipelineId);
    const maxOrder = pipelineCols.length > 0 ? Math.max(...pipelineCols.map(c => c.order)) : -1;

    let row: Awaited<ReturnType<typeof leadsRepo.insertPipelineColumn>>;
    try {
      row = await leadsRepo.insertPipelineColumn({
        name,
        color,
        order: maxOrder + 1,
        pipeline_id: currentPipelineId,
        client_id: clientId,
        ...tenantIdForInsert,
      });
    } catch (error) {
      logger.error(error);
      toast.error("Erro ao criar coluna: " + ((error as { message?: string })?.message ?? ""));
      return;
    }
    if (row) setColumns((prev) => [...prev, mapColumn(row as unknown as Record<string, unknown>)]);
    toast.success("Coluna criada");
  }, [columns, currentPipelineId, tenant?.id, tenantIdForInsert, user?.client_id]);

  const updateColumn = useCallback(async (id: string, data: Partial<PipelineColumn>): Promise<boolean> => {
    try {
      await leadsRepo.updatePipelineColumn(id, data);
    } catch (error) {
      logger.error(error); toast.error("Erro ao atualizar coluna"); return false;
    }
    setColumns((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
    toast.success("Coluna atualizada");
    return true;
  }, []);

  const deleteColumn = useCallback(async (id: string): Promise<boolean> => {
    try {
      await leadsRepo.deletePipelineColumn(id);
    } catch (error) {
      logger.error(error); toast.error("Erro ao excluir coluna"); return false;
    }
    setColumns((prev) => prev.filter((c) => c.id !== id));
    toast.success("Coluna removida");
    return true;
  }, []);

  /**
   * Reordena colunas do funil ativo. Recebe lista de IDs na nova ordem.
   * Atomic: faz N updates sequenciais (N = ~5 colunas). Otimista no estado local
   * primeiro; em caso de erro, recarrega do banco pra restaurar consistência.
   */
  const reorderColumns = useCallback(async (orderedIds: string[]) => {
    // Optimistic: aplica ordem nova no estado local imediatamente
    const newOrder = new Map(orderedIds.map((id, idx) => [id, idx]));
    setColumns((prev) =>
      prev.map((c) => newOrder.has(c.id) ? { ...c, order: newOrder.get(c.id)! } : c)
    );

    // Persiste: 1 UPDATE por coluna. Pra >20 colunas considerar batch RPC.
    const results = await Promise.allSettled(
      orderedIds.map((id, idx) => leadsRepo.updatePipelineColumn(id, { order: idx })),
    );
    const failed = results.find((r) => r.status === "rejected");
    if (failed) {
      logger.error("Erro ao reordenar colunas:", (failed as PromiseRejectedResult).reason);
      toast.error("Erro ao salvar nova ordem. Recarregando...");
      // Força refetch pra restaurar estado consistente (erro ignorado como no original)
      const data = await leadsRepo.listAllPipelineColumns().catch(() => null);
      if (data) setColumns(data.map((c) => mapColumn(c as unknown as Record<string, unknown>)));
      return;
    }
  }, []);

  const createAutomation = useCallback(async (name: string): Promise<string | null> => {
    const clientId = tenant?.id ?? user?.client_id;
    if (!clientId) {
      toast.error("Sessão inválida. Faça login novamente.");
      return null;
    }

    let row: Awaited<ReturnType<typeof automationsRepo.insertComplexAutomation>>;
    try {
      row = await automationsRepo.insertComplexAutomation({
        client_id: clientId,
        name,
        status: "draft",
        nodes: [],
        edges: [],
        ...tenantIdForInsert,
      });
    } catch (error) {
      logger.error(error);
      const e = error as { message?: string; details?: string };
      const detail = e?.message || e?.details || "Tente novamente.";
      toast.error(`Erro ao criar fluxo: ${detail}`);
      return null;
    }
    if (row) {
      const newAuto = mapComplexAutomation(row as unknown as Record<string, unknown>);
      setComplexAutomations(prev => [newAuto, ...prev]);
      return newAuto.id;
    }
    return null;
  }, [tenant?.id, tenantIdForInsert, user?.client_id]);

  const updateAutomationNodes = useCallback(async (id: string, nodes: Node[], edges: Edge[]) => {
    setComplexAutomations(prev => prev.map(a => a.id === id ? { ...a, nodes, edges } : a));
    
    try {
      await automationsRepo.updateComplexAutomation(id, {
        nodes,
        edges,
        updated_at: new Date().toISOString(),
      });
      toast.success("Fluxo salvo com sucesso!");
    } catch (error) {
      logger.error(error); toast.error("Erro ao salvar fluxo");
    }
  }, []);

  const toggleComplexAutomation = useCallback(async (id: string) => {
    const auto = complexAutomations.find(a => a.id === id);
    if (!auto) return;
    const newStatus = auto.status === 'active' ? 'draft' : 'active';
    
    setComplexAutomations(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    
    try {
      await automationsRepo.updateComplexAutomation(id, { status: newStatus });
      toast.success("Fluxo " + (newStatus === 'active' ? "Ativado" : "Desativado"));
    } catch (error) {
      logger.error(error);
      setComplexAutomations(prev => prev.map(a => a.id === id ? { ...a, status: auto.status } : a));
      toast.error("Erro ao alterar status do fluxo");
    }
  }, [complexAutomations]);

  const deleteAutomation = useCallback(async (id: string) => {
    try {
      await automationsRepo.deleteComplexAutomation(id);
    } catch (error) {
      logger.error(error); toast.error("Erro ao excluir"); return;
    }
    setComplexAutomations(prev => prev.filter(a => a.id !== id));
    toast.success("Automação excluída");
  }, []);

  const toggleBasicAutomation = useCallback(async (id: string) => {
    const rule = automations.find(a => a.id === id);
    if (!rule) return;
    const newStatus = !rule.active;

    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: newStatus } : a));

    try {
      await automationsRepo.updateAutomationRule(id, { active: newStatus });
      toast.success("Automação " + (newStatus ? "ativada" : "desativada"));
    } catch (error) {
      logger.error(error);
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: rule.active } : a));
      toast.error("Erro ao atualizar automação");
    }
  }, [automations]);

  const deleteBasicAutomation = useCallback(async (id: string) => {
    try {
      await automationsRepo.deleteAutomationRule(id);
    } catch (error) {
      logger.error(error); toast.error("Erro ao excluir"); return;
    }
    setAutomations(prev => prev.filter(a => a.id !== id));
    toast.success("Automação removida");
  }, []);

  const addBasicAutomation = useCallback(async (data: Partial<Automation>) => {
    const clientId = tenant?.id ?? user?.client_id;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return; }

    let row: Awaited<ReturnType<typeof automationsRepo.insertAutomationRule>>;
    try {
      row = await automationsRepo.insertAutomationRule({
        client_id: clientId,
        pipeline_id: data.pipeline_id || currentPipelineId || null,
        column_id: data.column_id || null,
        name: data.name || "Nova Automação",
        active: true,
        trigger: (data.trigger as any) || { type: "card_entered" },
        actions: (data.actions as any) || [],
        exceptions: (data.exceptions as any) || [],
        ...tenantIdForInsert,
      });
    } catch (error) {
      logger.error(error); toast.error("Erro ao criar automação"); return;
    }
    if (row) setAutomations(prev => [mapAutomationRule(row as unknown as Record<string, unknown>), ...prev]);
    toast.success("Automação criada!");
  }, [currentPipelineId, user?.client_id, tenant?.id, tenantIdForInsert]);

  const updateBasicAutomation = useCallback(async (id: string, data: Partial<Automation>) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.trigger !== undefined) updateData.trigger = data.trigger;
    if (data.actions !== undefined) updateData.actions = data.actions;
    if (data.exceptions !== undefined) updateData.exceptions = data.exceptions;
    if (data.column_id !== undefined) updateData.column_id = data.column_id;

    try {
      await automationsRepo.updateAutomationRule(id, updateData);
    } catch (error) {
      logger.error(error); toast.error("Erro ao atualizar automação"); return;
    }

    setAutomations(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    toast.success("Automação salva!");
  }, []);

  const addGlobalTag = useCallback(async (tag: string) => {
    if (!tag.trim() || globalTags.includes(tag.trim())) return;
    setGlobalTags(prev => [...prev, tag.trim()]);
    toast.success("Tag criada globalmente");
  }, [globalTags]);

  const deleteGlobalTag = useCallback(async (tag: string) => {
    setGlobalTags(prev => prev.filter(t => t !== tag));
    toast.success("Tag removida da lista global");
  }, []);

  // AUTOMATION ENGINE
  const runAction = useCallback(async (leadId: string, action: Automation["actions"][0]) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    switch (action.type) {
      case "add_tag":
        if (action.config?.tag) {
          await updateLead(leadId, { tags: [...new Set([...lead.tags, action.config.tag as string])] });
        }
        break;
      case "create_task":
        if (action.config?.title) {
          await addTask({
            lead_id: leadId,
            title: action.config.title as string,
            due_date: new Date().toISOString().split("T")[0],
          });
        }
        break;
      case "move_column":
        if (action.config?.column) {
          await moveLead(leadId, action.config.column as string);
        }
        break;
      default:
        logger.warn("Unhandled action type:", action.type);
    }
  }, [leads, updateLead, addTask, moveLead]);

  const executeAutomations = useCallback(async (leadId: string, triggerType: Automation["trigger"]["type"], columnId?: string) => {
    // 1. Run basic automation rules (existing behaviour)
    const activeRules = automations.filter(a =>
      a.active &&
      a.trigger.type === triggerType &&
      (!columnId || a.column_id === columnId)
    );

    for (const rule of activeRules) {
      const lead = leads.find(l => l.id === leadId);
      const hasException = rule.exceptions.some(ex => {
        if (ex.type === "has_tag" && ex.config?.tag) {
          return lead?.tags.includes(ex.config.tag as string);
        }
        return false;
      });

      if (hasException) continue;

      for (const action of rule.actions) {
        await runAction(leadId, action);
      }

      await addTimelineEvent({
        lead_id: leadId,
        type: "automation",
        content: `Automação executada: ${rule.name}`,
        user_name: "Sistema",
      });
    }

    // 2. Trigger active complex (visual-builder) automations via edge function
    const complexEventTypes = complexTriggerMap[triggerType] ?? [];
    if (complexEventTypes.length === 0) return;

    const activeComplex = complexAutomations.filter(a => a.status === "active");
    for (const auto of activeComplex) {
      const nodes: any[] = (auto as any).nodes || [];
      const triggerNodes = nodes.filter(
        (n: any) => n.type === "trigger" && complexEventTypes.includes(n.data?.type ?? n.data?.configType)
      );
      for (const trigger of triggerNodes) {
        automationsRepo.triggerAutomationEngine({
          automation_id: auto.id,
          lead_id: leadId,
          node_id: trigger.id,
          context: columnId ? { column_id: columnId } : {},
        }).catch((err: any) => logger.error("Complex automation trigger error:", err));
      }
    }
  }, [automations, complexAutomations, leads, runAction, addTimelineEvent]);

  useEffect(() => {
    executeAutomationsRef.current = executeAutomations;
  }, [executeAutomations]);

  return (
    <AppContext.Provider value={{
      leads, pipelines, columns, currentPipelineId, tasks, automations, complexAutomations, timeline, globalTags, loading,
      leadCountByPipeline,
      setPipeline: setCurrentPipelineId, addPipeline, updatePipeline, deletePipeline,
      addLead, updateLead, deleteLead, moveLead, moveLeadToPipeline,
      addTask, updateTask, deleteTask, toggleTaskStatus, completeTask, updateTaskResult,
      addColumn, updateColumn, deleteColumn, reorderColumns, addTimelineEvent,
      createAutomation, updateAutomationNodes, deleteAutomation, toggleComplexAutomation,
      toggleBasicAutomation, deleteBasicAutomation, addBasicAutomation, updateBasicAutomation,
      addGlobalTag, deleteGlobalTag,
      refreshData: fetchAll,
      mergeLeads
    }}>
      {children}
    </AppContext.Provider>
  );
}

// Mappers
function mapPipeline(row: Record<string, unknown>): Pipeline {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    name: row.name as string,
    columns: [],
  };
}

function mapColumn(row: Record<string, unknown>): PipelineColumn {
  return {
    id: row.id as string,
    pipeline_id: row.pipeline_id as string,
    name: row.name as string,
    order: row.order as number,
    color: (row.color as string) || undefined,
    description: (row.description as string) || undefined,
  };
}

function mapLead(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    name: row.name as string,
    phone: (row.phone as string) || undefined,
    email: (row.email as string) || undefined,
    company: (row.company as string) || undefined,
    position: (row.position as string) || undefined,
    city: (row.city as string) || undefined,
    notes: (row.notes as string) || undefined,
    notes_local: (row.notes_local as string) || undefined,
    custom_fields: (row.custom_fields as Record<string, any>) || {},
    origin: (row.origin as string) || undefined,
    category: (row.category as "lead" | "partner" | "collaborator") || "lead",
    tags: (row.tags as string[]) || [],
    column_id: row.column_id as string,
    responsible_id: (row.responsible_id as string) || undefined,
    value: (row.value as number) || undefined,
    segmento: (row.segmento as string) || undefined,
    faturamento_mensal: (row.faturamento_mensal as number) || undefined,
    utm_source: (row.utm_source as string) || undefined,
    utm_medium: (row.utm_medium as string) || undefined,
    utm_campaign: (row.utm_campaign as string) || undefined,
    utm_content: (row.utm_content as string) || undefined,
    utm_term: (row.utm_term as string) || undefined,
    ad_campaign_id: (row.ad_campaign_id as string) || undefined,
    ad_adset_id: (row.ad_adset_id as string) || undefined,
    ad_id: (row.ad_id as string) || undefined,
    fbclid: (row.fbclid as string) || undefined,
    gclid: (row.gclid as string) || undefined,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function mapTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    lead_id: (row.lead_id as string) || undefined,
    title: row.title as string,
    description: (row.description as string) || undefined,
    status: row.status as Task["status"],
    priority: (row.priority as Task["priority"]) || undefined,
    due_date: (row.due_date as string) || undefined,
    assigned_to: (row.assigned_to as string) || undefined,
    assigned_to_id: (row.assigned_to_id as string) || undefined,
    created_at: row.created_at as string,
    result: (row.result as string) || undefined,
    completed_at: (row.completed_at as string) || undefined,
  };
}

function mapTimeline(row: Record<string, unknown>): TimelineEvent {
  return {
    id: row.id as string,
    lead_id: row.lead_id as string,
    type: row.type as TimelineEvent["type"],
    content: row.content as string,
    created_at: row.created_at as string,
    user_name: (row.user_name as string) || undefined,
    user_id: (row.user_id as string) || undefined,
  };
}

function mapComplexAutomation(row: Record<string, unknown>): ComplexAutomation {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    name: row.name as string,
    status: row.status as string,
    trigger_type: row.trigger_type as string | undefined,
    nodes: Array.isArray(row.nodes) ? row.nodes : [],
    edges: Array.isArray(row.edges) ? row.edges : [],
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
function mapAutomationRule(row: Record<string, unknown>): Automation {
  return {
    id: row.id as string,
    client_id: row.client_id as string,
    pipeline_id: row.pipeline_id as string || undefined,
    column_id: row.column_id as string || undefined,
    name: row.name as string,
    active: row.active as boolean,
    trigger: (row.trigger as any) || { type: "card_entered" },
    actions: (row.actions as any[]) || [],
    exceptions: (row.exceptions as any[]) || [],
  };
}
