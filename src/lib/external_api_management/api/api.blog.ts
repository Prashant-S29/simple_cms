import { apiErrorResponse } from "../errors";
import { LocaleSchema, SlugSchema, rejectUnknownParams } from "../validation";

const BLOGS_LIST_ALLOWED_PARAMS = new Set(["locale"]);
const BLOGS_DETAIL_ALLOWED_PARAMS = new Set(["locale"]);

/**
 * Parses and validates query params for GET /api/v1/blogs
 *
 * Required: locale
 * Rejects any unknown params
 */
export function parseBlogsListParams(
  searchParams: URLSearchParams,
): { ok: true; locale: string } | { ok: false; response: Response } {
  // ── Reject unknown params ──────────────────────────────────────────────────
  const unknownError = rejectUnknownParams(
    searchParams,
    BLOGS_LIST_ALLOWED_PARAMS,
  );
  if (unknownError) return { ok: false, response: unknownError };

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

  return { ok: true, locale: localeResult.data };
}

/**
 * Parses and validates route + query params for GET /api/v1/blogs/[slug]
 *
 * Required: slug (route param), locale (query param)
 * Rejects any unknown query params
 */
export function parseBlogDetailParams(
  rawSlug: string,
  searchParams: URLSearchParams,
):
  | { ok: true; slug: string; locale: string }
  | { ok: false; response: Response } {
  // ── Reject unknown query params ────────────────────────────────────────────
  const unknownError = rejectUnknownParams(
    searchParams,
    BLOGS_DETAIL_ALLOWED_PARAMS,
  );
  if (unknownError) return { ok: false, response: unknownError };

  // ── slug (route param) ─────────────────────────────────────────────────────
  const slugResult = SlugSchema.safeParse(rawSlug);
  if (!slugResult.success) {
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

  return { ok: true, slug: slugResult.data, locale: localeResult.data };
}
