import { z } from "zod";
import { apiErrorResponse } from "./errors";

// ─── Reusable Zod schemas ─────────────────────────────────────────────────────

export const LocaleSchema = z
  .string()
  .min(2)
  .max(10)
  .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, {
    message: "Must be a valid BCP-47 locale code (e.g. en, ar, zh-TW)",
  });

export const SlugSchema = z.string().min(1).max(200);

// ─── Unknown param guard ──────────────────────────────────────────────────────

/**
 * Returns an error Response if the request contains any query params
 * not in the allowed set. Returns null if all params are valid.
 *
 * Prevents callers from passing garbage params and expecting behavior
 * that isn't defined.
 */
export function rejectUnknownParams(
  searchParams: URLSearchParams,
  allowed: Set<string>,
): Response | null {
  const unknown = [...searchParams.keys()].filter((k) => !allowed.has(k));
  if (unknown.length === 0) return null;
  return apiErrorResponse(
    "UNKNOWN_PARAMS",
    `Unknown query parameter(s): ${unknown.map((k) => `"${k}"`).join(", ")}. Allowed: ${[...allowed].map((k) => `"${k}"`).join(", ")}.`,
  );
}
