/**
 * Parser tolerante do CHANGELOG.md — sem JSON estruturado (decisão do dono do
 * produto), o formato do markdown já é regular o bastante pra extrair sessão/
 * categoria/tipo por regex. Linha fora do padrão nunca quebra a página: vira
 * item avulso classificado como "outro".
 *
 * Formato esperado:
 *   ## 📅 YYYY-MM-DD — Sessão: Título
 *   ### emoji Categoria
 *   - `tipo` texto — arquivos (opcional)
 */

export type ChangelogGroup = "feature" | "improvement" | "fix";

export interface ChangelogItem {
  /** Tag original do commit (feat, fix, perf...) ou "outro" quando a linha não bate no padrão. */
  type: string;
  text: string;
  files?: string;
  group: ChangelogGroup;
}

export interface ChangelogCategory {
  emoji: string;
  label: string;
  items: ChangelogItem[];
}

export interface ChangelogSession {
  /** YYYY-MM-DD, ou "" para sessões sem data (ex: [Unreleased]). */
  date: string;
  title: string;
  categories: ChangelogCategory[];
}

const GROUP_BY_TYPE: Record<string, ChangelogGroup> = {
  feat: "feature",
  fix: "fix",
  security: "fix",
  perf: "improvement",
  refactor: "improvement",
  chore: "improvement",
  docs: "improvement",
  test: "improvement",
};

export const GROUP_LABELS: Record<ChangelogGroup, string> = {
  feature: "Nova feature",
  improvement: "Melhoria",
  fix: "Correção",
};

const SESSION_RE = /^## 📅 (\d{4}-\d{2}-\d{2}) — Sessão: (.+)$/;
const CATEGORY_RE = /^### (\S+)\s+(.+)$/;
const ITEM_RE = /^- `([a-z]+)` (.+?)(?:\s—\s(.+))?$/;

export function parseChangelog(raw: string): ChangelogSession[] {
  const sessions: ChangelogSession[] = [];
  let currentSession: ChangelogSession | null = null;
  let currentCategory: ChangelogCategory | null = null;

  for (const line of raw.split("\n")) {
    const sessionMatch = line.match(SESSION_RE);
    if (sessionMatch) {
      currentSession = { date: sessionMatch[1], title: sessionMatch[2], categories: [] };
      sessions.push(currentSession);
      currentCategory = null;
      continue;
    }

    const categoryMatch = line.match(CATEGORY_RE);
    if (categoryMatch && currentSession) {
      currentCategory = { emoji: categoryMatch[1], label: categoryMatch[2], items: [] };
      currentSession.categories.push(currentCategory);
      continue;
    }

    const itemMatch = line.match(ITEM_RE);
    if (itemMatch && currentCategory) {
      const [, type, text, files] = itemMatch;
      currentCategory.items.push({
        type,
        text,
        files,
        group: GROUP_BY_TYPE[type] ?? "improvement",
      });
    }
  }

  return sessions;
}

export interface FlatChangelogItem extends ChangelogItem {
  sessionDate: string;
  sessionTitle: string;
  categoryEmoji: string;
  categoryLabel: string;
}

export function flattenChangelog(sessions: ChangelogSession[]): FlatChangelogItem[] {
  const flat: FlatChangelogItem[] = [];
  for (const session of sessions) {
    for (const category of session.categories) {
      for (const item of category.items) {
        flat.push({
          ...item,
          sessionDate: session.date,
          sessionTitle: session.title,
          categoryEmoji: category.emoji,
          categoryLabel: category.label,
        });
      }
    }
  }
  return flat;
}
