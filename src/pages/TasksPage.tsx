import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockTasks, mockLeads } from "@/lib/mock-data";
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task } from "@/types";

const tabs = ["Todas", "Pendentes", "Atrasadas", "Concluídas"];

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState("Todas");

  const filtered = mockTasks.filter((t) => {
    if (activeTab === "Pendentes") return t.status === "pending";
    if (activeTab === "Atrasadas") return t.status === "overdue";
    if (activeTab === "Concluídas") return t.status === "completed";
    return true;
  });

  const statusIcon = (s: Task["status"]) => {
    if (s === "completed") return <CheckCircle2 className="h-4 w-4 text-success" />;
    if (s === "overdue") return <AlertTriangle className="h-4 w-4 text-destructive" />;
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <AppLayout
      title="Tarefas"
      subtitle="Gerenciamento de tarefas"
      actions={<Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground"><Plus className="h-3 w-3" /> Nova Tarefa</Button>}
    >
      <div className="p-6 animate-fade-in">
        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === tab ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              {tab}
            </button>
          ))}
        </div>
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {filtered.map((task) => {
            const lead = mockLeads.find((l) => l.id === task.lead_id);
            return (
              <div key={task.id} className="flex items-center justify-between p-4 hover:bg-card-hover transition-colors">
                <div className="flex items-center gap-3">
                  {statusIcon(task.status)}
                  <div>
                    <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</p>
                    {lead && <p className="text-xs text-muted-foreground mt-0.5">Vinculado a: {lead.name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {task.due_date && (
                    <span className={`text-xs flex items-center gap-1 ${task.status === "overdue" ? "text-destructive" : "text-muted-foreground"}`}>
                      <Clock className="h-3 w-3" /> {task.due_date}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
