import type { Node, Edge } from 'reactflow';

export interface Client {
  id: string;
  name: string;
}

export interface User {
  id: string;
  client_id: string;
  name: string;
  email: string;
  role: "supervisor" | "atendente" | "vendedor" | "master";
  avatar?: string;
}

export interface Pipeline {
  id: string;
  client_id: string;
  name: string;
  columns: PipelineColumn[];
}

export interface PipelineColumn {
  id: string;
  pipeline_id: string;
  name: string;
  order: number;
  color?: string;
  /** 2.7: o que significa um lead estar nesta etapa. Máx 300 caracteres. */
  description?: string | null;
}

export interface Lead {
  id: string;
  client_id: string;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  position?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  address?: string;
  zip_code?: string;
  notes?: string;
  notes_local?: string;
  custom_fields?: Record<string, any>;
  origin?: string;
  tags: string[];
  column_id: string;
  responsible_id?: string;
  value?: number;
  segmento?: string;
  faturamento_mensal?: number;
  category?: "lead" | "partner" | "collaborator";
  // UTM & ads attribution
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ad_campaign_id?: string;
  ad_adset_id?: string;
  ad_id?: string;
  fbclid?: string;
  gclid?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  client_id: string;
  lead_id?: string;
  title: string;
  description?: string;
  status: "pending" | "completed" | "overdue";
  priority?: "low" | "medium" | "high" | "urgent";
  due_date?: string;
  /** Nome livre (texto) — legado, mantido pra exibição. */
  assigned_to?: string;
  /** Fase 7: dono real da tarefa. assigned_to (nome) segue existindo pra tarefas antigas sem dono. */
  assigned_to_id?: string;
  created_at: string;
  /** 2.6: desfecho registrado na conclusão. */
  result?: string;
  completed_at?: string;
}

export interface Automation {
  id: string;
  client_id: string;
  pipeline_id?: string;
  column_id?: string;
  name: string;
  description?: string;
  active: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  exceptions: AutomationException[];
}

export interface ComplexAutomation {
  id: string;
  client_id: string;
  name: string;
  status: string;
  trigger_type?: string;
  nodes: Node[];
  edges: Edge[];
  created_at: string;
  updated_at: string;
}

export type AutomationTrigger = {
  type: "card_entered" | "time_in_column" | "stage_changed";
  config?: Record<string, unknown>;
};

export type AutomationAction = {
  id?: string;
  type: "add_tag" | "remove_tag" | "move_column" | "create_task" | "send_message" | "send_template" | "add_ai_agent";
  config?: Record<string, unknown>;
  comingSoon?: boolean;
};

export type AutomationException = {
  id?: string;
  type: "has_tag" | "no_tag";
  config?: Record<string, unknown>;
};

export interface Tag {
  id: string;
  client_id: string;
  name: string;
  color: string;
}

export type CustomFieldType =
  | 'text' | 'textarea' | 'number' | 'select' | 'multi_select'
  | 'date' | 'datetime' | 'checkbox' | 'link' | 'radio';

export interface CustomFieldDefinition {
  id: string;
  client_id: string;
  tenant_id?: string | null;
  name: string;
  slug: string;
  field_type: CustomFieldType;
  options: Array<{ label: string; value: string }>;
  is_required: boolean;
  visible_pipelines: string[];
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type StandardFieldKey = "state" | "city" | "neighborhood" | "address" | "zip_code" | "segmento" | "origin";

export interface StandardFieldConfig {
  key: StandardFieldKey;
  label: string;
  enabled: boolean;
  order: number;
}

export interface ClientFieldSettings {
  id: string;
  client_id: string;
  field_config: StandardFieldConfig[];
  updated_at: string;
}

export type GoalMetric =
  | "leads_created"
  | "tasks_completed"
  | "contacts_made"
  | "leads_closed"
  | "calls_made"
  | "call_attempts"
  | "meetings_done";

export type GoalPeriod = "daily" | "weekly" | "monthly" | "quarterly";

export type GoalTrend = "on_track" | "at_risk" | "behind" | "achieved";

export interface Goal {
  id: string;
  client_id: string;
  title: string;
  metric: GoalMetric;
  target_value: number;
  period: GoalPeriod;
  /** @deprecated Substituído por goal_assignments — mantido só pelo backfill histórico. */
  assigned_to?: string;
  column_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** JOIN com goal_assignments — nem todo fetch inclui. */
  assignments?: GoalAssignment[];
}

export interface GoalAssignment {
  id: string;
  goal_id: string;
  /** null = meta da equipe toda. */
  user_id?: string;
  user?: { id: string; name: string; avatar_url?: string | null };
}

export interface GoalProgress {
  goal: Goal;
  /** Ausente quando a linha é o total da equipe (mesmo sentido de assignment.user_id null). */
  user_id?: string;
  current_value: number;
  percentage: number;
  trend: GoalTrend;
  pace_message: string;
  period_start: string;
  period_end: string;
  /** Últimos pontos de progresso pro sparkline. */
  sparkline: number[];
}

export interface LeaderboardEntry {
  user: { id: string; name: string; avatar_url?: string | null };
  overall_percentage: number;
  goals_count: number;
  rank: number;
  isCurrentUser: boolean;
}

export type ContactRole = "decisor" | "atendente";

export interface LeadContact {
  id: string;
  lead_id: string;
  client_id: string;
  name: string;
  role: ContactRole;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type PhoneCategory = "celular" | "fixo" | "whatsapp" | "comercial" | "outro";

export interface LeadPhone {
  id: string;
  lead_id: string;
  client_id: string;
  number: string;
  category: PhoneCategory;
  label?: string | null;
  created_at: string;
}

export interface TagMeta {
  id: string;
  tenant_id: string;
  name: string;
  color: string;
  category: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  lead_id: string;
  type: "message" | "stage_change" | "note" | "task" | "automation" | "call" | "call_attempt" | "meeting" | "field_changed";
  content: string;
  created_at: string;
  user_name?: string;
  /** Fase 7: autor real do evento — alimenta calls_made/meetings_done e leaderboard por pessoa. */
  user_id?: string;
}

export interface InboxThread {
  id: string;
  client_id: string;
  lead_id: string;
  lead_name: string;
  lead_avatar?: string;
  channel: "whatsapp" | "instagram" | "email" | "webchat";
  last_message: string;
  last_message_at: string;
  unread_count: number;
  status: "open" | "archived";
}

export interface InboxMessage {
  id: string;
  thread_id: string;
  content: string;
  type: "text" | "audio" | "image" | "file";
  direction: "inbound" | "outbound";
  created_at: string;
  sender_name?: string;
}

export interface ApiKey {
  id: string;
  client_id: string;
  name: string;
  token_preview: string;
  last_used_at?: string;
  created_at: string;
  active: boolean;
}

export interface WebhookEndpoint {
  id: string;
  client_id: string;
  url: string;
  description?: string;
  events: string[];
  secret: string;
  active: boolean;
  created_at: string;
}
