/** Campos de lead exportáveis (subconjunto tolerante — aceita Lead ou linha crua). */
interface ExportableLead {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  city?: string | null;
  position?: string | null;
  origin?: string | null;
  tags?: string[] | null;
}

/**
 * Exporta leads como CSV com os cabeçalhos do sistema (mesmo formato do modelo
 * de importação), permitindo reimportar. Reusa o escape/BOM de downloadCSV.
 */
export function exportLeadsToCSV(leads: ExportableLead[], filename = "leads-exportados.csv") {
  const rows = leads.map((l) => ({
    Nome: l.name ?? "",
    Telefone: l.phone ?? "",
    Email: l.email ?? "",
    Empresa: l.company ?? "",
    Cidade: l.city ?? "",
    Cargo: l.position ?? "",
    Origem: l.origin ?? "",
    Tags: Array.isArray(l.tags) ? l.tags.join("; ") : "",
  }));
  if (rows.length === 0) return;
  downloadCSV(rows, filename);
}

export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
