import { and, count, desc, eq, ilike } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { blogPost, blogPostContent } from "~/server/db/project";
import { slugify } from "~/lib/utils";
import { errorResponse, getErrorInfo, successResponse } from "~/lib/errors";
import { requireProjectAccess } from "~/server/api/membershipGuard";
import { logActivity } from "~/lib/activityLog";
import {
  CreateBlogPostSchema,
  DeleteBlogPostSchema,
  GetBlogPostBySlugSchema,
  GetBlogPostsSchema,
} from "~/zodSchema/blog";

export const blogPostRouter = createTRPCRouter({
  /**
   * Create a new blog post identity.
   * Admin / owner only (schema:manage).
   * Manager creates and edits content — not the post identity.
   */
  create: protectedProcedure
    .input(CreateBlogPostSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "schema:manage",
      );
      if (!guard.ok) return guard.response;

      const slug = slugify(input.slug);

      const [existing] = await ctx.db
        .select({ id: blogPost.id })
        .from(blogPost)
        .where(
          and(eq(blogPost.projectId, input.projectId), eq(blogPost.slug, slug)),
        )
        .limit(1);

      if (existing) {
        return errorResponse(
          getErrorInfo("project", "DUPLICATE_RECORD", {
            message: `A post with slug "${slug}" already exists in this project.`,
          }),
        );
      }

      const [newPost] = await ctx.db
        .insert(blogPost)
        .values({
          projectId: input.projectId,
          slug,
          createdById: ctx.session.user.id,
        })
        .returning();

      await logActivity({
        db: ctx.db,
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: "blog.created",
        resourceType: "blog",
        resourceId: newPost!.id,
        resourceSlug: newPost!.slug,
        metadata: { slug: newPost!.slug },
      });

      return successResponse(newPost!, `Blog post "${slug}" has been created.`);
    }),

  /**
   * List all blog posts for a project with per-locale content summaries.
   * Accessible by all roles (owner, admin, manager if assigned).
   */
  getAll: protectedProcedure
    .input(GetBlogPostsSchema)
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
        eq(blogPost.projectId, projectId),
        search ? ilike(blogPost.slug, `%${search}%`) : undefined,
      );

      const [posts, totalResult] = await Promise.all([
        ctx.db
          .select({
            id: blogPost.id,
            slug: blogPost.slug,
            createdAt: blogPost.createdAt,
            updatedAt: blogPost.updatedAt,
          })
          .from(blogPost)
          .where(whereClause)
          .orderBy(desc(blogPost.createdAt))
          .limit(limit)
          .offset(offset),

        ctx.db.select({ total: count() }).from(blogPost).where(whereClause),
      ]);

      if (posts.length === 0) {
        return successResponse(
          { items: [], total: 0, page, limit, hasNext: false, nextPage: null },
          "Blog posts fetched successfully.",
        );
      }

      // Fetch content summaries for all posts in one query
      const postIds = posts.map((p) => p.id);
      const contentRows = await ctx.db
        .select({
          postId: blogPostContent.postId,
          locale: blogPostContent.locale,
          title: blogPostContent.title,
          status: blogPostContent.status,
          isActive: blogPostContent.isActive,
          publishedAt: blogPostContent.publishedAt,
          updatedAt: blogPostContent.updatedAt,
        })
        .from(blogPostContent)
        .where(and(eq(blogPostContent.projectId, projectId)));

      // Group content by postId
      const contentByPost = new Map<string, typeof contentRows>();
      for (const row of contentRows) {
        if (!postIds.includes(row.postId)) continue;
        const existing = contentByPost.get(row.postId) ?? [];
        existing.push(row);
        contentByPost.set(row.postId, existing);
      }

      const total = totalResult[0]?.total ?? 0;
      const hasNext = offset + posts.length < total;

      const items = posts.map((post) => ({
        ...post,
        locales: contentByPost.get(post.id) ?? [],
      }));

      return successResponse(
        {
          items,
          total,
          page,
          limit,
          hasNext,
          nextPage: hasNext ? page + 1 : null,
        },
        "Blog posts fetched successfully.",
      );
    }),

  /**
   * Get a single post by slug (used by the editor to resolve postId).
   */
  getBySlug: protectedProcedure
    .input(GetBlogPostBySlugSchema)
    .query(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "project:read",
      );
      if (!guard.ok) return guard.response;

      const [post] = await ctx.db
        .select()
        .from(blogPost)
        .where(
          and(
            eq(blogPost.slug, input.slug),
            eq(blogPost.projectId, input.projectId),
          ),
        )
        .limit(1);

      if (!post) return errorResponse(getErrorInfo("project", "NOT_FOUND"));

      return successResponse(post, "Blog post fetched successfully.");
    }),

  /**
   * Delete a blog post and all its content (cascade).
   * Admin / owner only (schema:manage).
   */
  delete: protectedProcedure
    .input(DeleteBlogPostSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "schema:manage",
      );
      if (!guard.ok) return guard.response;

      const [post] = await ctx.db
        .select({ id: blogPost.id, slug: blogPost.slug })
        .from(blogPost)
        .where(
          and(
            eq(blogPost.id, input.id),
            eq(blogPost.projectId, input.projectId),
          ),
        )
        .limit(1);

      if (!post) return errorResponse(getErrorInfo("project", "NOT_FOUND"));

      await ctx.db.delete(blogPost).where(eq(blogPost.id, input.id));

      await logActivity({
        db: ctx.db,
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: "blog.deleted",
        resourceType: "blog",
        resourceId: input.id,
        resourceSlug: post.slug,
        metadata: { slug: post.slug },
      });

      return successResponse(
        null,
        `Blog post "${post.slug}" has been deleted.`,
      );
    }),
});
