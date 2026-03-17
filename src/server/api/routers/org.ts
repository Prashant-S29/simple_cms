import { and, count, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { org } from "~/server/db/org";
import { project } from "~/server/db/project";
import { slugify } from "~/lib/utils";
import {
  CreateOrgSchema,
  GetOrgBySlugSchema,
  GetOrgsSchema,
  UpdateOrgSchema,
} from "~/zodSchema/org";
import { errorResponse, getErrorInfo, successResponse } from "~/lib/errors";

export const orgRouter = createTRPCRouter({
  /**
   * Create a new organization.
   * Returns an error (never throws) if the slug derived from `name` already
   * exists — i.e. an org with the same name already exists for this user.
   */
  create: protectedProcedure
    .input(CreateOrgSchema)
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.name);

      // Reject duplicate slugs instead of silently appending a suffix
      const [existing] = await ctx.db
        .select({ id: org.id })
        .from(org)
        .where(eq(org.slug, slug))
        .limit(1);

      if (existing) {
        return errorResponse(
          getErrorInfo("org", "DUPLICATE_RECORD", {
            message: `"${input.name}" already exists.`,
          }),
        );
      }

      const [newOrg] = await ctx.db
        .insert(org)
        .values({
          name: input.name,
          slug,
          createdById: ctx.session.user.id,
        })
        .returning();

      return successResponse(newOrg!, `"${input.name}" has been created.`);
    }),

  getAll: protectedProcedure
    .input(GetOrgsSchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search } = input;
      const offset = (page - 1) * limit;

      const whereClause = and(
        eq(org.createdById, ctx.session.user.id),
        search ? ilike(org.name, `%${search}%`) : undefined,
      );

      const [items, totalResult] = await Promise.all([
        ctx.db
          .select({
            id: org.id,
            name: org.name,
            slug: org.slug,
            createdAt: org.createdAt,
            projectCount: count(project.id),
          })
          .from(org)
          .leftJoin(project, eq(project.orgId, org.id))
          .where(whereClause)
          .groupBy(org.id)
          .orderBy(desc(org.createdAt))
          .limit(limit)
          .offset(offset),

        ctx.db.select({ total: count() }).from(org).where(whereClause),
      ]);

      const total = totalResult[0]?.total ?? 0;
      const hasNext = offset + items.length < total;

      return successResponse(
        {
          items,
          total,
          page,
          limit,
          hasNext,
          nextPage: hasNext ? page + 1 : null,
        },
        "Organizations fetched successfully.",
      );
    }),

  getBySlug: protectedProcedure
    .input(GetOrgBySlugSchema)
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({
          id: org.id,
          name: org.name,
          slug: org.slug,
          createdAt: org.createdAt,
          projectCount: count(project.id),
        })
        .from(org)
        .leftJoin(project, eq(project.orgId, org.id))
        .where(
          and(
            eq(org.slug, input.slug),
            eq(org.createdById, ctx.session.user.id),
          ),
        )
        .groupBy(org.id)
        .limit(1);

      if (!result) {
        return errorResponse(getErrorInfo("org", "NOT_FOUND"));
      }

      return successResponse(result, "Organization fetched successfully.");
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({
          id: org.id,
          name: org.name,
          slug: org.slug,
          createdAt: org.createdAt,
          projectCount: count(project.id),
        })
        .from(org)
        .leftJoin(project, eq(project.orgId, org.id))
        .where(
          and(eq(org.id, input.id), eq(org.createdById, ctx.session.user.id)),
        )
        .groupBy(org.id)
        .limit(1);

      if (!result) {
        return errorResponse(getErrorInfo("org", "NOT_FOUND"));
      }

      return successResponse(result, "Organization fetched successfully.");
    }),

  update: protectedProcedure
    .input(UpdateOrgSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: org.id })
        .from(org)
        .where(
          and(eq(org.id, input.id), eq(org.createdById, ctx.session.user.id)),
        )
        .limit(1);

      if (!existing) {
        return errorResponse(getErrorInfo("org", "NOT_FOUND"));
      }

      const [updated] = await ctx.db
        .update(org)
        .set({ name: input.name })
        .where(eq(org.id, input.id))
        .returning();

      return successResponse(updated!, `"${input.name}" has been updated.`);
    }),
});
