import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { db } from "~/server/db";
import { apiRequestLog, projectApiKey } from "~/server/db/project";
import { eq, and } from "drizzle-orm";
import { hashApiKey } from "~/lib/apiKey";

import {
  apiErrorResponse,
  type ExternalErrorKey,
} from "~/lib/external_api_management";

export type ClientType = "browser" | "server" | "unknown";

export interface AuthResult {
  ok: true;
  projectId: string;
  apiKeyId: string;
  keyName: string;
}

export interface AuthError {
  ok: false;
  errorKey: ExternalErrorKey;
  messageOverride?: string;
}

/**
 * Resolves and validates the x-api-key header.
 * Returns projectId and keyId on success, or an error key on failure.
 */
export async function resolveApiKey(
  req: NextRequest,
): Promise<AuthResult | AuthError> {
  const rawKey = req.headers.get("x-api-key");

  if (!rawKey) {
    return { ok: false, errorKey: "MISSING_API_KEY" };
  }

  if (!rawKey.startsWith("scms_")) {
    return { ok: false, errorKey: "INVALID_KEY_FORMAT" };
  }

  const keyHash = hashApiKey(rawKey);

  const [key] = await db
    .select({
      id: projectApiKey.id,
      projectId: projectApiKey.projectId,
      name: projectApiKey.name,
      status: projectApiKey.status,
    })
    .from(projectApiKey)
    .where(
      and(
        eq(projectApiKey.keyHash, keyHash),
        eq(projectApiKey.status, "active"),
      ),
    )
    .limit(1);

  if (!key) {
    return { ok: false, errorKey: "INVALID_API_KEY" };
  }

  // Fire-and-forget: update lastUsedAt
  void db
    .update(projectApiKey)
    .set({ lastUsedAt: new Date() })
    .where(eq(projectApiKey.id, key.id));

  return {
    ok: true,
    projectId: key.projectId,
    apiKeyId: key.id,
    keyName: key.name,
  };
}

/**
 * Builds an auth error Response using the external API management helpers.
 */
export function buildAuthErrorResponse(error: AuthError): Response {
  return apiErrorResponse(error.errorKey, error.messageOverride);
}

/**
 * Detects client type from the User-Agent header.
 */
export function detectClientType(req: NextRequest): ClientType {
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua) return "unknown";
  if (/node|python|go-http|java|curl|axios|fetch|next\.js|vercel/i.test(ua)) {
    return "server";
  }
  if (/mozilla|chrome|safari|firefox|edge/i.test(ua)) {
    return "browser";
  }
  return "unknown";
}

/**
 * Hashes an IP address for privacy-safe logging.
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

/**
 * Writes a request log entry. Fire-and-forget — never awaited.
 */
export function writeRequestLog(params: {
  projectId: string;
  apiKeyId: string | null;
  endpoint: string;
  resourceSlug?: string;
  locale?: string;
  statusCode: number;
  errorCode?: string;
  durationMs: number;
  responseSizeBytes?: number;
  ipHash?: string | null;
  country?: string | null;
  clientType: ClientType;
}): void {
  void db.insert(apiRequestLog).values({
    projectId: params.projectId,
    apiKeyId: params.apiKeyId,
    endpoint: params.endpoint,
    resourceSlug: params.resourceSlug,
    locale: params.locale,
    statusCode: params.statusCode,
    errorCode: params.errorCode,
    durationMs: params.durationMs,
    responseSizeBytes: params.responseSizeBytes,
    ipHash: params.ipHash,
    country: params.country,
    clientType: params.clientType,
  });
}
