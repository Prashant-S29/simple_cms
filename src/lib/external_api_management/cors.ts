/**
 * Standard CORS headers for all public API routes.
 *
 * Allow-Origin is * — API keys are the auth mechanism, not origin restriction.
 * If you need per-project origin restriction in the future, add an
 * `allowedOrigins` column to `project_api_key` and resolve it here.
 */
export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "x-api-key, Content-Type",
  "Access-Control-Max-Age": "86400", // cache preflight for 24h
};

/**
 * Returns a 204 No Content response for OPTIONS preflight requests.
 * Add `export const OPTIONS = handleOptions` to every API route file.
 */
export function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * Appends CORS headers to an existing Response.
 * Use this to wrap all responses returned from GET handlers.
 */
export function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
