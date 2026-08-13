import { describe, it, expect } from "vitest";
import { parseChangelog, flattenChangelog } from "@/lib/changelog";

const SAMPLE = `# CHANGELOG

## 📅 2026-08-13 — Sessão: Correções pós-auditoria

### 🔒 Segurança
- \`security\` Só administradores editam etapas do funil — arquivo X.sql

### ✅ Consertado
- \`fix\` Botão do WhatsApp agora usa o número certo do lead

### 🆕 Criado
- \`feat\` Nova página de metas com ranking da equipe

linha solta sem padrão nenhum

## 📅 2026-06-10 — Sessão: Sessão anterior

### 🧹 Organização
- \`chore\` Limpeza de arquivos não usados
`;

describe("parseChangelog", () => {
  it("agrupa sessões, categorias e itens corretamente", () => {
    const sessions = parseChangelog(SAMPLE);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].date).toBe("2026-08-13");
    expect(sessions[0].title).toBe("Correções pós-auditoria");
    expect(sessions[0].categories).toHaveLength(3);
    expect(sessions[0].categories[0].items[0].type).toBe("security");
  });

  it("mapeia tipo pro grupo leigo certo", () => {
    const sessions = parseChangelog(SAMPLE);
    const items = flattenChangelog(sessions);
    expect(items.find((i) => i.type === "security")!.group).toBe("fix");
    expect(items.find((i) => i.type === "fix")!.group).toBe("fix");
    expect(items.find((i) => i.type === "feat")!.group).toBe("feature");
    expect(items.find((i) => i.type === "chore")!.group).toBe("improvement");
  });

  it("extrai o texto e o arquivo quando presentes", () => {
    const sessions = parseChangelog(SAMPLE);
    const item = sessions[0].categories[0].items[0];
    expect(item.text).toBe("Só administradores editam etapas do funil");
    expect(item.files).toBe("arquivo X.sql");
  });

  it("não quebra com linha fora do padrão — apenas ignora", () => {
    const sessions = parseChangelog(SAMPLE);
    const totalItems = sessions.flatMap((s) => s.categories.flatMap((c) => c.items));
    expect(totalItems).toHaveLength(4);
  });

  it("string vazia retorna lista vazia", () => {
    expect(parseChangelog("")).toEqual([]);
  });

  it("flattenChangelog carrega data/título/categoria em cada item", () => {
    const flat = flattenChangelog(parseChangelog(SAMPLE));
    const first = flat[0];
    expect(first.sessionDate).toBe("2026-08-13");
    expect(first.categoryLabel).toBe("Segurança");
  });
});
