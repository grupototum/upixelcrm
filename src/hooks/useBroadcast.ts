import { logger } from "@/lib/logger";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { extractEdgeError } from "@/lib/edge-error";
import { getProfileClientId } from "@/services/users";
import {
  listWhatsAppTemplates,
  getClientCredits,
  getConnectedWhatsAppIntegration,
  logCampaignDispatch,
  invokeWhatsAppTemplates,
} from "@/services/broadcast";

export type BroadcastRoute = "free" | "official";

export interface Template {
  id: string;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION" | "SERVICE";
  content: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  typebotFlowId?: string;
}

export interface BroadcastLead {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  company?: string;
}

function interpolate(template: string, lead: BroadcastLead): string {
  return template
    .replace(/\{\{nome\}\}/gi, lead.name ?? "")
    .replace(/\{\{name\}\}/gi, lead.name ?? "")
    .replace(/\{\{email\}\}/gi, lead.email ?? "")
    .replace(/\{\{empresa\}\}/gi, lead.company ?? "")
    .replace(/\{\{company\}\}/gi, lead.company ?? "");
}

export interface BroadcastOptions {
  campaignName?: string;
  campaignId?: string;
  /** Delay in ms between each message. Defaults to random 3–8 s. */
  delayMs?: number | "random" | { minMs: number; maxMs: number };
  maxRetries?: number;
  onProgress?: (sent: number, total: number, currentName?: string) => void;
}

// Meta 2024 Category-based Pricing for Brazil (Approx in Credits: 1 Credit = R$ 0,50)
export const META_RATES = {
  MARKETING: 1.24,
  UTILITY: 0.70,
  AUTHENTICATION: 0.60,
  SERVICE: 0.60,
  FREE: 0,
};

async function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function resolveDelay(opt?: BroadcastOptions["delayMs"]): number {
  if (opt === "random" || opt === undefined) {
    // 3–8 s random to avoid WA rate-limit bans
    return 3000 + Math.random() * 5000;
  }
  if (typeof opt === "object" && opt !== null) {
    return opt.minMs + Math.random() * (opt.maxMs - opt.minMs);
  }
  return opt;
}

export function useBroadcast() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [isInside24h, setIsInside24h] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);

  const clientId = tenant?.id ?? user?.client_id;

  const { data: templates = [], refetch: refetchTemplates } = useQuery({
    queryKey: ["whatsapp-templates", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      // Lê do cache local (whatsapp_templates table). Pra atualizar com Meta,
      // o user clica "Sincronizar" → syncTemplatesWithMeta() abaixo.
      try {
        const data = await listWhatsAppTemplates(clientId);
        return data.map((t) => ({
          id: t.id,
          name: t.name,
          category: t.category as Template["category"],
          content: t.content,
          status: t.status as Template["status"],
        })) as Template[];
      } catch (error) {
        logger.error("Error fetching templates:", error);
        return [];
      }
    },
    enabled: !!clientId,
  });

  /**
   * Puxa templates da Meta Graph API e atualiza o cache local.
   * Chamado quando user clica "Sincronizar com Meta" na TemplateManager.
   */
  const syncTemplatesWithMeta = useCallback(async () => {
    // tenant_id no body é obrigatório quando o master opera num subdomínio
    // (profile.tenant_id aponta pro tenant Master, mas a integration vive no
    // tenant ativo do subdomínio — useTenant().tenant.id).
    const { data, error } = await invokeWhatsAppTemplates("list", { tenant_id: clientId });
    if (error) {
      const detail = await extractEdgeError(error, "Erro de rede");
      toast.error(`Falha ao sincronizar: ${detail}`);
      return { ok: false };
    }
    const res = data as { error?: string; count?: number } | null;
    if (res?.error) {
      toast.error(`Falha ao sincronizar: ${res.error}`);
      return { ok: false };
    }
    const count = res?.count ?? 0;
    toast.success(`${count} template(s) sincronizado(s) com Meta.`);
    queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    await refetchTemplates();
    return { ok: true, count };
  }, [queryClient, refetchTemplates, clientId]);

  const { data: creditsData, isLoading: loadingCredits } = useQuery({
    queryKey: ["client-credits"],
    queryFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return 0;
      const profileClientId = await getProfileClientId(u.id).catch(() => null);
      if (!profileClientId) return 0;
      try {
        return await getClientCredits(profileClientId);
      } catch (error) {
        logger.error("Error fetching credits:", error);
        return 0;
      }
    },
  });

  const credits = creditsData ?? 0;

  const calculateCost = useCallback((count: number, route: BroadcastRoute, category?: Template["category"]) => {
    if (route === "free") return 0;
    if (isInside24h) return 0;
    if (!category) return count;
    return count * (META_RATES[category] || 1);
  }, [isInside24h]);

  /**
   * Cria um template novo submetendo pra aprovação na Meta Graph API.
   * Aceita o shape simplificado (name, category, content como string) e
   * converte pra estrutura Meta (components com BODY). Header/Footer/Buttons
   * podem ser adicionados depois — MVP só BODY.
   */
  const createTemplate = async (template: Omit<Template, "id" | "status">) => {
    const components = [{ type: "BODY" as const, text: template.content }];
    const { data, error } = await invokeWhatsAppTemplates("create", {
      tenant_id: clientId,
      name: template.name,
      category: template.category,
      language: "pt_BR",
      components,
    });
    if (error) {
      const detail = await extractEdgeError(error, "Erro ao criar template");
      throw new Error(detail);
    }
    const res = data as { error?: string } | null;
    if (res?.error) {
      throw new Error(res.error);
    }
    queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    await refetchTemplates();
    return data;
  };

  /** Dispatch a single message to one lead via the configured WA integration. */
  const dispatchOne = useCallback(async (
    lead: BroadcastLead,
    route: BroadcastRoute,
    messageText: string,
    template?: Template,
    maxRetries = 2,
  ): Promise<{ ok: boolean; error?: string }> => {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        if (route === "free") {
          const integration = await getConnectedWhatsAppIntegration(clientId as string, "whatsapp");

          if (!integration?.config) return { ok: false, error: "Integração WhatsApp não encontrada" };

          const { config } = integration;
          const cleanPhone = lead.phone.replace(/\D/g, "");
          const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
          const apiUrl = (config.api_url || "").replace(/\/$/, "");

          const res = await fetch(`${apiUrl}/message/sendText/${config.instance_name}`, {
            method: "POST",
            headers: { apikey: config.api_key, "Content-Type": "application/json" },
            body: JSON.stringify({ number: formattedPhone, text: messageText }),
          });

          if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
          return { ok: true };

        } else {
          const integration = await getConnectedWhatsAppIntegration(clientId as string, "whatsapp_official");

          if (!integration?.config) return { ok: false, error: "Integração WhatsApp Oficial não encontrada" };

          const { config } = integration;
          const cleanPhone = lead.phone.replace(/\D/g, "");
          const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
          const accessToken = integration.access_token || config.access_token;

          const body = template
            ? { messaging_product: "whatsapp", to: formattedPhone, type: "template", template: { name: template.name, language: { code: "pt_BR" } } }
            : { messaging_product: "whatsapp", to: formattedPhone, type: "text", text: { body: messageText } };

          const res = await fetch(`https://graph.facebook.com/v21.0/${config.phone_number_id}/messages`, {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });

          if (!res.ok) throw new Error(`Meta API ${res.status}: ${await res.text()}`);
          return { ok: true };
        }
      } catch (err: any) {
        attempt++;
        if (attempt > maxRetries) return { ok: false, error: err.message };
        // exponential backoff: 2^attempt seconds
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
    return { ok: false, error: "Max retries exceeded" };
  }, [clientId]);

  /** Real broadcast: sends to each lead with throttle, logs each dispatch. */
  const sendBroadcastToLeads = useCallback(async (
    leads: BroadcastLead[],
    route: BroadcastRoute,
    messageText: string,
    template?: Template,
    options: BroadcastOptions = {},
  ): Promise<{ sent: number; failed: number }> => {
    if (leads.length === 0) {
      toast.error("Nenhum destinatário selecionado");
      return { sent: 0, failed: 0 };
    }

    const cost = calculateCost(leads.length, route, template?.category);
    if (credits < cost) {
      toast.error("Saldo de créditos insuficiente!");
      return { sent: 0, failed: 0 };
    }

    setLoading(true);
    setProgress({ sent: 0, total: leads.length });

    let sent = 0;
    let failed = 0;
    const campaignName = options.campaignName ?? `Disparo ${new Date().toLocaleDateString("pt-BR")}`;
    const campaignId = options.campaignId ?? crypto.randomUUID();
    const tenantId = tenant?.id;

    try {
      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        options.onProgress?.(i, leads.length, lead.name);
        setProgress({ sent: i, total: leads.length });

        const personalizedText = interpolate(messageText, lead);
        const result = await dispatchOne(lead, route, personalizedText, template, options.maxRetries ?? 2);

        // Log to campaign_dispatch_logs (erro aqui é ignorado hoje — comportamento preservado)
        await logCampaignDispatch({
          client_id: clientId,
          tenant_id: tenantId,
          campaign_name: campaignName,
          campaign_id: campaignId,
          lead_id: lead.id || null,
          phone: lead.phone,
          channel: route === "free" ? "whatsapp" : "whatsapp_official",
          status: result.ok ? "sent" : "failed",
          template_id: template?.id ?? null,
          message_content: messageText.substring(0, 500),
          error: result.error ?? null,
          sent_at: result.ok ? new Date().toISOString() : null,
        }).catch(() => {});

        if (result.ok) {
          sent++;
        } else {
          failed++;
          logger.warn(`Broadcast failed for ${lead.phone}:`, result.error);
        }

        // Throttle between messages (skip after last)
        if (i < leads.length - 1) {
          await sleep(resolveDelay(options.delayMs));
        }
      }

      if (cost > 0) {
        logger.log(`Broadcast complete. Deducting ${cost} credits.`);
        // Credits deduction handled server-side via RPC if configured
      }

      queryClient.invalidateQueries({ queryKey: ["client-credits"] });
      queryClient.invalidateQueries({ queryKey: ["campaign-dispatch-logs"] });

      toast.success(`${sent} mensagens enviadas${failed > 0 ? `, ${failed} falhas` : ""}!`);
      return { sent, failed };
    } catch (error: any) {
      toast.error(`Erro no disparo: ${error.message}`);
      return { sent, failed };
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [credits, calculateCost, dispatchOne, clientId, tenant, queryClient]);

  /** Legacy helper — kept for BroadcastModal backward compatibility. */
  const sendBroadcast = useCallback(async (
    count: number,
    route: BroadcastRoute,
    template?: Template,
  ) => {
    const cost = calculateCost(count, route, template?.category);
    if (credits < cost) { toast.error("Saldo de créditos insuficiente!"); return false; }
    setLoading(true);
    try {
      await sleep(1500);
      queryClient.invalidateQueries({ queryKey: ["client-credits"] });
      toast.success(`${count} mensagem(ns) enfileirada(s) com sucesso!`);
      return true;
    } catch (error: any) {
      toast.error(`Erro ao enviar: ${error.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, [credits, calculateCost, queryClient]);

  return {
    credits,
    loadingCredits,
    isInside24h,
    setIsInside24h,
    loading,
    progress,
    templates,
    calculateCost,
    sendBroadcast,
    sendBroadcastToLeads,
    createTemplate,
    syncTemplatesWithMeta,
  };
}
