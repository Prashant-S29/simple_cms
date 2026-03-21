import { and, asc, count, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cmsSchema } from "~/server/db/project";
import { slugify } from "~/lib/utils";
import { errorResponse, getErrorInfo, successResponse } from "~/lib/errors";
import { requireProjectAccess } from "~/server/api/membershipGuard";
import {
  BulkCreateCmsSchemaSchema,
  CreateCmsSchemaSchema,
  DeleteCmsSchemaSchema,
  GetCmsSchemaBySlugSchema,
  GetCmsSchemasSchema,
  ResetSchemaStructureSchema,
  SaveSchemaStructureSchema,
  UpdateCmsSchemaSchema,
} from "~/zodSchema/cmsSchema";

export const cmsSchemaRouter = createTRPCRouter({
  create: protectedProcedure
    .input(CreateCmsSchemaSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "schema:manage",
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

  bulkCreate: protectedProcedure
    .input(BulkCreateCmsSchemaSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, orgId, items } = input;

      // ── 1. Permission check ────────────────────────────────────────────────
      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "schema:manage",
      );
      if (!guard.ok) return guard.response;

      // ── 2. Build slug list and check intra-batch uniqueness ────────────────
      const slugMap = new Map<string, string>(); // slug → title
      const duplicatesInBatch: string[] = [];

      for (const item of items) {
        const slug = slugify(item.title);
        if (slugMap.has(slug)) {
          duplicatesInBatch.push(`"${item.title}"`);
        } else {
          slugMap.set(slug, item.title);
        }
      }

      if (duplicatesInBatch.length > 0) {
        return errorResponse(
          getErrorInfo("general", "VALIDATION_ERROR", {
            message: `Duplicate titles in batch: ${duplicatesInBatch.join(", ")}. Each schema must have a unique title.`,
          }),
        );
      }

      const slugsToCreate = Array.from(slugMap.keys());

      // ── 3. Check against existing schemas in the project ───────────────────
      const existingRows = await ctx.db
        .select({ slug: cmsSchema.slug, title: cmsSchema.title })
        .from(cmsSchema)
        .where(
          and(
            eq(cmsSchema.projectId, projectId),
            inArray(cmsSchema.slug, slugsToCreate),
          ),
        );

      if (existingRows.length > 0) {
        const conflicting = existingRows.map((r) => `"${r.title}"`).join(", ");
        return errorResponse(
          getErrorInfo("general", "VALIDATION_ERROR", {
            message: `The following schemas already exist in this project: ${conflicting}. Remove or rename them before importing.`,
          }),
        );
      }

      // ── 4. Insert all in a transaction ─────────────────────────────────────
      const created: (typeof cmsSchema.$inferSelect)[] = [];
      const failed: { title: string; reason: string }[] = [];

      await ctx.db.transaction(async (tx) => {
        for (const item of items) {
          const slug = slugify(item.title);
          try {
            const [inserted] = await tx
              .insert(cmsSchema)
              .values({
                projectId,
                title: item.title,
                slug,
                description: item.description,
                schemaStructure: item.schemaStructure,
                createdById: ctx.session.user.id,
              })
              .returning();

            if (inserted) created.push(inserted);
          } catch (err) {
            // Catch individual insert errors (e.g. race condition duplicate)
            // without rolling back the whole batch
            failed.push({
              title: item.title,
              reason:
                err instanceof Error ? err.message : "Unknown error occurred",
            });
          }
        }
      });

      return successResponse(
        {
          created: created.length,
          failed,
          items: created,
        },
        failed.length === 0
          ? `${created.length} schema${created.length === 1 ? "" : "s"} created successfully.`
          : `${created.length} created, ${failed.length} failed.`,
      );
    }),

  getAll: protectedProcedure
    .input(GetCmsSchemasSchema)
    .query(async ({ ctx, input }) => {
      const {
        projectId,
        orgId,
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        noStructureFirst,
      } = input;
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

      // Build order by — noStructureFirst pins null schemaStructure rows to top
      const titleOrder =
        sortOrder === "asc" ? asc(cmsSchema.title) : desc(cmsSchema.title);
      const createdAtOrder =
        sortOrder === "asc"
          ? asc(cmsSchema.createdAt)
          : desc(cmsSchema.createdAt);
      const primaryOrder = sortBy === "title" ? titleOrder : createdAtOrder;

      // noStructureFirst: NULLs first via CASE WHEN
      const structureOrder = sql`CASE WHEN ${cmsSchema.schemaStructure} IS NULL THEN 0 ELSE 1 END`;

      const orderBy = noStructureFirst
        ? [structureOrder, primaryOrder]
        : [primaryOrder];

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
          .orderBy(...orderBy)
          .limit(limit)
          .offset(offset),

        ctx.db.select({ total: count() }).from(cmsSchema).where(whereClause),
      ]);

      const total = totalResult[0]?.total ?? 0;
      const hasNext = offset + items.length < total;

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

  update: protectedProcedure
    .input(UpdateCmsSchemaSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "schema:manage",
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
          // undefined = not provided (leave as-is)
          // empty string = explicitly cleared → set to null
          // any other string = update to that value
          ...(input.description !== undefined && {
            description: input.description?.trim() || null,
          }),
        })
        .where(eq(cmsSchema.id, input.id))
        .returning();

      return successResponse(updated!, "Schema updated successfully.");
    }),

  resetStructure: protectedProcedure
    .input(ResetSchemaStructureSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "schema:manage",
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
        .set({ schemaStructure: null })
        .where(eq(cmsSchema.id, input.id))
        .returning();

      return successResponse(
        updated!,
        `Schema "${existing.title}" has been reset.`,
      );
    }),

  delete: protectedProcedure
    .input(DeleteCmsSchemaSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "schema:manage",
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
        "schema:manage",
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
