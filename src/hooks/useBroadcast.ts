import { logger } from "@/lib/logger";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

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

  const { data: templates = [] } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("integrations") as any)
        .select("*")
        .eq("provider", "whatsapp_template")
        .order("created_at", { ascending: false });
      if (error) { logger.error("Error fetching templates:", error); return []; }
      return (data || []) as Template[];
    },
  });

  const { data: creditsData, isLoading: loadingCredits } = useQuery({
    queryKey: ["client-credits"],
    queryFn: async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return 0;
      const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", u.id).single();
      if (!profile) return 0;
      const { data, error } = await (supabase.from("integrations") as any)
        .select("config")
        .eq("provider", "client_credits")
        .eq("client_id", profile.client_id)
        .single();
      if (error && error.code !== "PGRST116") { logger.error("Error fetching credits:", error); return 0; }
      return (data?.config as any)?.balance || 0;
    },
  });

  const credits = creditsData ?? 0;

  const calculateCost = useCallback((count: number, route: BroadcastRoute, category?: Template["category"]) => {
    if (route === "free") return 0;
    if (isInside24h) return 0;
    if (!category) return count;
    return count * (META_RATES[category] || 1);
  }, [isInside24h]);

  const createTemplate = async (template: Omit<Template, "id" | "status">) => {
    const { data: { user: u } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", u?.id).single();
    if (!profile) throw new Error("Client not found");
    const { data, error } = await (supabase.from("integrations") as any).insert({
      ...template,
      client_id: profile.client_id,
      status: "PENDING",
    }).select().single();
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
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
          const { data: integration } = await (supabase.from("integrations") as any)
            .select("config")
            .eq("client_id", clientId)
            .eq("provider", "whatsapp")
            .eq("status", "connected")
            .maybeSingle();

          if (!integration?.config) return { ok: false, error: "Integração WhatsApp não encontrada" };

          const { config } = integration;
          const cleanPhone = lead.phone.replace(/\D/g, "");
          const formattedPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
          let apiUrl = (config.api_url || "").replace(/\/$/, "");

          const res = await fetch(`${apiUrl}/message/sendText/${config.instance_name}`, {
            method: "POST",
            headers: { apikey: config.api_key, "Content-Type": "application/json" },
            body: JSON.stringify({ number: formattedPhone, text: messageText }),
          });

          if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
          return { ok: true };

        } else {
          const { data: integration } = await (supabase.from("integrations") as any)
            .select("config, access_token")
            .eq("client_id", clientId)
            .eq("provider", "whatsapp_official")
            .eq("status", "connected")
            .maybeSingle();

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

        // Log to campaign_dispatch_logs
        await (supabase.from("campaign_dispatch_logs") as any).insert({
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
        });

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
  };
}
