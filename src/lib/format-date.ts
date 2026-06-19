/**
 * Tempo relativo em PT-BR ("Agora", "Há 5min", "Há 2h", "Há 3d", e datas absolutas pra mais antigos).
 * Usado nos cards do Dashboard, timeline e atividades.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return "Agora";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `Há ${diffD}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Data curta em PT-BR ("dd/MM"). Usada para datas de vencimento (due_date)
 * onde o formato relativo não faz sentido. Aceita ISO ou date-only.
 */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
