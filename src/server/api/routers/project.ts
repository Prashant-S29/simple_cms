import { and, count, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { project, projectMember } from "~/server/db/project";
import { org } from "~/server/db/org";
import { slugify } from "~/lib/utils";
import {
  CreateProjectSchema,
  GetProjectBySlugSchema,
  GetProjectsSchema,
  UpdateProjectSchema,
} from "~/zodSchema/project";
import { errorResponse, getErrorInfo, successResponse } from "~/lib/errors";

export const projectRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.name);

      // Verify org ownership
      const [existingOrg] = await ctx.db
        .select({ id: org.id })
        .from(org)
        .where(
          and(
            eq(org.id, input.orgId),
            eq(org.createdById, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (!existingOrg) {
        return errorResponse(getErrorInfo("org", "NOT_FOUND"));
      }

      // Reject duplicate slugs within the same org
      const [existing] = await ctx.db
        .select({ id: project.id })
        .from(project)
        .where(and(eq(project.orgId, input.orgId), eq(project.slug, slug)))
        .limit(1);

      if (existing) {
        return errorResponse(
          getErrorInfo("project", "DUPLICATE_RECORD", {
            message: `"${input.name}" already exists in this organization.`,
          }),
        );
      }

      const [newProject] = await ctx.db
        .insert(project)
        .values({
          name: input.name,
          slug,
          description: input.description,
          orgId: input.orgId,
          createdById: ctx.session.user.id,
        })
        .returning();

      return successResponse(newProject!, `"${input.name}" has been created.`);
    }),

  getAll: protectedProcedure
    .input(GetProjectsSchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search, orgId } = input;
      const offset = (page - 1) * limit;

      const whereClause = and(
        eq(project.orgId, orgId),
        eq(project.createdById, ctx.session.user.id),
        search ? ilike(project.name, `%${search}%`) : undefined,
      );

      const [items, totalResult] = await Promise.all([
        ctx.db
          .select({
            id: project.id,
            name: project.name,
            slug: project.slug,
            description: project.description,
            orgId: project.orgId,
            createdAt: project.createdAt,
            memberCount: count(projectMember.id),
          })
          .from(project)
          .leftJoin(projectMember, eq(projectMember.projectId, project.id))
          .where(whereClause)
          .groupBy(project.id)
          .orderBy(desc(project.createdAt))
          .limit(limit)
          .offset(offset),

        ctx.db.select({ total: count() }).from(project).where(whereClause),
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
        "Projects fetched successfully.",
      );
    }),

  getBySlug: protectedProcedure
    .input(GetProjectBySlugSchema)
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          orgId: project.orgId,
          createdAt: project.createdAt,
          memberCount: count(projectMember.id),
        })
        .from(project)
        .leftJoin(projectMember, eq(projectMember.projectId, project.id))
        .where(
          and(
            eq(project.slug, input.slug),
            eq(project.orgId, input.orgId),
            eq(project.createdById, ctx.session.user.id),
          ),
        )
        .groupBy(project.id)
        .limit(1);

      if (!result) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      return successResponse(result, "Project fetched successfully.");
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .select({
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          orgId: project.orgId,
          createdAt: project.createdAt,
          memberCount: count(projectMember.id),
        })
        .from(project)
        .leftJoin(projectMember, eq(projectMember.projectId, project.id))
        .where(
          and(
            eq(project.id, input.id),
            eq(project.createdById, ctx.session.user.id),
          ),
        )
        .groupBy(project.id)
        .limit(1);

      if (!result) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      return successResponse(result, "Project fetched successfully.");
    }),

  update: protectedProcedure
    .input(UpdateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: project.id })
        .from(project)
        .where(
          and(
            eq(project.id, input.id),
            eq(project.createdById, ctx.session.user.id),
          ),
        )
        .limit(1);

      if (!existing) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      const [updated] = await ctx.db
        .update(project)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
        })
        .where(eq(project.id, input.id))
        .returning();

      return successResponse(updated!, `"${updated!.name}" has been updated.`);
    }),
});
