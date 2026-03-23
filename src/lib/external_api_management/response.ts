import { externalSuccess } from "./types";

/**
 * Build a standardized JSON success Response.
 * Optionally adds Cache-Control headers.
 */
export function apiSuccessResponse<T>(
  data: T,
  message: string,
  options?: { cacheSeconds?: number },
): Response {
  const body = externalSuccess(data, message);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options?.cacheSeconds) {
    const ttl = options.cacheSeconds;
    headers["Cache-Control"] =
      `s-maxage=${ttl}, stale-while-revalidate=${ttl * 5}`;
  }
  return Response.json(body, { status: 200, headers });
}
