import { z } from "zod";

// ─── Invite member ────────────────────────────────────────────────────────────

export const InviteMemberSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID."),
  email: z.string().email("Please enter a valid email address."),
  role: z.enum(["admin", "manager"], {
    required_error: "Role is required.",
    invalid_type_error: "Role must be 'admin' or 'manager'.",
  }),
  /**
   * Required when role = "manager".
   * Lists the project IDs the manager will be scoped to.
   */
  projectIds: z
    .array(z.string().uuid("Invalid project ID."))
    .optional()
    .default([]),
});

export type InviteMemberSchemaType = z.infer<typeof InviteMemberSchema>;

// ─── Join org via invite code ─────────────────────────────────────────────────

export const JoinOrgSchema = z.object({
  /**
   * Invite code in the format "CMS-XXXXXX".
   * Case-insensitive — normalised to uppercase on the server.
   */
  inviteCode: z
    .string()
    .min(1, "Invite code is required.")
    .transform((v) => v.trim().toUpperCase()),
});

export type JoinOrgSchemaType = z.infer<typeof JoinOrgSchema>;

// ─── Update member role ───────────────────────────────────────────────────────

export const UpdateMemberRoleSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID."),
  memberId: z.string().uuid("Invalid member ID."),
  role: z.enum(["admin", "manager"], {
    required_error: "Role is required.",
    invalid_type_error: "Role must be 'admin' or 'manager'.",
  }),
  /**
   * Required when changing to / staying on the "manager" role.
   * Replaces the full set of assigned projects for this member.
   */
  projectIds: z
    .array(z.string().uuid("Invalid project ID."))
    .optional()
    .default([]),
});

export type UpdateMemberRoleSchemaType = z.infer<typeof UpdateMemberRoleSchema>;

// ─── Remove member ────────────────────────────────────────────────────────────

export const RemoveMemberSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID."),
  memberId: z.string().uuid("Invalid member ID."),
});

export type RemoveMemberSchemaType = z.infer<typeof RemoveMemberSchema>;

// ─── Get members ──────────────────────────────────────────────────────────────

export const GetMembersSchema = z.object({
  orgId: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

export type GetMembersSchemaType = z.infer<typeof GetMembersSchema>;

// ─── Get invitations ──────────────────────────────────────────────────────────

export const GetInvitationsSchema = z.object({
  orgId: z.string().uuid(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
});

export type GetInvitationsSchemaType = z.infer<typeof GetInvitationsSchema>;

// ─── Re-invite (resend a new invitation to an expired/revoked email) ──────────

export const ReInviteSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID."),
  invitationId: z.string().uuid("Invalid invitation ID."),
});

export type ReInviteSchemaType = z.infer<typeof ReInviteSchema>;

// ─── Revoke a pending invitation ─────────────────────────────────────────────

export const RevokeInvitationSchema = z.object({
  orgId: z.string().uuid("Invalid organization ID."),
  invitationId: z.string().uuid("Invalid invitation ID."),
});

export type RevokeInvitationSchemaType = z.infer<typeof RevokeInvitationSchema>;
