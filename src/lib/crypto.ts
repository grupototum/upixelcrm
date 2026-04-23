/**
 * FIX-02: Cryptographically secure token generation.
 * Replaces Math.random()-based generation which is not cryptographically random
 * and can be predicted by an attacker with knowledge of the seed/timing.
 *
 * FIX-03: SHA-256 token hashing.
 * Replaces btoa() (reversible Base64 encoding) with a one-way SHA-256 digest,
 * so a database breach does not expose plaintext tokens.
 */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * Generate a cryptographically secure random token.
 * @param prefix   String prepended to the token (e.g. "sk_live_", "wh_sec_")
 * @param byteLength Number of random bytes to use (each byte maps to 1 char)
 */
export function generateSecureToken(prefix: string, byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  const randomPart = Array.from(bytes)
    .map((b) => ALPHABET[b % ALPHABET.length])
    .join("");
  return prefix + randomPart;
}

/**
 * Hash a token with SHA-256, returning a hex string.
 * Use this before storing a token in the database so that even if the
 * database is compromised the plaintext tokens cannot be recovered.
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
