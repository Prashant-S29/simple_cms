import { and, eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  blogPost,
  blogPostContent,
  projectLanguage,
} from "~/server/db/project";
import { errorResponse, getErrorInfo, successResponse } from "~/lib/errors";
import { requireProjectAccess } from "~/server/api/membershipGuard";
import {
  GetBlogContentSchema,
  PublishBlogContentSchema,
  SaveBlogContentSchema,
  ToggleActiveBlogContentSchema,
  UnpublishBlogContentSchema,
} from "~/zodSchema/blog";

export const blogContentRouter = createTRPCRouter({
  /**
   * Fetch content for a post × locale.
   * Returns existing row or a zeroed-out empty object if not yet filled.
   * Accessible by all roles with project:read.
   */
  getOrInit: protectedProcedure
    .input(GetBlogContentSchema)
    .query(async ({ ctx, input }) => {
      const { postId, projectId, orgId, locale } = input;

      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "project:read",
      );
      if (!guard.ok) return guard.response;

      // Verify post exists and belongs to project
      const [post] = await ctx.db
        .select({ id: blogPost.id, slug: blogPost.slug })
        .from(blogPost)
        .where(and(eq(blogPost.id, postId), eq(blogPost.projectId, projectId)))
        .limit(1);

      if (!post) return errorResponse(getErrorInfo("project", "NOT_FOUND"));

      // Verify locale is active
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
            message: `Locale "${locale}" is disabled. Contact your admin to re-enable it.`,
          }),
        );
      }

      // Fetch existing content
      const [existing] = await ctx.db
        .select()
        .from(blogPostContent)
        .where(
          and(
            eq(blogPostContent.postId, postId),
            eq(blogPostContent.locale, locale),
          ),
        )
        .limit(1);

      if (existing) {
        return successResponse(
          { ...existing, postSlug: post.slug, isNew: false },
          "Blog content fetched successfully.",
        );
      }

      // Return empty scaffold — row not created until first save
      return successResponse(
        {
          id: null,
          postId,
          postSlug: post.slug,
          projectId,
          locale,
          title: null,
          excerpt: null,
          coverImage: null,
          body: null,
          authorName: null,
          authorDesignation: null,
          authorCompany: null,
          tags: [] as string[],
          customMeta: {} as Record<string, string>,
          status: "draft" as const,
          isActive: true,
          publishedAt: null,
          updatedAt: null,
          isNew: true,
        },
        "Blog content initialized.",
      );
    }),

  /**
   * Save (upsert) blog content for a post × locale.
   * Accessible by: owner, admin, manager (scoped).
   * Uses project:update — managers can save content for assigned projects.
   */
  save: protectedProcedure
    .input(SaveBlogContentSchema)
    .mutation(async ({ ctx, input }) => {
      const { postId, projectId, orgId, locale, ...fields } = input;

      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "project:update",
      );
      if (!guard.ok) return guard.response;

      // Verify locale is active
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
        .insert(blogPostContent)
        .values({
          postId,
          projectId,
          locale,
          ...fields,
          tags: fields.tags ?? [],
          customMeta: fields.customMeta ?? {},
          updatedById: ctx.session.user.id,
        })
        .onConflictDoUpdate({
          target: [blogPostContent.postId, blogPostContent.locale],
          set: {
            ...fields,
            tags: fields.tags ?? [],
            customMeta: fields.customMeta ?? {},
            updatedById: ctx.session.user.id,
            updatedAt: new Date(),
          },
        })
        .returning();

      return successResponse(upserted!, "Blog content saved.");
    }),

  /**
   * Publish a post locale.
   * Sets status → published. Sets publishedAt if not already set (first publish).
   * Accessible by: owner, admin, manager (scoped).
   */
  publish: protectedProcedure
    .input(PublishBlogContentSchema)
    .mutation(async ({ ctx, input }) => {
      const { postId, projectId, orgId, locale } = input;

      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "project:update",
      );
      if (!guard.ok) return guard.response;

      const [existing] = await ctx.db
        .select({
          id: blogPostContent.id,
          publishedAt: blogPostContent.publishedAt,
        })
        .from(blogPostContent)
        .where(
          and(
            eq(blogPostContent.postId, postId),
            eq(blogPostContent.locale, locale),
          ),
        )
        .limit(1);

      if (!existing) {
        return errorResponse(
          getErrorInfo("general", "VALIDATION_ERROR", {
            message: "Save the post at least once before publishing.",
          }),
        );
      }

      const now = new Date();
      const [updated] = await ctx.db
        .update(blogPostContent)
        .set({
          status: "published",
          // Only set publishedAt on first publish — preserve original date
          publishedAt: existing.publishedAt ?? now,
          updatedById: ctx.session.user.id,
          updatedAt: now,
        })
        .where(eq(blogPostContent.id, existing.id))
        .returning();

      return successResponse(updated!, "Post published successfully.");
    }),

  /**
   * Unpublish a post locale — sets status back to draft.
   * publishedAt is preserved.
   */
  unpublish: protectedProcedure
    .input(UnpublishBlogContentSchema)
    .mutation(async ({ ctx, input }) => {
      const { postId, projectId, orgId, locale } = input;

      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "project:update",
      );
      if (!guard.ok) return guard.response;

      const [existing] = await ctx.db
        .select({ id: blogPostContent.id })
        .from(blogPostContent)
        .where(
          and(
            eq(blogPostContent.postId, postId),
            eq(blogPostContent.locale, locale),
          ),
        )
        .limit(1);

      if (!existing) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      const [updated] = await ctx.db
        .update(blogPostContent)
        .set({
          status: "draft",
          updatedById: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(blogPostContent.id, existing.id))
        .returning();

      return successResponse(updated!, "Post moved back to draft.");
    }),

  /**
   * Toggle isActive for a post locale.
   * isActive = false hides the post from the API regardless of status.
   */
  toggleActive: protectedProcedure
    .input(ToggleActiveBlogContentSchema)
    .mutation(async ({ ctx, input }) => {
      const { postId, projectId, orgId, locale, isActive } = input;

      const guard = await requireProjectAccess(
        ctx.db,
        orgId,
        projectId,
        ctx.session.user.id,
        "project:update",
      );
      if (!guard.ok) return guard.response;

      const [existing] = await ctx.db
        .select({ id: blogPostContent.id })
        .from(blogPostContent)
        .where(
          and(
            eq(blogPostContent.postId, postId),
            eq(blogPostContent.locale, locale),
          ),
        )
        .limit(1);

      if (!existing) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      const [updated] = await ctx.db
        .update(blogPostContent)
        .set({
          isActive,
          updatedById: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(blogPostContent.id, existing.id))
        .returning();

      return successResponse(
        updated!,
        isActive ? "Post activated." : "Post deactivated.",
      );
    }),
});
