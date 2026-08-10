import type {
  ShadowSdrAdapter,
  ShadowSdrAnalysis,
  ShadowSdrConversationInput,
  ShadowSdrMessageInput,
  ShadowSdrTemperature,
} from "@/types/shadow-sdr";

const HOT_TERMS = [
  "preco",
  "preço",
  "valor",
  "orcamento",
  "orçamento",
  "proposta",
  "reuniao",
  "reunião",
  "contratar",
  "fechar",
  "urgente",
  "hoje",
  "amanha",
  "amanhã",
];

const WARM_TERMS = [
  "interesse",
  "quero",
  "preciso",
  "crm",
  "automacao",
  "automação",
  "site",
  "landing",
  "leads",
  "whatsapp",
  "funil",
  "atendimento",
];

function visibleMessages(messages: ShadowSdrMessageInput[]) {
  return messages
    .filter((message) => !message.isPrivate && (message.content || "").trim())
    .slice(-30);
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function classify(input: ShadowSdrConversationInput) {
  const messages = visibleMessages(input.messages);
  const inbound = messages.filter((message) => message.direction !== "outbound");
  const joined = messages.map((message) => message.content.toLowerCase()).join(" ");
  const latestInbound = [...inbound].reverse()[0];

  let temperature: ShadowSdrTemperature = "frio";
  let confidence = 0.48;
  let reason = "Poucos sinais comerciais claros no histórico visível.";

  if (hasAny(joined, HOT_TERMS)) {
    temperature = "quente";
    confidence = latestInbound ? 0.78 : 0.66;
    reason = "O histórico contém sinais de decisão, preço, proposta ou timing próximo.";
  } else if (hasAny(joined, WARM_TERMS) || inbound.length >= 2) {
    temperature = "morno";
    confidence = 0.64;
    reason = "Há interesse ou dor inicial, mas ainda faltam dados de prioridade e decisão.";
  }

  return { temperature, confidence, reason };
}

function buildSummary(input: ShadowSdrConversationInput) {
  const messages = visibleMessages(input.messages);
  const leadName = input.lead.name || "Lead";
  const company = input.lead.company ? ` da ${input.lead.company}` : "";
  const latest = [...messages].reverse().find((message) => message.direction !== "outbound") || messages[messages.length - 1];

  if (!latest) {
    return `${leadName}${company} ainda nao tem mensagens suficientes para leitura comercial.`;
  }

  const cleanLatest = latest.content.replace(/\s+/g, " ").slice(0, 180);
  return `${leadName}${company} tem ${messages.length} mensagem(ns) visiveis. Ultimo contexto relevante: "${cleanLatest}".`;
}

function nextActionFor(temperature: ShadowSdrTemperature) {
  if (temperature === "quente") {
    return "Convidar para uma call curta e confirmar quem decide, timing e objetivo da implantacao.";
  }
  if (temperature === "morno") {
    return "Fazer uma pergunta SPIN para entender processo atual, perda de leads e prioridade.";
  }
  return "Abrir conversa com uma pergunta leve de contexto antes de ofertar solucao.";
}

function replyFor(input: ShadowSdrConversationInput, temperature: ShadowSdrTemperature) {
  const firstName = (input.lead.name || "").split(" ")[0] || "tudo bem";

  if (temperature === "quente") {
    return `Oi, ${firstName}. Pelo que voce trouxe, parece que o ponto principal e organizar o processo comercial sem depender de memoria e WhatsApp solto. Faz sentido marcarmos 20 minutos para eu te mostrar como ficaria esse fluxo no cenario de voces?`;
  }

  if (temperature === "morno") {
    return `Oi, ${firstName}. Para eu entender se faz sentido te orientar: hoje voces controlam os leads em algum CRM ou isso ainda fica mais em WhatsApp, planilha e memoria do time?`;
  }

  return `Oi, ${firstName}. Tudo bem? Queria entender uma coisa rapida: hoje voces ja tem algum processo para organizar leads, contatos e retornos comerciais, ou isso ainda fica mais no WhatsApp/planilha?`;
}

export const mockShadowSdrAdapter: ShadowSdrAdapter = {
  async analyze(input): Promise<ShadowSdrAnalysis> {
    const classification = classify(input);
    const hasCompany = Boolean(input.lead.company);
    const hasBudget = input.messages.some((message) => /pre[cç]o|valor|or[cç]amento|verba/i.test(message.content));
    const hasTiming = input.messages.some((message) => /hoje|amanh[aã]|semana|m[eê]s|urgente|prazo/i.test(message.content));
    const hasAuthority = input.messages.some((message) => /s[oó]cio|diretor|dono|gestor|decisor|respons[aá]vel/i.test(message.content));

    return {
      id: `shadow-sdr-${Date.now()}`,
      source: "mock",
      generatedAt: new Date().toISOString(),
      summary: buildSummary(input),
      classification,
      nextAction: nextActionFor(classification.temperature),
      suggestedReply: replyFor(input, classification.temperature),
      spin: {
        situation: [
          "Confirmar quais canais geram leads hoje.",
          "Mapear se existe CRM, planilha ou controle manual.",
        ],
        problem: [
          "Investigar se contatos ficam sem retorno.",
          "Entender onde o historico se perde entre WhatsApp, CRM e equipe.",
        ],
        implication: [
          "Quantificar leads perdidos ou propostas atrasadas por falta de follow-up.",
          "Validar impacto de depender da memoria do responsavel comercial.",
        ],
        needPayoff: [
          "Conectar CRM simples, lembretes e IA SDR como ganho operacional.",
          "Mostrar reducao de retrabalho e mais previsibilidade no pipeline.",
        ],
      },
      bant: {
        budget: hasBudget ? "sinal citado na conversa" : "desconhecido",
        authority: hasAuthority ? "possivel decisor citado" : "desconhecida",
        need: classification.temperature === "frio" ? "fraca ou nao validada" : "dor inicial validada",
        timeline: hasTiming ? "sinal de prazo citado" : "desconhecido",
        notes: [
          hasCompany ? "Empresa identificada no cadastro." : "Empresa ainda nao identificada.",
          "Validar BANT de forma consultiva, sem transformar a conversa em interrogatorio.",
        ],
      },
      missingInfo: [
        !hasCompany ? "empresa/segmento" : null,
        !hasBudget ? "orcamento ou faixa aceitavel" : null,
        !hasAuthority ? "quem participa da decisao" : null,
        !hasTiming ? "prazo para resolver" : null,
      ].filter(Boolean) as string[],
      risks: [
        input.lead.category && input.lead.category !== "lead"
          ? "Contato marcado como parceiro/colaborador; revisar abordagem antes de tratar como venda."
          : "Revisar manualmente antes de usar o rascunho.",
      ],
    };
  },
};
