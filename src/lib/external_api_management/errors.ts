import { externalError, type ExternalErrorResponse } from "./types";

export const EXTERNAL_ERRORS = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  MISSING_API_KEY: {
    code: "MISSING_API_KEY",
    message: "Missing x-api-key header.",
    status: 401,
  },
  INVALID_API_KEY: {
    code: "INVALID_API_KEY",
    message: "API key not found or has been revoked.",
    status: 401,
  },
  INVALID_KEY_FORMAT: {
    code: "INVALID_API_KEY",
    message: "Invalid API key format. Keys must start with 'scms_'.",
    status: 401,
  },

  // ── General validation ────────────────────────────────────────────────────
  UNKNOWN_PARAMS: {
    code: "UNKNOWN_PARAMS",
    message: "Unknown query parameters provided.",
    status: 400,
  },
  MISSING_SCHEMA_PARAM: {
    code: "MISSING_PARAM",
    message: "Query param 'schema' is required.",
    status: 400,
  },
  MISSING_LOCALE_PARAM: {
    code: "MISSING_PARAM",
    message: "Query param 'locale' is required.",
    status: 400,
  },
  INVALID_LOCALE: {
    code: "VALIDATION_ERROR",
    message: "Locale must be a valid BCP-47 code (e.g. 'en', 'ar', 'zh-TW').",
    status: 400,
  },
  INVALID_SLUG: {
    code: "VALIDATION_ERROR",
    message: "Slug must be a non-empty string of max 200 characters.",
    status: 400,
  },

  // ── Locale ────────────────────────────────────────────────────────────────
  LOCALE_NOT_FOUND: {
    code: "LOCALE_NOT_FOUND",
    message: "Locale is not configured for this project.",
    status: 404,
  },
  LOCALE_DISABLED: {
    code: "LOCALE_DISABLED",
    message: "Locale is disabled. Contact the project admin to re-enable it.",
    status: 403,
  },

  // ── Content ───────────────────────────────────────────────────────────────
  SCHEMA_NOT_FOUND: {
    code: "SCHEMA_NOT_FOUND",
    message: "Schema not found.",
    status: 404,
  },

  // ── Blog ──────────────────────────────────────────────────────────────────
  POST_NOT_FOUND: {
    code: "POST_NOT_FOUND",
    message: "Blog post not found.",
    status: 404,
  },
  POST_NOT_PUBLISHED: {
    code: "POST_NOT_PUBLISHED",
    message: "Blog post is not published in this locale.",
    status: 404,
  },

  // ── Internal ──────────────────────────────────────────────────────────────
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    message: "Something went wrong. Please try again later.",
    status: 500,
  },
} as const;

export type ExternalErrorKey = keyof typeof EXTERNAL_ERRORS;

/**
 * Build a standardized JSON error Response from the catalog.
 * Accepts an optional message override for dynamic context
 * (e.g. including the actual locale/slug in the message).
 */
export function apiErrorResponse(
  key: ExternalErrorKey,
  messageOverride?: string,
): Response {
  const entry = EXTERNAL_ERRORS[key];
  const body: ExternalErrorResponse = externalError(
    entry.code,
    messageOverride ?? entry.message,
  );
  return Response.json(body, { status: entry.status });
}
