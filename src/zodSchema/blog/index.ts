import { z } from "zod";

// ─── Admin — blog post identity ───────────────────────────────────────────────

export const CreateBlogPostSchema = z.object({
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  slug: z.string().min(1).max(200),
});

export const GetBlogPostsSchema = z.object({
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export const DeleteBlogPostSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
});

export const GetBlogPostBySlugSchema = z.object({
  slug: z.string(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
});

// ─── Manager — blog post content ──────────────────────────────────────────────

export const GetBlogContentSchema = z.object({
  postId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  locale: z.string().min(2).max(10),
});

export const SaveBlogContentSchema = z.object({
  postId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  locale: z.string().min(2).max(10),

  // Core content
  title: z.string().max(500).optional(),
  excerpt: z.string().max(1000).optional(),
  coverImage: z.string().max(2000).optional(),
  body: z.string().optional(),

  // Author
  authorName: z.string().max(200).optional(),
  authorDesignation: z.string().max(200).optional(),
  authorCompany: z.string().max(200).optional(),

  // Taxonomy
  tags: z.array(z.string().max(100)).max(20).optional(),

  // Extra metadata
  customMeta: z.record(z.string(), z.string()).optional(),
});

export const PublishBlogContentSchema = z.object({
  postId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  locale: z.string().min(2).max(10),
});

export const UnpublishBlogContentSchema = z.object({
  postId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  locale: z.string().min(2).max(10),
});

export const ToggleActiveBlogContentSchema = z.object({
  postId: z.string().uuid(),
  projectId: z.string().uuid(),
  orgId: z.string().uuid(),
  locale: z.string().min(2).max(10),
  isActive: z.boolean(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateBlogPostSchemaType = z.infer<typeof CreateBlogPostSchema>;
export type SaveBlogContentSchemaType = z.infer<typeof SaveBlogContentSchema>;
