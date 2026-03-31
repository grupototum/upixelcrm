import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface ConversationLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
}

// In-memory labels until the table is created
const defaultLabels: ConversationLabel[] = [
  { id: "1", name: "Urgente", color: "#ef4444", created_at: new Date().toISOString() },
  { id: "2", name: "VIP", color: "#f59e0b", created_at: new Date().toISOString() },
  { id: "3", name: "Suporte", color: "#3b82f6", created_at: new Date().toISOString() },
];

export function useConversationLabels() {
  const [labels, setLabels] = useState<ConversationLabel[]>(defaultLabels);
  const [loading] = useState(false);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});

  const create = useCallback(async (name: string, color: string, description?: string) => {
    const newLabel: ConversationLabel = {
      id: crypto.randomUUID(),
      name, color, description,
      created_at: new Date().toISOString(),
    };
    setLabels(prev => [...prev, newLabel]);
    toast.success("Etiqueta criada!");
    return true;
  }, []);

  const update = useCallback(async (id: string, data: Partial<ConversationLabel>) => {
    setLabels(prev => prev.map(l => l.id === id ? { ...l, ...data } : l));
    return true;
  }, []);

  const remove = useCallback(async (id: string) => {
    setLabels(prev => prev.filter(l => l.id !== id));
    toast.success("Etiqueta removida");
    return true;
  }, []);

  const assignToConversation = useCallback(async (conversationId: string, labelId: string) => {
    setAssignments(prev => {
      const current = prev[conversationId] || [];
      if (current.includes(labelId)) return prev;
      return { ...prev, [conversationId]: [...current, labelId] };
    });
    return true;
  }, []);

  const removeFromConversation = useCallback(async (conversationId: string, labelId: string) => {
    setAssignments(prev => {
      const current = prev[conversationId] || [];
      return { ...prev, [conversationId]: current.filter(id => id !== labelId) };
    });
    return true;
  }, []);

  const getConversationLabels = useCallback(async (conversationId: string) => {
    const labelIds = assignments[conversationId] || [];
    return labels.filter(l => labelIds.includes(l.id));
  }, [assignments, labels]);

  return {
    labels, loading, create, update, remove,
    assignToConversation, removeFromConversation, getConversationLabels,
    refresh: () => {}
  };
}
