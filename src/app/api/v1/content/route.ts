import { type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "~/server/db";
import { cmsContent, cmsSchema, projectLanguage } from "~/server/db/project";
import {
  buildAuthErrorResponse,
  detectClientType,
  hashIp,
  resolveApiKey,
  writeRequestLog,
  apiErrorResponse,
  apiSuccessResponse,
} from "~/lib/external_api_management";
import { initContentFromSchema } from "~/lib/cms/contentInitializer";
import type { SchemaStructure } from "~/zodSchema/cmsSchema";
import { parseContentParams } from "~/lib/external_api_management/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  const start = Date.now();
  const clientType = detectClientType(req);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ipHash = hashIp(ip);
  const country = req.headers.get("x-vercel-ip-country") ?? null;

  // ── Auth ───────────────────────────────────────────────────────────────────
  const auth = await resolveApiKey(req);

  if (!auth.ok) {
    writeRequestLog({
      projectId: "unknown",
      apiKeyId: null,
      endpoint: "content",
      statusCode: 401,
      errorCode: auth.errorKey,
      durationMs: Date.now() - start,
      ipHash,
      country,
      clientType,
    });
    return buildAuthErrorResponse(auth);
  }

  const { projectId, apiKeyId } = auth;

  // ── Validate + parse query params ──────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const parsed = parseContentParams(searchParams);

  if (!parsed.ok) {
    writeRequestLog({
      projectId,
      apiKeyId,
      endpoint: "content",
      statusCode: 400,
      errorCode: "VALIDATION_ERROR",
      durationMs: Date.now() - start,
      ipHash,
      country,
      clientType,
    });
    return parsed.response;
  }

  const { schemaSlug, locale } = parsed;

  // ── Verify locale is active ────────────────────────────────────────────────
  const [lang] = await db
    .select({ status: projectLanguage.status })
    .from(projectLanguage)
    .where(
      and(
        eq(projectLanguage.projectId, projectId),
        eq(projectLanguage.locale, locale),
      ),
    )
    .limit(1);

  if (!lang) {
    const res = apiErrorResponse(
      "LOCALE_NOT_FOUND",
      `Locale "${locale}" is not configured for this project.`,
    );
    writeRequestLog({
      projectId,
      apiKeyId,
      endpoint: "content",
      resourceSlug: schemaSlug,
      locale,
      statusCode: 404,
      errorCode: "LOCALE_NOT_FOUND",
      durationMs: Date.now() - start,
      ipHash,
      country,
      clientType,
    });
    return res;
  }

  if (lang.status === "disabled") {
    const res = apiErrorResponse(
      "LOCALE_DISABLED",
      `Locale "${locale}" is disabled. Contact the project admin.`,
    );
    writeRequestLog({
      projectId,
      apiKeyId,
      endpoint: "content",
      resourceSlug: schemaSlug,
      locale,
      statusCode: 403,
      errorCode: "LOCALE_DISABLED",
      durationMs: Date.now() - start,
      ipHash,
      country,
      clientType,
    });
    return res;
  }

  // ── Resolve schema ─────────────────────────────────────────────────────────
  const [schemaRow] = await db
    .select({
      id: cmsSchema.id,
      slug: cmsSchema.slug,
      schemaStructure: cmsSchema.schemaStructure,
    })
    .from(cmsSchema)
    .where(
      and(eq(cmsSchema.slug, schemaSlug), eq(cmsSchema.projectId, projectId)),
    )
    .limit(1);

  if (!schemaRow) {
    const res = apiErrorResponse(
      "SCHEMA_NOT_FOUND",
      `Schema "${schemaSlug}" not found.`,
    );
    writeRequestLog({
      projectId,
      apiKeyId,
      endpoint: "content",
      resourceSlug: schemaSlug,
      locale,
      statusCode: 404,
      errorCode: "SCHEMA_NOT_FOUND",
      durationMs: Date.now() - start,
      ipHash,
      country,
      clientType,
    });
    return res;
  }

  // ── Fetch content ──────────────────────────────────────────────────────────
  const [contentRow] = await db
    .select({
      content: cmsContent.content,
      updatedAt: cmsContent.updatedAt,
    })
    .from(cmsContent)
    .where(
      and(eq(cmsContent.schemaId, schemaRow.id), eq(cmsContent.locale, locale)),
    )
    .limit(1);

  const content =
    contentRow?.content ??
    (schemaRow.schemaStructure
      ? initContentFromSchema(schemaRow.schemaStructure as SchemaStructure)
      : {});

  const res = apiSuccessResponse(
    {
      schema: schemaSlug,
      locale,
      content,
      updatedAt: contentRow?.updatedAt ?? null,
    },
    "Content fetched successfully.",
    { cacheSeconds: 60 },
  );

  writeRequestLog({
    projectId,
    apiKeyId,
    endpoint: "content",
    resourceSlug: schemaSlug,
    locale,
    statusCode: 200,
    durationMs: Date.now() - start,
    ipHash,
    country,
    clientType,
  });

  return res;
}
