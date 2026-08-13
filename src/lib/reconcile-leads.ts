import type { Lead } from "@/types";

/**
 * Funde o snapshot vindo do servidor com o que o usuário mexeu durante a carga.
 *
 * A carga de leads roda em background e chega em batches; a UI já está
 * interativa nesse meio-tempo. Substituir o estado pelo snapshot cru desfazia a
 * mutação otimista — card voltava de coluna, lead criado sumia, deletado
 * ressuscitava. Aqui o estado local sempre vence para os ids marcados.
 *
 * `dirty` contém só os ids tocados enquanto a carga estava rodando.
 */
export function reconcileLeads(prev: Lead[], serverRows: Lead[], dirty: Set<string>): Lead[] {
  if (dirty.size === 0) return serverRows;

  const localById = new Map(prev.map((l) => [l.id, l]));
  const out: Lead[] = [];
  for (const row of serverRows) {
    if (!dirty.has(row.id)) { out.push(row); continue; }
    const local = localById.get(row.id);
    // Sem versão local = deletado durante a carga: fica de fora.
    if (local) out.push(local);
  }

  // Criado durante a carga — o snapshot ainda não o conhece.
  const inSnapshot = new Set(serverRows.map((r) => r.id));
  for (const id of dirty) {
    const local = localById.get(id);
    if (local && !inSnapshot.has(id)) out.unshift(local);
  }
  return out;
}
