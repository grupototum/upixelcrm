import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { extractEdgeError } from "@/lib/edge-error";
import { invokeEdge } from "@/lib/edge-invoke";
import { resolveClientId } from "@/lib/tenant-utils";
import { notifyMentions } from "@/lib/mentions";
import {
  reawakenExpiredSnoozes,
  listConversations,
  listLeadBasicsByIds,
  listLeadConversationRefs,
  listMessagesByConversationIds,
  markConversationsRead,
  getConversationRef,
  getConversationCsatInfo,
  insertCsatResponse,
  assignLeadToConversation,
  insertMessage,
  updateConversationLastMessage,
  updateConversationsStatus,
  updateConversationMetadata,
  insertConversation,
  getMessageContentMeta,
  updateMessageMetadata,
  reassignConversationsToLead,
} from "@/services/inbox";
import {
  findLeadIdsByPhoneSuffix,
  findLeadIdsByEmail,
  getFirstPipelineColumnId,
  insertAutoLead,
  deleteLeadById,
  reassignTasksToLead,
  reassignNotesToLead,
} from "@/services/leads";

export interface LeadConversation {
  lead_id: string;
  lead_name: string;
  lead_phone?: string;
  lead_email?: string;
  lead_company?: string;
  category?: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  status: string;
  priority: string;
  assignee_id: string | null;
  labels: { id: string; name: string; color: string }[];
  channels: string[];
  source_conversations: {
    id: string;
    channel: string;
    metadata: Record<string, any>;
  }[];
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  type: string;
  direction: string;
  sender_name: string | null;
  metadata: Record<string, any>;
  created_at: string;
  channel?: string;
  is_private: boolean;
  content_type: string;
}

// Normaliza fone BR para forma canônica DDD+8 (sem o "9" extra do celular),
// alinhada ao wa_id que Meta retorna. Mantém E.164 com prefixo 55.
function canonicalBrPhone(raw?: string | null): string {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    // 55 + DDD(2) + 9 + 8 → remove o 9
    return digits.slice(0, 4) + digits.slice(5);
  }
  if (digits.length === 11 && !digits.startsWith("55")) {
    // DDD(2) + 9 + 8 → remove o 9, adiciona 55
    return "55" + digits.slice(0, 2) + digits.slice(3);
  }
  if (digits.length === 10 && !digits.startsWith("55")) {
    return "55" + digits;
  }
  return digits;
}

function sortByCreatedAt(list: Message[]): Message[] {
  return [...list].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export function useInbox(onLeadCreated?: () => void) {
  const [conversations, setConversations] = useState<LeadConversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const realtimeSubscriptionRef = useRef<any>(null);

  const { tenant } = useTenant();
  const { user } = useAuth();
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  // Tenant scope: prefer tenant.id (UUID válido); cai para user.client_id em master-view sem tenant
  const clientId = resolveClientId(tenant?.id, user?.client_id);

  // Load conversations grouped by lead
  const loadConversations = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    // Self-healing: reacorda sonecas expiradas (roda uma vez por load).
    await reawakenExpiredSnoozes(clientId);

    let convs: Awaited<ReturnType<typeof listConversations>>;
    try {
      convs = await listConversations(clientId);
    } catch (convError) {
      logger.error("Error loading conversations:", convError);
      toast.error("Erro ao carregar conversas. Tente novamente.");
      return;
    }

    // Fetch leads — erro aqui é ignorado como no original (lista segue sem
    // os dados do lead, exibindo fallbacks do metadata)
    const leadIds = (convs || []).map(c => c.lead_id).filter((id): id is string => !!id);
    let leadsMap: Record<string, any> = {};

    const leads = await listLeadBasicsByIds(leadIds).catch(() => []);
    if (leads.length > 0) {
      leadsMap = Object.fromEntries(leads.map(l => [l.id, l]));
    }

    // Grouping logic
    const groupedMap: Record<string, LeadConversation> = {};

    (convs || []).forEach(c => {
      const lid = c.lead_id || "unassigned";
      const meta = (c.metadata || {}) as Record<string, any>;
      
      // Extract labels from metadata
      const labels = (meta.labels || []) as { id: string; name: string; color: string }[];

      if (!groupedMap[lid]) {
        const lead = leadsMap[lid];
        groupedMap[lid] = {
          lead_id: lid,
          lead_name: lead?.name || meta?.lead_name || meta?.phone || "Desconhecido",
          lead_phone: lead?.phone || meta?.phone,
          lead_email: lead?.email || meta?.email,
          lead_company: lead?.company,
          category: lead?.category || "lead",
          last_message: c.last_message,
          last_message_at: c.last_message_at,
          unread_count: c.unread_count || 0,
          status: c.status || "open",
          priority: meta?.priority || "none",
          assignee_id: meta?.assignee_id || null,
          labels: labels,
          channels: [c.channel],
          source_conversations: [{ id: c.id, channel: c.channel, metadata: meta }],
        };
      } else {
        const group = groupedMap[lid];
        if (!group.channels.includes(c.channel)) group.channels.push(c.channel);
        group.source_conversations.push({ id: c.id, channel: c.channel, metadata: meta });
        group.unread_count += (c.unread_count || 0);
        
        // Merge labels (unique)
        labels.forEach(l => {
          if (!group.labels.some(gl => gl.id === l.id)) group.labels.push(l);
        });

        if (c.last_message_at && (!group.last_message_at || new Date(c.last_message_at) > new Date(group.last_message_at))) {
          group.last_message = c.last_message;
          group.last_message_at = c.last_message_at;
          group.status = c.status || "open";
          // Metadata fields from most recent conversation
          group.priority = meta?.priority || group.priority;
          group.assignee_id = meta?.assignee_id || group.assignee_id;
        }
      }
    });

    const result = Object.values(groupedMap).sort((a, b) => {
      const da = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const db = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return db - da;
    });

    setConversations(result);
    setLoading(false);
  }, [clientId]);

  // Load messages for all conversations associated with a lead
  const loadMessages = useCallback(async (leadId: string) => {
    if (!clientId) return;

    // Erro aqui era ignorado no original (lista vazia) — preservado
    const convs = await listLeadConversationRefs(clientId, leadId).catch(() => []);

    if (!convs || convs.length === 0) {
      setMessages([]);
      return;
    }

    const convIds = convs.map(c => c.id);
    const channelMap = Object.fromEntries(convs.map(c => [c.id, c.channel]));

    let data: Awaited<ReturnType<typeof listMessagesByConversationIds>>;
    try {
      data = await listMessagesByConversationIds(convIds);
    } catch (error) {
      logger.error("Error loading messages:", error);
      return;
    }

    const seenIds = new Set<string>();
    const dedupedRows = (data || []).filter(m => {
      if (seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      return true;
    });
    console.debug("[useInbox] loadMessages", { leadId, rows: dedupedRows.length });
    setMessages(dedupedRows.map(m => {
      const meta = (m.metadata || {}) as Record<string, any>;
      // For media messages, resolve the best available URL
      let resolvedContent = m.content;
      const isMedia = ["image", "audio", "video", "file", "sticker"].includes(m.type);
      if (isMedia) {
        const isEncrypted = resolvedContent?.includes(".enc");
        const isWhatsAppDomain = resolvedContent?.includes("mmg.whatsapp.net") || resolvedContent?.includes("media.whatsapp.net");
        const isPlaceholder = resolvedContent?.startsWith("[") || !resolvedContent || resolvedContent === "";
        
        // Fallback to metadata media_url if content is not a direct link or is an inaccessible WhatsApp link
        if ((isEncrypted || isPlaceholder || isWhatsAppDomain) && meta?.media_url && !meta.media_url.includes(".enc") && !meta.media_url.startsWith("[")) {
          resolvedContent = meta.media_url;
        }
      }
      return {
        ...m,
        content: resolvedContent,
        channel: channelMap[m.conversation_id],
        metadata: meta,
        is_private: meta?.is_private || false,
        content_type: meta?.content_type || "text",
      };
    }));

    // Mark all as read (erro ignorado como no original)
    await markConversationsRead(convIds).catch(() => {});
    setConversations(prev =>
      prev.map(c => c.lead_id === leadId ? { ...c, unread_count: 0 } : c)
    );
  }, [clientId]);

  const selectLead = useCallback((id: string) => {
    setSelectedLeadId(id);
    loadMessages(id);
  }, [loadMessages]);

  // Upload file to Supabase Storage
  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop() || 'bin';
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('whatsapp_media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });

    if (uploadError) {
      logger.error("Storage upload error:", uploadError);
      throw new Error(`Falha no upload: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('whatsapp_media')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Detect media type from file
  const detectMediaType = (file: File): "image" | "video" | "audio" | "document" => {
    if (file.type.startsWith('image')) return 'image';
    if (file.type.startsWith('video')) return 'video';
    if (file.type.startsWith('audio')) return 'audio';
    return 'document';
  };

  // Send message via WhatsApp
  const sendWhatsAppMessage = useCallback(async (leadId: string, text: string, targetConversationId?: string) => {
    const leadGroup = conversations.find(c => c.lead_id === leadId);
    if (!leadGroup) return;

    const target = targetConversationId
      ? leadGroup.source_conversations.find(sc => sc.id === targetConversationId)
      : leadGroup.source_conversations.find(sc => ["whatsapp", "whatsapp_official", "whatsapp_cloud", "instagram"].includes(sc.channel));

    if (!target) {
      toast.error("Nenhuma conexão de mensageria encontrada para este lead.");
      return;
    }

    const phone = target.metadata?.phone || leadGroup.lead_phone;
    if (!phone) {
      toast.error("Sem número de telefone para enviar a mensagem.");
      return;
    }

    // Optimistic UI: insere a mensagem localmente antes do invoke.
    // O realtime callback substitui pelo registro real (mesmo conv + mesmo conteúdo)
    // assim que o webhook/persistOutbound do proxy gravar no banco.
    const optimisticId = `optimistic-${
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2)
    }`;
    const optimisticMsg: Message = {
      id: optimisticId,
      conversation_id: target.id,
      content: text,
      type: "text",
      direction: "outbound",
      sender_name: "Você",
      metadata: { optimistic: true, pending: true },
      created_at: new Date().toISOString(),
      channel: target.channel,
      is_private: false,
      content_type: "text",
    };
    setMessages(prev => sortByCreatedAt([...prev, optimisticMsg]));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const channel = target.channel;
      const instanceName = target.metadata?.instance_name as string | undefined;
      const integrationId = target.metadata?.integration_id as string | undefined;

      let functionName: string;
      let queryString: string;

      if (channel === "instagram") {
        functionName = "instagram-proxy";
        queryString = "?action=send-message";
      } else if (channel === "whatsapp_cloud" || channel === "whatsapp_official") {
        // whatsapp_official é label legacy do cloud — backend é o mesmo.
        functionName = "whatsapp-cloud-proxy";
        queryString = `?action=send-message${integrationId ? `&integration_id=${integrationId}` : ""}`;
      } else {
        // whatsapp Baileys (Evolution) — só se o tenant tiver essa integration.
        functionName = "whatsapp-proxy";
        queryString = `?action=send-message${instanceName ? `&instance_name=${encodeURIComponent(instanceName)}` : ""}`;
      }

      const { error } = await invokeEdge(`${functionName}${queryString}`, {
        body: { phone, message: text },
      });

      if (error) {
        const detail = await extractEdgeError(error, "Falha ao enviar mensagem");
        throw new Error(detail);
      }

      // Sucesso: realtime entregará a msg real e substituirá a otimista.
      // loadConversations dispara via realtime UPDATE em conversations.
    } catch (err: any) {
      // Marca a otimista como falhada para feedback visual.
      setMessages(prev =>
        prev.map(m =>
          m.id === optimisticId
            ? { ...m, metadata: { ...m.metadata, pending: false, failed: true } }
            : m
        )
      );
      toast.error(`Erro ao enviar: ${err.message}`);
    }
  }, [conversations]);

  // Send message with media (unified - WhatsApp, Instagram, or fallback for other channels)
  const sendWhatsAppMedia = useCallback(async (leadId: string, file: File, targetConversationId?: string) => {
    const leadGroup = conversations.find(c => c.lead_id === leadId);
    if (!leadGroup) {
      toast.error("Lead não encontrado.");
      return;
    }

    const target = targetConversationId
      ? leadGroup.source_conversations.find(sc => sc.id === targetConversationId)
      : leadGroup.source_conversations.find(sc => sc.channel === "whatsapp" || sc.channel === "whatsapp_official" || sc.channel === "instagram")
        ?? leadGroup.source_conversations[0];

    if (!target) {
      toast.error("Nenhuma conexão encontrada para este lead.");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      // 1. Upload to Supabase Storage
      const url = await uploadFile(file);
      const mediaType = detectMediaType(file);

      // 2. Send via appropriate proxy/channel
      if (target.channel === "whatsapp_cloud" || target.channel === "whatsapp_official") {
        // whatsapp_official é label legacy do cloud — backend é o mesmo.
        const phone = target.metadata?.phone || leadGroup.lead_phone;
        if (!phone) throw new Error("Número de telefone não encontrado para este contato.");
        const integrationId = target.metadata?.integration_id as string | undefined;
        const queryString = `?action=send-media${integrationId ? `&integration_id=${integrationId}` : ""}`;

        const { error } = await invokeEdge(`whatsapp-cloud-proxy${queryString}`, {
          body: { phone, mediaUrl: url, mediaType, fileName: file.name },
        });

        if (error) {
          const detail = await extractEdgeError(error, "Falha ao enviar via WhatsApp Cloud.");
          throw new Error(detail);
        }
      } else if (target.channel === "whatsapp") {
        const phone = target.metadata?.phone || leadGroup.lead_phone;
        if (!phone) throw new Error("Número de telefone não encontrado para este contato.");

        const { error } = await invokeEdge("whatsapp-proxy?action=send-media", {
          body: {
            phone,
            mediaUrl: url,
            mediaType,
            mimetype: file.type,
            fileName: file.name,
          },
        });

        if (error) {
          const detail = await extractEdgeError(error, "Falha ao enviar via WhatsApp.");
          throw new Error(detail);
        }
      } else if (target.channel === "instagram") {
        const phone = target.metadata?.phone || leadGroup.lead_phone || "";
        const { error } = await invokeEdge("instagram-proxy?action=send-media", {
          body: {
            phone,
            mediaUrl: url,
            mediaType,
            mimetype: file.type,
            fileName: file.name,
          },
        });

        if (error) {
          const detail = await extractEdgeError(error, "Falha ao enviar via Instagram.");
          throw new Error(detail);
        }
      } else {
        // Webchat/email/outros: apenas registra a mensagem com o link da mídia.
        // Para email, idealmente usaríamos anexo via Gmail API, mas isso requer extensão futura.
        // Lança em erro, como no original (msgError -> throw)
        await insertMessage({
          conversation_id: target.id,
          content: url,
          type: mediaType === "video" || mediaType === "document" ? "file" : mediaType,
          direction: "outbound",
          sender_name: "Você",
          metadata: {
            media_url: url,
            filename: file.name,
            mimetype: file.type,
            channel: target.channel,
          },
        });

        // Erro ignorado como no original
        await updateConversationLastMessage(
          target.id,
          mediaType === "image" ? "📷 Imagem" : mediaType === "audio" ? "🎵 Áudio" : mediaType === "video" ? "🎥 Vídeo" : `📎 ${file.name}`,
        ).catch(() => {});
      }

      // Realtime entrega o INSERT da mensagem persistida (pelo proxy ou direto)
      // e o dedup por id evita duplicata na UI — não recarregamos manualmente.
      toast.success("Mídia enviada!");
    } catch (err: any) {
      logger.error("sendWhatsAppMedia error:", err);
      toast.error(`Erro ao enviar mídia: ${err.message}`);
      throw err;
    }
  }, [conversations]);

  // Send email via Gmail
  const sendEmail = useCallback(async (leadId: string, text: string, targetConversationId?: string) => {
    const leadGroup = conversations.find(c => c.lead_id === leadId);
    if (!leadGroup) return;

    const target = targetConversationId
      ? leadGroup.source_conversations.find(sc => sc.id === targetConversationId)
      : leadGroup.source_conversations.find(sc => sc.channel === "email");

    if (!target) {
      toast.error("Nenhuma conexão de E-mail encontrada para este lead.");
      return;
    }

    const email = target.metadata?.email || leadGroup.lead_email;
    if (!email) {
      toast.error("Sem e-mail para enviar a mensagem.");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { error } = await invokeEdge('google-oauth?action=gmail-send', {
        body: { to: email, subject: "Re: Conversa uPixel", body: text },
      });

      if (error) {
        throw new Error(error.message || "Failed to send email");
      }

      // Erros ignorados como no original
      await insertMessage({
        conversation_id: target.id,
        content: text,
        type: "email",
        direction: "outbound",
        sender_name: "Você",
      }).catch(() => {});

      await updateConversationLastMessage(target.id, text).catch(() => {});

      await loadMessages(leadId);
      await loadConversations();
      toast.success("E-mail enviado!");
    } catch (err: any) {
      toast.error(`Erro ao enviar e-mail: ${err.message}`);
    }
  }, [conversations, loadMessages, loadConversations]);

  // Unified send
  const sendMessage = useCallback(async (text: string, targetConversationId?: string, isPrivate: boolean = false) => {
    if (!selectedLeadId || !text.trim()) return;
    const leadGroup = conversations.find(c => c.lead_id === selectedLeadId);
    if (!leadGroup) return;

    const target = targetConversationId
      ? leadGroup.source_conversations.find(sc => sc.id === targetConversationId)
      : leadGroup.source_conversations[0];

    if (!target) return;

    if (isPrivate) {
      // Erro ignorado como no original
      await insertMessage({
        conversation_id: target.id,
        content: text,
        type: "text",
        direction: "outbound",
        sender_name: "Você (Nota Privada)",
        metadata: { is_private: true },
      }).catch(() => {});
      if (clientId) {
        void notifyMentions({
          clientId,
          authorId: user?.id,
          text,
          leadId: selectedLeadId,
          leadName: leadGroup.lead_name,
        });
      }
      await loadMessages(selectedLeadId);
      return;
    }

    const waChannels = ["whatsapp", "whatsapp_official", "whatsapp_cloud", "instagram"];
    if (waChannels.includes(target.channel)) {
      await sendWhatsAppMessage(selectedLeadId, text, target.id);
    } else if (target.channel === "email") {
      await sendEmail(selectedLeadId, text, target.id);
    } else {
      // Webchat e outros canais sem proxy: persiste direto.
      // Realtime entrega o INSERT e o dedup por id evita duplicata na UI,
      // então não chamamos loadMessages aqui.
      // Erros ignorados como no original
      await insertMessage({
        conversation_id: target.id,
        content: text,
        type: "text",
        direction: "outbound",
        sender_name: "Você",
      }).catch(() => {});
      await updateConversationLastMessage(target.id, text).catch(() => {});
    }
  }, [selectedLeadId, conversations, sendWhatsAppMessage, sendEmail, clientId, user]);

  // Update conversation status
  const updateStatus = useCallback(async (leadId: string, status: string) => {
    const leadGroup = conversations.find(c => c.lead_id === leadId);
    if (!leadGroup) return;

    // Optimistic update
    setConversations(prev => prev.map(c => c.lead_id === leadId ? { ...c, status } : c));

    const convIds = leadGroup.source_conversations.map(sc => sc.id);
    try {
      await updateConversationsStatus(convIds, status);
    } catch {
      toast.error("Erro ao atualizar status");
      loadConversations(); // Revert
      return;
    }

    toast.success(`Conversa marcada como ${status === 'resolved' ? 'Resolvida' : status === 'snoozed' ? 'Soneca' : 'Aberta'}`);
  }, [conversations, loadConversations]);

  // Snooze conversation until a given datetime
  const snoozeConversation = useCallback(async (leadId: string, until: Date) => {
    const leadGroup = conversations.find(c => c.lead_id === leadId);
    if (!leadGroup) return;

    const convIds = leadGroup.source_conversations.map(sc => sc.id);
    try {
      await updateConversationsStatus(convIds, "snoozed", until.toISOString());
    } catch {
      toast.error("Erro ao adiar conversa");
      return;
    }

    setConversations(prev =>
      prev.map(c => c.lead_id === leadId ? { ...c, status: "snoozed" } : c)
    );
    toast.success(`Conversa adiada até ${until.toLocaleString("pt-BR")}`);
  }, [conversations]);

  // Update conversation priority (stored in metadata)
  const updatePriority = useCallback(async (leadId: string, priority: string) => {
    const leadGroup = conversations.find(c => c.lead_id === leadId);
    if (!leadGroup) return;

    for (const sc of leadGroup.source_conversations) {
      const newMeta = { ...sc.metadata, priority };
      // Erro ignorado como no original
      await updateConversationMetadata(sc.id, newMeta).catch(() => {});
    }

    loadConversations();
    toast.success("Prioridade atualizada");
  }, [conversations, loadConversations]);

  // Assign conversation to agent (stored in metadata)
  const assignToAgent = useCallback(async (leadId: string, agentId: string | null) => {
    const leadGroup = conversations.find(c => c.lead_id === leadId);
    if (!leadGroup) return;

    for (const sc of leadGroup.source_conversations) {
      const newMeta = { ...sc.metadata, assignee_id: agentId };
      // Erro ignorado como no original
      await updateConversationMetadata(sc.id, newMeta).catch(() => {});
    }

    loadConversations();
    toast.success(agentId ? "Agente atribuído" : "Agente removido");
  }, [conversations, loadConversations]);

  // Update conversation labels (stored in metadata)
  const updateLabels = useCallback(async (leadId: string, labels: { id: string; name: string; color: string }[]) => {
    const leadGroup = conversations.find(c => c.lead_id === leadId);
    if (!leadGroup) return;

    const convIds = leadGroup.source_conversations.map(sc => sc.id);
    
    // We update all conversations for this lead to have the same labels
    for (const sc of leadGroup.source_conversations) {
      const newMeta = { ...(sc.metadata as any || {}), labels };
      // Erro ignorado como no original
      await updateConversationMetadata(sc.id, newMeta, true).catch(() => {});
    }
    
    await loadConversations();
    toast.success("Etiquetas atualizadas");
  }, [conversations, loadConversations]);

  // Find or create lead
  const findOrCreateLead = useCallback(async (
    phone?: string, email?: string, name?: string
  ): Promise<string | null> => {
    // Sem client_id não há como buscar nem criar o lead.
    if (!clientId) return null;

    // Normaliza para forma canônica antes de buscar e inserir, evitando
    // leads duplicados quando o mesmo número vem em formatos diferentes
    // (ex.: webhook Meta como wa_id "553391294114" vs cadastro como "+55 33 99129-4114").
    const canonicalPhone = canonicalBrPhone(phone);

    if (canonicalPhone) {
      const phoneSuffix = canonicalPhone.length >= 8 ? canonicalPhone.slice(-8) : canonicalPhone;
      // Erro ignorado como no original (duplicates undefined -> segue o fluxo)
      const duplicates = await findLeadIdsByPhoneSuffix(clientId, phoneSuffix).catch(() => []);
      if (duplicates && duplicates.length > 0) return duplicates[0].id;
    }

    if (email) {
      // Erro ignorado como no original
      const byEmail = await findLeadIdsByEmail(clientId, email).catch(() => []);
      if (byEmail && byEmail.length > 0) return byEmail[0].id;
    }

    // Erro ignorado como no original
    const firstColId = await getFirstPipelineColumnId(clientId).catch(() => null);

    if (!firstColId) return null;

    const leadName = name || phone || email || "Lead Automático";
    const newLead = await insertAutoLead({
      client_id: clientId,
      name: leadName,
      phone: canonicalPhone || null,
      email: email || null,
      column_id: firstColId,
      tags: ["auto-criado"],
      origin: "inbox",
    }).catch(() => null);

    if (!newLead) return null;
    if (onLeadCreated) onLeadCreated();
    return newLead.id;
  }, [clientId, onLeadCreated]);

  // Create new conversation
  const createConversation = useCallback(async (
    channel: string, leadId?: string, phone?: string, email?: string, leadName?: string
  ) => {
    if (!clientId) {
      toast.error("Erro ao criar conversa.");
      return null;
    }

    let resolvedLeadId = leadId || null;
    if (!resolvedLeadId && (phone || email)) {
      resolvedLeadId = await findOrCreateLead(phone, email, leadName);
    }

    let data: { id: string };
    try {
      data = await insertConversation({
        channel,
        lead_id: resolvedLeadId,
        status: "open",
        client_id: clientId,
        metadata: { phone, email, lead_name: leadName },
      });
    } catch {
      toast.error("Erro ao criar conversa.");
      return null;
    }

    await loadConversations();
    if (resolvedLeadId) selectLead(resolvedLeadId);
    return data.id;
  }, [loadConversations, findOrCreateLead, selectLead, clientId]);

  // Initial load
  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Realtime subscription
  useEffect(() => {
    if (!clientId || !selectedLeadId) return;

    const channel = supabase
      .channel(`inbox-realtime:${clientId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (payload) => {
        const newMsg = payload.new as any;

        // Erro no lookup era ignorado no original (conv undefined) — preservado
        const conv = await getConversationRef(newMsg.conversation_id, clientId).catch(() => null);

        if (conv?.lead_id === selectedLeadId) {
          const meta = (newMsg.metadata || {}) as Record<string, any>;
          let resolvedContent = newMsg.content;
          const isMedia = ["image", "audio", "video", "file", "sticker"].includes(newMsg.type);

          // Resolve media URLs similar to loadMessages
          if (isMedia) {
            const isEncrypted = resolvedContent?.includes(".enc");
            const isWhatsAppDomain = resolvedContent?.includes("mmg.whatsapp.net") || resolvedContent?.includes("media.whatsapp.net");
            const isPlaceholder = resolvedContent?.startsWith("[") || !resolvedContent || resolvedContent === "";

            if ((isEncrypted || isPlaceholder || isWhatsAppDomain) && meta?.media_url && !meta.media_url.includes(".enc") && !meta.media_url.startsWith("[")) {
              resolvedContent = meta.media_url;
            }
          }

          const incomingMsg: Message = {
            ...newMsg,
            content: resolvedContent,
            channel: conv.channel,
            metadata: meta,
            is_private: meta?.is_private || false,
            content_type: meta?.content_type || "text",
          };

          setMessages(prev => {
            // Dedup robusto: também detecta caso prev já tenha qualquer msg
            // com mesmo meta_message_id (wamid) — proteção extra se um INSERT
            // for entregue 2x pelo realtime ou se loadMessages rodar em paralelo.
            const incomingWamid = (incomingMsg.metadata as any)?.meta_message_id;
            if (prev.some(m => m.id === incomingMsg.id)) {
              console.debug("[useInbox] realtime dedup by id", incomingMsg.id);
              return prev;
            }
            if (incomingWamid && prev.some(m => (m.metadata as any)?.meta_message_id === incomingWamid)) {
              console.debug("[useInbox] realtime dedup by wamid", incomingWamid);
              return prev;
            }

            // Outbound: substitui otimista correspondente. Match por content+pending
            // SEM exigir conversation_id igual — o proxy pode persistir a msg numa
            // conv diferente (ex.: whatsapp_official na UI vira whatsapp_cloud no DB)
            // e ambas pertencem ao mesmo lead, então a UI exibe as duas.
            if (incomingMsg.direction === "outbound") {
              const idx = prev.findIndex(m =>
                typeof m.id === "string" &&
                m.id.startsWith("optimistic-") &&
                m.content === incomingMsg.content &&
                m.direction === "outbound" &&
                (m.metadata as any)?.pending
              );
              if (idx >= 0) {
                console.debug("[useInbox] substituting optimistic", { from: prev[idx].id, to: incomingMsg.id });
                const next = [...prev];
                next[idx] = incomingMsg;
                return sortByCreatedAt(next);
              }
              console.debug("[useInbox] no optimistic match — appending", { content: incomingMsg.content, prevPending: prev.filter(m => (m.metadata as any)?.pending).map(m => ({ id: m.id, content: m.content })) });
            }

            return sortByCreatedAt([...prev, incomingMsg]);
          });
        }

        if (newMsg.direction === "inbound" && conv) {
          // Detect CSAT reply: single digit 1-5 on a conversation that had CSAT sent
          const trimmed = (newMsg.content ?? "").trim();
          const possibleRating = Number(trimmed);
          if (
            Number.isInteger(possibleRating) &&
            possibleRating >= 1 &&
            possibleRating <= 5 &&
            trimmed.length === 1
          ) {
            const csatConv = await getConversationCsatInfo(newMsg.conversation_id).catch(() => null);

            if (csatConv?.csat_sent_at && clientId) {
              // Erro no insert era ignorado no original — preservado
              await insertCsatResponse({
                client_id: clientId,
                conversation_id: newMsg.conversation_id,
                lead_id: csatConv.lead_id ?? null,
                rating: possibleRating,
              }).catch(() => {});
            }
          }

          // Auto-assign lead if conversation has none
          if (!conv.lead_id) {
            const phone = (newMsg.metadata as any)?.phone;
            const senderName = (newMsg.metadata as any)?.sender_name || newMsg.sender_name;
            const leadId = await findOrCreateLead(phone, undefined, senderName || phone);
            if (leadId) {
              // Erro no update era ignorado no original — preservado
              await assignLeadToConversation(newMsg.conversation_id, leadId).catch(() => {});
            }
          }
        }

        loadConversations();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, async (payload) => {
        const updatedConv = payload.new as any;
        // Only process updates from this client
        if (updatedConv.client_id === clientId) {
          loadConversations();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedLeadId, loadConversations, findOrCreateLead, clientId]);

  // Delete lead and its data
  const deleteLead = useCallback(async (leadId: string) => {
    try {
      await deleteLeadById(leadId);

      setSelectedLeadId(null);
      await loadConversations();
      toast.success("Lead excluído com sucesso.");
    } catch (err: any) {
      toast.error(`Erro ao excluir lead: ${err.message}`);
    }
  }, [loadConversations]);

  // Transcribe an audio message via AI
  const transcribeAudio = useCallback(async (messageId: string) => {
    try {
      // Erro no fetch era ignorado no original (msg undefined) — preservado
      const msg = await getMessageContentMeta(messageId).catch(() => null);

      if (!msg?.content) throw new Error("Áudio não encontrado");

      const { data, error } = await invokeEdge("ai-chat?action=transcribe", {
        body: { message_id: messageId, audio_url: msg.content },
      });

      if (error) {
        const detail = await extractEdgeError(error, "Falha na transcrição");
        throw new Error(detail);
      }

      const transcript = (data as { transcript?: string } | null)?.transcript;
      if (!transcript) throw new Error("Transcrição vazia");

      const newMeta = { ...((msg.metadata as Record<string, unknown> | null) || {}), transcript };
      // Erro no update era ignorado no original — preservado
      await updateMessageMetadata(messageId, newMeta).catch(() => {});

      setMessages(prev =>
        prev.map(m => m.id === messageId ? { ...m, metadata: newMeta } : m)
      );
      toast.success("Áudio transcrito!");
    } catch (err: any) {
      toast.error(`Erro ao transcrever: ${err.message}`);
    }
  }, []);

  // Merge source lead into target lead
  const mergeLeads = useCallback(async (sourceLeadId: string, targetLeadId: string) => {
    try {
      // 1. Move conversations
      await reassignConversationsToLead(sourceLeadId, targetLeadId);

      // 2. Move tasks (erro ignorado como no original)
      await reassignTasksToLead(sourceLeadId, targetLeadId).catch(() => {});

      // 3. Move notes (erro ignorado como no original; tabela fora dos tipos gerados)
      await reassignNotesToLead(sourceLeadId, targetLeadId).catch(() => {});

      // 4. Delete source lead
      await deleteLeadById(sourceLeadId);

      setSelectedLeadId(targetLeadId);
      await loadConversations();
      await loadMessages(targetLeadId);
      toast.success("Leads mesclados com sucesso.");
    } catch (err: any) {
      toast.error(`Erro ao mesclar leads: ${err.message}`);
    }
  }, [loadConversations, loadMessages]);

  return {
    conversations, messages, selectedLeadId, loading,
    selectLead, sendMessage, createConversation,
    updateStatus, updatePriority, assignToAgent, updateLabels,
    snoozeConversation,
    transcribeAudio, sendWhatsAppMedia, deleteLead, mergeLeads,
    refresh: loadConversations,
  };
}
