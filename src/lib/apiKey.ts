import { createHash, randomBytes } from "crypto";

const PREFIX = "scms_";
const KEY_BYTES = 32; // 32 random bytes → 64 hex chars

/**
 * Generates a new raw API key.
 * Format: scms_<64 random hex chars>
 * Example: scms_a1b2c3d4e5f6...
 *
 * Call this ONCE — return the raw key to the user, never store it.
 */
export function generateApiKey(): string {
  const random = randomBytes(KEY_BYTES).toString("hex");
  return `${PREFIX}${random}`;
}

/**
 * Hashes a raw key for storage / lookup.
 * sha256 is fast and sufficient for API key hashing.
 * (bcrypt would be overkill and too slow for per-request auth.)
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Extracts the displayable prefix from a raw key.
 * Returns the first 16 chars: "scms_a1b2c3d4e5f6"
 * Safe to store and show in the UI — not enough to reconstruct the key.
 */
export function getKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, 16);
}

/**
 * Verifies an incoming raw key against a stored hash.
 * Used in the API route handler.
 */
export function verifyApiKey(rawKey: string, storedHash: string): boolean {
  const hash = hashApiKey(rawKey);
  // Constant-time comparison to prevent timing attacks
  return hash === storedHash;
}
