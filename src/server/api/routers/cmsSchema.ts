import { and, count, desc, eq, ilike } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cmsSchema } from "~/server/db/project";
import { slugify } from "~/lib/utils";
import { errorResponse, getErrorInfo, successResponse } from "~/lib/errors";
import { requireProjectAccess } from "~/server/api/membershipGuard";
import {
  CreateCmsSchemaSchema,
  DeleteCmsSchemaSchema,
  GetCmsSchemaBySlugSchema,
  GetCmsSchemasSchema,
  SaveSchemaStructureSchema,
  UpdateCmsSchemaSchema,
} from "~/zodSchema/cmsSchema";

export const cmsSchemaRouter = createTRPCRouter({
  /**
   * Create a new schema inside a project.
   * Only owner and admin can create schemas (project:update permission).
   */
  create: protectedProcedure
    .input(CreateCmsSchemaSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "project:update",
      );
      if (!guard.ok) return guard.response;

      const slug = slugify(input.title);

      const [existing] = await ctx.db
        .select({ id: cmsSchema.id })
        .from(cmsSchema)
        .where(
          and(
            eq(cmsSchema.projectId, input.projectId),
            eq(cmsSchema.slug, slug),
          ),
        )
        .limit(1);

      if (existing) {
        return errorResponse(
          getErrorInfo("project", "DUPLICATE_RECORD", {
            message: `A schema named "${input.title}" already exists in this project.`,
          }),
        );
      }

      const [newSchema] = await ctx.db
        .insert(cmsSchema)
        .values({
          projectId: input.projectId,
          title: input.title,
          slug,
          description: input.description,
          schemaStructure: null,
          createdById: ctx.session.user.id,
        })
        .returning();

      return successResponse(
        newSchema!,
        `Schema "${input.title}" has been created.`,
      );
    }),

  /**
   * List all schemas for a project.
   * owner / admin / manager (if assigned) can read.
   */
  getAll: protectedProcedure
    .input(GetCmsSchemasSchema)
    .query(async ({ ctx, input }) => {
      const { projectId, orgId, page, limit, search } = input;
      const offset = (page - 1) * limit;

      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "project:read",
      );
      if (!guard.ok) return guard.response;

      const whereClause = and(
        eq(cmsSchema.projectId, projectId),
        search ? ilike(cmsSchema.title, `%${search}%`) : undefined,
      );

      const [items, totalResult] = await Promise.all([
        ctx.db
          .select({
            id: cmsSchema.id,
            title: cmsSchema.title,
            slug: cmsSchema.slug,
            description: cmsSchema.description,
            hasStructure: cmsSchema.schemaStructure,
            createdAt: cmsSchema.createdAt,
            updatedAt: cmsSchema.updatedAt,
          })
          .from(cmsSchema)
          .where(whereClause)
          .orderBy(desc(cmsSchema.createdAt))
          .limit(limit)
          .offset(offset),

        ctx.db.select({ total: count() }).from(cmsSchema).where(whereClause),
      ]);

      const total = totalResult[0]?.total ?? 0;
      const hasNext = offset + items.length < total;

      // Normalize hasStructure to a boolean — client doesn't need the raw jsonb
      const normalized = items.map((s) => ({
        ...s,
        hasStructure: s.hasStructure !== null,
      }));

      return successResponse(
        {
          items: normalized,
          total,
          page,
          limit,
          hasNext,
          nextPage: hasNext ? page + 1 : null,
        },
        "Schemas fetched successfully.",
      );
    }),

  /**
   * Fetch a single schema by slug.
   * Returns the full schemaStructure — used by the schema builder page.
   */
  getBySlug: protectedProcedure
    .input(GetCmsSchemaBySlugSchema)
    .query(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "project:read",
      );
      if (!guard.ok) return guard.response;

      const [row] = await ctx.db
        .select()
        .from(cmsSchema)
        .where(
          and(
            eq(cmsSchema.slug, input.slug),
            eq(cmsSchema.projectId, input.projectId),
          ),
        )
        .limit(1);

      if (!row) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      return successResponse(row, "Schema fetched successfully.");
    }),

  /**
   * Update title / description of a schema.
   * Only owner and admin (project:update).
   */
  update: protectedProcedure
    .input(UpdateCmsSchemaSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "project:update",
      );
      if (!guard.ok) return guard.response;

      const [existing] = await ctx.db
        .select({ id: cmsSchema.id })
        .from(cmsSchema)
        .where(
          and(
            eq(cmsSchema.id, input.id),
            eq(cmsSchema.projectId, input.projectId),
          ),
        )
        .limit(1);

      if (!existing) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      const [updated] = await ctx.db
        .update(cmsSchema)
        .set({
          ...(input.title && {
            title: input.title,
            slug: slugify(input.title),
          }),
          ...(input.description !== undefined && {
            description: input.description,
          }),
        })
        .where(eq(cmsSchema.id, input.id))
        .returning();

      return successResponse(updated!, "Schema updated successfully.");
    }),

  /**
   * Delete a schema.
   * Only owner and admin (project:delete).
   */
  delete: protectedProcedure
    .input(DeleteCmsSchemaSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "project:delete",
      );
      if (!guard.ok) return guard.response;

      const [existing] = await ctx.db
        .select({ id: cmsSchema.id, title: cmsSchema.title })
        .from(cmsSchema)
        .where(
          and(
            eq(cmsSchema.id, input.id),
            eq(cmsSchema.projectId, input.projectId),
          ),
        )
        .limit(1);

      if (!existing) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      await ctx.db.delete(cmsSchema).where(eq(cmsSchema.id, input.id));

      return successResponse(
        null,
        `Schema "${existing.title}" has been deleted.`,
      );
    }),

  saveStructure: protectedProcedure
    .input(SaveSchemaStructureSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "project:update",
      );
      if (!guard.ok) return guard.response;

      const [existing] = await ctx.db
        .select({ id: cmsSchema.id, title: cmsSchema.title })
        .from(cmsSchema)
        .where(
          and(
            eq(cmsSchema.id, input.id),
            eq(cmsSchema.projectId, input.projectId),
          ),
        )
        .limit(1);

      if (!existing) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      const [updated] = await ctx.db
        .update(cmsSchema)
        .set({ schemaStructure: input.schemaStructure })
        .where(eq(cmsSchema.id, input.id))
        .returning();

      return successResponse(updated!, "Schema structure saved successfully.");
    }),
});
