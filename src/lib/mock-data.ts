import type { InboxThread, InboxMessage } from "@/types";

export const mockThreads: InboxThread[] = [
  { id: "th1", client_id: "c1", lead_id: "l1", lead_name: "Maria Silva", channel: "whatsapp", last_message: "Olá, gostaria de saber mais sobre o plano enterprise", last_message_at: "2024-03-20T10:30:00Z", unread_count: 2, status: "open" },
  { id: "th2", client_id: "c1", lead_id: "l3", lead_name: "Ana Oliveira", channel: "instagram", last_message: "Vi o anúncio de vocês e me interessei", last_message_at: "2024-03-20T09:15:00Z", unread_count: 0, status: "open" },
  { id: "th3", client_id: "c1", lead_id: "l5", lead_name: "Fernanda Lima", channel: "whatsapp", last_message: "Pode me enviar a proposta atualizada?", last_message_at: "2024-03-19T18:00:00Z", unread_count: 1, status: "open" },
  { id: "th4", client_id: "c1", lead_id: "l10", lead_name: "Ricardo Montenegro", channel: "whatsapp", last_message: "Qual o prazo para a primeira entrega?", last_message_at: "2024-03-30T10:15:00Z", unread_count: 3, status: "open" },
  { id: "th5", client_id: "c1", lead_id: "l14", lead_name: "Eduardo Rocha", channel: "email", last_message: "Agradeço o retorno. Vamos marcar a call.", last_message_at: "2024-03-30T09:10:00Z", unread_count: 0, status: "open" },
];

export const mockMessages: InboxMessage[] = [
  { id: "m1", thread_id: "th1", content: "Olá! Vi o anúncio de vocês no Instagram.", type: "text", direction: "inbound", created_at: "2024-03-20T10:00:00Z", sender_name: "Maria Silva" },
  { id: "m2", thread_id: "th1", content: "Oi Maria! Tudo bem? Ficamos felizes pelo interesse! Como posso ajudar?", type: "text", direction: "outbound", created_at: "2024-03-20T10:05:00Z", sender_name: "Atendente" },
  { id: "m3", thread_id: "th4", content: "Qual o prazo para a primeira entrega?", type: "text", direction: "inbound", created_at: "2024-03-30T10:00:00Z", sender_name: "Ricardo Montenegro" },
  { id: "m4", thread_id: "th4", content: "Vou verificar com a equipe técnica e te retorno em 15 minutos.", type: "text", direction: "outbound", created_at: "2024-03-30T10:10:00Z", sender_name: "Atendente" },
];
