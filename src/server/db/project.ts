import { relations } from "drizzle-orm";
import { index, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createTable, user } from "./schema";
import { org } from "./org";

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

export const languageStatusEnum = pgEnum("language_status", [
  "active",
  "disabled",
]);

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

/**
 * Stores the manager-entered textual content for a schema × locale pair.
 *
 * The `content` jsonb mirrors the schemaStructure shape but with real values:
 *   - string/text fields → ""  (empty string until filled)
 *   - file fields        → ""  (URL string once uploaded)
 *   - array fields       → []
 *   - object fields      → {}  (recursively initialized)
 *
 * One row per (schemaId, locale). Row is created lazily on first access
 * via the `cmsContent.getOrInit` procedure — manager never needs to
 * explicitly create a content record.
 */
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

export const orgWithProjectsRelations = relations(org, ({ one, many }) => ({
  createdBy: one(user, {
    fields: [org.createdById],
    references: [user.id],
  }),
  projects: many(project),
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  org: one(org, {
    fields: [project.orgId],
    references: [org.id],
  }),
  createdBy: one(user, {
    fields: [project.createdById],
    references: [user.id],
  }),
  schemas: many(cmsSchema),
  languages: many(projectLanguage),
  contents: many(cmsContent),
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
