import { apiErrorResponse } from "../errors";
import { LocaleSchema, SlugSchema, rejectUnknownParams } from "../validation";

const ALLOWED_PARAMS = new Set(["schema", "locale"]);

/**
 * Parses and validates query params for GET /api/v1/content
 *
 * Required: schema, locale
 * Rejects any unknown params
 */
export function parseContentParams(
  searchParams: URLSearchParams,
):
  | { ok: true; schemaSlug: string; locale: string }
  | { ok: false; response: Response } {
  // ── Reject unknown params ──────────────────────────────────────────────────
  const unknownError = rejectUnknownParams(searchParams, ALLOWED_PARAMS);
  if (unknownError) return { ok: false, response: unknownError };

  // ── schema ─────────────────────────────────────────────────────────────────
  const schemaRaw = searchParams.get("schema");
  if (!schemaRaw) {
    return { ok: false, response: apiErrorResponse("MISSING_SCHEMA_PARAM") };
  }
  const schemaResult = SlugSchema.safeParse(schemaRaw);
  if (!schemaResult.success) {
    return { ok: false, response: apiErrorResponse("INVALID_SLUG") };
  }

  // ── locale ─────────────────────────────────────────────────────────────────
  const localeRaw = searchParams.get("locale");
  if (!localeRaw) {
    return { ok: false, response: apiErrorResponse("MISSING_LOCALE_PARAM") };
  }
  const localeResult = LocaleSchema.safeParse(localeRaw);
  if (!localeResult.success) {
    return {
      ok: false,
      response: apiErrorResponse(
        "INVALID_LOCALE",
        `Invalid locale "${localeRaw}". Must be a BCP-47 code like 'en' or 'ar'.`,
      ),
    };
  }

  return { ok: true, schemaSlug: schemaResult.data, locale: localeResult.data };
}
