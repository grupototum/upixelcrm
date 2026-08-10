/**
 * Formata telefone brasileiro para exibição: `DD NNNNN-NNNN`.
 *
 * Remove o DDI 55 quando presente. Números que não batem com o padrão BR
 * (10 ou 11 dígitos após o DDI) voltam como vieram — melhor mostrar o valor
 * cru que mutilar um número internacional.
 */
export function formatPhone(phone?: string | null): string {
  if (!phone) return "";

  let digits = phone.replace(/\D/g, "");

  // DDI 55 só é removido se o que sobra ainda for um número BR plausível,
  // senão um fixo de SP (11 dígitos) começando com 55 seria decapitado.
  if (digits.length > 11 && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  if (digits.length === 11) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return phone;
}
