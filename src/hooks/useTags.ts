import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TagMeta } from "@/types";

export function useTags() {
  const [tags, setTags] = useState<TagMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching tags:", error);
    } else {
      setTags((data as unknown as TagMeta[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = useCallback(
    async (params: { name: string; color?: string; category?: string }) => {
      const { data, error } = await supabase
        .from("tags")
        .insert({
          name: params.name,
          color: params.color || "#6366f1",
          category: params.category || "general",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("Esta tag já existe.");
        } else {
          toast.error("Erro ao criar tag: " + error.message);
        }
        return null;
      }
      toast.success(`Tag "${params.name}" criada!`);
      setTags((prev) => [...prev, data as unknown as TagMeta].sort((a, b) => a.name.localeCompare(b.name)));
      return data;
    },
    []
  );

  const updateTag = useCallback(
    async (id: string, updates: Partial<Pick<TagMeta, "name" | "color" | "category">>) => {
      const { error } = await supabase
        .from("tags")
        .update(updates)
        .eq("id", id);

      if (error) {
        toast.error("Erro ao atualizar tag: " + error.message);
        return false;
      }
      setTags((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      return true;
    },
    []
  );

  const deleteTag = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("tags")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir tag: " + error.message);
      return false;
    }
    setTags((prev) => prev.filter((t) => t.id !== id));
    toast.success("Tag removida.");
    return true;
  }, []);

  return {
    tags,
    loading,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
  };
}
