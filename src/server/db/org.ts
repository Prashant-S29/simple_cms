import { relations } from "drizzle-orm";
import { index } from "drizzle-orm/pg-core";

import { createTable, user } from "./schema";

export const org = createTable(
  "org",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),

    name: d.text().notNull(),
    slug: d.text().notNull().unique(),

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
    index("org_slug_idx").on(t.slug),
    index("org_created_by_idx").on(t.createdById),
  ],
);

export const orgRelations = relations(org, ({ one }) => ({
  createdBy: one(user, {
    fields: [org.createdById],
    references: [user.id],
  }),
}));
