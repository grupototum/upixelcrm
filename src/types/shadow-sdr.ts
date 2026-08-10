export type ShadowSdrTemperature = "frio" | "morno" | "quente";

export type ShadowSdrSource = "mock" | "alexandria";

export interface ShadowSdrLeadInput {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  category?: string | null;
  stageName?: string | null;
  value?: number | null;
  tags?: string[];
}

export interface ShadowSdrConversationInput {
  lead: ShadowSdrLeadInput;
  messages: ShadowSdrMessageInput[];
  channels: string[];
  lastMessageAt?: string | null;
}

export interface ShadowSdrMessageInput {
  id: string;
  content: string;
  direction: string;
  type?: string | null;
  createdAt: string;
  senderName?: string | null;
  isPrivate?: boolean;
}

export interface ShadowSdrQualification {
  situation: string[];
  problem: string[];
  implication: string[];
  needPayoff: string[];
}

export interface ShadowSdrBant {
  budget: string;
  authority: string;
  need: string;
  timeline: string;
  notes: string[];
}

export interface ShadowSdrAnalysis {
  id: string;
  source: ShadowSdrSource;
  generatedAt: string;
  summary: string;
  classification: {
    temperature: ShadowSdrTemperature;
    confidence: number;
    reason: string;
  };
  nextAction: string;
  suggestedReply: string;
  spin: ShadowSdrQualification;
  bant: ShadowSdrBant;
  missingInfo: string[];
  risks: string[];
}

export interface ShadowSdrAdapter {
  analyze(input: ShadowSdrConversationInput): Promise<ShadowSdrAnalysis>;
}
