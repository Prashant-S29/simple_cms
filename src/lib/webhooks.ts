/**
 * Webhook utility — fire-and-forget POST to a client-configured endpoint.
 *
 * Rules:
 *  - Early-return if webhookUrl is falsy (no-op)
 *  - Never throws, never rejects — a dead endpoint must not break a CMS save
 *  - Logs URL + error message on failure, never logs the secret
 *  - Writes failures to apiRequestLog via writeRequestLog (network errors
 *    as statusCode 0, HTTP error responses as their actual status code)
 */

import { writeRequestLog } from "~/lib/external_api_management/apiAuth";

export type WebhookPayload =
  | { event: "content.published"; schema: string; locale: string }
  | { event: "blog.published"; slug: string; locale: string }
  | { event: "blog.unpublished"; slug: string; locale: string }
  | { event: "blog.deleted"; slug: string }
  | { event: "schema.updated"; schema: string };

/** Derive a stable resourceSlug + locale from any payload shape. */
function payloadMeta(payload: WebhookPayload): {
  resourceSlug: string;
  locale: string | undefined;
} {
  switch (payload.event) {
    case "content.published":
      return { resourceSlug: payload.schema, locale: payload.locale };
    case "blog.published":
    case "blog.unpublished":
      return { resourceSlug: payload.slug, locale: payload.locale };
    case "blog.deleted":
      return { resourceSlug: payload.slug, locale: undefined };
    case "schema.updated":
      return { resourceSlug: payload.schema, locale: undefined };
  }
}

export async function fireWebhook(
  projectId: string,
  webhookUrl: string | null | undefined,
  webhookSecret: string | null | undefined,
  payload: WebhookPayload,
): Promise<void> {
  // No URL configured — silent no-op
  if (!webhookUrl) return;

  // Build destination URL, appending secret as query param when present
  let url = webhookUrl;
  if (webhookSecret) {
    const separator = webhookUrl.includes("?") ? "&" : "?";
    url = `${webhookUrl}${separator}secret=${encodeURIComponent(webhookSecret)}`;
  }

  const { resourceSlug, locale } = payloadMeta(payload);
  const start = Date.now();

  try {
    console.debug("webhook: sending", url, payload)
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const durationMs = Date.now() - start;

    if (!response.ok) {
      // HTTP-level failure (4xx / 5xx) — log it, but still do not throw
      console.error(
        "[webhook] HTTP error from endpoint:",
        webhookUrl,
        response.status,
        response.statusText,
      );

      await writeRequestLog({
        projectId,
        apiKeyId: null,
        endpoint: "webhook",
        resourceSlug,
        locale,
        statusCode: response.status,
        errorCode: "WEBHOOK_HTTP_ERROR",
        durationMs,
        clientType: "server",
      });
    }
    
    console.debug("webhook success")
    
  } catch (err) {
    const durationMs = Date.now() - start;

    // Network-level failure (DNS, timeout, ECONNREFUSED, etc.)
    console.error(
      "[webhook] POST failed:",
      webhookUrl,
      err instanceof Error ? err.message : String(err),
    );

    await writeRequestLog({
      projectId,
      apiKeyId: null,
      endpoint: "webhook",
      resourceSlug,
      locale,
      statusCode: 0,
      errorCode: "WEBHOOK_NETWORK_ERROR",
      durationMs,
      clientType: "server",
    });
  }
}
