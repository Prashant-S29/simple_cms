import { relations } from "drizzle-orm";
import { index, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";

import { createTable, user } from "./schema";
import { org } from "./org";
import { project } from "./project";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const orgMemberRoleEnum = pgEnum("org_member_role", [
  "owner",
  "admin",
  "manager",
]);

export const orgMemberStatusEnum = pgEnum("org_member_status", [
  "active",
  "removed",
]);

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "expired",
  "joined",
]);

export const invitationRoleEnum = pgEnum("invitation_role", [
  "admin",
  "manager",
]);

// ─── Tables ───────────────────────────────────────────────────────────────────

/**
 * Org membership — one record per user per org.
 * status = "removed" means the user has been kicked and all ABAC checks deny
 * them immediately on the very next request.
 */
export const orgMember = createTable(
  "org_member",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),

    orgId: d
      .uuid()
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),

    userId: d
      .uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    role: orgMemberRoleEnum("role").notNull(),
    status: orgMemberStatusEnum("status").notNull().default("active"),

    /** Who sent the invitation — null for self-created owner records. */
    invitedById: d.uuid().references(() => user.id, { onDelete: "set null" }),

    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("org_member_org_idx").on(t.orgId),
    index("org_member_user_idx").on(t.userId),
    uniqueIndex("org_member_unique_idx").on(t.orgId, t.userId),
  ],
);

/**
 * Invitation records — the full history is kept so owners can see
 * pending / expired / joined states and re-invite or revoke at any time.
 */
export const orgInvitation = createTable(
  "org_invitation",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),

    orgId: d
      .uuid()
      .notNull()
      .references(() => org.id, { onDelete: "cascade" }),

    /** Email address the invitation was sent to. */
    email: d.text().notNull(),

    /** Populated once the invited user actually accepts and joins. */
    invitedUserId: d.uuid().references(() => user.id, { onDelete: "set null" }),

    role: invitationRoleEnum("role").notNull(),
    status: invitationStatusEnum("status").notNull().default("pending"),

    invitedById: d
      .uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    /** Always set to createdAt + 24 h. */
    expiresAt: d.timestamp({ withTimezone: true }).notNull(),

    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("org_invitation_org_idx").on(t.orgId),
    index("org_invitation_email_idx").on(t.email),
    index("org_invitation_status_idx").on(t.status),
  ],
);

/**
 * Projects scoped to a *pending* manager invitation.
 * When the invitee joins, these rows are copied into orgMemberProject.
 */
export const orgInvitationProject = createTable(
  "org_invitation_project",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),

    invitationId: d
      .uuid()
      .notNull()
      .references(() => orgInvitation.id, { onDelete: "cascade" }),

    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),

    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("org_inv_proj_inv_idx").on(t.invitationId),
    index("org_inv_proj_proj_idx").on(t.projectId),
    uniqueIndex("org_inv_proj_unique_idx").on(t.invitationId, t.projectId),
  ],
);

/**
 * Projects an *active* manager member is allowed to access.
 * owner / admin bypass this table — they always have full project access.
 */
export const orgMemberProject = createTable(
  "org_member_project",
  (d) => ({
    id: d.uuid().primaryKey().defaultRandom(),

    orgMemberId: d
      .uuid()
      .notNull()
      .references(() => orgMember.id, { onDelete: "cascade" }),

    projectId: d
      .uuid()
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),

    createdAt: d
      .timestamp({ withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  }),
  (t) => [
    index("org_member_proj_member_idx").on(t.orgMemberId),
    index("org_member_proj_proj_idx").on(t.projectId),
    uniqueIndex("org_member_proj_unique_idx").on(t.orgMemberId, t.projectId),
  ],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const orgMemberRelations = relations(orgMember, ({ one, many }) => ({
  org: one(org, { fields: [orgMember.orgId], references: [org.id] }),
  user: one(user, {
    fields: [orgMember.userId],
    references: [user.id],
    relationName: "orgMemberUser",
  }),
  invitedBy: one(user, {
    fields: [orgMember.invitedById],
    references: [user.id],
    relationName: "orgMemberInvitedBy",
  }),
  projectAccess: many(orgMemberProject),
}));

export const orgInvitationRelations = relations(
  orgInvitation,
  ({ one, many }) => ({
    org: one(org, { fields: [orgInvitation.orgId], references: [org.id] }),
    invitedUser: one(user, {
      fields: [orgInvitation.invitedUserId],
      references: [user.id],
      relationName: "orgInvitationInvitedUser",
    }),
    invitedBy: one(user, {
      fields: [orgInvitation.invitedById],
      references: [user.id],
      relationName: "orgInvitationInvitedBy",
    }),
    projects: many(orgInvitationProject),
  }),
);

export const orgInvitationProjectRelations = relations(
  orgInvitationProject,
  ({ one }) => ({
    invitation: one(orgInvitation, {
      fields: [orgInvitationProject.invitationId],
      references: [orgInvitation.id],
    }),
    project: one(project, {
      fields: [orgInvitationProject.projectId],
      references: [project.id],
    }),
  }),
);

export const orgMemberProjectRelations = relations(
  orgMemberProject,
  ({ one }) => ({
    orgMember: one(orgMember, {
      fields: [orgMemberProject.orgMemberId],
      references: [orgMember.id],
    }),
    project: one(project, {
      fields: [orgMemberProject.projectId],
      references: [project.id],
    }),
  }),
);
