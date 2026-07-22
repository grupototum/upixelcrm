// Regras de tag automáticas (client-side) + sugestões heurísticas para importação.
//
// F11 — Regras configuráveis: "se <campo> contém <texto> → adicionar tag <tag>".
//        Aplicadas ANTES de inserir os leads (determinístico, sem IA).
// F10 — Sugestões heurísticas: rótulos operacionais deduzidos dos dados
//        (ex.: cargo de decisor, contato sem telefone), revisados e aplicados
//        pelo usuário na tela de resultado. NÃO é IA — é heurística explícita.

export type TagRuleField = "name" | "company" | "city" | "position" | "origin" | "email";

export interface TagRule {
  id: string;
  field: TagRuleField;
  contains: string;
  tag: string;
}

export const TAG_RULE_FIELD_LABELS: Record<TagRuleField, string> = {
  name: "Nome",
  company: "Empresa",
  city: "Cidade",
  position: "Cargo",
  origin: "Origem",
  email: "Email",
};

/** Campos de um lead relevantes para regras/heurísticas. */
export interface LeadFields {
  name?: string | null;
  company?: string | null;
  city?: string | null;
  position?: string | null;
  origin?: string | null;
  email?: string | null;
  phone?: string | null;
}

const storageKey = (clientId: string) => `import_tag_rules_${clientId}`;

export function loadTagRules(clientId: string): TagRule[] {
  try {
    const raw = localStorage.getItem(storageKey(clientId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TagRule[]) : [];
  } catch {
    return [];
  }
}

export function saveTagRules(clientId: string, rules: TagRule[]): void {
  try {
    localStorage.setItem(storageKey(clientId), JSON.stringify(rules));
  } catch {
    // silencioso
  }
}

const norm = (v: string | null | undefined) =>
  (v ?? "").toString().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Retorna as tags que as regras aplicam a este lead (sem duplicar). */
export function applyTagRules(fields: LeadFields, rules: TagRule[]): string[] {
  const out = new Set<string>();
  for (const rule of rules) {
    const value = norm(fields[rule.field]);
    const needle = norm(rule.contains);
    if (needle && value.includes(needle) && rule.tag.trim()) {
      out.add(rule.tag.trim());
    }
  }
  return Array.from(out);
}

const DECISOR_RE =
  /diretor|ceo|c-level|socio|s[oó]cio|propriet|fundador|owner|founder|presidente|\bhead\b|gerente|coordenador/i;

/**
 * Sugestões heurísticas (operacionais) para um lead. Cada sugestão é um par
 * { tag, reason }. Determinístico — nada de IA.
 */
export function suggestHeuristicTags(fields: LeadFields): { tag: string; reason: string }[] {
  const out: { tag: string; reason: string }[] = [];
  if (fields.position && DECISOR_RE.test(fields.position)) {
    out.push({ tag: "Decisor", reason: "Cargo indica poder de decisão" });
  }
  if (!fields.phone) {
    out.push({ tag: "Sem telefone", reason: "Lead sem telefone cadastrado" });
  }
  if (!fields.email) {
    out.push({ tag: "Sem e-mail", reason: "Lead sem e-mail cadastrado" });
  }
  return out;
}
