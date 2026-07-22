// Importação de planilhas do Google Sheets por URL pública.
// Extrai o spreadsheetId (e gid, quando presente) e baixa o CSV exportado.
// A planilha precisa estar compartilhada como "qualquer pessoa com o link pode ver".

/** Extrai o spreadsheetId de uma URL do Google Sheets (/d/{ID}/edit|view|...). */
export function extractSpreadsheetId(url: string): string | null {
  const match = (url ?? "").match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/** Extrai o gid (aba) da URL; default "0" (primeira aba). */
export function extractGid(url: string): string {
  const match = (url ?? "").match(/[#&?]gid=([0-9]+)/);
  return match ? match[1] : "0";
}

/**
 * Baixa o conteúdo CSV de uma planilha pública do Google Sheets.
 * Lança erro amigável quando a URL é inválida ou a planilha não é pública.
 */
export async function fetchGoogleSheetsCSV(url: string): Promise<string> {
  const id = extractSpreadsheetId(url);
  if (!id) {
    throw new Error(
      "URL inválida. Cole o link de uma planilha do Google Sheets (ex: https://docs.google.com/spreadsheets/d/.../edit)."
    );
  }
  const gid = extractGid(url);
  const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;

  let res: Response;
  try {
    res = await fetch(exportUrl);
  } catch {
    // Falha de rede/CORS — planilha privada costuma cair aqui.
    throw new Error(
      "Não foi possível acessar a planilha. Verifique se ela está compartilhada como 'qualquer pessoa com o link pode ver'."
    );
  }

  if (!res.ok) {
    throw new Error(
      "Não foi possível acessar a planilha. Verifique se ela é pública (qualquer pessoa com o link pode ver)."
    );
  }

  const text = await res.text();

  // Planilhas privadas devolvem uma página HTML de login em vez do CSV.
  const head = text.trimStart().slice(0, 200).toLowerCase();
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) {
    throw new Error(
      "A planilha não é pública. Compartilhe como 'qualquer pessoa com o link pode ver' e tente novamente."
    );
  }

  return text;
}
