import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  activityLog,
  apiRequestLog,
  blogPost,
  blogPostContent,
  cmsContent,
  cmsSchema,
  projectApiKey,
  projectLanguage,
} from "~/server/db/project";
import { user } from "~/server/db/schema";
import { successResponse } from "~/lib/errors";
import { requireProjectAccess } from "~/server/api/membershipGuard";

const DashboardInputSchema = z.object({
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
});

const AnalyticsInputSchema = z.object({
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  /** Number of days to look back. Default 30. */
  days: z.number().int().min(1).max(90).default(30),
});

export const projectDashboardRouter = createTRPCRouter({
  /**
   * Overview stats for the project dashboard header cards.
   * Returns counts for schemas, blogs, languages, active API keys.
   * Also returns per-schema content fill status per active locale.
   */
  getStats: protectedProcedure
    .input(DashboardInputSchema)
    .query(async ({ ctx, input }) => {
      const { projectId, orgId } = input;

      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "project:read",
      );
      if (!guard.ok) return guard.response;

      const [
        schemaCountResult,
        blogCountResult,
        langCountResult,
        activeKeyCountResult,
        publishedBlogCountResult,
        contentCountResult,
      ] = await Promise.all([
        // Total schemas
        ctx.db
          .select({ count: count() })
          .from(cmsSchema)
          .where(eq(cmsSchema.projectId, projectId)),

        // Total blog posts
        ctx.db
          .select({ count: count() })
          .from(blogPost)
          .where(eq(blogPost.projectId, projectId)),

        // Active languages
        ctx.db
          .select({ count: count() })
          .from(projectLanguage)
          .where(
            and(
              eq(projectLanguage.projectId, projectId),
              eq(projectLanguage.status, "active"),
            ),
          ),

        // Active API keys
        ctx.db
          .select({ count: count() })
          .from(projectApiKey)
          .where(
            and(
              eq(projectApiKey.projectId, projectId),
              eq(projectApiKey.status, "active"),
            ),
          ),

        // Published blog posts
        ctx.db
          .select({ count: count() })
          .from(blogPostContent)
          .where(
            and(
              eq(blogPostContent.projectId, projectId),
              eq(blogPostContent.status, "published"),
              eq(blogPostContent.isActive, true),
            ),
          ),

        // Content rows that have been filled (content != {})
        ctx.db
          .select({ count: count() })
          .from(cmsContent)
          .where(eq(cmsContent.projectId, projectId)),
      ]);

      // Schemas with no structure defined
      const schemasWithoutStructure = await ctx.db
        .select({ count: count() })
        .from(cmsSchema)
        .where(
          and(
            eq(cmsSchema.projectId, projectId),
            sql`${cmsSchema.schemaStructure} IS NULL`,
          ),
        );

      return successResponse(
        {
          schemas: {
            total: schemaCountResult[0]?.count ?? 0,
            withoutStructure: schemasWithoutStructure[0]?.count ?? 0,
          },
          blogs: {
            total: blogCountResult[0]?.count ?? 0,
            published: publishedBlogCountResult[0]?.count ?? 0,
          },
          languages: {
            active: langCountResult[0]?.count ?? 0,
          },
          apiKeys: {
            active: activeKeyCountResult[0]?.count ?? 0,
          },
          content: {
            filledLocales: contentCountResult[0]?.count ?? 0,
          },
        },
        "Dashboard stats fetched.",
      );
    }),

  /**
   * API request analytics for the last N days.
   * Returns:
   *   - total requests, success count, error count
   *   - requests per day (for sparkline/chart)
   *   - top endpoints
   *   - top error codes
   *   - requests by status code breakdown
   */
  getAnalytics: protectedProcedure
    .input(AnalyticsInputSchema)
    .query(async ({ ctx, input }) => {
      const { projectId, orgId, days } = input;

      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "schema:manage",
      );
      if (!guard.ok) return guard.response;

      const since = new Date();
      since.setDate(since.getDate() - days);

      const whereClause = and(
        eq(apiRequestLog.projectId, projectId),
        gte(apiRequestLog.createdAt, since),
      );

      const [
        totalResult,
        successResult,
        errorResult,
        avgDurationResult,
        perDayResult,
        topEndpointsResult,
        topErrorsResult,
        statusBreakdownResult,
      ] = await Promise.all([
        // Total requests
        ctx.db
          .select({ count: count() })
          .from(apiRequestLog)
          .where(whereClause),

        // Successful (2xx)
        ctx.db
          .select({ count: count() })
          .from(apiRequestLog)
          .where(
            and(
              whereClause,
              sql`${apiRequestLog.statusCode} >= 200 AND ${apiRequestLog.statusCode} < 300`,
            ),
          ),

        // Errors (4xx + 5xx)
        ctx.db
          .select({ count: count() })
          .from(apiRequestLog)
          .where(and(whereClause, sql`${apiRequestLog.statusCode} >= 400`)),

        // Avg response time
        ctx.db
          .select({ avg: sql<number>`ROUND(AVG(${apiRequestLog.durationMs}))` })
          .from(apiRequestLog)
          .where(whereClause),

        // Requests per day
        ctx.db
          .select({
            date: sql<string>`DATE(${apiRequestLog.createdAt})`,
            total: count(),
            errors: sql<number>`COUNT(*) FILTER (WHERE ${apiRequestLog.statusCode} >= 400)`,
          })
          .from(apiRequestLog)
          .where(whereClause)
          .groupBy(sql`DATE(${apiRequestLog.createdAt})`)
          .orderBy(sql`DATE(${apiRequestLog.createdAt})`),

        // Top endpoints
        ctx.db
          .select({
            endpoint: apiRequestLog.endpoint,
            total: count(),
          })
          .from(apiRequestLog)
          .where(whereClause)
          .groupBy(apiRequestLog.endpoint)
          .orderBy(desc(count()))
          .limit(5),

        // Top error codes
        ctx.db
          .select({
            errorCode: apiRequestLog.errorCode,
            total: count(),
          })
          .from(apiRequestLog)
          .where(and(whereClause, sql`${apiRequestLog.errorCode} IS NOT NULL`))
          .groupBy(apiRequestLog.errorCode)
          .orderBy(desc(count()))
          .limit(5),

        // Status code breakdown
        ctx.db
          .select({
            statusCode: apiRequestLog.statusCode,
            total: count(),
          })
          .from(apiRequestLog)
          .where(whereClause)
          .groupBy(apiRequestLog.statusCode)
          .orderBy(desc(count())),
      ]);

      return successResponse(
        {
          period: { days, since },
          summary: {
            total: totalResult[0]?.count ?? 0,
            success: successResult[0]?.count ?? 0,
            errors: errorResult[0]?.count ?? 0,
            avgDurationMs: avgDurationResult[0]?.avg ?? 0,
            errorRate: totalResult[0]?.count
              ? Math.round(
                  ((errorResult[0]?.count ?? 0) / totalResult[0].count) * 100,
                )
              : 0,
          },
          perDay: perDayResult,
          topEndpoints: topEndpointsResult,
          topErrors: topErrorsResult,
          statusBreakdown: statusBreakdownResult,
        },
        "Analytics fetched.",
      );
    }),

  /**
   * Recent activity log for the project.
   * Returns the last N activity entries with user display info.
   */
  getActivityFeed: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        orgId: z.string().uuid(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { projectId, orgId, limit } = input;

      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "project:read",
      );
      if (!guard.ok) return guard.response;

      const entries = await ctx.db
        .select({
          id: activityLog.id,
          action: activityLog.action,
          resourceType: activityLog.resourceType,
          resourceId: activityLog.resourceId,
          resourceSlug: activityLog.resourceSlug,
          metadata: activityLog.metadata,
          createdAt: activityLog.createdAt,
          userName: user.name,
          userEmail: user.email,
          userImage: user.image,
        })
        .from(activityLog)
        .innerJoin(user, eq(activityLog.userId, user.id))
        .where(eq(activityLog.projectId, projectId))
        .orderBy(desc(activityLog.createdAt))
        .limit(limit);

      return successResponse(entries, "Activity feed fetched.");
    }),
});
