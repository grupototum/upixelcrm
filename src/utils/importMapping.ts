// Persistência do mapeamento de colunas por "fingerprint" dos cabeçalhos.
// Quando o usuário importa uma planilha com os mesmos headers de antes, o
// mapeamento salvo é reaplicado automaticamente (com opção de editar).

/**
 * Gera uma chave estável a partir dos nomes de coluna (ordenados e normalizados).
 * Mesmo conjunto de colunas -> mesmo fingerprint, independente da ordem.
 */
export function fingerprintHeaders(headers: string[]): string {
  const norm = (headers ?? [])
    .map((h) => (h ?? "").trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("|");
  try {
    // btoa com segurança para acentos/unicode.
    return btoa(unescape(encodeURIComponent(norm)));
  } catch {
    return norm;
  }
}

const storageKey = (fingerprint: string) => `import_mapping_${fingerprint}`;

export function saveImportMapping(headers: string[], mapping: Record<string, string>): void {
  try {
    localStorage.setItem(storageKey(fingerprintHeaders(headers)), JSON.stringify(mapping));
  } catch {
    // localStorage indisponível (modo privado/cota) — silencioso, não é crítico.
  }
}

export function loadImportMapping(headers: string[]): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(storageKey(fingerprintHeaders(headers)));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : null;
  } catch {
    return null;
  }
}

export function clearImportMapping(headers: string[]): void {
  try {
    localStorage.removeItem(storageKey(fingerprintHeaders(headers)));
  } catch {
    // silencioso
  }
}
