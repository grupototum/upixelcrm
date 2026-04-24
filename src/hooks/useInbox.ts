import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";

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

export function useInbox(onLeadCreated?: () => void) {
  const [conversations, setConversations] = useState<LeadConversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { tenant } = useTenant();
  const { user } = useAuth();
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  // user.client_id is the correct tenant scope for conversations
  const clientId = user?.client_id ?? tenant?.id;

  // Load conversations grouped by lead
  const loadConversations = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const { data: convs, error: convError } = await supabase
      .from("conversations")
      .select("*")
      .eq("client_id", clientId)
      .order("last_message_at", { ascending: false });

    if (convError) {
      logger.error("Error loading conversations:", convError);
      return;
    }

    // Fetch leads
    const leadIds = (convs || []).filter(c => c.lead_id).map(c => c.lead_id);
    let leadsMap: Record<string, any> = {};

    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, name, phone, email, company, origin, category")
        .in("id", leadIds);
      if (leads) {
        leadsMap = Object.fromEntries(leads.map(l => [l.id, l]));
      }
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

    let convQuery = supabase
      .from("conversations")
      .select("id, channel")
      .eq("client_id", clientId);

    if (leadId === "unassigned") {
      convQuery = convQuery.is("lead_id", null) as typeof convQuery;
    } else {
      convQuery = convQuery.eq("lead_id", leadId) as typeof convQuery;
    }

    const { data: convs } = await convQuery;

    if (!convs || convs.length === 0) {
      setMessages([]);
      return;
    }

    const convIds = convs.map(c => c.id);
    const channelMap = Object.fromEntries(convs.map(c => [c.id, c.channel]));

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("Error loading messages:", error);
      return;
    }

    setMessages((data || []).map(m => {
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

    // Mark all as read
    await supabase.from("conversations").update({ unread_count: 0 }).in("id", convIds);
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
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('whatsapp_media')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('whatsapp_media')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Send message via WhatsApp
  const sendWhatsAppMessage = useCallback(async (leadId: string, text: string, targetConversationId?: string) => {
    const leadGroup = conversations.find(c => c.lead_id === leadId);
    if (!leadGroup) return;

    const target = targetConversationId
      ? leadGroup.source_conversations.find(sc => sc.id === targetConversationId)
      : leadGroup.source_conversations.find(sc => sc.channel === "whatsapp" || sc.channel === "whatsapp_official" || sc.channel === "instagram");

    if (!target) {
      toast.error("Nenhuma conexão de mensageria encontrada para este lead.");
      return;
    }

    const phone = target.metadata?.phone || leadGroup.lead_phone;
    if (!phone) {
      toast.error("Sem número de telefone para enviar a mensagem.");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const isOfficial = target.channel === "whatsapp_official";
      const isInstagram = target.channel === "instagram";
      const functionName = isInstagram ? "instagram-proxy" : "whatsapp-proxy";
      const queryString = isInstagram ? "?action=send-message" : `?action=send-message${isOfficial ? "&type=official" : ""}`;
      
      const { error } = await supabase.functions.invoke(`${functionName}${queryString}`, {
        body: { phone, message: text },
      });

      if (error) {
        throw new Error(error.message || "Failed to send message");
      }

      await loadMessages(leadId);
      await loadConversations();
    } catch (err: any) {
      toast.error(`Erro ao enviar: ${err.message}`);
    }
  }, [conversations, projectId, loadMessages, loadConversations]);

  // Send message with media via WhatsApp
  const sendWhatsAppMedia = useCallback(async (leadId: string, file: File, targetConversationId?: string) => {
    const leadGroup = conversations.find(c => c.lead_id === leadId);
    if (!leadGroup) return;

    const target = targetConversationId
      ? leadGroup.source_conversations.find(sc => sc.id === targetConversationId)
      : leadGroup.source_conversations.find(sc => sc.channel === "whatsapp" || sc.channel === "whatsapp_official" || sc.channel === "instagram");

    if (!target) {
      toast.error("Nenhuma conexão de mensageria encontrada.");
      return;
    }

    const phone = target.metadata?.phone || leadGroup.lead_phone;
    if (!phone) {
      toast.error("Número não encontrado.");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // 1. Upload
      const url = await uploadFile(file);

      // 2. Send via proxy
      const isOfficial = target.channel === "whatsapp_official";
      const isInstagram = target.channel === "instagram";
      const functionName = isInstagram ? "instagram-proxy" : "whatsapp-proxy";
      const queryString = isInstagram ? "?action=send-media" : `?action=send-media${isOfficial ? "&type=official" : ""}`;
      
      const { error } = await supabase.functions.invoke(`${functionName}${queryString}`, {
        body: { 
          phone, 
          mediaUrl: url, 
          mediaType: file.type.startsWith('image') ? 'image' 
                   : file.type.startsWith('video') ? 'video' 
                   : file.type.startsWith('audio') ? 'audio' 
                   : 'document',
          mimetype: file.type,
          fileName: file.name
        },
      });

      if (error) throw new Error(error.message || "Failed to send media via proxy");

      await loadMessages(leadId);
      await loadConversations();
      toast.success("Mídia enviada!");
    } catch (err: any) {
      toast.error(`Erro ao enviar mídia: ${err.message}`);
    }
  }, [conversations, projectId, loadMessages, loadConversations]);

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

      const { error } = await supabase.functions.invoke('google-oauth?action=gmail-send', {
        body: { to: email, subject: "Re: Conversa uPixel", body: text },
      });

      if (error) {
        throw new Error(error.message || "Failed to send email");
      }

      await supabase.from("messages").insert({
        conversation_id: target.id,
        content: text,
        type: "email",
        direction: "outbound",
        sender_name: "Você",
      });

      await supabase.from("conversations").update({
        last_message: text,
        last_message_at: new Date().toISOString(),
      }).eq("id", target.id);

      await loadMessages(leadId);
      await loadConversations();
      toast.success("E-mail enviado!");
    } catch (err: any) {
      toast.error(`Erro ao enviar e-mail: ${err.message}`);
    }
  }, [conversations, projectId, loadMessages, loadConversations]);

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
      await supabase.from("messages").insert({
        conversation_id: target.id,
        content: text,
        type: "text",
        direction: "outbound",
        sender_name: "Você (Nota Privada)",
        metadata: { is_private: true },
      });
      await loadMessages(selectedLeadId);
      return;
    }

    if (target.channel === "whatsapp" || target.channel === "whatsapp_official" || target.channel === "instagram") {
      await sendWhatsAppMessage(selectedLeadId, text, target.id);
    } else if (target.channel === "email") {
      await sendEmail(selectedLeadId, text, target.id);
    } else {
      await supabase.from("messages").insert({
        conversation_id: target.id,
        content: text,
        type: "text",
        direction: "outbound",
        sender_name: "Você",
      });
      await supabase.from("conversations").update({
        last_message: text,
        last_message_at: new Date().toISOString(),
      }).eq("id", target.id);
      await loadMessages(selectedLeadId);
      await loadConversations();
    }
  }, [selectedLeadId, conversations, sendWhatsAppMessage, sendEmail, loadMessages, loadConversations]);

  // Update conversation status
  const updateStatus = useCallback(async (leadId: string, status: string) => {
    const leadGroup = conversations.find(c => c.lead_id === leadId);
    if (!leadGroup) return;

    // Optimistic update
    setConversations(prev => prev.map(c => c.lead_id === leadId ? { ...c, status } : c));

    const convIds = leadGroup.source_conversations.map(sc => sc.id);
    const { error } = await supabase
      .from("conversations")
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .in("id", convIds);

    if (error) {
      toast.error("Erro ao atualizar status");
      loadConversations(); // Revert
      return;
    }

    toast.success(`Conversa marcada como ${status === 'resolved' ? 'Resolvida' : status === 'snoozed' ? 'Soneca' : 'Aberta'}`);
  }, [conversations, loadConversations]);

  // Update conversation priority (stored in metadata)
  const updatePriority = useCallback(async (leadId: string, priority: string) => {
    const leadGroup = conversations.find(c => c.lead_id === leadId);
    if (!leadGroup) return;

    for (const sc of leadGroup.source_conversations) {
      const newMeta = { ...sc.metadata, priority };
      await supabase.from("conversations").update({ metadata: newMeta }).eq("id", sc.id);
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
      await supabase.from("conversations").update({ metadata: newMeta }).eq("id", sc.id);
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
      await supabase
        .from("conversations")
        .update({ 
          metadata: newMeta,
          updated_at: new Date().toISOString() 
        })
        .eq("id", sc.id);
    }
    
    await loadConversations();
    toast.success("Etiquetas atualizadas");
  }, [conversations, loadConversations]);

  // Find or create lead
  const findOrCreateLead = useCallback(async (
    phone?: string, email?: string, name?: string
  ): Promise<string | null> => {
    if (phone) {
      const normalized = phone.replace(/\D/g, "");
      const phoneSuffix = normalized.length >= 8 ? normalized.slice(-8) : normalized;
      const { data: duplicates } = await supabase
        .from("leads").select("id")
        .eq("client_id", clientId)
        .or(`phone.ilike.%${phoneSuffix}%`)
        .order("created_at", { ascending: true });
      if (duplicates && duplicates.length > 0) return duplicates[0].id;
    }

    if (email) {
      const { data: byEmail } = await supabase
        .from("leads").select("id")
        .eq("client_id", clientId)
        .ilike("email", email).limit(1);
      if (byEmail && byEmail.length > 0) return byEmail[0].id;
    }

    const { data: firstCol } = await supabase
      .from("pipeline_columns").select("id")
      .eq("client_id", clientId)
      .order("order", { ascending: true }).limit(1).maybeSingle();

    if (!firstCol) return null;

    const leadName = name || phone || email || "Lead Automático";
    const { data: newLead, error } = await supabase
      .from("leads").insert({
        client_id: clientId,
        name: leadName,
        phone: phone || null,
        email: email || null,
        column_id: firstCol.id,
        tags: ["auto-criado"],
        origin: "inbox",
      }).select("id").single();

    if (error) return null;
    if (onLeadCreated) onLeadCreated();
    return newLead?.id ?? null;
  }, [clientId, onLeadCreated]);

  // Create new conversation
  const createConversation = useCallback(async (
    channel: string, leadId?: string, phone?: string, email?: string, leadName?: string
  ) => {
    let resolvedLeadId = leadId || null;
    if (!resolvedLeadId && (phone || email)) {
      resolvedLeadId = await findOrCreateLead(phone, email, leadName);
    }

    const { data, error } = await supabase.from("conversations").insert({
      channel,
      lead_id: resolvedLeadId,
      status: "open",
      client_id: clientId,
      metadata: { phone, email, lead_name: leadName },
    }).select("id").single();

    if (error) {
      toast.error("Erro ao criar conversa.");
      return null;
    }

    await loadConversations();
    if (resolvedLeadId) selectLead(resolvedLeadId);
    return data?.id;
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

        const { data: conv } = await supabase.from("conversations")
          .select("lead_id, channel")
          .eq("id", newMsg.conversation_id)
          .eq("client_id", clientId)
          .maybeSingle();

        if (conv?.lead_id === selectedLeadId) {
          setMessages(prev => [...prev, {
            ...newMsg,
            channel: conv.channel,
            metadata: (newMsg.metadata || {}) as Record<string, any>,
            is_private: (newMsg.metadata as any)?.is_private || false,
            content_type: (newMsg.metadata as any)?.content_type || "text",
          }]);
        }

        if (newMsg.direction === "inbound" && conv && !conv.lead_id) {
          const phone = (newMsg.metadata as any)?.phone;
          const senderName = (newMsg.metadata as any)?.sender_name || newMsg.sender_name;
          const leadId = await findOrCreateLead(phone, undefined, senderName || phone);
          if (leadId) {
            await supabase.from("conversations").update({ lead_id: leadId }).eq("id", newMsg.conversation_id);
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
      const { error } = await supabase.from("leads").delete().eq("id", leadId);
      if (error) throw error;
      
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
      const { data: msg } = await supabase
        .from("messages")
        .select("content, metadata")
        .eq("id", messageId)
        .single();

      if (!msg?.content) throw new Error("Áudio não encontrado");

      const { data, error } = await supabase.functions.invoke("ai-chat?action=transcribe", {
        body: { message_id: messageId, audio_url: msg.content },
      });

      if (error) throw new Error(error.message);

      const transcript = data?.transcript;
      if (!transcript) throw new Error("Transcrição vazia");

      const newMeta = { ...(msg.metadata || {}), transcript };
      await supabase.from("messages").update({ metadata: newMeta }).eq("id", messageId);

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
      const { error: convError } = await supabase
        .from("conversations")
        .update({ lead_id: targetLeadId })
        .eq("lead_id", sourceLeadId);
      if (convError) throw convError;

      // 2. Move tasks
      await supabase.from("tasks").update({ lead_id: targetLeadId }).eq("lead_id", sourceLeadId);
      
      // 3. Move notes
      await supabase.from("notes").update({ lead_id: targetLeadId }).eq("lead_id", sourceLeadId);

      // 4. Delete source lead
      const { error: deleteError } = await supabase.from("leads").delete().eq("id", sourceLeadId);
      if (deleteError) throw deleteError;

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
    transcribeAudio, sendWhatsAppMedia, deleteLead, mergeLeads,
    refresh: loadConversations,
  };
}
