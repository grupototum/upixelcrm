// Validação de fluxo de bot, executada antes de publicar.
//
// Sem isto, fluxo quebrado ia para produção e falhava em silêncio: o engine
// dá `break` no meio (nó sem saída, condição sem ramo) e a sessão vira
// "completed" sem o cliente receber nada — sem erro, sem log visível ao
// usuário do builder.

export interface FlowNode {
  id: string;
  type?: string;
  data?: Record<string, unknown>;
}

export interface FlowEdge {
  source: string;
  target: string;
  sourceHandle?: string | null;
}

export interface FlowIssue {
  nodeId: string | null;
  message: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateBotFlow(nodes: FlowNode[], edges: FlowEdge[]): FlowIssue[] {
  const issues: FlowIssue[] = [];
  const label = (n: FlowNode) => (n.data?.label as string) || n.type || n.id;

  const start = nodes.find((n) => n.type === "bot_start");
  if (!start) {
    issues.push({ nodeId: null, message: "O fluxo não tem bloco de Início." });
  } else if (!edges.some((e) => e.source === start.id)) {
    issues.push({ nodeId: start.id, message: "O bloco de Início não está conectado a nada." });
  }

  const reachable = new Set<string>();
  if (start) {
    const queue = [start.id];
    while (queue.length) {
      const id = queue.shift()!;
      if (reachable.has(id)) continue;
      reachable.add(id);
      edges.filter((e) => e.source === id).forEach((e) => queue.push(e.target));
    }
  }

  for (const node of nodes) {
    const d = node.data ?? {};
    const outgoing = edges.filter((e) => e.source === node.id);

    if (start && !reachable.has(node.id)) {
      issues.push({ nodeId: node.id, message: `"${label(node)}" está solto: nada leva até ele.` });
    }

    if (node.type === "bot_message" && !(d.text as string)?.trim()) {
      issues.push({ nodeId: node.id, message: `"${label(node)}" está sem texto de mensagem.` });
    }

    if (node.type === "bot_question") {
      if (!(d.text as string)?.trim()) {
        issues.push({ nodeId: node.id, message: `"${label(node)}" está sem o texto da pergunta.` });
      }
      if (!(d.variable as string)?.trim()) {
        issues.push({
          nodeId: node.id,
          message: `"${label(node)}" não salva a resposta em nenhuma variável — o valor digitado pelo cliente se perde.`,
        });
      }
      if (outgoing.length === 0) {
        issues.push({ nodeId: node.id, message: `"${label(node)}" não tem saída: o bot para depois de perguntar.` });
      }
    }

    if (node.type === "bot_condition") {
      if (!(d.variable as string)?.trim()) {
        issues.push({ nodeId: node.id, message: `"${label(node)}" está sem a variável a comparar.` });
      }
      const hasTrue = outgoing.some((e) => e.sourceHandle === "true");
      const hasFalse = outgoing.some((e) => e.sourceHandle === "false");
      if (!hasTrue || !hasFalse) {
        issues.push({
          nodeId: node.id,
          message: `"${label(node)}" precisa dos dois caminhos conectados (verdadeiro e falso).`,
        });
      }
    }

    if (node.type === "bot_action") {
      const action = d.action as string | undefined;
      const value = (d.value as string)?.trim();
      if (action && action !== "end" && !value) {
        issues.push({ nodeId: node.id, message: `"${label(node)}" está sem valor para a ação escolhida.` });
      }
      // move_stage/assign_agent gravam direto em colunas UUID; valor inválido
      // vira erro de FK engolido pelo engine, e o fluxo segue como se tivesse
      // funcionado.
      if ((action === "move_stage" || action === "assign_agent") && value && !UUID_RE.test(value)) {
        issues.push({
          nodeId: node.id,
          message: `"${label(node)}" espera um ID válido (selecione na lista) — "${value}" não é.`,
        });
      }
      if (action !== "end" && outgoing.length === 0) {
        issues.push({ nodeId: node.id, message: `"${label(node)}" não tem saída e não encerra o bot.` });
      }
    }
  }

  return issues;
}
