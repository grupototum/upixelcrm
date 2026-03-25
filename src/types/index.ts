export interface Client {
  id: string;
  name: string;
}

export interface User {
  id: string;
  client_id: string;
  name: string;
  email: string;
  role: "admin" | "manager" | "operator";
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
  notes?: string;
  origin?: string;
  tags: string[];
  column_id: string;
  responsible_id?: string;
  value?: number;
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
  assigned_to?: string;
  created_at: string;
}

export interface Automation {
  id: string;
  client_id: string;
  column_id?: string;
  name: string;
  description?: string;
  active: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  exceptions: AutomationException[];
}

export type AutomationTrigger = {
  type: "card_entered" | "time_in_column" | "stage_changed";
  config?: Record<string, unknown>;
};

export type AutomationAction = {
  type: "add_tag" | "remove_tag" | "move_column" | "create_task" | "send_message" | "send_template" | "add_ai_agent";
  config?: Record<string, unknown>;
  comingSoon?: boolean;
};

export type AutomationException = {
  type: "has_tag" | "no_tag";
  config?: Record<string, unknown>;
};

export interface Tag {
  id: string;
  client_id: string;
  name: string;
  color: string;
}

export interface TimelineEvent {
  id: string;
  lead_id: string;
  type: "message" | "stage_change" | "note" | "task" | "automation" | "call";
  content: string;
  created_at: string;
  user_name?: string;
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
