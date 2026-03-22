import { relations, sql } from "drizzle-orm";
import { index, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createTable, user } from "./schema";
import { org } from "./org";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const languageStatusEnum = pgEnum("language_status", [
  "active",
  "disabled",
]);

export const blogPostStatusEnum = pgEnum("blog_post_status", [
  "draft",
  "published",
]);

// ─── project ──────────────────────────────────────────────────────────────────

export const project = createTable(
  "project",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    name: d.text().notNull(),
    slug: d.text().notNull(),
    description: d.text(),
    orgId: d
      .uuid()
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),
    createdById: d
      .uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("project_slug_idx").on(t.slug),
    index("project_org_idx").on(t.orgId),
    index("project_created_by_idx").on(t.createdById),
    index("project_org_slug_unique_idx").on(t.orgId, t.slug),
  ],
);

// ─── project_language ─────────────────────────────────────────────────────────

export const projectLanguage = createTable(
  "project_language",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    locale: d.text().notNull(),
    label: d.text().notNull(),
    isDefault: d.boolean().notNull().default(false),
    status: languageStatusEnum("status").notNull().default("active"),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("project_lang_project_idx").on(t.projectId),
    uniqueIndex("project_lang_unique_idx").on(t.projectId, t.locale),
  ],
);

// ─── cms_schema ───────────────────────────────────────────────────────────────

export const cmsSchema = createTable(
  "cms_schema",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    title: d.text().notNull(),
    slug: d.text().notNull(),
    description: d.text(),
    schemaStructure: d.jsonb(),
    createdById: d
      .uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("cms_schema_project_idx").on(t.projectId),
    uniqueIndex("cms_schema_project_slug_idx").on(t.projectId, t.slug),
  ],
);

// ─── cms_content ──────────────────────────────────────────────────────────────

export const cmsContent = createTable(
  "cms_content",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    schemaId: d
      .uuid()
      .notNull()
      .references(() => cmsSchema.id, { onDelete: "cascade" }),
    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    locale: d.text().notNull(),
    content: d.jsonb().notNull().default({}),
    updatedById: d.uuid().references(() => user.id, { onDelete: "set null" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("cms_content_schema_idx").on(t.schemaId),
    index("cms_content_project_idx").on(t.projectId),
    index("cms_content_locale_idx").on(t.locale),
    uniqueIndex("cms_content_schema_locale_idx").on(t.schemaId, t.locale),
  ],
);

// ─── blog_post ────────────────────────────────────────────────────────────────

/**
 * The canonical blog post identity — created by admin with just a slug.
 * All actual content lives in blog_post_content (one row per locale).
 */
export const blogPost = createTable(
  "blog_post",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    /** URL-safe slug — used as the API identifier. Unique per project. */
    slug: d.text().notNull(),
    createdById: d
      .uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("blog_post_project_idx").on(t.projectId),
    uniqueIndex("blog_post_project_slug_idx").on(t.projectId, t.slug),
  ],
);

// ─── blog_post_content ────────────────────────────────────────────────────────

/**
 * Manager-editable content for a blog post × locale.
 *
 * State logic (checked in this order by the API):
 *   isActive = false            → 404 (hidden regardless of status)
 *   isActive = true, draft      → 404 (not yet published)
 *   isActive = true, published  → 200 ✓
 *
 * publishedAt is set once on first publish — never reset on unpublish/republish.
 * customMeta holds manager-defined key-value pairs beyond the standard fields.
 */
export const blogPostContent = createTable(
  "blog_post_content",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    postId: d
      .uuid()
      .notNull()
      .references(() => blogPost.id, { onDelete: "cascade" }),
    /** Denormalized for efficient project-level queries */
    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    locale: d.text().notNull(),

    // ── Core content ────────────────────────────────────────────────────────
    title: d.text(),
    excerpt: d.text(),
    /** URL string — resolved to CDN URL after upload */
    coverImage: d.text(),
    /** Markdown string — source of truth for the blog body */
    body: d.text(),

    // ── Author metadata ──────────────────────────────────────────────────────
    authorName: d.text(),
    authorDesignation: d.text(),
    authorCompany: d.text(),

    // ── Taxonomy ─────────────────────────────────────────────────────────────
    tags: d
      .text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),

    // ── Manager-defined extra metadata ───────────────────────────────────────
    /** Free-form key-value pairs: { "readTime": "5 min", "series": "AI Weekly" } */
    customMeta: d.jsonb().notNull().default({}),

    // ── State ────────────────────────────────────────────────────────────────
    status: blogPostStatusEnum("status").notNull().default("draft"),
    /** Master on/off. false = invisible to API regardless of status. */
    isActive: d.boolean().notNull().default(true),
    /** Set once on first publish — never reset. */
    publishedAt: d.timestamp({ withTimezone: true }),

    updatedById: d.uuid().references(() => user.id, { onDelete: "set null" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("blog_content_post_idx").on(t.postId),
    index("blog_content_project_idx").on(t.projectId),
    index("blog_content_locale_idx").on(t.locale),
    index("blog_content_status_idx").on(t.status),
    uniqueIndex("blog_content_post_locale_idx").on(t.postId, t.locale),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const orgWithProjectsRelations = relations(org, ({ one, many }) => ({
  createdBy: one(user, { fields: [org.createdById], references: [user.id] }),
  projects: many(project),
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  org: one(org, { fields: [project.orgId], references: [org.id] }),
  createdBy: one(user, {
    fields: [project.createdById],
    references: [user.id],
  }),
  schemas: many(cmsSchema),
  languages: many(projectLanguage),
  contents: many(cmsContent),
  blogPosts: many(blogPost),
}));

export const projectLanguageRelations = relations(
  projectLanguage,
  ({ one }) => ({
    project: one(project, {
      fields: [projectLanguage.projectId],
      references: [project.id],
    }),
  }),
);

export const cmsSchemaRelations = relations(cmsSchema, ({ one, many }) => ({
  project: one(project, {
    fields: [cmsSchema.projectId],
    references: [project.id],
  }),
  createdBy: one(user, {
    fields: [cmsSchema.createdById],
    references: [user.id],
  }),
  contents: many(cmsContent),
}));

export const cmsContentRelations = relations(cmsContent, ({ one }) => ({
  schema: one(cmsSchema, {
    fields: [cmsContent.schemaId],
    references: [cmsSchema.id],
  }),
  project: one(project, {
    fields: [cmsContent.projectId],
    references: [project.id],
  }),
  updatedBy: one(user, {
    fields: [cmsContent.updatedById],
    references: [user.id],
  }),
}));

export const blogPostRelations = relations(blogPost, ({ one, many }) => ({
  project: one(project, {
    fields: [blogPost.projectId],
    references: [project.id],
  }),
  createdBy: one(user, {
    fields: [blogPost.createdById],
    references: [user.id],
  }),
  contents: many(blogPostContent),
}));

export const blogPostContentRelations = relations(
  blogPostContent,
  ({ one }) => ({
    post: one(blogPost, {
      fields: [blogPostContent.postId],
      references: [blogPost.id],
    }),
    project: one(project, {
      fields: [blogPostContent.projectId],
      references: [project.id],
    }),
    updatedBy: one(user, {
      fields: [blogPostContent.updatedById],
      references: [user.id],
    }),
  }),
);
