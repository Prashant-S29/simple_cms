import { type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "~/server/db";
import {
  blogPost,
  blogPostContent,
  projectLanguage,
} from "~/server/db/project";
import {
  buildAuthErrorResponse,
  detectClientType,
  hashIp,
  resolveApiKey,
  writeRequestLog,
  apiErrorResponse,
  apiSuccessResponse,
} from "~/lib/external_api_management";
import { parseBlogDetailParams } from "~/lib/external_api_management/api";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const start = Date.now();
  const clientType = detectClientType(req);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ipHash = hashIp(ip);
  const country = req.headers.get("x-vercel-ip-country") ?? null;
  const { slug: rawSlug } = await params;

  // ── Auth ───────────────────────────────────────────────────────────────────
  const auth = await resolveApiKey(req);

  if (!auth.ok) {
    writeRequestLog({
      projectId: "unknown",
      apiKeyId: null,
      endpoint: "blogs.detail",
      resourceSlug: rawSlug,
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

  // ── Validate + parse params ────────────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const parsed = parseBlogDetailParams(rawSlug, searchParams);

  if (!parsed.ok) {
    writeRequestLog({
      projectId,
      apiKeyId,
      endpoint: "blogs.detail",
      resourceSlug: rawSlug,
      statusCode: 400,
      errorCode: "VALIDATION_ERROR",
      durationMs: Date.now() - start,
      ipHash,
      country,
      clientType,
    });
    return parsed.response;
  }

  const { slug, locale } = parsed;

  // ── Verify locale ──────────────────────────────────────────────────────────
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
      endpoint: "blogs.detail",
      resourceSlug: slug,
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
      `Locale "${locale}" is disabled.`,
    );
    writeRequestLog({
      projectId,
      apiKeyId,
      endpoint: "blogs.detail",
      resourceSlug: slug,
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

  // ── Resolve post ───────────────────────────────────────────────────────────
  const [post] = await db
    .select({ id: blogPost.id, slug: blogPost.slug })
    .from(blogPost)
    .where(and(eq(blogPost.slug, slug), eq(blogPost.projectId, projectId)))
    .limit(1);

  if (!post) {
    const res = apiErrorResponse(
      "POST_NOT_FOUND",
      `Blog post "${slug}" not found.`,
    );
    writeRequestLog({
      projectId,
      apiKeyId,
      endpoint: "blogs.detail",
      resourceSlug: slug,
      locale,
      statusCode: 404,
      errorCode: "POST_NOT_FOUND",
      durationMs: Date.now() - start,
      ipHash,
      country,
      clientType,
    });
    return res;
  }

  // ── Fetch published + active content ──────────────────────────────────────
  const [content] = await db
    .select()
    .from(blogPostContent)
    .where(
      and(
        eq(blogPostContent.postId, post.id),
        eq(blogPostContent.locale, locale),
        eq(blogPostContent.isActive, true),
        eq(blogPostContent.status, "published"),
      ),
    )
    .limit(1);

  if (!content) {
    const res = apiErrorResponse(
      "POST_NOT_PUBLISHED",
      `Blog post "${slug}" is not published in locale "${locale}".`,
    );
    writeRequestLog({
      projectId,
      apiKeyId,
      endpoint: "blogs.detail",
      resourceSlug: slug,
      locale,
      statusCode: 404,
      errorCode: "POST_NOT_PUBLISHED",
      durationMs: Date.now() - start,
      ipHash,
      country,
      clientType,
    });
    return res;
  }

  const res = apiSuccessResponse(
    {
      slug: post.slug,
      locale,
      title: content.title,
      excerpt: content.excerpt,
      coverImage: content.coverImage,
      body: content.body,
      author: content.authorName
        ? {
            name: content.authorName,
            designation: content.authorDesignation,
            company: content.authorCompany,
          }
        : null,
      tags: content.tags,
      meta: content.customMeta,
      publishedAt: content.publishedAt,
      updatedAt: content.updatedAt,
    },
    "Blog post fetched successfully.",
    { cacheSeconds: 60 },
  );

  writeRequestLog({
    projectId,
    apiKeyId,
    endpoint: "blogs.detail",
    resourceSlug: slug,
    locale,
    statusCode: 200,
    durationMs: Date.now() - start,
    ipHash,
    country,
    clientType,
  });

  return res;
}
