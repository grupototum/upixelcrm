/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mockAutomations } from "@/lib/mock-data";
import type { Lead, PipelineColumn, Task, Automation, TimelineEvent } from "@/types";
import { toast } from "sonner";

interface AppState {
  leads: Lead[];
  columns: PipelineColumn[];
  tasks: Task[];
  automations: Automation[];
  timeline: TimelineEvent[];
  loading: boolean;

  addLead: (data: Partial<Lead>, columnId: string) => Promise<Lead | null>;
  updateLead: (id: string, data: Partial<Lead>) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  moveLead: (id: string, toColumnId: string) => Promise<void>;

  addTask: (data: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskStatus: (id: string) => Promise<void>;

  addColumn: (name: string, color: string) => Promise<void>;

  addTimelineEvent: (event: Omit<TimelineEvent, "id" | "created_at">) => Promise<void>;

  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [automations] = useState<Automation[]>(mockAutomations);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [colRes, leadRes, taskRes, tlRes] = await Promise.all([
        supabase.from("pipeline_columns").select("*").order("order"),
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("timeline_events").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      if (colRes.data) setColumns(colRes.data.map(mapColumn));
      if (leadRes.data) setLeads(leadRes.data.map(mapLead));
      if (taskRes.data) setTasks(taskRes.data.map(mapTask));
      if (tlRes.data) setTimeline(tlRes.data.map(mapTimeline));
    } catch (err) {
      console.error("Error fetching data:", err);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const addTimelineEvent = useCallback(async (event: Omit<TimelineEvent, "id" | "created_at">) => {
    const { data, error } = await supabase.from("timeline_events").insert({
      lead_id: event.lead_id || null,
      type: event.type,
      content: event.content,
      user_name: event.user_name,
    }).select().single();
    if (error) { console.error(error); return; }
    if (data) setTimeline((prev) => [mapTimeline(data), ...prev]);
  }, []);

  const addLead = useCallback(async (data: Partial<Lead>, columnId: string): Promise<Lead | null> => {
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
    }).select().single();

    if (error) { console.error(error); toast.error("Erro ao criar lead"); return null; }
    const newLead = mapLead(row);
    setLeads((prev) => [newLead, ...prev]);

    await addTimelineEvent({
      lead_id: newLead.id,
      type: "stage_change",
      content: `Lead "${newLead.name}" criado e adicionado ao pipeline`,
      user_name: "Sistema",
    });

    toast.success("Lead criado com sucesso");
    return newLead;
  }, [addTimelineEvent]);

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
    if (data.column_id !== undefined) updateData.column_id = data.column_id;

    const { error } = await supabase.from("leads").update(updateData).eq("id", id);
    if (error) { console.error(error); toast.error("Erro ao atualizar lead"); return; }

    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l));

    await addTimelineEvent({ lead_id: id, type: "note", content: "Lead atualizado", user_name: "Usuário" });
  }, [addTimelineEvent]);

  const deleteLead = useCallback(async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) { console.error(error); toast.error("Erro ao excluir lead"); return; }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTasks((prev) => prev.filter((t) => t.lead_id !== id));
    toast.success("Lead excluído");
  }, []);

  const moveLead = useCallback(async (id: string, toColumnId: string) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.column_id === toColumnId) return;

    const fromCol = columns.find((c) => c.id === lead.column_id);
    const toCol = columns.find((c) => c.id === toColumnId);

    // Optimistic update
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, column_id: toColumnId, updated_at: new Date().toISOString() } : l));

    const { error } = await supabase.from("leads").update({ column_id: toColumnId }).eq("id", id);
    if (error) {
      console.error(error);
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
  }, [leads, columns, addTimelineEvent]);

  const addTask = useCallback(async (data: Partial<Task>): Promise<Task | null> => {
    const { data: row, error } = await supabase.from("tasks").insert({
      title: data.title ?? "",
      lead_id: data.lead_id || null,
      due_date: data.due_date || null,
      assigned_to: data.assigned_to || "Você",
      description: data.description || null,
    }).select().single();

    if (error) { console.error(error); toast.error("Erro ao criar tarefa"); return null; }
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

  const updateTask = useCallback(async (id: string, data: Partial<Task>) => {
    const { error } = await supabase.from("tasks").update(data).eq("id", id);
    if (error) { console.error(error); return; }
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { console.error(error); toast.error("Erro ao excluir tarefa"); return; }
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
      console.error(error);
      setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: task.status } : t));
    }
  }, [tasks]);

  const addColumn = useCallback(async (name: string, color: string) => {
    const { data: row, error } = await supabase.from("pipeline_columns").insert({
      name,
      color,
      order: columns.length,
    }).select().single();

    if (error) { console.error(error); toast.error("Erro ao criar coluna"); return; }
    if (row) setColumns((prev) => [...prev, mapColumn(row)]);
    toast.success("Coluna criada");
  }, [columns.length]);

  return (
    <AppContext.Provider value={{
      leads, columns, tasks, automations, timeline, loading,
      addLead, updateLead, deleteLead, moveLead,
      addTask, updateTask, deleteTask, toggleTaskStatus,
      addColumn, addTimelineEvent, refreshData: fetchAll,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// Mappers from DB rows to app types
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
    origin: (row.origin as string) || undefined,
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
