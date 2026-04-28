/**
 * Conversor entre o formato uPixel (ReactFlow nodes+edges) e o formato Kommo
 * Salesbot (scenario array com steps + next_step refs).
 *
 * Referência do formato Kommo:
 *   https://developers.kommo.com/reference/bots
 *
 * Cada step do Kommo tem:
 *   { id, type, params, next_step?, branches?, ... }
 *
 * Tipos suportados (mapeados):
 *   send_message  → message
 *   conditions    → condition
 *   pause         → delay
 *   tags          → action (add_tag)
 *   set_status    → action (change_status)
 *   webhook       → webhook
 *   handoff       → wait_for_reply (Kommo chama de "handoff" / "operator")
 *   send_media    → send_media (extensão uPixel)
 *
 * Tipos sem mapeamento direto viram node "action" com configType="custom" para
 * o usuário ajustar manualmente após o import.
 */

import type { Node, Edge } from "reactflow";

// ─── Kommo schema (subset suficiente para round-trip) ────────────────────────
export interface KommoStep {
  id: string;
  type: string;
  params?: Record<string, any>;
  next_step?: string | null;
  // Para condition/branch
  branches?: Array<{
    label?: string;
    conditions?: Array<{ field?: string; operator?: string; value?: any }>;
    next_step?: string | null;
  }>;
  position?: { x: number; y: number };
}

export interface KommoBot {
  id?: string;
  name: string;
  scenario: KommoStep[];
  // Metadata extra do uPixel para preservar fidelidade no round-trip
  _upixel?: {
    edges: Edge[];
    nodes_extra?: Record<string, any>;
  };
  schema_version?: string;
  exported_at?: string;
  source?: string;
}

// ─── Mapeamentos ────────────────────────────────────────────────────────────
const TYPE_MAP_TO_KOMMO: Record<string, string> = {
  trigger: "trigger",
  message: "send_message",
  condition: "conditions",
  delay: "pause",
  action: "tags", // refinado abaixo conforme configType
  webhook: "webhook",
  wait_for_reply: "handoff",
  send_media: "send_media",
  randomizer: "split",
  ai_assistant: "ai_text",
};

const TYPE_MAP_FROM_KOMMO: Record<string, string> = {
  trigger: "trigger",
  send_message: "message",
  conditions: "condition",
  pause: "delay",
  tags: "action",
  set_status: "action",
  webhook: "webhook",
  handoff: "wait_for_reply",
  operator: "wait_for_reply",
  send_media: "send_media",
  split: "randomizer",
  ai_text: "ai_assistant",
};

// ============================================================================
// EXPORT: uPixel → Kommo JSON
// ============================================================================
export function nodesToKommoBot(
  name: string,
  nodes: Node[],
  edges: Edge[]
): KommoBot {
  const scenario: KommoStep[] = nodes.map((node) => {
    const data = (node.data ?? {}) as any;
    const baseStep: KommoStep = {
      id: node.id,
      type: TYPE_MAP_TO_KOMMO[node.type ?? ""] ?? "custom",
      position: node.position,
      params: {},
    };

    // Próximo step (padrão: pega a aresta mais simples)
    const outgoing = edges.filter((e) => e.source === node.id);
    if (outgoing.length === 1 && !outgoing[0].sourceHandle) {
      baseStep.next_step = outgoing[0].target;
    }

    switch (node.type) {
      case "trigger":
        baseStep.params = {
          trigger: data.type ?? data.configType ?? "new_lead",
          keywords: data.keywords ?? "",
        };
        break;

      case "message":
        baseStep.params = {
          channel: data.configType ?? "whatsapp",
          text: data.text ?? "",
        };
        break;

      case "condition":
        baseStep.type = "conditions";
        baseStep.params = {
          operator: data.conditionOperator ?? "and",
        };
        // Constrói branches a partir das arestas com sourceHandle 'true'/'false'
        baseStep.branches = ["true", "false"].map((handle) => {
          const branchEdge = edges.find(
            (e) => e.source === node.id && e.sourceHandle === handle
          );
          return {
            label: handle === "true" ? "Sim" : "Não",
            conditions: handle === "true" ? data.conditions ?? [] : [],
            next_step: branchEdge?.target ?? null,
          };
        });
        delete baseStep.next_step;
        break;

      case "delay":
        baseStep.params = {
          delay_type: data.delayType ?? "fixed",
          amount: Number(data.amount) || 1,
          unit: data.unit ?? "days",
          dynamic_date: data.dynamicDate,
        };
        break;

      case "action": {
        const action = data.configType;
        if (action === "add_tag") {
          baseStep.type = "tags";
          baseStep.params = { tag: data.tag };
        } else if (action === "change_status") {
          baseStep.type = "set_status";
          baseStep.params = { status_id: data.status };
        } else if (action === "leave_note") {
          baseStep.type = "note";
          baseStep.params = { text: data.note };
        } else if (action === "assign_user") {
          baseStep.type = "assign";
          baseStep.params = { user_id: data.userId };
        } else {
          baseStep.type = "custom";
          baseStep.params = { ...data };
        }
        break;
      }

      case "webhook":
        baseStep.params = {
          url: data.url,
          method: data.method ?? "POST",
          body: data.body,
          headers: data.headers ?? {},
        };
        break;

      case "wait_for_reply":
        baseStep.params = {
          timeout_hours: Number(data.timeoutHours) || 0,
          save_as: data.saveAs ?? "last_reply",
        };
        // 2 saídas: reply e timeout
        baseStep.branches = ["reply", "timeout"].map((handle) => {
          const e = edges.find(
            (ed) => ed.source === node.id && ed.sourceHandle === handle
          );
          return {
            label: handle,
            next_step: e?.target ?? null,
          };
        });
        delete baseStep.next_step;
        break;

      case "send_media":
        baseStep.type = "send_media";
        baseStep.params = {
          channel: data.configType ?? "whatsapp",
          media_type: data.mediaType ?? "image",
          media_url: data.mediaUrl,
          file_name: data.fileName,
          caption: data.caption,
        };
        break;

      case "randomizer":
        baseStep.type = "split";
        baseStep.params = {
          percentage_a: Number(data.percentageA) || 50,
        };
        baseStep.branches = ["a", "b"].map((handle) => {
          const e = edges.find(
            (ed) => ed.source === node.id && ed.sourceHandle === handle
          );
          return { label: handle.toUpperCase(), next_step: e?.target ?? null };
        });
        delete baseStep.next_step;
        break;

      case "ai_assistant":
        baseStep.type = "ai_text";
        baseStep.params = {
          prompt: data.prompt,
          output_field: data.outputField,
        };
        break;

      default:
        baseStep.params = { ...data };
    }

    return baseStep;
  });

  return {
    name,
    scenario,
    _upixel: { edges },
    schema_version: "kommo-1.0+upixel",
    exported_at: new Date().toISOString(),
    source: "upixel",
  };
}

// ============================================================================
// IMPORT: Kommo JSON → uPixel nodes+edges
// ============================================================================
export function kommoBotToNodes(
  bot: KommoBot
): { nodes: Node[]; edges: Edge[]; warnings: string[] } {
  const warnings: string[] = [];
  if (!bot.scenario || !Array.isArray(bot.scenario)) {
    return {
      nodes: [],
      edges: [],
      warnings: ["JSON inválido: campo 'scenario' não encontrado."],
    };
  }

  // Se foi exportado por nós antes, recupera as edges originais (round-trip exato)
  if (bot._upixel?.edges) {
    const nodes: Node[] = bot.scenario.map((step, idx) => {
      const upixelType = TYPE_MAP_FROM_KOMMO[step.type] ?? "action";
      return {
        id: step.id,
        type: upixelType,
        position: step.position ?? { x: 100 + (idx % 4) * 280, y: 100 + Math.floor(idx / 4) * 200 },
        data: kommoStepToData(step, upixelType, warnings),
      };
    });
    return { nodes, edges: bot._upixel.edges, warnings };
  }

  // Caminho do Kommo puro: monta layout em grid e gera edges a partir de
  // next_step / branches.
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  bot.scenario.forEach((step, idx) => {
    const upixelType = TYPE_MAP_FROM_KOMMO[step.type] ?? "action";
    nodes.push({
      id: step.id,
      type: upixelType,
      position: step.position ?? {
        x: 150 + (idx % 4) * 320,
        y: 150 + Math.floor(idx / 4) * 220,
      },
      data: kommoStepToData(step, upixelType, warnings),
    });

    // next_step simples
    if (step.next_step) {
      edges.push({
        id: `${step.id}-${step.next_step}`,
        source: step.id,
        target: step.next_step,
        type: "smoothstep",
        animated: true,
        markerEnd: { type: "arrowclosed" } as any,
      });
    }

    // branches (condition/wait_for_reply/randomizer)
    step.branches?.forEach((branch, bIdx) => {
      if (!branch.next_step) return;
      let handle: string | undefined;
      if (step.type === "conditions") {
        handle = bIdx === 0 ? "true" : "false";
      } else if (step.type === "split") {
        handle = bIdx === 0 ? "a" : "b";
      } else if (step.type === "handoff" || step.type === "operator") {
        handle = bIdx === 0 ? "reply" : "timeout";
      }
      edges.push({
        id: `${step.id}-${handle ?? "br" + bIdx}-${branch.next_step}`,
        source: step.id,
        sourceHandle: handle,
        target: branch.next_step,
        type: "smoothstep",
        animated: true,
        markerEnd: { type: "arrowclosed" } as any,
      });
    });
  });

  return { nodes, edges, warnings };
}

function kommoStepToData(
  step: KommoStep,
  upixelType: string,
  warnings: string[]
): Record<string, any> {
  const p = step.params ?? {};

  switch (upixelType) {
    case "trigger":
      return {
        label: "Início",
        type: p.trigger ?? "new_lead",
        configType: p.trigger ?? "new_lead",
        keywords: p.keywords ?? "",
      };
    case "message":
      return {
        label: "Enviar mensagem",
        configType: p.channel ?? "whatsapp",
        text: p.text ?? "",
      };
    case "condition":
      return {
        label: "Condição",
        conditionOperator: p.operator ?? "and",
        conditions: step.branches?.[0]?.conditions ?? [],
      };
    case "delay":
      return {
        label: "Aguardar",
        delayType: p.delay_type ?? "fixed",
        amount: p.amount ?? 1,
        unit: p.unit ?? "days",
        dynamicDate: p.dynamic_date,
      };
    case "action": {
      // Detecta sub-tipo da ação a partir do step type
      if (step.type === "tags") {
        return { label: "Adicionar tag", configType: "add_tag", tag: p.tag };
      }
      if (step.type === "set_status") {
        return {
          label: "Mudar etapa",
          configType: "change_status",
          status: p.status_id ?? p.status,
        };
      }
      if (step.type === "note") {
        return { label: "Nota", configType: "leave_note", note: p.text };
      }
      if (step.type === "assign") {
        return {
          label: "Atribuir",
          configType: "assign_user",
          userId: p.user_id,
        };
      }
      warnings.push(`Step "${step.id}" tipo "${step.type}" sem mapeamento direto — importado como ação custom.`);
      return { label: "Ação custom", configType: "custom", ...p };
    }
    case "webhook":
      return {
        label: "Webhook",
        url: p.url,
        method: p.method ?? "POST",
        body: p.body,
        headers: p.headers,
      };
    case "wait_for_reply":
      return {
        label: "Aguardar resposta",
        timeoutHours: p.timeout_hours ?? 0,
        saveAs: p.save_as ?? "last_reply",
      };
    case "send_media":
      return {
        label: "Enviar mídia",
        configType: p.channel ?? "whatsapp",
        mediaType: p.media_type ?? "image",
        mediaUrl: p.media_url,
        fileName: p.file_name,
        caption: p.caption,
      };
    case "randomizer":
      return { label: "A/B", percentageA: p.percentage_a ?? 50 };
    case "ai_assistant":
      return { label: "IA", prompt: p.prompt, outputField: p.output_field };
    default:
      return { ...p };
  }
}

// ============================================================================
// HELPERS
// ============================================================================
export function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function readJsonFile(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text);
}

export function isKommoBot(obj: any): obj is KommoBot {
  return obj && typeof obj === "object" && Array.isArray(obj.scenario);
}
