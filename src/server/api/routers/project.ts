import { and, count, desc, eq, ilike, inArray } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { project, projectLanguage } from "~/server/db/project";
import { slugify } from "~/lib/utils";
import {
  CreateProjectSchema,
  GetProjectBySlugSchema,
  GetProjectsSchema,
  UpdateProjectSchema,
  UpdateProjectWebhookSchema,
} from "~/zodSchema/project";
import { errorResponse, getErrorInfo, successResponse } from "~/lib/errors";
import {
  requireOrgAccess,
  requireProjectAccess,
  resolveOrgMembership,
} from "~/server/api/membershipGuard";

export const projectRouter = createTRPCRouter({
  /**
   * Create a project inside an org.
   * Allowed for: owner, admin.
   * Managers cannot create projects.
   *
   * Seeds "en" as the default language automatically.
   */
  create: protectedProcedure
    .input(CreateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireOrgAccess(
        ctx.db,
        input.orgId,
        ctx.session.user.id,
        "project:create",
      );
      if (!guard.ok) return guard.response;

      const slug = slugify(input.name);

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

      // Create project + seed default language in a transaction
      const newProject = await ctx.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(project)
          .values({
            name: input.name,
            slug,
            description: input.description,
            orgId: input.orgId,
            createdById: ctx.session.user.id,
          })
          .returning();

        // Always seed English as the default language
        await tx.insert(projectLanguage).values({
          projectId: created!.id,
          locale: "en",
          label: "English",
          isDefault: true,
          status: "active",
        });

        return created!;
      });

      return successResponse(newProject, `"${input.name}" has been created.`);
    }),

  /**
   * List projects for an org.
   *
   * - owner / admin  → all projects in the org
   * - manager        → only projects they have been assigned to
   */
  getAll: protectedProcedure
    .input(GetProjectsSchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search, orgId } = input;
      const offset = (page - 1) * limit;
      const userId = ctx.session.user.id;

      const membership = await resolveOrgMembership(ctx.db, orgId, userId);

      if (!membership) {
        return errorResponse(getErrorInfo("org", "NOT_FOUND"));
      }

      if (membership.status === "removed") {
        return errorResponse(getErrorInfo("orgMember", "REMOVED"));
      }

      const isManager = membership.orgRole === "manager";
      const assigned = membership.assignedProjectIds;

      if (isManager && assigned.length === 0) {
        return successResponse(
          { items: [], total: 0, page, limit, hasNext: false, nextPage: null },
          "Projects fetched successfully.",
        );
      }

      const whereClause = and(
        eq(project.orgId, orgId),
        isManager ? inArray(project.id, assigned) : undefined,
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
          })
          .from(project)
          .where(whereClause)
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

  /**
   * Fetch a single project by slug + orgId.
   * Managers can only fetch projects they have been assigned to.
   */
  getBySlug: protectedProcedure
    .input(GetProjectBySlugSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [projectRow] = await ctx.db
        .select({
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          orgId: project.orgId,
          createdAt: project.createdAt,
          webhookUrl: project.webhookUrl,
          webhookSecret: project.webhookSecret,
        })
        .from(project)
        .where(
          and(eq(project.slug, input.slug), eq(project.orgId, input.orgId)),
        )
        .limit(1);

      if (!projectRow) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        projectRow.id,
        userId,
        "project:read",
      );
      if (!guard.ok) return guard.response;

      return successResponse(
        { ...projectRow, myRole: guard.membership.orgRole },
        "Project fetched successfully.",
      );
    }),

  /** Fetch a single project by ID. */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid(), orgId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [projectRow] = await ctx.db
        .select({
          id: project.id,
          name: project.name,
          slug: project.slug,
          description: project.description,
          orgId: project.orgId,
          createdAt: project.createdAt,
          webhookUrl: project.webhookUrl,
          webhookSecret: project.webhookSecret,
        })
        .from(project)
        .where(and(eq(project.id, input.id), eq(project.orgId, input.orgId)))
        .limit(1);

      if (!projectRow) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        projectRow.id,
        userId,
        "project:read",
      );
      if (!guard.ok) return guard.response;

      return successResponse(
        { ...projectRow, myRole: guard.membership.orgRole },
        "Project fetched successfully.",
      );
    }),

  updateWebhook: protectedProcedure
    .input(UpdateProjectWebhookSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [projectRow] = await ctx.db
        .select({ id: project.id, orgId: project.orgId })
        .from(project)
        .where(eq(project.id, input.id))
        .limit(1);

      if (!projectRow) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      const guard = await requireProjectAccess(
        ctx.db,
        projectRow.orgId,
        projectRow.id,
        userId,
        "project:update",
      );
      if (!guard.ok) return guard.response;

      const [updated] = await ctx.db
        .update(project)
        .set({
          webhookUrl: input.webhookUrl ?? null,
          webhookSecret: input.webhookSecret ?? null,
        })
        .where(eq(project.id, input.id))
        .returning();

      if (!updated) {
        return errorResponse(getErrorInfo("project", "UPDATE_FAILED"));
      }

      return successResponse(updated, "Webhook settings saved.");
    }),

  update: protectedProcedure
    .input(UpdateProjectSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [projectRow] = await ctx.db
        .select({ id: project.id, orgId: project.orgId, name: project.name })
        .from(project)
        .where(eq(project.id, input.id))
        .limit(1);

      if (!projectRow) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      const guard = await requireProjectAccess(
        ctx.db,
        projectRow.orgId,
        projectRow.id,
        userId,
        "project:update",
      );
      if (!guard.ok) return guard.response;

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

      if (!updated) {
        return errorResponse(getErrorInfo("project", "UPDATE_FAILED"));
      }

      return successResponse(updated, `"${updated.name}" has been updated.`);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid(), orgId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [projectRow] = await ctx.db
        .select({ id: project.id, orgId: project.orgId, name: project.name })
        .from(project)
        .where(and(eq(project.id, input.id), eq(project.orgId, input.orgId)))
        .limit(1);

      if (!projectRow) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      const guard = await requireProjectAccess(
        ctx.db,
        projectRow.orgId,
        projectRow.id,
        userId,
        "project:delete",
      );
      if (!guard.ok) return guard.response;

      await ctx.db.delete(project).where(eq(project.id, input.id));

      return successResponse(null, `"${projectRow.name}" has been deleted.`);
    }),
});
