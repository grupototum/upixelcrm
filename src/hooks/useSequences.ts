import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { isValidUuid } from "@/lib/tenant-utils";

export type SequenceChannel = "whatsapp" | "email";
export type SequenceStepType = "text" | "audio" | "file";
export type DelayUnit = "minutes" | "hours" | "days";

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  type: SequenceStepType;
  content: string;
  delay_value: number;
  delay_unit: DelayUnit;
  metadata?: Record<string, unknown>;
}

export interface MessageSequence {
  id: string;
  client_id: string;
  tenant_id: string | null;
  name: string;
  description?: string | null;
  channel: SequenceChannel;
  active: boolean;
  trigger_column_id: string | null;
  trigger_pipeline_id: string | null;
  enrollment_count: number;
  steps: SequenceStep[];
  created_at: string;
  updated_at: string;
}

export function useSequences() {
  const [sequences, setSequences] = useState<MessageSequence[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { tenant } = useTenant();
  const clientId = user?.client_id ?? tenant?.id;

  const fetchSequences = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    setLoading(true);
    const { data: seqs, error: seqErr } = await supabase
      .from("message_sequences")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (seqErr) {
      console.error("Error fetching sequences:", seqErr);
      setLoading(false);
      return;
    }

    const ids = (seqs ?? []).map((s: any) => s.id);
    let stepsBySeq = new Map<string, SequenceStep[]>();
    if (ids.length > 0) {
      const { data: steps, error: stepsErr } = await supabase
        .from("message_sequence_steps")
        .select("*")
        .in("sequence_id", ids)
        .order("step_order", { ascending: true });
      if (stepsErr) {
        console.error("Error fetching steps:", stepsErr);
      } else {
        for (const st of steps ?? []) {
          const arr = stepsBySeq.get((st as any).sequence_id) ?? [];
          arr.push(st as unknown as SequenceStep);
          stepsBySeq.set((st as any).sequence_id, arr);
        }
      }
    }

    const merged = (seqs ?? []).map((s: any) => ({
      ...s,
      steps: stepsBySeq.get(s.id) ?? [],
    })) as MessageSequence[];

    setSequences(merged);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { fetchSequences(); }, [fetchSequences]);

  const createSequence = useCallback(async (params: {
    name: string;
    channel?: SequenceChannel;
    description?: string;
    trigger_column_id?: string | null;
    trigger_pipeline_id?: string | null;
  }) => {
    if (!clientId) { toast.error("Sessão inválida."); return null; }
    const { data, error } = await supabase
      .from("message_sequences")
      .insert({
        client_id: clientId,
        tenant_id: isValidUuid(tenant?.id) ? tenant.id : null,
        name: params.name,
        description: params.description ?? null,
        channel: params.channel ?? "whatsapp",
        active: false,
        trigger_column_id: params.trigger_column_id ?? null,
        trigger_pipeline_id: params.trigger_pipeline_id ?? null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao criar sequência: " + error.message);
      return null;
    }
    const newSeq = { ...(data as any), steps: [] } as MessageSequence;
    setSequences((prev) => [newSeq, ...prev]);
    toast.success(`Sequência "${params.name}" criada!`);
    return newSeq;
  }, [clientId, tenant?.id]);

  const updateSequence = useCallback(async (id: string, updates: Partial<MessageSequence>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.channel !== undefined) dbUpdates.channel = updates.channel;
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    if (updates.trigger_column_id !== undefined) dbUpdates.trigger_column_id = updates.trigger_column_id;
    if (updates.trigger_pipeline_id !== undefined) dbUpdates.trigger_pipeline_id = updates.trigger_pipeline_id;

    const { error } = await supabase
      .from("message_sequences")
      .update(dbUpdates)
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return false;
    }
    setSequences((prev) => prev.map((s) => s.id === id ? { ...s, ...updates } : s));
    return true;
  }, []);

  const toggleActive = useCallback(async (id: string) => {
    const seq = sequences.find((s) => s.id === id);
    if (!seq) return;
    const ok = await updateSequence(id, { active: !seq.active });
    if (ok) {
      toast.success(`Sequência ${!seq.active ? "ativada" : "desativada"}.`);
    }
  }, [sequences, updateSequence]);

  const deleteSequence = useCallback(async (id: string) => {
    const { error } = await supabase
      .from("message_sequences")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir: " + error.message);
      return false;
    }
    setSequences((prev) => prev.filter((s) => s.id !== id));
    toast.success("Sequência excluída.");
    return true;
  }, []);

  const addStep = useCallback(async (sequenceId: string, params: {
    type?: SequenceStepType;
    content?: string;
    delay_value?: number;
    delay_unit?: DelayUnit;
  }) => {
    const seq = sequences.find((s) => s.id === sequenceId);
    if (!seq) return null;
    const nextOrder = seq.steps.length;
    const { data, error } = await supabase
      .from("message_sequence_steps")
      .insert({
        sequence_id: sequenceId,
        step_order: nextOrder,
        type: params.type ?? "text",
        content: params.content ?? "",
        delay_value: params.delay_value ?? 0,
        delay_unit: params.delay_unit ?? "minutes",
      })
      .select()
      .single();

    if (error) {
      toast.error("Erro ao adicionar etapa: " + error.message);
      return null;
    }
    const newStep = data as unknown as SequenceStep;
    setSequences((prev) => prev.map((s) => s.id === sequenceId
      ? { ...s, steps: [...s.steps, newStep] }
      : s
    ));
    return newStep;
  }, [sequences]);

  const updateStep = useCallback(async (stepId: string, updates: Partial<SequenceStep>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.delay_value !== undefined) dbUpdates.delay_value = updates.delay_value;
    if (updates.delay_unit !== undefined) dbUpdates.delay_unit = updates.delay_unit;
    if (updates.step_order !== undefined) dbUpdates.step_order = updates.step_order;

    const { error } = await supabase
      .from("message_sequence_steps")
      .update(dbUpdates)
      .eq("id", stepId);

    if (error) {
      toast.error("Erro ao atualizar etapa: " + error.message);
      return false;
    }
    setSequences((prev) => prev.map((s) => ({
      ...s,
      steps: s.steps.map((st) => st.id === stepId ? { ...st, ...updates } : st),
    })));
    return true;
  }, []);

  const deleteStep = useCallback(async (stepId: string) => {
    const { error } = await supabase
      .from("message_sequence_steps")
      .delete()
      .eq("id", stepId);

    if (error) {
      toast.error("Erro ao excluir etapa: " + error.message);
      return false;
    }
    setSequences((prev) => prev.map((s) => ({
      ...s,
      steps: s.steps.filter((st) => st.id !== stepId),
    })));
    return true;
  }, []);

  return {
    sequences,
    loading,
    fetchSequences,
    createSequence,
    updateSequence,
    toggleActive,
    deleteSequence,
    addStep,
    updateStep,
    deleteStep,
  };
}
