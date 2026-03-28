import { type NextRequest } from "next/server";
import { and, eq, desc } from "drizzle-orm";
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
} from "~/lib/external_api_management/apiAuth";
import {
  apiErrorResponse,
  apiSuccessResponse,
  handleOptions,
  withCors,
} from "~/lib/external_api_management";
import { parseBlogsListParams } from "~/lib/external_api_management/api";

export const runtime = "nodejs";
export const OPTIONS = handleOptions;

export async function GET(req: NextRequest): Promise<Response> {
  const start = Date.now();
  const clientType = detectClientType(req);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const ipHash = hashIp(ip);
  const country = req.headers.get("x-vercel-ip-country") ?? null;

  // ── Auth ───────────────────────────────────────────────────────────────────
  const auth = await resolveApiKey(req);

  if (!auth.ok) {
    return withCors(buildAuthErrorResponse(auth));
  }

  const { projectId, apiKeyId } = auth;

  // ── Validate + parse query params ──────────────────────────────────────────
  const { searchParams } = new URL(req.url);
  const parsed = parseBlogsListParams(searchParams);

  if (!parsed.ok) {
    await writeRequestLog({
      projectId,
      apiKeyId,
      endpoint: "blogs.list",
      statusCode: 400,
      errorCode: "VALIDATION_ERROR",
      durationMs: Date.now() - start,
      ipHash,
      country,
      clientType,
    });
    return withCors(parsed.response);
  }

  const { locale } = parsed;

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
    await writeRequestLog({
      projectId,
      apiKeyId,
      endpoint: "blogs.list",
      locale,
      statusCode: 404,
      errorCode: "LOCALE_NOT_FOUND",
      durationMs: Date.now() - start,
      ipHash,
      country,
      clientType,
    });
    return withCors(
      apiErrorResponse(
        "LOCALE_NOT_FOUND",
        `Locale "${locale}" is not configured for this project.`,
      ),
    );
  }

  if (lang.status === "disabled") {
    await writeRequestLog({
      projectId,
      apiKeyId,
      endpoint: "blogs.list",
      locale,
      statusCode: 403,
      errorCode: "LOCALE_DISABLED",
      durationMs: Date.now() - start,
      ipHash,
      country,
      clientType,
    });
    return withCors(
      apiErrorResponse("LOCALE_DISABLED", `Locale "${locale}" is disabled.`),
    );
  }

  // ── Fetch published active posts ───────────────────────────────────────────
  const posts = await db
    .select({
      slug: blogPost.slug,
      title: blogPostContent.title,
      excerpt: blogPostContent.excerpt,
      coverImage: blogPostContent.coverImage,
      authorName: blogPostContent.authorName,
      authorDesignation: blogPostContent.authorDesignation,
      authorCompany: blogPostContent.authorCompany,
      tags: blogPostContent.tags,
      customMeta: blogPostContent.customMeta,
      publishedAt: blogPostContent.publishedAt,
      updatedAt: blogPostContent.updatedAt,
    })
    .from(blogPost)
    .innerJoin(
      blogPostContent,
      and(
        eq(blogPostContent.postId, blogPost.id),
        eq(blogPostContent.locale, locale),
        eq(blogPostContent.status, "published"),
        eq(blogPostContent.isActive, true),
      ),
    )
    .where(eq(blogPost.projectId, projectId))
    .orderBy(desc(blogPostContent.publishedAt));

  const res = withCors(
    apiSuccessResponse(
      {
        locale,
        posts: posts.map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          coverImage: p.coverImage,
          author: p.authorName
            ? {
                name: p.authorName,
                designation: p.authorDesignation,
                company: p.authorCompany,
              }
            : null,
          tags: p.tags,
          meta: p.customMeta,
          publishedAt: p.publishedAt,
          updatedAt: p.updatedAt,
        })),
      },
      "Blog posts fetched successfully.",
      { cacheSeconds: 60 },
    ),
  );

  await writeRequestLog({
    projectId,
    apiKeyId,
    endpoint: "blogs.list",
    locale,
    statusCode: 200,
    durationMs: Date.now() - start,
    ipHash,
    country,
    clientType,
  });

  return res;
}
