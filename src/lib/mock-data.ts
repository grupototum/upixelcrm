import type { Lead, Pipeline, PipelineColumn, Task, InboxThread, InboxMessage, TimelineEvent, Automation } from "@/types";

export const mockPipeline: Pipeline = {
  id: "p1",
  client_id: "c1",
  name: "Vendas Principal",
  columns: [],
};

export const mockColumns: PipelineColumn[] = [
  { id: "col1", pipeline_id: "p1", name: "Novos Leads", order: 0, color: "#3b82f6" },
  { id: "col2", pipeline_id: "p1", name: "Qualificação", order: 1, color: "#f59e0b" },
  { id: "col3", pipeline_id: "p1", name: "Proposta", order: 2, color: "#8b5cf6" },
  { id: "col4", pipeline_id: "p1", name: "Negociação", order: 3, color: "#ec4899" },
  { id: "col5", pipeline_id: "p1", name: "Fechamento", order: 4, color: "#22c55e" },
];

export const mockLeads: Lead[] = [
  { id: "l1", client_id: "c1", name: "Maria Silva", phone: "+55 11 99999-0001", email: "maria@empresa.com", company: "Tech Solutions", position: "CEO", city: "São Paulo", tags: ["hot", "enterprise"], column_id: "col1", value: 15000, origin: "Meta Ads", created_at: "2024-01-10T10:00:00Z", updated_at: "2024-03-20T10:00:00Z" },
  { id: "l2", client_id: "c1", name: "João Santos", phone: "+55 11 99999-0002", email: "joao@startup.io", company: "Startup.io", tags: ["warm"], column_id: "col1", value: 8000, origin: "Google Ads", created_at: "2024-01-22T14:00:00Z", updated_at: "2024-03-19T14:00:00Z" },
  { id: "l3", client_id: "c1", name: "Ana Oliveira", phone: "+55 21 99999-0003", email: "ana@corp.com", company: "CorpBrasil", position: "CMO", tags: ["enterprise"], column_id: "col2", value: 25000, origin: "Indicação", created_at: "2024-02-05T09:00:00Z", updated_at: "2024-03-18T09:00:00Z" },
  { id: "l4", client_id: "c1", name: "Carlos Mendes", email: "carlos@digital.com", company: "Digital First", tags: ["hot"], column_id: "col2", value: 12000, origin: "Website", created_at: "2024-02-18T16:00:00Z", updated_at: "2024-03-17T16:00:00Z" },
  { id: "l5", client_id: "c1", name: "Fernanda Lima", phone: "+55 31 99999-0005", company: "AgênciaMax", tags: ["warm", "agency"], column_id: "col3", value: 30000, origin: "Meta Ads", created_at: "2024-02-28T11:00:00Z", updated_at: "2024-03-16T11:00:00Z" },
  { id: "l6", client_id: "c1", name: "Roberto Alves", email: "roberto@industria.com", company: "Indústria SA", position: "Diretor", tags: ["enterprise"], column_id: "col3", value: 45000, origin: "Evento", created_at: "2024-03-05T08:00:00Z", updated_at: "2024-03-15T08:00:00Z" },
  { id: "l7", client_id: "c1", name: "Patricia Costa", phone: "+55 41 99999-0007", company: "EduTech", tags: ["hot"], column_id: "col4", value: 18000, origin: "Google Ads", created_at: "2024-03-10T13:00:00Z", updated_at: "2024-03-14T13:00:00Z" },
  { id: "l8", client_id: "c1", name: "Lucas Ferreira", email: "lucas@saas.com", company: "SaaSPro", tags: ["warm"], column_id: "col5", value: 22000, origin: "Outbound", created_at: "2024-03-20T15:00:00Z", updated_at: "2024-03-20T15:00:00Z" },
  { id: "l9", client_id: "c1", name: "Juliana Alencar", phone: "+55 11 98888-1111", email: "juliana@fashion.br", company: "Alencar Fashion", tags: ["cold"], column_id: "col1", value: 5000, origin: "Instagram", created_at: "2024-03-21T10:00:00Z", updated_at: "2024-03-21T10:00:00Z" },
  { id: "l10", client_id: "c1", name: "Ricardo Montenegro", phone: "+55 11 97777-2222", email: "ricardo@logistica.com", company: "Montenegro Log", position: "Gerente", tags: ["hot", "enterprise"], column_id: "col2", value: 35000, origin: "Google Ads", created_at: "2024-03-22T14:00:00Z", updated_at: "2024-03-22T14:00:00Z" },
  { id: "l11", client_id: "c1", name: "Camila Oliveira", phone: "+55 21 96666-3333", email: "camila@decor.io", company: "Oliveira Decor", tags: ["warm"], column_id: "col3", value: 12000, origin: "Indicação", created_at: "2024-03-23T09:00:00Z", updated_at: "2024-03-23T09:00:00Z" },
  { id: "l12", client_id: "c1", name: "Marcos Vinícius", phone: "+55 31 95555-4444", company: "Marcos Construções", tags: ["hot"], column_id: "col4", value: 55000, origin: "Website", created_at: "2024-03-24T16:00:00Z", updated_at: "2024-03-24T16:00:00Z" },
  { id: "l13", client_id: "c1", name: "Beatriz Lopes", phone: "+55 41 94444-5555", company: "Lopes Advocacia", tags: ["won"], column_id: "col5", value: 10000, origin: "Outbound", created_at: "2024-03-25T11:00:00Z", updated_at: "2024-03-25T11:00:00Z" },
  { id: "l14", client_id: "c1", name: "Eduardo Rocha", phone: "+55 51 93333-6666", email: "eduardo@invest.com", company: "Rocha Investimentos", position: "Diretor", tags: ["enterprise"], column_id: "col5", value: 60000, origin: "Evento", created_at: "2024-03-26T08:00:00Z", updated_at: "2024-03-26T08:00:00Z" },
];

export const mockTasks: Task[] = [
  { id: "t1", client_id: "c1", lead_id: "l1", title: "Ligar para Maria Silva", status: "pending", priority: "high", due_date: "2024-03-22", assigned_to: "Você", created_at: "2024-03-20T10:00:00Z" },
  { id: "t2", client_id: "c1", lead_id: "l3", title: "Enviar proposta para Ana", status: "pending", priority: "urgent", due_date: "2024-03-21", assigned_to: "Você", created_at: "2024-03-19T14:00:00Z" },
  { id: "t3", client_id: "c1", lead_id: "l5", title: "Follow-up Fernanda", status: "overdue", priority: "high", due_date: "2024-03-18", assigned_to: "Você", created_at: "2024-03-16T11:00:00Z" },
  { id: "t4", client_id: "c1", lead_id: "l7", title: "Agendar reunião com Patricia", status: "completed", priority: "medium", due_date: "2024-03-20", assigned_to: "Você", created_at: "2024-03-14T13:00:00Z" },
  { id: "t5", client_id: "c1", title: "Revisar pipeline semanal", status: "pending", priority: "low", due_date: "2024-03-25", assigned_to: "Você", created_at: "2024-03-20T08:00:00Z" },
  { id: "t6", client_id: "c1", lead_id: "l10", title: "Reunião de apresentação", status: "pending", priority: "high", due_date: "2024-03-31", assigned_to: "Você", created_at: "2024-03-28T10:00:00Z" },
  { id: "t7", client_id: "c1", lead_id: "l14", title: "Revisão contratual", status: "pending", priority: "urgent", due_date: "2024-03-30", assigned_to: "Você", created_at: "2024-03-29T14:00:00Z" },
  { id: "t8", client_id: "c1", lead_id: "l9", title: "Email de follow-up", status: "pending", priority: "low", due_date: "2024-04-01", assigned_to: "Você", created_at: "2024-03-29T11:00:00Z" },
];

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

export const mockTimeline: TimelineEvent[] = [
  { id: "ev1", lead_id: "l1", type: "stage_change", content: "Movido para Novos Leads", created_at: "2024-03-20T10:00:00Z", user_name: "Sistema" },
  { id: "ev2", lead_id: "l1", type: "message", content: "Primeira mensagem recebida via WhatsApp", created_at: "2024-03-20T10:00:00Z", user_name: "Maria Silva" },
  { id: "ev3", lead_id: "l10", type: "note", content: "Ricardo está com pressa. Priorizar proposta.", created_at: "2024-03-30T11:00:00Z", user_name: "Operador" },
  { id: "ev4", lead_id: "l14", type: "stage_change", content: "Entrou na fase de Fechamento", created_at: "2024-03-29T15:30:00Z", user_name: "Sistema" },
];

export const mockAutomations: Automation[] = [
  {
    id: "a1", client_id: "c1", column_id: "col1", name: "Boas-vindas automática", description: "Envia tag e cria tarefa ao entrar", active: true,
    trigger: { type: "card_entered" },
    actions: [{ type: "add_tag", config: { tag: "novo" } }, { type: "create_task", config: { title: "Fazer primeiro contato" } }],
    exceptions: [{ type: "has_tag", config: { tag: "retorno" } }],
  },
  {
    id: "a2", client_id: "c1", column_id: "col2", name: "Follow-up 48h", description: "Move lead se ficar 48h sem interação", active: true,
    trigger: { type: "time_in_column", config: { hours: 48 } },
    actions: [{ type: "move_column", config: { column: "col1" } }],
    exceptions: [],
  },
  {
    id: "a3", client_id: "c1", column_id: "col3", name: "Notificar proposta", description: "Cria tarefa ao entrar em Proposta", active: false,
    trigger: { type: "card_entered" },
    actions: [{ type: "create_task", config: { title: "Enviar proposta" } }, { type: "send_message", comingSoon: true }],
    exceptions: [],
  },
];
