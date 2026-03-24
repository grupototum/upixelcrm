import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { mockLeads, mockColumns, mockTasks, mockAutomations, mockTimeline } from "@/lib/mock-data";
import type { Lead, PipelineColumn, Task, Automation, TimelineEvent } from "@/types";

function loadState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveState(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

interface AppState {
  leads: Lead[];
  columns: PipelineColumn[];
  tasks: Task[];
  automations: Automation[];
  timeline: TimelineEvent[];

  // Lead actions
  addLead: (data: Partial<Lead>, columnId: string) => Lead;
  updateLead: (id: string, data: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  moveLead: (id: string, toColumnId: string) => void;

  // Task actions
  addTask: (data: Partial<Task>) => Task;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;

  // Column actions
  addColumn: (name: string, color: string) => void;

  // Timeline
  addTimelineEvent: (event: Omit<TimelineEvent, "id" | "created_at">) => void;
}

const AppContext = createContext<AppState | null>(null);

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(() => loadState("totum_leads", mockLeads));
  const [columns, setColumns] = useState<PipelineColumn[]>(() => loadState("totum_columns", mockColumns));
  const [tasks, setTasks] = useState<Task[]>(() => loadState("totum_tasks", mockTasks));
  const [automations] = useState<Automation[]>(() => loadState("totum_automations", mockAutomations));
  const [timeline, setTimeline] = useState<TimelineEvent[]>(() => loadState("totum_timeline", mockTimeline));

  // Persist on change
  useEffect(() => { saveState("totum_leads", leads); }, [leads]);
  useEffect(() => { saveState("totum_columns", columns); }, [columns]);
  useEffect(() => { saveState("totum_tasks", tasks); }, [tasks]);
  useEffect(() => { saveState("totum_timeline", timeline); }, [timeline]);

  const addTimelineEvent = useCallback((event: Omit<TimelineEvent, "id" | "created_at">) => {
    const newEvent: TimelineEvent = {
      ...event,
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
    };
    setTimeline((prev) => [newEvent, ...prev]);
  }, []);

  const addLead = useCallback((data: Partial<Lead>, columnId: string): Lead => {
    const newLead: Lead = {
      id: `l_${Date.now()}`,
      client_id: "c1",
      name: data.name ?? "",
      phone: data.phone,
      email: data.email,
      company: data.company,
      position: data.position,
      city: data.city,
      notes: data.notes,
      origin: data.origin || "Manual",
      tags: data.tags ?? [],
      column_id: columnId,
      value: data.value,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setLeads((prev) => [...prev, newLead]);
    addTimelineEvent({
      lead_id: newLead.id,
      type: "stage_change",
      content: `Lead "${newLead.name}" criado e adicionado ao pipeline`,
      user_name: "Sistema",
    });
    return newLead;
  }, [addTimelineEvent]);

  const updateLead = useCallback((id: string, data: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) =>
      l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l
    ));
    addTimelineEvent({
      lead_id: id,
      type: "note",
      content: `Lead atualizado`,
      user_name: "Usuário",
    });
  }, [addTimelineEvent]);

  const deleteLead = useCallback((id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setTasks((prev) => prev.filter((t) => t.lead_id !== id));
  }, []);

  const moveLead = useCallback((id: string, toColumnId: string) => {
    let leadName = "";
    let fromColumnId = "";
    setLeads((prev) => prev.map((l) => {
      if (l.id === id) {
        leadName = l.name;
        fromColumnId = l.column_id;
        return { ...l, column_id: toColumnId, updated_at: new Date().toISOString() };
      }
      return l;
    }));
    const fromCol = columns.find((c) => c.id === fromColumnId);
    const toCol = columns.find((c) => c.id === toColumnId);
    if (fromColumnId !== toColumnId) {
      addTimelineEvent({
        lead_id: id,
        type: "stage_change",
        content: `"${leadName}" movido de ${fromCol?.name ?? "?"} para ${toCol?.name ?? "?"}`,
        user_name: "Usuário",
      });
    }
  }, [columns, addTimelineEvent]);

  const addTask = useCallback((data: Partial<Task>): Task => {
    const newTask: Task = {
      id: `t_${Date.now()}`,
      client_id: "c1",
      lead_id: data.lead_id,
      title: data.title ?? "",
      description: data.description,
      status: "pending",
      due_date: data.due_date,
      assigned_to: data.assigned_to || "Você",
      created_at: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, newTask]);
    if (newTask.lead_id) {
      addTimelineEvent({
        lead_id: newTask.lead_id,
        type: "task",
        content: `Tarefa criada: ${newTask.title}`,
        user_name: "Usuário",
      });
    }
    return newTask;
  }, [addTimelineEvent]);

  const updateTask = useCallback((id: string, data: Partial<Task>) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTaskStatus = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const newStatus = t.status === "completed" ? "pending" : "completed";
      return { ...t, status: newStatus };
    }));
  }, []);

  const addColumn = useCallback((name: string, color: string) => {
    const newCol: PipelineColumn = {
      id: `col_${Date.now()}`,
      pipeline_id: "p1",
      name,
      order: columns.length,
      color,
    };
    setColumns((prev) => [...prev, newCol]);
  }, [columns.length]);

  return (
    <AppContext.Provider value={{
      leads, columns, tasks, automations, timeline,
      addLead, updateLead, deleteLead, moveLead,
      addTask, updateTask, deleteTask, toggleTaskStatus,
      addColumn, addTimelineEvent,
    }}>
      {children}
    </AppContext.Provider>
  );
}
