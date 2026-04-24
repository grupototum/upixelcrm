import { logger } from "@/lib/logger";
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Lead, Pipeline, PipelineColumn, Task, Automation, TimelineEvent, ComplexAutomation } from "@/types";
import type { Node, Edge } from "reactflow";
import { toast } from "sonner";

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
  loading: boolean;

  setPipeline: (id: string) => void;
  addPipeline: (name: string) => Promise<void>;
  addLead: (data: Partial<Lead>, columnId: string) => Promise<Lead | null>;
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  moveLead: (id: string, toColumnId: string) => Promise<void>;

  addTask: (data: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;

  addColumn: (name: string, color: string) => Promise<void>;
  updateColumn: (id: string, data: Partial<PipelineColumn>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;

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
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [currentPipelineId, setCurrentPipelineId] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [complexAutomations, setComplexAutomations] = useState<ComplexAutomation[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [globalTags, setGlobalTags] = useState<string[]>(["Hot", "Warm", "Cold", "Enterprise", "Agência"]);
  const [loading, setLoading] = useState(true);

  const { tenant } = useTenant();

  // Master view: master user no subdomínio "master" vê dados de TODOS os tenants (RLS permite)
  const isMasterView = user?.role === "master" && tenant?.subdomain === "master";

  const executeAutomationsRef = useRef<((leadId: string, triggerType: Automation["trigger"]["type"], columnId?: string) => Promise<void>) | null>(null);

  const fetchAll = useCallback(async () => {
    // Return early (and clear loading) if auth has not resolved a valid client_id yet.
    // Master view bypassa o filtro por client_id, então só precisa de user autenticado.
    const clientId = tenant?.id ?? user?.client_id ?? "";
    if (!clientId && !isMasterView) { setLoading(false); return; }
    try {
      // Em master view, não filtra por client_id — retorna dados de todos os tenants.
      const withClient = <T extends { eq: (k: string, v: string) => T }>(q: T): T =>
        isMasterView ? q : q.eq("client_id", clientId);

      const [pipeRes, colRes, leadRes, taskRes, tlRes, autoRes, rulesRes] = await Promise.all([
        withClient((supabase.from as any)("pipelines").select("*")).order("name"),
        withClient(supabase.from("pipeline_columns").select("*")).order("order"),
        withClient(supabase.from("leads").select("*")).order("created_at", { ascending: false }),
        withClient(supabase.from("tasks").select("*")).order("created_at", { ascending: false }),
        withClient(supabase.from("timeline_events").select("*")).order("created_at", { ascending: false }).limit(100),
        withClient((supabase.from as any)("automations").select("*")).order("created_at", { ascending: false }),
        withClient((supabase.from as any)("automation_rules").select("*")).order("created_at", { ascending: false }),
      ]);

      if (pipeRes.data) {
        setPipelines(pipeRes.data.map(mapPipeline));
        if (pipeRes.data.length > 0 && !currentPipelineId) {
          setCurrentPipelineId(pipeRes.data[0].id);
        }
      }
      if (colRes.data) setColumns(colRes.data.map(mapColumn));
      if (leadRes.data) setLeads(leadRes.data.map(mapLead));
      if (taskRes.data) setTasks(taskRes.data.map(mapTask));
      if (tlRes.data) setTimeline(tlRes.data.map(mapTimeline));
      if (autoRes.data) setComplexAutomations(autoRes.data.map(mapComplexAutomation));
      if (rulesRes.data) setAutomations(rulesRes.data.map(mapAutomationRule));
    } catch (err) {
      logger.error("Error fetching data:", err);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [currentPipelineId, tenant, user?.client_id, isMasterView]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addTimelineEvent = useCallback(async (event: Omit<TimelineEvent, "id" | "created_at">) => {
    const { data, error } = await supabase.from("timeline_events").insert({
      lead_id: event.lead_id || null,
      type: event.type,
      content: event.content,
      user_name: event.user_name,
    }).select().single();
    if (error) { logger.error(error); return; }
    if (data) setTimeline((prev) => [mapTimeline(data), ...prev]);
  }, []);

  const updateLead = useCallback(async (id: string, data: Partial<Lead>) => {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.company !== undefined) updateData.company = data.company || null;
    if (data.position !== undefined) updateData.position = data.position || null;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.value !== undefined) updateData.value = data.value ?? null;
    if (data.origin !== undefined) updateData.origin = data.origin || null;
    if (data.category !== undefined) updateData.category = data.category || null;
    if (data.column_id !== undefined) updateData.column_id = data.column_id;
    if (data.notes_local !== undefined) updateData.notes_local = data.notes_local || null;
    if (data.custom_fields !== undefined) updateData.custom_fields = data.custom_fields || {};

    const { error } = await supabase.from("leads").update(updateData).eq("id", id);
    if (error) { logger.error(error); toast.error("Erro ao atualizar lead"); return; }

    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l));

    await addTimelineEvent({ lead_id: id, type: "note", content: "Lead atualizado", user_name: "Usuário" });
  }, [addTimelineEvent]);

  const addTask = useCallback(async (data: Partial<Task>): Promise<Task | null> => {
    const { data: row, error } = await supabase.from("tasks").insert({
      title: data.title ?? "",
      lead_id: data.lead_id || null,
      due_date: data.due_date || null,
      assigned_to: data.assigned_to || "Você",
      description: data.description || null,
    }).select().single();

    if (error) { logger.error(error); toast.error("Erro ao criar tarefa"); return null; }
    const newTask = mapTask(row);
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
  }, [addTimelineEvent]);

  const moveLead = useCallback(async (id: string, toColumnId: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.column_id === toColumnId) return;

    const fromCol = columns.find((c) => c.id === lead.column_id);
    const toCol = columns.find((c) => c.id === toColumnId);

    // Optimistic update
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, column_id: toColumnId, updated_at: new Date().toISOString() } : l));

    const { error } = await supabase.from("leads").update({ column_id: toColumnId }).eq("id", id);
    if (error) {
      logger.error(error);
      // Rollback
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, column_id: lead.column_id } : l));
      toast.error("Erro ao mover lead");
      return;
    }

    await addTimelineEvent({
      lead_id: id,
      type: "stage_change",
      content: `"${lead.name}" movido de ${fromCol?.name ?? "?"} para ${toCol?.name ?? "?"}`,
      user_name: "Usuário",
    });

    // Trigger automations for transition
    if (executeAutomationsRef.current) {
      await executeAutomationsRef.current(id, "stage_changed", toColumnId);
      await executeAutomationsRef.current(id, "card_entered", toColumnId);
    }
  }, [leads, columns, addTimelineEvent]);

  const addLead = useCallback(async (data: Partial<Lead>, columnId: string): Promise<Lead | null> => {
    const clientId = tenant?.id ?? user?.client_id;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return null; }

    const { data: row, error } = await supabase.from("leads").insert({
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
      client_id: clientId,
      ...(tenant?.id ? { tenant_id: tenant.id } : {}),
    }).select().single();

    if (error) { logger.error(error); toast.error("Erro ao criar lead"); return null; }
    const newLead = mapLead(row);
    setLeads((prev) => [newLead, ...prev]);

    await addTimelineEvent({
      lead_id: newLead.id,
      type: "stage_change",
      content: `Lead "${newLead.name}" criado e adicionado ao pipeline`,
      user_name: "Sistema",
    });

    toast.success("Lead criado com sucesso");

    // Trigger automations for entry
    if (executeAutomationsRef.current) {
      await executeAutomationsRef.current(newLead.id, "card_entered", columnId);
    }

    return newLead;
  }, [addTimelineEvent, user?.client_id]);

  const deleteLead = useCallback(async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) { logger.error(error); toast.error("Erro ao excluir lead"); return; }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTasks((prev) => prev.filter((t) => t.lead_id !== id));
    toast.success("Lead excluído");
  }, []);

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const { error } = await supabase.from("tasks").update(data).eq("id", id);
    if (error) { logger.error(error); return; }
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { logger.error(error); toast.error("Erro ao excluir tarefa"); return; }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tarefa excluída");
  }, []);

  const toggleTaskStatus = useCallback(async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus = task.status === "completed" ? "pending" : "completed";

    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));

    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", id);
    if (error) {
      logger.error(error);
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: task.status } : t));
    }
  }, [tasks]);

  const addPipeline = useCallback(async (name: string) => {
    const clientId = tenant?.id ?? user?.client_id;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return; }

    const { data: row, error } = await supabase.from("pipelines").insert({
      name,
      client_id: clientId,
      ...(tenant?.id ? { tenant_id: tenant.id } : {}),
    }).select().single();

    if (error) { logger.error(error); toast.error("Erro ao criar funil"); return; }
    if (row) {
      const newPipe = mapPipeline(row);
      setPipelines((prev) => [...prev, newPipe]);
      setCurrentPipelineId(newPipe.id);
      
      // Criar colunas padrão para o novo funil
      const defaultCols = [
        { name: "Novos Leads", color: "#3b82f6", order: 0, pipeline_id: newPipe.id, client_id: clientId, ...(tenant?.id ? { tenant_id: tenant.id } : {}) },
        { name: "Qualificação", color: "#f59e0b", order: 1, pipeline_id: newPipe.id, client_id: clientId, ...(tenant?.id ? { tenant_id: tenant.id } : {}) },
        { name: "Fechamento", color: "#22c55e", order: 2, pipeline_id: newPipe.id, client_id: clientId, ...(tenant?.id ? { tenant_id: tenant.id } : {}) },
      ];
      
      const { data: colRows } = await supabase.from("pipeline_columns").insert(defaultCols).select();
      if (colRows) setColumns((prev) => [...prev, ...colRows.map(mapColumn)]);
      
      toast.success("Funil criado com sucesso");
    }
  }, [user?.client_id]);

  const deletePipeline = useCallback(async (id: string) => {
    // Delete columns first to be safe (cascade should handle this but let's be explicitly)
    const { error: colError } = await supabase.from("pipeline_columns").delete().eq("pipeline_id", id);
    if (colError) { logger.error(colError); }

    const { error } = await supabase.from("pipelines").delete().eq("id", id);
    if (error) { logger.error(error); toast.error("Erro ao excluir funil"); return; }
    
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
    
    // Get max order for current pipeline
    const pipelineCols = columns.filter(c => c.pipeline_id === currentPipelineId);
    const maxOrder = pipelineCols.length > 0 ? Math.max(...pipelineCols.map(c => c.order)) : -1;

    const { data: row, error } = await supabase.from("pipeline_columns").insert({
      name,
      color,
      order: maxOrder + 1,
      pipeline_id: currentPipelineId,
    }).select().single();

    if (error) { logger.error(error); toast.error("Erro ao criar coluna"); return; }
    if (row) setColumns((prev) => [...prev, mapColumn(row)]);
    toast.success("Coluna criada");
  }, [columns, currentPipelineId]);

  const updateColumn = useCallback(async (id: string, data: Partial<PipelineColumn>) => {
    const { error } = await supabase.from("pipeline_columns").update(data).eq("id", id);
    if (error) { logger.error(error); toast.error("Erro ao atualizar coluna"); return; }
    setColumns((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
    toast.success("Coluna atualizada");
  }, []);

  const deleteColumn = useCallback(async (id: string) => {
    const { error } = await supabase.from("pipeline_columns").delete().eq("id", id);
    if (error) { logger.error(error); toast.error("Erro ao excluir coluna"); return; }
    setColumns((prev) => prev.filter((c) => c.id !== id));
    toast.success("Coluna removida");
  }, []);

  const createAutomation = useCallback(async (name: string): Promise<string | null> => {
    // client_id é gerenciado pelo trigger do Supabase RLS ou é optional.
    const { data: row, error } = await supabase.from("automations").insert({
      name,
      status: "draft",
      nodes: [],
      edges: []
    }).select().single();

    if (error) { logger.error(error); toast.error("Erro ao criar fluxo"); return null; }
    if (row) {
      const newAuto = mapComplexAutomation(row);
      setComplexAutomations(prev => [newAuto, ...prev]);
      return newAuto.id;
    }
    return null;
  }, []);

  const updateAutomationNodes = useCallback(async (id: string, nodes: Node[], edges: Edge[]) => {
    setComplexAutomations(prev => prev.map(a => a.id === id ? { ...a, nodes, edges } : a));
    
    const { error } = await supabase.from("automations").update({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      nodes: nodes as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      edges: edges as any,
      updated_at: new Date().toISOString()
    }).eq("id", id);

    if (error) {
       logger.error(error); toast.error("Erro ao salvar fluxo"); 
    } else {
       toast.success("Fluxo salvo com sucesso!");
    }
  }, []);

  const toggleComplexAutomation = useCallback(async (id: string) => {
    const auto = complexAutomations.find(a => a.id === id);
    if (!auto) return;
    const newStatus = auto.status === 'active' ? 'draft' : 'active';
    
    setComplexAutomations(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    
    const { error } = await supabase.from("automations").update({ status: newStatus }).eq("id", id);
    if (error) {
      logger.error(error);
      setComplexAutomations(prev => prev.map(a => a.id === id ? { ...a, status: auto.status } : a));
      toast.error("Erro ao alterar status do fluxo");
    } else {
      toast.success("Fluxo " + (newStatus === 'active' ? "Ativado" : "Desativado"));
    }
  }, [complexAutomations]);

  const deleteAutomation = useCallback(async (id: string) => {
    const { error } = await supabase.from("automations").delete().eq("id", id);
    if (error) { logger.error(error); toast.error("Erro ao excluir"); return; }
    setComplexAutomations(prev => prev.filter(a => a.id !== id));
    toast.success("Automação excluída");
  }, []);

  const toggleBasicAutomation = useCallback(async (id: string) => {
    const rule = automations.find(a => a.id === id);
    if (!rule) return;
    const newStatus = !rule.active;
    
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: newStatus } : a));
    
    const { error } = await supabase.from("automation_rules").update({ active: newStatus }).eq("id", id);
    if (error) {
      logger.error(error);
      setAutomations(prev => prev.map(a => a.id === id ? { ...a, active: rule.active } : a));
      toast.error("Erro ao atualizar automação");
    } else {
      toast.success("Automação " + (newStatus ? "ativada" : "desativada"));
    }
  }, [automations]);

  const deleteBasicAutomation = useCallback(async (id: string) => {
    const { error } = await supabase.from("automation_rules").delete().eq("id", id);
    if (error) { logger.error(error); toast.error("Erro ao excluir"); return; }
    setAutomations(prev => prev.filter(a => a.id !== id));
    toast.success("Automação removida");
  }, []);

  const addBasicAutomation = useCallback(async (data: Partial<Automation>) => {
    const clientId = tenant?.id ?? user?.client_id;
    if (!clientId) { toast.error("Sessão inválida. Faça login novamente."); return; }

    const { data: row, error } = await supabase.from("automation_rules").insert({
      client_id: clientId,
      pipeline_id: data.pipeline_id || currentPipelineId || null,
      column_id: data.column_id || null,
      name: data.name || "Nova Automação",
      active: true,
      trigger: (data.trigger as any) || { type: "card_entered" },
      actions: (data.actions as any) || [],
      exceptions: (data.exceptions as any) || [],
      ...(tenant?.id ? { tenant_id: tenant.id } : {}),
    }).select().single();

    if (error) { logger.error(error); toast.error("Erro ao criar automação"); return; }
    if (row) setAutomations(prev => [mapAutomationRule(row), ...prev]);
    toast.success("Automação criada!");
  }, [currentPipelineId, user?.client_id]);

  const updateBasicAutomation = useCallback(async (id: string, data: Partial<Automation>) => {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.active !== undefined) updateData.active = data.active;
    if (data.trigger !== undefined) updateData.trigger = data.trigger;
    if (data.actions !== undefined) updateData.actions = data.actions;
    if (data.exceptions !== undefined) updateData.exceptions = data.exceptions;
    if (data.column_id !== undefined) updateData.column_id = data.column_id;

    const { error } = await supabase.from("automation_rules").update(updateData).eq("id", id);
    if (error) { logger.error(error); toast.error("Erro ao atualizar automação"); return; }
    
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
  }, [automations, leads, runAction, addTimelineEvent]);

  useEffect(() => {
    executeAutomationsRef.current = executeAutomations;
  }, [executeAutomations]);

  return (
    <AppContext.Provider value={{
      leads, pipelines, columns, currentPipelineId, tasks, automations, complexAutomations, timeline, globalTags, loading,
      setPipeline: setCurrentPipelineId, addPipeline, deletePipeline,
      addLead, updateLead, deleteLead, moveLead,
      addTask, updateTask, deleteTask, toggleTaskStatus,
      addColumn, updateColumn, deleteColumn, addTimelineEvent, 
      createAutomation, updateAutomationNodes, deleteAutomation, toggleComplexAutomation,
      toggleBasicAutomation, deleteBasicAutomation, addBasicAutomation, updateBasicAutomation,
      addGlobalTag, deleteGlobalTag,
      refreshData: fetchAll,
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
    due_date: (row.due_date as string) || undefined,
    assigned_to: (row.assigned_to as string) || undefined,
    created_at: row.created_at as string,
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
