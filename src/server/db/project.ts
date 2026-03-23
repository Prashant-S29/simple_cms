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

export const apiKeyStatusEnum = pgEnum("api_key_status", ["active", "revoked"]);

export const clientTypeEnum = pgEnum("client_type", [
  "browser",
  "server",
  "unknown",
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

export const blogPost = createTable(
  "blog_post",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
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

export const blogPostContent = createTable(
  "blog_post_content",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    postId: d
      .uuid()
      .notNull()
      .references(() => blogPost.id, { onDelete: "cascade" }),
    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    locale: d.text().notNull(),
    title: d.text(),
    excerpt: d.text(),
    coverImage: d.text(),
    body: d.text(),
    authorName: d.text(),
    authorDesignation: d.text(),
    authorCompany: d.text(),
    tags: d
      .text()
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    customMeta: d.jsonb().notNull().default({}),
    status: blogPostStatusEnum("status").notNull().default("draft"),
    isActive: d.boolean().notNull().default(true),
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

// ─── project_api_key ──────────────────────────────────────────────────────────

/**
 * API keys for authenticating external requests to the content API.
 *
 * Security model:
 *   - Raw key is shown ONCE on creation and never stored
 *   - keyHash: sha256(rawKey) — used for lookup on every request
 *   - keyPrefix: first 12 chars of raw key — shown in UI so users can
 *     identify which key is which without exposing the secret
 *
 * Key format:  scms_<32 random chars>
 * Example:     scms_xK9mP2nQ8rT5vW1yZ3bE6fH0jL4oS7u
 */
export const projectApiKey = createTable(
  "project_api_key",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    /** Human-readable label: "Production", "Staging", "Netlify" */
    name: d.text().notNull(),
    /** sha256 hash of the raw key — used for auth lookup */
    keyHash: d.text().notNull().unique(),
    /** First 12 chars of raw key — safe to display in UI */
    keyPrefix: d.text().notNull(),
    status: apiKeyStatusEnum("status").notNull().default("active"),
    /** Updated fire-and-forget on every successful request */
    lastUsedAt: d.timestamp({ withTimezone: true }),
    createdById: d
      .uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    /** Set when status → revoked */
    revokedAt: d.timestamp({ withTimezone: true }),
    revokedById: d.uuid().references(() => user.id, { onDelete: "set null" }),
  }),
  (t) => [
    index("api_key_project_idx").on(t.projectId),
    index("api_key_hash_idx").on(t.keyHash),
    index("api_key_status_idx").on(t.status),
  ],
);

// ─── api_request_log ──────────────────────────────────────────────────────────

/**
 * Append-only log of every inbound API request.
 * Written fire-and-forget — never blocks the response.
 *
 * Designed for future analytics:
 *   - requests over time per project
 *   - error rate by errorCode
 *   - most requested schemas / locales
 *   - geographic distribution (country)
 *   - key usage breakdown
 *   - response time percentiles (durationMs)
 *   - bandwidth (responseSizeBytes)
 *
 * apiKeyId is nullable — set to null when the key was invalid/missing
 * so we can still log the failed attempt.
 */
export const apiRequestLog = createTable(
  "api_request_log",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    /** Null when key was missing or invalid */
    apiKeyId: d
      .uuid()
      .references(() => projectApiKey.id, { onDelete: "set null" }),

    // ── What was requested ─────────────────────────────────────────────────
    /** "content" | "blogs.list" | "blogs.detail" */
    endpoint: d.text().notNull(),
    /** Schema slug or blog slug — null for list endpoints */
    resourceSlug: d.text(),
    locale: d.text(),

    // ── Response ───────────────────────────────────────────────────────────
    statusCode: d.integer().notNull(),
    /** Machine-readable error code e.g. "SCHEMA_NOT_FOUND" */
    errorCode: d.text(),
    /** Milliseconds from request receipt to response sent */
    durationMs: d.integer().notNull(),
    /** Bytes in the JSON response body */
    responseSizeBytes: d.integer(),

    // ── Client info ────────────────────────────────────────────────────────
    /** sha256(ip) — for rate-limit analysis without storing raw IPs */
    ipHash: d.text(),
    /** ISO 3166-1 alpha-2 country code resolved at request time */
    country: d.text(),
    clientType: clientTypeEnum("client_type").notNull().default("unknown"),

    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    // Primary query patterns — all analytics queries start with projectId + time
    index("req_log_project_time_idx").on(t.projectId, t.createdAt),
    index("req_log_api_key_idx").on(t.apiKeyId),
    index("req_log_endpoint_idx").on(t.endpoint),
    index("req_log_status_idx").on(t.statusCode),
    index("req_log_country_idx").on(t.country),
  ],
);

// ─── activity_log ─────────────────────────────────────────────────────────────

/**
 * Audit trail of every CMS action performed by a user.
 * Written synchronously inside tRPC procedures (small write, negligible cost).
 *
 * Actions logged:
 *   content.saved        schema slug + locale
 *   content.reset        schema slug
 *   blog.published       post slug + locale
 *   blog.unpublished     post slug + locale
 *   blog.saved           post slug + locale
 *   schema.created       schema slug
 *   schema.deleted       schema slug
 *   language.added       locale
 *   language.disabled    locale
 *   language.deleted     locale
 *   api_key.created      key name + prefix
 *   api_key.revoked      key name + prefix
 *   member.invited       invitee email + role
 *   member.removed       member id + role
 */
export const activityLog = createTable(
  "activity_log",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: d
      .uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /**
     * Dot-namespaced action string.
     * Format: "<resource>.<verb>"
     * e.g. "content.saved", "api_key.revoked"
     */
    action: d.text().notNull(),
    /** The primary resource type acted on */
    resourceType: d.text().notNull(),
    /** UUID or slug of the resource */
    resourceId: d.text().notNull(),
    /** Human-readable slug for display (optional) */
    resourceSlug: d.text(),
    /**
     * Extra context as flat jsonb.
     * e.g. { locale: "en", schemaSlug: "home" }
     * Keep shallow — no nested objects.
     */
    metadata: d.jsonb().notNull().default({}),
    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    // Most queries: "show me activity for this project, most recent first"
    index("activity_log_project_time_idx").on(t.projectId, t.createdAt),
    index("activity_log_user_idx").on(t.userId),
    index("activity_log_action_idx").on(t.action),
    index("activity_log_resource_type_idx").on(t.resourceType),
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
  apiKeys: many(projectApiKey),
  requestLogs: many(apiRequestLog),
  activityLogs: many(activityLog),
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

export const projectApiKeyRelations = relations(
  projectApiKey,
  ({ one, many }) => ({
    project: one(project, {
      fields: [projectApiKey.projectId],
      references: [project.id],
    }),
    createdBy: one(user, {
      fields: [projectApiKey.createdById],
      references: [user.id],
    }),
    revokedBy: one(user, {
      fields: [projectApiKey.revokedById],
      references: [user.id],
    }),
    requestLogs: many(apiRequestLog),
  }),
);

export const apiRequestLogRelations = relations(apiRequestLog, ({ one }) => ({
  project: one(project, {
    fields: [apiRequestLog.projectId],
    references: [project.id],
  }),
  apiKey: one(projectApiKey, {
    fields: [apiRequestLog.apiKeyId],
    references: [projectApiKey.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  project: one(project, {
    fields: [activityLog.projectId],
    references: [project.id],
  }),
  user: one(user, { fields: [activityLog.userId], references: [user.id] }),
}));
