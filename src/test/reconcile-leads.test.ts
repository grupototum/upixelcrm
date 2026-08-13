import { describe, it, expect } from "vitest";
import { reconcileLeads } from "@/lib/reconcile-leads";
import type { Lead } from "@/types";

/** Lead mínimo — só os campos que a reconciliação enxerga. */
const lead = (id: string, column_id: string): Lead =>
  ({ id, name: id, column_id, tags: [] }) as unknown as Lead;

describe("reconcileLeads", () => {
  it("sem mutações locais, devolve o snapshot do servidor", () => {
    const server = [lead("a", "col1"), lead("b", "col1")];
    expect(reconcileLeads([], server, new Set())).toBe(server);
  });

  it("mantém o lead movido localmente na coluna de destino", () => {
    const prev = [lead("a", "col2")]; // usuário arrastou pra col2
    const server = [lead("a", "col1")]; // snapshot ainda tem a coluna antiga
    const out = reconcileLeads(prev, server, new Set(["a"]));
    expect(out).toHaveLength(1);
    expect(out[0].column_id).toBe("col2");
  });

  it("preserva lead criado durante a carga, ausente do snapshot", () => {
    const prev = [lead("novo", "col1"), lead("a", "col1")];
    const server = [lead("a", "col1")];
    const out = reconcileLeads(prev, server, new Set(["novo"]));
    expect(out.map((l) => l.id)).toContain("novo");
    expect(out).toHaveLength(2);
  });

  it("não ressuscita lead deletado durante a carga", () => {
    const prev = [lead("a", "col1")]; // "b" já foi removido localmente
    const server = [lead("a", "col1"), lead("b", "col1")];
    const out = reconcileLeads(prev, server, new Set(["b"]));
    expect(out.map((l) => l.id)).toEqual(["a"]);
  });

  it("não duplica o lead criado quando ele aparece num batch seguinte", () => {
    const dirty = new Set(["novo"]);
    const prev = reconcileLeads([lead("novo", "col1")], [], dirty);
    const out = reconcileLeads(prev, [lead("novo", "col1"), lead("a", "col1")], dirty);
    expect(out.filter((l) => l.id === "novo")).toHaveLength(1);
  });

  it("não mexe em leads que o usuário não tocou", () => {
    const prev = [lead("a", "col2")];
    const server = [lead("a", "col1"), lead("b", "col1")];
    const out = reconcileLeads(prev, server, new Set(["b"]));
    expect(out.find((l) => l.id === "a")!.column_id).toBe("col1");
  });
});
