// ─── src/server/api/routers/projectLanguage.ts ───────────────────────────────

import { and, eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { projectLanguage } from "~/server/db/project";
import { errorResponse, getErrorInfo, successResponse } from "~/lib/errors";
import { requireProjectAccess } from "~/server/api/membershipGuard";
// import { getLocaleLabel } from "~/lib/locales";
import { logActivity } from "~/lib/activityLog";
import {
  AddLanguageSchema,
  BulkAddLanguageSchema,
  DeleteLanguageSchema,
  GetLanguagesSchema,
  SetLanguageStatusSchema,
} from "~/zodSchema/projectLanguage";

export const projectLanguageRouter = createTRPCRouter({
  /**
   * List all languages for a project.
   * Accessible by all roles (owner, admin, manager) — managers need this
   * to know which locale tabs to show on the content editor.
   */
  getAll: protectedProcedure
    .input(GetLanguagesSchema)
    .query(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "project:read",
      );
      if (!guard.ok) return guard.response;

      const languages = await ctx.db
        .select()
        .from(projectLanguage)
        .where(eq(projectLanguage.projectId, input.projectId))
        .orderBy(projectLanguage.createdAt);

      return successResponse(languages, "Languages fetched successfully.");
    }),

  /**
   * Add a new language to a project.
   * Only owner / admin (schema:manage).
   *
   * Rules:
   *   - locale must not already exist for this project
   *   - locale must be from the supported list (validated on client,
   *     server just checks for duplicates)
   */
  add: protectedProcedure
    .input(AddLanguageSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "schema:manage",
      );
      if (!guard.ok) return guard.response;

      // Check for duplicate locale
      const [existing] = await ctx.db
        .select({ id: projectLanguage.id })
        .from(projectLanguage)
        .where(
          and(
            eq(projectLanguage.projectId, input.projectId),
            eq(projectLanguage.locale, input.locale),
          ),
        )
        .limit(1);

      if (existing) {
        return errorResponse(
          getErrorInfo("general", "DUPLICATE_RECORD", {
            message: `Language "${input.label}" is already added to this project.`,
          }),
        );
      }

      const [newLang] = await ctx.db
        .insert(projectLanguage)
        .values({
          projectId: input.projectId,
          locale: input.locale,
          label: input.label,
          isDefault: false,
          status: "active",
        })
        .returning();

      await logActivity({
        db: ctx.db,
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: "language.added",
        resourceType: "language",
        resourceId: newLang!.id,
        resourceSlug: newLang!.locale,
        metadata: { locale: input.locale, label: input.label },
      });

      return successResponse(
        newLang!,
        `"${input.label}" has been added to the project.`,
      );
    }),

  bulkAdd: protectedProcedure
    .input(BulkAddLanguageSchema)
    .mutation(async ({ ctx, input }) => {
      const { projectId, orgId, locales } = input;

      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "schema:manage",
      );
      if (!guard.ok) return guard.response;

      // Fetch already-added locales so we can skip duplicates
      const existing = await ctx.db
        .select({ locale: projectLanguage.locale })
        .from(projectLanguage)
        .where(eq(projectLanguage.projectId, projectId));

      const existingSet = new Set(existing.map((r) => r.locale));
      const toInsert = locales.filter((l) => !existingSet.has(l.locale));

      if (toInsert.length === 0) {
        return errorResponse(
          getErrorInfo("general", "VALIDATION_ERROR", {
            message:
              "All selected languages are already added to this project.",
          }),
        );
      }

      const inserted = await ctx.db
        .insert(projectLanguage)
        .values(
          toInsert.map((l) => ({
            projectId,
            locale: l.locale,
            label: l.label,
            isDefault: false,
            status: "active" as const,
          })),
        )
        .returning();

      await logActivity({
        db: ctx.db,
        projectId,
        userId: ctx.session.user.id,
        action: "language.added",
        resourceType: "language",
        resourceId: inserted[0]!.id,
        resourceSlug: inserted[0]!.locale,
        metadata: { locales: toInsert.map((l) => l.locale).join(", ") },
      });

      const skipped = locales.length - toInsert.length;
      const msg =
        skipped > 0
          ? `${inserted.length} language${inserted.length === 1 ? "" : "s"} added. ${skipped} already existed and were skipped.`
          : `${inserted.length} language${inserted.length === 1 ? "" : "s"} added successfully.`;

      return successResponse({ items: inserted, skipped }, msg);
    }),

  /**
   * Enable or disable a language.
   * Only owner / admin (schema:manage).
   *
   * Default language (isDefault = true) cannot be disabled.
   */
  setStatus: protectedProcedure
    .input(SetLanguageStatusSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "schema:manage",
      );
      if (!guard.ok) return guard.response;

      const [lang] = await ctx.db
        .select()
        .from(projectLanguage)
        .where(
          and(
            eq(projectLanguage.id, input.id),
            eq(projectLanguage.projectId, input.projectId),
          ),
        )
        .limit(1);

      if (!lang) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      if (lang.isDefault && input.status === "disabled") {
        return errorResponse(
          getErrorInfo("general", "VALIDATION_ERROR", {
            message: `The default language cannot be disabled.`,
          }),
        );
      }

      const [updated] = await ctx.db
        .update(projectLanguage)
        .set({ status: input.status })
        .where(eq(projectLanguage.id, input.id))
        .returning();

      await logActivity({
        db: ctx.db,
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action:
          input.status === "active" ? "language.enabled" : "language.disabled",
        resourceType: "language",
        resourceId: input.id,
        resourceSlug: lang.locale,
        metadata: { locale: lang.locale, label: lang.label },
      });

      const action = input.status === "active" ? "enabled" : "disabled";
      return successResponse(updated!, `"${lang.label}" has been ${action}.`);
    }),

  /**
   * Delete a language from a project.
   * Only owner / admin (schema:manage).
   *
   * Default language (isDefault = true) cannot be deleted.
   * All cms_content rows for this locale will be cascade deleted
   * once the cms_content table is implemented.
   */
  delete: protectedProcedure
    .input(DeleteLanguageSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "schema:manage",
      );
      if (!guard.ok) return guard.response;

      const [lang] = await ctx.db
        .select()
        .from(projectLanguage)
        .where(
          and(
            eq(projectLanguage.id, input.id),
            eq(projectLanguage.projectId, input.projectId),
          ),
        )
        .limit(1);

      if (!lang) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      if (lang.isDefault) {
        return errorResponse(
          getErrorInfo("general", "VALIDATION_ERROR", {
            message: `The default language cannot be deleted.`,
          }),
        );
      }

      await ctx.db
        .delete(projectLanguage)
        .where(eq(projectLanguage.id, input.id));

      await logActivity({
        db: ctx.db,
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: "language.deleted",
        resourceType: "language",
        resourceId: input.id,
        resourceSlug: lang.locale,
        metadata: { locale: lang.locale, label: lang.label },
      });

      return successResponse(
        null,
        `"${lang.label}" has been removed from the project.`,
      );
    }),
});
