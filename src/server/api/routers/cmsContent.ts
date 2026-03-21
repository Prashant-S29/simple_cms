import { and, eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { cmsContent, cmsSchema, projectLanguage } from "~/server/db/project";
import { errorResponse, getErrorInfo, successResponse } from "~/lib/errors";
import { requireProjectAccess } from "~/server/api/membershipGuard";
import { initContentFromSchema } from "~/lib/cms/contentInitializer";
import type { SchemaStructure } from "~/zodSchema/cmsSchema";
import { GetContentSchema, SaveContentSchema } from "~/zodSchema/cmsContent";

export const cmsContentRouter = createTRPCRouter({
  /**
   * Fetch content for a schema × locale.
   * If no row exists yet, returns a zero-initialized content object
   * shaped from the schema structure — the manager never needs to
   * explicitly create a content record.
   *
   * Accessible by: owner, admin, manager (if assigned to project).
   */
  getOrInit: protectedProcedure
    .input(GetContentSchema)
    .query(async ({ ctx, input }) => {
      const { schemaSlug, projectId, orgId, locale } = input;

      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "project:read",
      );
      if (!guard.ok) return guard.response;

      const [lang] = await ctx.db
        .select({ id: projectLanguage.id, status: projectLanguage.status })
        .from(projectLanguage)
        .where(
          and(
            eq(projectLanguage.projectId, projectId),
            eq(projectLanguage.locale, locale),
          ),
        )
        .limit(1);

      if (!lang) {
        return errorResponse(
          getErrorInfo("general", "NOT_FOUND", {
            message: `Locale "${locale}" is not configured for this project.`,
          }),
        );
      }

      if (lang.status === "disabled") {
        return errorResponse(
          getErrorInfo("general", "VALIDATION_ERROR", {
            message: `Locale "${locale}" is disabled. Contact your admin to re-enable it.`,
          }),
        );
      }

      const [schemaRow] = await ctx.db
        .select({
          id: cmsSchema.id,
          title: cmsSchema.title,
          slug: cmsSchema.slug,
          schemaStructure: cmsSchema.schemaStructure,
        })
        .from(cmsSchema)
        .where(
          and(
            eq(cmsSchema.slug, schemaSlug),
            eq(cmsSchema.projectId, projectId),
          ),
        )
        .limit(1);

      if (!schemaRow) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      if (!schemaRow.schemaStructure) {
        return errorResponse(
          getErrorInfo("general", "VALIDATION_ERROR", {
            message: `Schema "${schemaRow.title}" has no structure defined yet. Ask your admin to build the schema first.`,
          }),
        );
      }

      const [existing] = await ctx.db
        .select()
        .from(cmsContent)
        .where(
          and(
            eq(cmsContent.schemaId, schemaRow.id),
            eq(cmsContent.locale, locale),
          ),
        )
        .limit(1);

      if (existing) {
        return successResponse(
          {
            contentId: existing.id,
            schemaId: schemaRow.id,
            schemaTitle: schemaRow.title,
            schemaSlug: schemaRow.slug,
            schemaStructure: schemaRow.schemaStructure as SchemaStructure,
            locale,
            content: existing.content as Record<string, unknown>,
            updatedAt: existing.updatedAt,
            isNew: false,
          },
          "Content fetched successfully.",
        );
      }

      const emptyContent = initContentFromSchema(
        schemaRow.schemaStructure as SchemaStructure,
      );

      return successResponse(
        {
          contentId: null,
          schemaId: schemaRow.id,
          schemaTitle: schemaRow.title,
          schemaSlug: schemaRow.slug,
          schemaStructure: schemaRow.schemaStructure as SchemaStructure,
          locale,
          content: emptyContent,
          updatedAt: null,
          isNew: true,
        },
        "Content initialized successfully.",
      );
    }),

  /**
   * Save (upsert) content for a schema × locale.
   * Creates the row on first save, updates on subsequent saves.
   *
   * Accessible by: owner, admin, manager (if assigned to project).
   * Uses project:update — managers with scoped access can save content
   * for their assigned projects.
   */
  save: protectedProcedure
    .input(SaveContentSchema)
    .mutation(async ({ ctx, input }) => {
      const { schemaId, projectId, orgId, locale, content } = input;

      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "project:update",
      );
      if (!guard.ok) return guard.response;

      const [lang] = await ctx.db
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
        return errorResponse(
          getErrorInfo("general", "NOT_FOUND", {
            message: `Locale "${locale}" is not configured for this project.`,
          }),
        );
      }

      if (lang.status === "disabled") {
        return errorResponse(
          getErrorInfo("general", "VALIDATION_ERROR", {
            message: `Locale "${locale}" is disabled and cannot be edited.`,
          }),
        );
      }

      const [upserted] = await ctx.db
        .insert(cmsContent)
        .values({
          schemaId,
          projectId,
          locale,
          content,
          updatedById: ctx.session.user.id,
        })
        .onConflictDoUpdate({
          target: [cmsContent.schemaId, cmsContent.locale],
          set: {
            content,
            updatedById: ctx.session.user.id,
            updatedAt: new Date(),
          },
        })
        .returning();

      return successResponse(upserted!, "Content saved successfully.");
    }),
});
