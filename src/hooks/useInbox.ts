import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Conversation {
  id: string;
  client_id: string;
  lead_id: string | null;
  channel: string;
  status: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  metadata: Record<string, any>;
  created_at: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  lead_company?: string;
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
}

export function useInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;

  // Load conversations
  const loadConversations = useCallback(async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("Error loading conversations:", error);
      return;
    }

    // Enrich with lead data
    const leadIds = (data || []).filter(c => c.lead_id).map(c => c.lead_id);
    let leadsMap: Record<string, any> = {};

    if (leadIds.length > 0) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, name, phone, email, company")
        .in("id", leadIds);
      if (leads) {
        leadsMap = Object.fromEntries(leads.map(l => [l.id, l]));
      }
    }

    const enriched: Conversation[] = (data || []).map(c => ({
      ...c,
      metadata: (c.metadata || {}) as Record<string, any>,
      lead_name: c.lead_id && leadsMap[c.lead_id]?.name || (c.metadata as any)?.lead_name || (c.metadata as any)?.phone || "Desconhecido",
      lead_phone: c.lead_id && leadsMap[c.lead_id]?.phone || (c.metadata as any)?.phone,
      lead_email: c.lead_id && leadsMap[c.lead_id]?.email,
      lead_company: c.lead_id && leadsMap[c.lead_id]?.company,
    }));

    setConversations(enriched);
    setLoading(false);
  }, []);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    setMessages((data || []).map(m => ({
      ...m,
      metadata: (m.metadata || {}) as Record<string, any>,
    })));

    // Mark as read
    await supabase.from("conversations").update({ unread_count: 0 }).eq("id", conversationId);
    setConversations(prev =>
      prev.map(c => c.id === conversationId ? { ...c, unread_count: 0 } : c)
    );
  }, []);

  // Select conversation
  const selectConversation = useCallback((id: string) => {
    setSelectedConversationId(id);
    loadMessages(id);
  }, [loadMessages]);

  // Send message via WhatsApp
  const sendWhatsAppMessage = useCallback(async (conversationId: string, text: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    const phone = conv.lead_phone || conv.metadata?.phone;
    if (!phone) {
      toast.error("Sem número de telefone para enviar a mensagem.");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const url = `https://${projectId}.supabase.co/functions/v1/whatsapp-proxy?action=send-message`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ phone, message: text }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send message");
      }

      // Reload messages
      await loadMessages(conversationId);
      await loadConversations();
    } catch (err: any) {
      toast.error(`Erro ao enviar: ${err.message}`);
    }
  }, [conversations, projectId, loadMessages, loadConversations]);

  // Send email via Gmail
  const sendEmail = useCallback(async (conversationId: string, text: string) => {
    const conv = conversations.find(c => c.id === conversationId);
    if (!conv) return;

    const email = conv.lead_email || conv.metadata?.email;
    if (!email) {
      toast.error("Sem e-mail para enviar a mensagem.");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const url = `https://${projectId}.supabase.co/functions/v1/google-oauth?action=gmail-send`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ to: email, subject: "Re: Conversa uPixel", body: text }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to send email");
      }

      // Save to DB
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        content: text,
        type: "email",
        direction: "outbound",
        sender_name: "Você",
      });

      await supabase.from("conversations").update({
        last_message: text,
        last_message_at: new Date().toISOString(),
      }).eq("id", conversationId);

      await loadMessages(conversationId);
      await loadConversations();
      toast.success("E-mail enviado!");
    } catch (err: any) {
      toast.error(`Erro ao enviar e-mail: ${err.message}`);
    }
  }, [conversations, projectId, loadMessages, loadConversations]);

  // Send message (auto-detect channel)
  const sendMessage = useCallback(async (text: string) => {
    if (!selectedConversationId || !text.trim()) return;
    const conv = conversations.find(c => c.id === selectedConversationId);
    if (!conv) return;

    if (conv.channel === "whatsapp") {
      await sendWhatsAppMessage(selectedConversationId, text);
    } else if (conv.channel === "email") {
      await sendEmail(selectedConversationId, text);
    } else {
      // For other channels, just save locally
      await supabase.from("messages").insert({
        conversation_id: selectedConversationId,
        content: text,
        type: "text",
        direction: "outbound",
        sender_name: "Você",
      });
      await supabase.from("conversations").update({
        last_message: text,
        last_message_at: new Date().toISOString(),
      }).eq("id", selectedConversationId);
      await loadMessages(selectedConversationId);
      await loadConversations();
    }
  }, [selectedConversationId, conversations, sendWhatsAppMessage, sendEmail, loadMessages, loadConversations]);

  // Create new conversation
  const createConversation = useCallback(async (
    channel: string,
    leadId?: string,
    phone?: string,
    email?: string,
    leadName?: string
  ) => {
    const { data, error } = await supabase.from("conversations").insert({
      channel,
      lead_id: leadId || null,
      status: "open",
      metadata: { phone, email, lead_name: leadName },
    }).select("id").single();

    if (error) {
      toast.error("Erro ao criar conversa.");
      return null;
    }

    await loadConversations();
    return data?.id;
  }, [loadConversations]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("inbox-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMsg = payload.new as any;
        if (newMsg.conversation_id === selectedConversationId) {
          setMessages(prev => [...prev, {
            ...newMsg,
            metadata: (newMsg.metadata || {}) as Record<string, any>,
          }]);
        }
        loadConversations();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversations" }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversationId, loadConversations]);

  return {
    conversations,
    messages,
    selectedConversationId,
    loading,
    selectConversation,
    sendMessage,
    createConversation,
    refresh: loadConversations,
  };
}
