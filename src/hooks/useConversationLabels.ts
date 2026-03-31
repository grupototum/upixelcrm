import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ConversationLabel {
  id: string;
  name: string;
  color: string;
  description?: string;
  created_at: string;
}

export function useConversationLabels() {
  const [labels, setLabels] = useState<ConversationLabel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("conversation_labels")
      .select("*")
      .order("name");
    
    if (error) {
      console.error("Error loading conversation labels:", error);
      return;
    }
    setLabels(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async (name: string, color: string, description?: string) => {
    const { error } = await supabase.from("conversation_labels").insert({
      name,
      color,
      description,
    });
    if (error) {
      toast.error("Erro ao criar etiqueta");
      return false;
    }
    toast.success("Etiqueta criada!");
    await load();
    return true;
  }, [load]);

  const update = useCallback(async (id: string, data: Partial<ConversationLabel>) => {
    const { error } = await supabase.from("conversation_labels").update(data).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar etiqueta");
      return false;
    }
    await load();
    return true;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("conversation_labels").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover etiqueta");
      return false;
    }
    toast.success("Etiqueta removida");
    await load();
    return true;
  }, [load]);

  const assignToConversation = useCallback(async (conversationId: string, labelId: string) => {
    const { error } = await supabase.from("conversation_label_assignments").insert({
      conversation_id: conversationId,
      label_id: labelId,
    });
    if (error) {
      if (error.code === "23505") { // Unique violation
        return true;
      }
      toast.error("Erro ao atribuir etiqueta");
      return false;
    }
    return true;
  }, []);

  const removeFromConversation = useCallback(async (conversationId: string, labelId: string) => {
    const { error } = await supabase
      .from("conversation_label_assignments")
      .delete()
      .eq("conversation_id", conversationId)
      .eq("label_id", labelId);
    
    if (error) {
      toast.error("Erro ao remover etiqueta da conversa");
      return false;
    }
    return true;
  }, []);

  const getConversationLabels = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("conversation_label_assignments")
      .select("label_id, conversation_labels(*)")
      .eq("conversation_id", conversationId);
    
    if (error) {
      console.error("Error fetching conversation labels:", error);
      return [];
    }
    
    return data.map((item: any) => item.conversation_labels) as ConversationLabel[];
  }, []);

  return {
    labels,
    loading,
    create,
    update,
    remove,
    assignToConversation,
    removeFromConversation,
    getConversationLabels,
    refresh: load
  };
}
