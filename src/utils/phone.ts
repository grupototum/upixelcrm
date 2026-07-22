// Validação e normalização de telefone brasileiro para o fluxo de importação.
// Aceita fixo (10 dígitos) e celular (11 dígitos, com 9 na frente do número),
// com ou sem código do país (55) e com ou sem formatação. DDD válido: 11–99.

/** Retorna só os dígitos, removendo o código do país (55) quando presente. */
export function stripBRPhone(value: string): string {
  let digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith("55")) digits = digits.slice(2);
  return digits;
}

/**
 * Chave normalizada de telefone BR para deduplicação (DDD + 8 dígitos finais).
 * Remove código do país (55) e o 9 de celular, batendo formatos "+55 11 9 8765-4321"
 * e "11 8765-4321". Mantém DDD para não colidir números de DDDs diferentes.
 * DEVE espelhar a lógica de dedup usada na importação.
 */
export function normalizePhoneKey(raw: string): string {
  let digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 11 && digits[2] === "9") {
    digits = digits.slice(0, 2) + digits.slice(3);
  }
  return digits.slice(-10);
}

/**
 * Valida o formato de um telefone brasileiro.
 * Válidos: (DD) NNNNN-NNNN (celular, 11 dígitos, 9º dígito = 9) ou
 *          (DD) NNNN-NNNN (fixo, 10 dígitos). DDD entre 11 e 99.
 * Formatação é ignorada — considera apenas os dígitos.
 */
export function validateBRPhone(value: string): boolean {
  const digits = stripBRPhone(value);
  if (digits.length !== 10 && digits.length !== 11) return false;

  const ddd = parseInt(digits.slice(0, 2), 10);
  if (Number.isNaN(ddd) || ddd < 11 || ddd > 99) return false;

  // Celular (11 dígitos) precisa do 9 após o DDD.
  if (digits.length === 11 && digits[2] !== "9") return false;

  return true;
}
