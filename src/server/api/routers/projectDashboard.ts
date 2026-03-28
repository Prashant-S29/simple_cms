import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  activityLog,
  apiRequestLog,
  blogPost,
  blogPostContent,
  cmsSchema,
  projectApiKey,
  projectLanguage,
} from "~/server/db/project";
import { orgMember, orgMemberProject } from "~/server/db/orgMember";
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
  days: z.number().int().min(1).max(90).default(30),
});

export const projectDashboardRouter = createTRPCRouter({
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
        schemasWithoutStructureResult,
        recentSchemasResult,
        recentBlogsResult,
        apiKeyListResult,
        adminCountResult,
        managerCountResult,
        adminListResult,
        managerListResult,
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

        // Active API keys count
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

        // Schemas without structure
        ctx.db
          .select({ count: count() })
          .from(cmsSchema)
          .where(
            and(
              eq(cmsSchema.projectId, projectId),
              sql`${cmsSchema.schemaStructure} IS NULL`,
            ),
          ),

        // Recent 4 schemas
        ctx.db
          .select({
            id: cmsSchema.id,
            title: cmsSchema.title,
            slug: cmsSchema.slug,
            hasStructure: cmsSchema.schemaStructure,
            updatedAt: cmsSchema.updatedAt,
          })
          .from(cmsSchema)
          .where(eq(cmsSchema.projectId, projectId))
          .orderBy(desc(cmsSchema.updatedAt))
          .limit(4),

        // Recent 4 blog posts
        ctx.db
          .select({
            id: blogPost.id,
            slug: blogPost.slug,
            updatedAt: blogPost.updatedAt,
          })
          .from(blogPost)
          .where(eq(blogPost.projectId, projectId))
          .orderBy(desc(blogPost.updatedAt))
          .limit(4),

        // Active API keys (for key list)
        ctx.db
          .select({
            id: projectApiKey.id,
            name: projectApiKey.name,
            keyPrefix: projectApiKey.keyPrefix,
            status: projectApiKey.status,
            lastUsedAt: projectApiKey.lastUsedAt,
            createdAt: projectApiKey.createdAt,
          })
          .from(projectApiKey)
          .where(
            and(
              eq(projectApiKey.projectId, projectId),
              eq(projectApiKey.status, "active"),
            ),
          )
          .orderBy(desc(projectApiKey.createdAt))
          .limit(5),

        // Admin/owner count for this project
        // Admin/owner count for this project
        ctx.db
          .select({ count: count() })
          .from(orgMember)
          .where(
            and(
              eq(orgMember.orgId, orgId),
              inArray(orgMember.role, ["owner", "admin"]),
              eq(orgMember.status, "active"),
            ),
          ),

        // Manager count assigned to this project
        ctx.db
          .select({ count: count() })
          .from(orgMemberProject)
          .where(eq(orgMemberProject.projectId, projectId)),

        // Admin/owner user list (for avatars)
        ctx.db
          .select({
            id: user.id,
            name: user.name,
            image: user.image,
          })
          .from(orgMember)
          .innerJoin(user, eq(orgMember.userId, user.id))
          .where(
            and(
              eq(orgMember.orgId, orgId),
              inArray(orgMember.role, ["owner", "admin"]),
              eq(orgMember.status, "active"),
            ),
          )
          .limit(5),

        // Manager user list (for avatars)
        ctx.db
          .select({
            id: user.id,
            name: user.name,
            image: user.image,
          })
          .from(orgMemberProject)
          .innerJoin(orgMember, eq(orgMemberProject.orgMemberId, orgMember.id))
          .innerJoin(user, eq(orgMember.userId, user.id))
          .where(eq(orgMemberProject.projectId, projectId))
          .limit(5),
      ]);

      const normalizedSchemas = recentSchemasResult.map((s) => ({
        ...s,
        hasStructure: s.hasStructure !== null,
      }));

      return successResponse(
        {
          schemas: {
            total: schemaCountResult[0]?.count ?? 0,
            withoutStructure: schemasWithoutStructureResult[0]?.count ?? 0,
            recent: normalizedSchemas,
          },
          blogs: {
            total: blogCountResult[0]?.count ?? 0,
            published: publishedBlogCountResult[0]?.count ?? 0,
            recent: recentBlogsResult,
          },
          languages: {
            active: langCountResult[0]?.count ?? 0,
          },
          apiKeys: {
            active: activeKeyCountResult[0]?.count ?? 0,
            list: apiKeyListResult,
          },
          team: {
            admins: adminCountResult[0]?.count ?? 0,
            managers: managerCountResult[0]?.count ?? 0,
            adminList: adminListResult,
            managerList: managerListResult,
          },
        },
        "Dashboard stats fetched.",
      );
    }),

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
        ctx.db
          .select({ count: count() })
          .from(apiRequestLog)
          .where(whereClause),
        ctx.db
          .select({ count: count() })
          .from(apiRequestLog)
          .where(
            and(
              whereClause,
              sql`${apiRequestLog.statusCode} >= 200 AND ${apiRequestLog.statusCode} < 300`,
            ),
          ),
        ctx.db
          .select({ count: count() })
          .from(apiRequestLog)
          .where(and(whereClause, sql`${apiRequestLog.statusCode} >= 400`)),
        ctx.db
          .select({ avg: sql<number>`ROUND(AVG(${apiRequestLog.durationMs}))` })
          .from(apiRequestLog)
          .where(whereClause),
        ctx.db
          .select({
            date: sql<string>`DATE(${apiRequestLog.createdAt})`,
            total: count(),
            errors: sql<number>`COUNT(*) FILTER (WHERE ${apiRequestLog.statusCode} >= 400)`,
            success: sql<number>`COUNT(*) FILTER (WHERE ${apiRequestLog.statusCode} >= 200 AND ${apiRequestLog.statusCode} < 300)`,
          })
          .from(apiRequestLog)
          .where(whereClause)
          .groupBy(sql`DATE(${apiRequestLog.createdAt})`)
          .orderBy(sql`DATE(${apiRequestLog.createdAt})`),
        ctx.db
          .select({ endpoint: apiRequestLog.endpoint, total: count() })
          .from(apiRequestLog)
          .where(whereClause)
          .groupBy(apiRequestLog.endpoint)
          .orderBy(desc(count()))
          .limit(5),
        ctx.db
          .select({ errorCode: apiRequestLog.errorCode, total: count() })
          .from(apiRequestLog)
          .where(and(whereClause, sql`${apiRequestLog.errorCode} IS NOT NULL`))
          .groupBy(apiRequestLog.errorCode)
          .orderBy(desc(count()))
          .limit(5),
        ctx.db
          .select({ statusCode: apiRequestLog.statusCode, total: count() })
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
