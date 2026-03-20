import { relations } from "drizzle-orm";
import { index, uniqueIndex } from "drizzle-orm/pg-core";

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

//  relations
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
}));

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
