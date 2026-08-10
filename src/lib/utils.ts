import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Coage um valor possivelmente serializado como Long ({ low, high, unsigned })
// — formato que o protobuf/Baileys usa para inteiros de 64 bits — para number.
// Aceita também number e string numérica. Retorna null se não for coercível.
export function coerceLong(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "object" && "low" in value && "high" in value) {
    const { low, high, unsigned } = value as { low: number; high: number; unsigned?: boolean };
    const hi = unsigned ? high >>> 0 : high;
    // Tamanhos de arquivo cabem com folga na faixa segura de number.
    return hi * 4294967296 + (low >>> 0);
  }
  return null;
}

// Formata um tamanho em bytes (number, string ou Long) de forma legível.
// Retorna null quando o valor não representa um tamanho válido (> 0),
// para que a UI possa cair num rótulo de fallback.
export function formatFileSize(value: unknown): string | null {
  const bytes = coerceLong(value);
  if (bytes == null || bytes <= 0) return null;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i > 0 && n < 10 ? 1 : 0)} ${units[i]}`;
}
