import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CannedResponse {
  id: string;
  short_code: string;
  title: string;
  content: string;
  created_at: string;
}

export function useCannedResponses() {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("canned_responses")
      .select("*")
      .order("title");
    if (error) {
      console.error("Error loading canned responses:", error);
      return;
    }
    setResponses(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (shortCode: string, title: string, content: string) => {
    const { error } = await supabase.from("canned_responses").insert({
      short_code: shortCode,
      title,
      content,
    });
    if (error) {
      toast.error("Erro ao criar resposta rápida");
      return false;
    }
    toast.success("Resposta rápida criada!");
    await load();
    return true;
  }, [load]);

  const update = useCallback(async (id: string, data: Partial<CannedResponse>) => {
    const { error } = await supabase.from("canned_responses").update(data).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar resposta rápida");
      return false;
    }
    await load();
    return true;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("canned_responses").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao remover resposta rápida");
      return false;
    }
    toast.success("Resposta rápida removida");
    await load();
    return true;
  }, [load]);

  // Search by shortcode prefix (for `/` trigger)
  const search = useCallback((query: string) => {
    if (!query) return responses;
    const q = query.toLowerCase();
    return responses.filter(
      r => r.short_code.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)
    );
  }, [responses]);

  // Replace template variables like {{contact.name}}
  const resolveVariables = useCallback((template: string, vars: Record<string, string>) => {
    return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, group, key) => {
      const fullKey = `${group}.${key}`;
      return vars[fullKey] || match;
    });
  }, []);

  return { responses, loading, create, update, remove, search, resolveVariables, refresh: load };
}
