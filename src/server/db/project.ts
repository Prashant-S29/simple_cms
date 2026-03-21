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

/**
 * Languages configured for a project.
 *
 * Rules enforced at the application layer:
 *   - "en" is always seeded when a project is created (isDefault = true)
 *   - isDefault = true rows cannot be disabled or deleted
 *   - Only owner / admin can add, disable, enable, or delete languages
 */
export const projectLanguage = createTable(
  "project_language",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),
    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    /** BCP-47 locale code: "en", "ru", "ar", "fr" etc. */
    locale: d.text().notNull(),
    /** Human-readable display name: "English", "Russian" */
    label: d.text().notNull(),
    /** True only for the project's default language (always "en"). */
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

export const cmsSchemaRelations = relations(cmsSchema, ({ one }) => ({
  project: one(project, {
    fields: [cmsSchema.projectId],
    references: [project.id],
  }),
  createdBy: one(user, {
    fields: [cmsSchema.createdById],
    references: [user.id],
  }),
}));
