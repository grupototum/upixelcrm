import { describe, it, expect } from "vitest";
import { validateBotFlow, type FlowEdge, type FlowNode } from "@/lib/bot-validation";

const start: FlowNode = { id: "s", type: "bot_start", data: { label: "Início" } };

describe("validateBotFlow", () => {
  it("aprova um fluxo mínimo bem formado", () => {
    const nodes: FlowNode[] = [start, { id: "m", type: "bot_message", data: { text: "Olá" } }];
    const edges: FlowEdge[] = [{ source: "s", target: "m" }];
    expect(validateBotFlow(nodes, edges)).toEqual([]);
  });

  it("acusa fluxo sem bloco de início", () => {
    const issues = validateBotFlow([{ id: "m", type: "bot_message", data: { text: "oi" } }], []);
    expect(issues.some((i) => i.message.includes("não tem bloco de Início"))).toBe(true);
  });

  it("acusa nó órfão", () => {
    const nodes: FlowNode[] = [
      start,
      { id: "a", type: "bot_message", data: { text: "conectado" } },
      { id: "orfao", type: "bot_message", data: { text: "solto" } },
    ];
    const issues = validateBotFlow(nodes, [{ source: "s", target: "a" }]);
    expect(issues.some((i) => i.nodeId === "orfao")).toBe(true);
  });

  it("exige variável na pergunta — sem ela a resposta do cliente se perde", () => {
    const nodes: FlowNode[] = [start, { id: "q", type: "bot_question", data: { text: "Qual seu nome?" } }];
    const edges: FlowEdge[] = [{ source: "s", target: "q" }, { source: "q", target: "s" }];
    const issues = validateBotFlow(nodes, edges);
    expect(issues.some((i) => i.nodeId === "q" && i.message.includes("variável"))).toBe(true);
  });

  it("exige os dois ramos da condição conectados", () => {
    const nodes: FlowNode[] = [
      start,
      { id: "c", type: "bot_condition", data: { variable: "x" } },
      { id: "m", type: "bot_message", data: { text: "sim" } },
    ];
    const edges: FlowEdge[] = [
      { source: "s", target: "c" },
      { source: "c", target: "m", sourceHandle: "true" },
    ];
    const issues = validateBotFlow(nodes, edges);
    expect(issues.some((i) => i.nodeId === "c" && i.message.includes("caminhos"))).toBe(true);
  });

  it("rejeita UUID inválido em move_stage — vira erro de FK engolido pelo engine", () => {
    const nodes: FlowNode[] = [
      start,
      { id: "a", type: "bot_action", data: { action: "move_stage", value: "id-da-etapa" } },
    ];
    const edges: FlowEdge[] = [{ source: "s", target: "a" }, { source: "a", target: "s" }];
    const issues = validateBotFlow(nodes, edges);
    expect(issues.some((i) => i.nodeId === "a" && i.message.includes("ID válido"))).toBe(true);
  });

  it("aceita UUID válido em move_stage", () => {
    const nodes: FlowNode[] = [
      start,
      { id: "a", type: "bot_action", data: { action: "move_stage", value: "3f2504e0-4f89-11d3-9a0c-0305e82c3301" } },
      { id: "e", type: "bot_action", data: { action: "end" } },
    ];
    const edges: FlowEdge[] = [{ source: "s", target: "a" }, { source: "a", target: "e" }];
    expect(validateBotFlow(nodes, edges)).toEqual([]);
  });

  it("acusa ação que não encerra nem tem saída", () => {
    const nodes: FlowNode[] = [start, { id: "a", type: "bot_action", data: { action: "tag", value: "quente" } }];
    const issues = validateBotFlow(nodes, [{ source: "s", target: "a" }]);
    expect(issues.some((i) => i.nodeId === "a" && i.message.includes("não encerra"))).toBe(true);
  });
});
