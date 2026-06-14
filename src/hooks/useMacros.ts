import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { resolveClientId } from "@/lib/tenant-utils";
import { logger } from "@/lib/logger";

export type MacroAction =
  | { type: "send_message"; content: string }
  | { type: "update_status"; status: string }
  | { type: "add_label"; label_id: string }
  | { type: "assign"; user_id: string | null }
  | { type: "create_task"; title: string; due_offset_days?: number; description?: string };

export interface Macro {
  id: string;
  name: string;
  description: string | null;
  actions: MacroAction[];
}

interface ExecuteContext {
  leadId: string;
  conversationId?: string;
  sendMessage: (text: string) => Promise<void> | void;
  updateStatus: (leadId: string, status: string) => Promise<void> | void;
  updateLabels: (leadId: string, labels: { id: string; name: string; color: string }[]) => Promise<void> | void;
  assignToAgent: (leadId: string, userId: string | null) => Promise<void> | void;
  currentLabels: { id: string; name: string; color: string }[];
  availableLabels: { id: string; name: string; color: string }[];
}

export function useMacros() {
  const [macros, setMacros] = useState<Macro[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenant } = useTenant();
  const { user } = useAuth();
  const clientId = resolveClientId(tenant?.id, user?.client_id);

  const load = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("macros")
      .select("id, name, description, actions")
      .eq("client_id", clientId)
      .order("name", { ascending: true });

    if (error) {
      logger.error("Error loading macros:", error);
      setLoading(false);
      return;
    }
    setMacros(((data ?? []) as unknown as Macro[]));
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    load();
  }, [load]);

  const executeMacro = useCallback(async (macroId: string, ctx: ExecuteContext) => {
    const macro = macros.find(m => m.id === macroId);
    if (!macro) {
      toast.error("Macro não encontrada");
      return;
    }

    const results: { action: string; success: boolean; error?: string }[] = [];

    for (const action of macro.actions) {
      try {
        switch (action.type) {
          case "send_message":
            await ctx.sendMessage(action.content);
            results.push({ action: "send_message", success: true });
            break;
          case "update_status":
            await ctx.updateStatus(ctx.leadId, action.status);
            results.push({ action: "update_status", success: true });
            break;
          case "add_label": {
            const label = ctx.availableLabels.find(l => l.id === action.label_id);
            if (!label) {
              results.push({ action: "add_label", success: false, error: "label not found" });
              break;
            }
            if (ctx.currentLabels.some(l => l.id === label.id)) {
              results.push({ action: "add_label", success: true });
              break;
            }
            await ctx.updateLabels(ctx.leadId, [...ctx.currentLabels, label]);
            results.push({ action: "add_label", success: true });
            break;
          }
          case "assign":
            await ctx.assignToAgent(ctx.leadId, action.user_id);
            results.push({ action: "assign", success: true });
            break;
          case "create_task": {
            const due = action.due_offset_days != null
              ? new Date(Date.now() + action.due_offset_days * 24 * 60 * 60 * 1000).toISOString()
              : null;
            const { error: taskError } = await supabase.from("tasks").insert({
              client_id: clientId!,
              lead_id: ctx.leadId,
              title: action.title,
              description: action.description ?? null,
              due_date: due,
              status: "pending",
            });
            if (taskError) throw taskError;
            results.push({ action: "create_task", success: true });
            break;
          }
          default:
            results.push({ action: (action as { type: string }).type, success: false, error: "unknown action" });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ action: action.type, success: false, error: message });
      }
    }

    await supabase.from("macro_executions").insert({
      macro_id: macroId,
      conversation_id: ctx.conversationId ?? null,
      lead_id: ctx.leadId,
      executed_by: user?.id ?? null,
      results,
    });

    const failed = results.filter(r => !r.success).length;
    if (failed === 0) {
      toast.success(`Macro "${macro.name}" executada (${results.length} ações)`);
    } else {
      toast.warning(`Macro "${macro.name}" parcial: ${results.length - failed}/${results.length} ações`);
    }
  }, [macros, clientId, user]);

  return { macros, loading, executeMacro, refresh: load };
}
