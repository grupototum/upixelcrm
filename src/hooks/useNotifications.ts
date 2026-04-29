import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppState } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationType =
  | "new_lead"
  | "task_warning"
  | "task_overdue"
  | "unread_message"
  | "automation"
  | "stage_change";

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  type: NotificationType;
  href?: string;
  unread: boolean;
}

const READ_KEY_PREFIX = "upixel:notifications:read:";

function readReadIds(userId?: string): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(READ_KEY_PREFIX + userId);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr) : new Set();
  } catch {
    return new Set();
  }
}

function writeReadIds(userId: string, ids: Set<string>) {
  try {
    // Cap stored ids to last 500 to avoid unbounded growth
    const arr = Array.from(ids).slice(-500);
    localStorage.setItem(READ_KEY_PREFIX + userId, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

export function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  if (Number.isNaN(diff)) return "";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

export function useNotifications() {
  const { user } = useAuth();
  const { leads, tasks, timeline } = useAppState();
  const [readIds, setReadIds] = useState<Set<string>>(() => readReadIds(user?.id));

  useEffect(() => {
    setReadIds(readReadIds(user?.id));
  }, [user?.id]);

  const notifications = useMemo<AppNotification[]>(() => {
    const out: AppNotification[] = [];
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

    // 1. New leads in last 24h
    for (const lead of leads) {
      const created = new Date(lead.created_at).getTime();
      if (now - created < 24 * 60 * 60 * 1000) {
        out.push({
          id: `lead:${lead.id}`,
          title: "Novo Lead",
          description: `${lead.name}${lead.origin ? ` veio de ${lead.origin}` : ""}.`,
          createdAt: lead.created_at,
          type: "new_lead",
          href: `/leads/${lead.id}`,
          unread: false,
        });
      }
    }

    // 2. Overdue tasks
    for (const task of tasks) {
      if (task.status === "completed") continue;
      const due = task.due_date ? new Date(task.due_date).getTime() : NaN;
      if (!Number.isNaN(due)) {
        const isOverdue = task.status === "overdue" || due < now;
        const dueSoon = !isOverdue && due - now < 60 * 60 * 1000; // within 1h
        if (isOverdue || dueSoon) {
          out.push({
            id: `task:${task.id}`,
            title: isOverdue ? "Tarefa atrasada" : "Tarefa vencendo",
            description: task.title,
            createdAt: task.due_date || new Date().toISOString(),
            type: isOverdue ? "task_overdue" : "task_warning",
            href: `/tasks`,
            unread: false,
          });
        }
      }
    }

    // 3. Recent timeline events (stage changes, automations, messages) - last 7 days
    for (const ev of timeline.slice(0, 30)) {
      const t = new Date(ev.created_at).getTime();
      if (now - t > SEVEN_DAYS) continue;
      let type: NotificationType = "stage_change";
      let title = "Atividade no CRM";
      if (ev.type === "automation") {
        type = "automation";
        title = "Automação executada";
      } else if (ev.type === "stage_change") {
        type = "stage_change";
        title = "Mudança de etapa";
      } else if (ev.type === "message") {
        type = "unread_message";
        title = "Nova mensagem";
      } else if (ev.type === "task") {
        type = "task_warning";
        title = "Tarefa atualizada";
      } else {
        continue; // skip notes / generic field changes from notification feed
      }
      out.push({
        id: `tl:${ev.id}`,
        title,
        description: ev.content,
        createdAt: ev.created_at,
        type,
        href: ev.lead_id ? `/leads/${ev.lead_id}` : undefined,
        unread: false,
      });
    }

    // Sort: most recent first
    out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply read state and cap to 30
    return out.slice(0, 30).map((n) => ({ ...n, unread: !readIds.has(n.id) }));
  }, [leads, tasks, timeline, readIds]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAsRead = useCallback((id: string) => {
    if (!user?.id) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      writeReadIds(user.id, next);
      return next;
    });
  }, [user?.id]);

  const markAllRead = useCallback(() => {
    if (!user?.id) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      writeReadIds(user.id, next);
      return next;
    });
  }, [notifications, user?.id]);

  return { notifications, unreadCount, markAsRead, markAllRead };
}
