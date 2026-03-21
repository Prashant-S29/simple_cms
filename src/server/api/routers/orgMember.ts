import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { org } from "~/server/db/org";
import { project } from "~/server/db/project";
import {
  orgInvitation,
  orgInvitationProject,
  orgMember,
  orgMemberProject,
} from "~/server/db/orgMember";
import { user } from "~/server/db/schema";
import { errorResponse, getErrorInfo, successResponse } from "~/lib/errors";
import {
  requireOrgAccess,
  resolveOrgMembership,
} from "~/server/api/membershipGuard";
// import { sendInvitationEmail } from "~/lib/mail";
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";

import {
  GetInvitationsSchema,
  GetMembersSchema,
  InviteMemberSchema,
  JoinOrgSchema,
  ReInviteSchema,
  RemoveMemberSchema,
  RevokeInvitationSchema,
  UpdateMemberRoleSchema,
} from "~/zodSchema/orgMember";

// ─── Constants ────────────────────────────────────────────────────────────────

const INVITATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Router ───────────────────────────────────────────────────────────────────

export const orgMemberRouter = createTRPCRouter({
  // ── Invite a user ───────────────────────────────────────────────────────────
  /**
   * Sends an email invitation to a user.
   *
   * Rules:
   *   - Caller must be owner or admin.
   *   - Target email must not already be an active member.
   *   - If a pending (non-expired) invitation already exists for that email +
   *     org, reject with INVITATION_ALREADY_PENDING.
   *   - For role = "manager", projectIds must be non-empty.
   *   - Invitation expires in 24 h.
   */
  invite: protectedProcedure
    .input(InviteMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, email, role, projectIds } = input;
      const callerId = ctx.session.user.id;

      // ── Permission check ────────────────────────────────────────────────────
      const guard = await requireOrgAccess(
        ctx.db,
        orgId,
        callerId,
        "member:invite",
      );
      if (!guard.ok) return guard.response;

      // ── Load org for name + invite code ─────────────────────────────────────
      const [orgRow] = await ctx.db
        .select({ id: org.id, name: org.name, inviteCode: org.inviteCode })
        .from(org)
        .where(eq(org.id, orgId))
        .limit(1);

      if (!orgRow) return errorResponse(getErrorInfo("org", "NOT_FOUND"));

      // ── Check if target is already an active member ──────────────────────────
      const [targetUser] = await ctx.db
        .select({ id: user.id, email: user.email })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);

      if (targetUser) {
        const [existingMember] = await ctx.db
          .select({ id: orgMember.id, status: orgMember.status })
          .from(orgMember)
          .where(
            and(
              eq(orgMember.orgId, orgId),
              eq(orgMember.userId, targetUser.id),
            ),
          )
          .limit(1);

        if (existingMember?.status === "active") {
          return errorResponse(getErrorInfo("orgMember", "ALREADY_MEMBER"));
        }
      }

      // ── Block duplicate pending invitations ──────────────────────────────────
      const now = new Date();
      const [pendingInv] = await ctx.db
        .select({ id: orgInvitation.id })
        .from(orgInvitation)
        .where(
          and(
            eq(orgInvitation.orgId, orgId),
            eq(orgInvitation.email, email),
            eq(orgInvitation.status, "pending"),
          ),
        )
        .limit(1);

      if (pendingInv) {
        // If it has actually expired in real time, mark it and continue
        const [pendingFull] = await ctx.db
          .select({ expiresAt: orgInvitation.expiresAt })
          .from(orgInvitation)
          .where(eq(orgInvitation.id, pendingInv.id))
          .limit(1);

        if (pendingFull && pendingFull.expiresAt > now) {
          return errorResponse(getErrorInfo("invitation", "ALREADY_PENDING"));
        }

        // Expired — mark it so and allow re-invite
        await ctx.db
          .update(orgInvitation)
          .set({ status: "expired" })
          .where(eq(orgInvitation.id, pendingInv.id));
      }

      // ── Validate project IDs for manager role ────────────────────────────────
      if (role === "manager" && projectIds && projectIds.length > 0) {
        const orgProjects = await ctx.db
          .select({ id: project.id })
          .from(project)
          .where(
            and(eq(project.orgId, orgId), inArray(project.id, projectIds)),
          );

        if (orgProjects.length !== projectIds.length) {
          return errorResponse(
            getErrorInfo("general", "VALIDATION_ERROR", {
              message:
                "One or more project IDs are invalid or do not belong to this organization.",
            }),
          );
        }
      }

      // ── Create invitation record ─────────────────────────────────────────────
      const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);

      const [invitation] = await ctx.db
        .insert(orgInvitation)
        .values({
          orgId,
          email,
          invitedUserId: targetUser?.id ?? null,
          role,
          status: "pending",
          invitedById: callerId,
          expiresAt,
        })
        .returning();

      if (!invitation) {
        return errorResponse(getErrorInfo("general", "INTERNAL_SERVER_ERROR"));
      }

      // ── Attach project scopes for manager invitations ────────────────────────
      if (role === "manager" && projectIds && projectIds.length > 0) {
        await ctx.db.insert(orgInvitationProject).values(
          projectIds.map((projectId) => ({
            invitationId: invitation.id,
            projectId,
          })),
        );
      }

      // ── Send invitation email ────────────────────────────────────────────────
      try {
        console.log(`[EMAIL] invitation email`, {
          email,
          orgName: orgRow.name,
          inviteCode: orgRow.inviteCode,
          role,
          inviterName: ctx.session.user.name,
          expiresAt,
        });

        // await sendInvitationEmail({
        //   email,
        //   orgName: orgRow.name,
        //   inviteCode: orgRow.inviteCode,
        //   role,
        //   inviterName: ctx.session.user.name,
        //   expiresAt,
        // });
      } catch {
        // Roll back the invitation if the email fails
        await ctx.db
          .delete(orgInvitation)
          .where(eq(orgInvitation.id, invitation.id));
        return errorResponse(getErrorInfo("invitation", "SEND_FAILED"));
      }

      return successResponse(
        { invitationId: invitation.id },
        `Invitation sent to ${email}.`,
      );
    }),

  // ── Join org via invite code ─────────────────────────────────────────────────
  /**
   * Accepts an invitation by entering the org's invite code.
   *
   * Flow:
   *   1. Resolve the org from the invite code.
   *   2. Find the most-recent pending invitation for (orgId, callerEmail).
   *   3. Check it is not expired.
   *   4. Create / reactivate the org_member record.
   *   5. Copy invitation project scopes into org_member_project (managers).
   *   6. Mark invitation as "joined".
   */
  join: protectedProcedure
    .input(JoinOrgSchema)
    .mutation(async ({ ctx, input }) => {
      const callerEmail = ctx.session.user.email;
      const callerId = ctx.session.user.id;
      const now = new Date();

      // ── Resolve org from code ────────────────────────────────────────────────
      const [orgRow] = await ctx.db
        .select({ id: org.id, name: org.name, slug: org.slug })
        .from(org)
        .where(eq(org.inviteCode, input.inviteCode))
        .limit(1);

      if (!orgRow) {
        return errorResponse(getErrorInfo("invitation", "INVALID_INVITE_CODE"));
      }

      // ── Lazy expiry — fetch pending rows and mark truly stale ones ───────────
      // Drizzle does not expose a native "WHERE expiresAt < now()" in updates
      // without raw SQL, so we fetch + filter in JS and batch-update only the
      // rows that have actually passed their deadline.
      const pendingForOrg = await ctx.db
        .select({ id: orgInvitation.id, expiresAt: orgInvitation.expiresAt })
        .from(orgInvitation)
        .where(
          and(
            eq(orgInvitation.orgId, orgRow.id),
            eq(orgInvitation.status, "pending"),
          ),
        );

      const staleIds = pendingForOrg
        .filter((r) => r.expiresAt <= now)
        .map((r) => r.id);

      if (staleIds.length > 0) {
        await ctx.db
          .update(orgInvitation)
          .set({ status: "expired" })
          .where(inArray(orgInvitation.id, staleIds));
      }

      // ── Find the user's pending invitation ───────────────────────────────────
      const [invitation] = await ctx.db
        .select({
          id: orgInvitation.id,
          role: orgInvitation.role,
          status: orgInvitation.status,
          expiresAt: orgInvitation.expiresAt,
        })
        .from(orgInvitation)
        .where(
          and(
            eq(orgInvitation.orgId, orgRow.id),
            eq(orgInvitation.email, callerEmail),
            eq(orgInvitation.status, "pending"),
          ),
        )
        .orderBy(desc(orgInvitation.createdAt))
        .limit(1);

      if (!invitation) {
        const [anyInv] = await ctx.db
          .select({ id: orgInvitation.id, status: orgInvitation.status })
          .from(orgInvitation)
          .where(
            and(
              eq(orgInvitation.orgId, orgRow.id),
              eq(orgInvitation.email, callerEmail),
            ),
          )
          .orderBy(desc(orgInvitation.createdAt))
          .limit(1);

        if (anyInv?.status === "expired") {
          return errorResponse(getErrorInfo("invitation", "EXPIRED"));
        }

        if (anyInv?.status === "joined") {
          // Their invitation was previously accepted — but they may have been
          // removed since. Check the actual membership record before deciding.
          const [membership] = await ctx.db
            .select({ status: orgMember.status })
            .from(orgMember)
            .where(
              and(
                eq(orgMember.orgId, orgRow.id),
                eq(orgMember.userId, callerId),
              ),
            )
            .limit(1);

          if (membership?.status === "active") {
            // Genuinely still a member — block the join
            return errorResponse(getErrorInfo("orgMember", "ALREADY_MEMBER"));
          }

          // membership is "removed" (or somehow missing) — treat as not invited
          // so they must be re-invited by an owner/admin before rejoining
          return errorResponse(getErrorInfo("invitation", "NOT_INVITED"));
        }

        return errorResponse(getErrorInfo("invitation", "NOT_INVITED"));
      }

      // Double-check expiry (defensive)
      if (invitation.expiresAt <= now) {
        await ctx.db
          .update(orgInvitation)
          .set({ status: "expired" })
          .where(eq(orgInvitation.id, invitation.id));
        return errorResponse(getErrorInfo("invitation", "EXPIRED"));
      }

      // ── Upsert org_member ────────────────────────────────────────────────────
      const [existing] = await ctx.db
        .select({ id: orgMember.id, status: orgMember.status })
        .from(orgMember)
        .where(
          and(eq(orgMember.orgId, orgRow.id), eq(orgMember.userId, callerId)),
        )
        .limit(1);

      let memberId: string;

      if (existing) {
        // Re-activate a previously removed member
        await ctx.db
          .update(orgMember)
          .set({ role: invitation.role, status: "active" })
          .where(eq(orgMember.id, existing.id));
        memberId = existing.id;

        // Clear out stale project access so we start fresh
        await ctx.db
          .delete(orgMemberProject)
          .where(eq(orgMemberProject.orgMemberId, existing.id));
      } else {
        const [newMember] = await ctx.db
          .insert(orgMember)
          .values({
            orgId: orgRow.id,
            userId: callerId,
            role: invitation.role,
            status: "active",
            invitedById: null,
          })
          .returning({ id: orgMember.id });

        if (!newMember) {
          return errorResponse(
            getErrorInfo("general", "INTERNAL_SERVER_ERROR"),
          );
        }
        memberId = newMember.id;
      }

      // ── Copy project scopes for manager role ─────────────────────────────────
      if (invitation.role === "manager") {
        const scopedProjects = await ctx.db
          .select({ projectId: orgInvitationProject.projectId })
          .from(orgInvitationProject)
          .where(eq(orgInvitationProject.invitationId, invitation.id));

        if (scopedProjects.length > 0) {
          await ctx.db.insert(orgMemberProject).values(
            scopedProjects.map((sp) => ({
              orgMemberId: memberId,
              projectId: sp.projectId,
            })),
          );
        }
      }

      // ── Mark invitation as joined ────────────────────────────────────────────
      await ctx.db
        .update(orgInvitation)
        .set({ status: "joined", invitedUserId: callerId })
        .where(eq(orgInvitation.id, invitation.id));

      return successResponse(
        { orgSlug: orgRow.slug },
        `You have joined "${orgRow.name}".`,
      );
    }),

  // ── Update a member's role ───────────────────────────────────────────────────
  updateRole: protectedProcedure
    .input(UpdateMemberRoleSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, memberId, role, projectIds } = input;
      const callerId = ctx.session.user.id;

      // ── Permission check ─────────────────────────────────────────────────────
      const guard = await requireOrgAccess(
        ctx.db,
        orgId,
        callerId,
        "member:update_role",
      );
      if (!guard.ok) return guard.response;

      // ── Load target member ────────────────────────────────────────────────────
      const [targetMember] = await ctx.db
        .select({
          id: orgMember.id,
          userId: orgMember.userId,
          role: orgMember.role,
          status: orgMember.status,
        })
        .from(orgMember)
        .where(and(eq(orgMember.id, memberId), eq(orgMember.orgId, orgId)))
        .limit(1);

      if (!targetMember) {
        return errorResponse(getErrorInfo("orgMember", "NOT_FOUND"));
      }

      if (targetMember.role === "owner") {
        return errorResponse(
          getErrorInfo("orgMember", "CANNOT_CHANGE_OWNER_ROLE"),
        );
      }

      // ── Validate project IDs when provided ───────────────────────────────────
      // Projects are now OPTIONAL for manager — if provided, verify they belong
      // to this org. If none are passed the manager simply has no project access.
      if (role === "manager" && projectIds && projectIds.length > 0) {
        const orgProjects = await ctx.db
          .select({ id: project.id })
          .from(project)
          .where(
            and(eq(project.orgId, orgId), inArray(project.id, projectIds)),
          );

        if (orgProjects.length !== projectIds.length) {
          return errorResponse(
            getErrorInfo("general", "VALIDATION_ERROR", {
              message: "One or more project IDs are invalid.",
            }),
          );
        }
      }

      // ── Update role ───────────────────────────────────────────────────────────
      await ctx.db
        .update(orgMember)
        .set({ role })
        .where(eq(orgMember.id, memberId));

      // ── Sync project access ───────────────────────────────────────────────────
      await ctx.db
        .delete(orgMemberProject)
        .where(eq(orgMemberProject.orgMemberId, memberId));

      if (role === "manager" && projectIds && projectIds.length > 0) {
        await ctx.db.insert(orgMemberProject).values(
          projectIds.map((projectId) => ({
            orgMemberId: memberId,
            projectId,
          })),
        );
      }

      return successResponse(null, "Member role updated successfully.");
    }),

  // ── Remove a member ──────────────────────────────────────────────────────────

  remove: protectedProcedure
    .input(RemoveMemberSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, memberId } = input;
      const callerId = ctx.session.user.id;

      // ── Permission check ─────────────────────────────────────────────────────
      const guard = await requireOrgAccess(
        ctx.db,
        orgId,
        callerId,
        "member:remove",
      );
      if (!guard.ok) return guard.response;

      // ── Load target member ─────────────────────────────────────────────────
      const [targetMember] = await ctx.db
        .select({
          id: orgMember.id,
          userId: orgMember.userId,
          role: orgMember.role,
          status: orgMember.status,
        })
        .from(orgMember)
        .where(and(eq(orgMember.id, memberId), eq(orgMember.orgId, orgId)))
        .limit(1);

      if (!targetMember) {
        return errorResponse(getErrorInfo("orgMember", "NOT_FOUND"));
      }

      if (targetMember.role === "owner") {
        return errorResponse(getErrorInfo("orgMember", "CANNOT_REMOVE_OWNER"));
      }

      // ── Mark as removed ───────────────────────────────────────────────────────
      await ctx.db
        .update(orgMember)
        .set({ status: "removed" })
        .where(eq(orgMember.id, memberId));

      // ── Revoke all project access immediately ────────────────────────────────
      await ctx.db
        .delete(orgMemberProject)
        .where(eq(orgMemberProject.orgMemberId, memberId));

      return successResponse(null, "Member removed from organization.");
    }),

  // ── List members ─────────────────────────────────────────────────────────────
  /**
   * Returns all active + removed members of an org.
   * Caller must be owner or admin.
   */
  getMembers: protectedProcedure
    .input(GetMembersSchema)
    .query(async ({ ctx, input }) => {
      const { orgId, page, limit, search } = input;
      const callerId = ctx.session.user.id;

      const guard = await requireOrgAccess(
        ctx.db,
        orgId,
        callerId,
        "member:view",
      );
      if (!guard.ok) return guard.response;

      const offset = (page - 1) * limit;

      // Build search filter across user name + email
      const searchFilter = search
        ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`))
        : undefined;

      const whereClause = and(eq(orgMember.orgId, orgId), searchFilter);

      const [members, [countRow]] = await Promise.all([
        ctx.db
          .select({
            id: orgMember.id,
            userId: orgMember.userId,
            role: orgMember.role,
            status: orgMember.status,
            createdAt: orgMember.createdAt,
            name: user.name,
            email: user.email,
            image: user.image,
          })
          .from(orgMember)
          .innerJoin(user, eq(user.id, orgMember.userId))
          .where(whereClause)
          .orderBy(desc(orgMember.createdAt))
          .limit(limit)
          .offset(offset),

        ctx.db
          .select({ total: count(orgMember.id) })
          .from(orgMember)
          .innerJoin(user, eq(user.id, orgMember.userId))
          .where(whereClause),
      ]);

      const total = countRow?.total ?? 0;

      // Attach project access for manager members
      const managerIds = members
        .filter((m) => m.role === "manager" && m.status === "active")
        .map((m) => m.id);

      const projectAccess =
        managerIds.length > 0
          ? await ctx.db
              .select({
                orgMemberId: orgMemberProject.orgMemberId,
                projectId: orgMemberProject.projectId,
                projectName: project.name,
                projectSlug: project.slug,
              })
              .from(orgMemberProject)
              .innerJoin(project, eq(project.id, orgMemberProject.projectId))
              .where(inArray(orgMemberProject.orgMemberId, managerIds))
          : [];

      const accessByMember = projectAccess.reduce<
        Record<
          string,
          { projectId: string; projectName: string; projectSlug: string }[]
        >
      >((acc, row) => {
        (acc[row.orgMemberId] ??= []).push({
          projectId: row.projectId,
          projectName: row.projectName,
          projectSlug: row.projectSlug,
        });
        return acc;
      }, {});

      const enriched = members.map((m) => ({
        ...m,
        projectAccess: accessByMember[m.id] ?? [],
      }));

      const hasNext = offset + members.length < total;

      return successResponse(
        {
          items: enriched,
          total,
          page,
          limit,
          hasNext,
          nextPage: hasNext ? page + 1 : null,
        },
        "Members fetched successfully.",
      );
    }),

  // ── List invitation history ──────────────────────────────────────────────────
  /**
   * Returns all invitation records for an org (full history).
   * Lazily marks expired invitations before returning.
   * Caller must be owner or admin.
   */

  getInvitations: protectedProcedure
    .input(GetInvitationsSchema)
    .query(async ({ ctx, input }) => {
      const { orgId, page, limit, search } = input;
      const callerId = ctx.session.user.id;

      const guard = await requireOrgAccess(
        ctx.db,
        orgId,
        callerId,
        "member:view",
      );
      if (!guard.ok) return guard.response;

      // ── Lazy expiry ────────────────────────────────────────────────────────
      const now = new Date();

      const pendingRows = await ctx.db
        .select({ id: orgInvitation.id, expiresAt: orgInvitation.expiresAt })
        .from(orgInvitation)
        .where(
          and(
            eq(orgInvitation.orgId, orgId),
            eq(orgInvitation.status, "pending"),
          ),
        );

      const staleIds = pendingRows
        .filter((r) => r.expiresAt <= now)
        .map((r) => r.id);

      if (staleIds.length > 0) {
        await ctx.db
          .update(orgInvitation)
          .set({ status: "expired" })
          .where(inArray(orgInvitation.id, staleIds));
      }

      const offset = (page - 1) * limit;

      const searchFilter = search
        ? ilike(orgInvitation.email, `%${search}%`)
        : undefined;

      const whereClause = and(eq(orgInvitation.orgId, orgId), searchFilter);

      const [invitations, [countRow]] = await Promise.all([
        ctx.db
          .select({
            id: orgInvitation.id,
            email: orgInvitation.email,
            role: orgInvitation.role,
            status: orgInvitation.status,
            expiresAt: orgInvitation.expiresAt,
            createdAt: orgInvitation.createdAt,
            invitedById: orgInvitation.invitedById,
            invitedUserId: orgInvitation.invitedUserId,
          })
          .from(orgInvitation)
          .where(whereClause)
          .orderBy(desc(orgInvitation.createdAt))
          .limit(limit)
          .offset(offset),

        ctx.db
          .select({ total: count(orgInvitation.id) })
          .from(orgInvitation)
          .where(whereClause),
      ]);

      const total = countRow?.total ?? 0;
      const hasNext = offset + invitations.length < total;

      // Attach project scopes
      const invitationIds = invitations.map((i) => i.id);
      const projectScopes =
        invitationIds.length > 0
          ? await ctx.db
              .select({
                invitationId: orgInvitationProject.invitationId,
                projectId: orgInvitationProject.projectId,
                projectName: project.name,
                projectSlug: project.slug,
              })
              .from(orgInvitationProject)
              .innerJoin(
                project,
                eq(project.id, orgInvitationProject.projectId),
              )
              .where(inArray(orgInvitationProject.invitationId, invitationIds))
          : [];

      const scopesByInvitation = projectScopes.reduce<
        Record<
          string,
          { projectId: string; projectName: string; projectSlug: string }[]
        >
      >((acc, row) => {
        (acc[row.invitationId] ??= []).push({
          projectId: row.projectId,
          projectName: row.projectName,
          projectSlug: row.projectSlug,
        });
        return acc;
      }, {});

      const enriched = invitations.map((inv) => ({
        ...inv,
        projectScopes: scopesByInvitation[inv.id] ?? [],
      }));

      return successResponse(
        {
          items: enriched,
          total,
          page,
          limit,
          hasNext,
          nextPage: hasNext ? page + 1 : null,
        },
        "Invitations fetched successfully.",
      );
    }),

  // ── Re-invite ────────────────────────────────────────────────────────────────
  /**
   * Creates a fresh invitation (new expiry) for an expired or revoked one.
   * Caller must be owner or admin.
   */
  reinvite: protectedProcedure
    .input(ReInviteSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, invitationId } = input;
      const callerId = ctx.session.user.id;

      const guard = await requireOrgAccess(
        ctx.db,
        orgId,
        callerId,
        "member:invite",
      );
      if (!guard.ok) return guard.response;

      // ── Load original invitation ─────────────────────────────────────────────
      const [original] = await ctx.db
        .select({
          id: orgInvitation.id,
          email: orgInvitation.email,
          role: orgInvitation.role,
          status: orgInvitation.status,
        })
        .from(orgInvitation)
        .where(
          and(
            eq(orgInvitation.id, invitationId),
            eq(orgInvitation.orgId, orgId),
          ),
        )
        .limit(1);

      if (!original) {
        return errorResponse(getErrorInfo("invitation", "NOT_FOUND"));
      }

      if (original.status === "joined") {
        return errorResponse(getErrorInfo("invitation", "ALREADY_USED"));
      }

      if (original.status === "pending") {
        return errorResponse(getErrorInfo("invitation", "ALREADY_PENDING"));
      }

      // ── Get original project scopes ──────────────────────────────────────────
      const originalScopes = await ctx.db
        .select({ projectId: orgInvitationProject.projectId })
        .from(orgInvitationProject)
        .where(eq(orgInvitationProject.invitationId, original.id));

      const projectIds = originalScopes.map((s) => s.projectId);

      // ── Load org info ────────────────────────────────────────────────────────
      const [orgRow] = await ctx.db
        .select({ name: org.name, inviteCode: org.inviteCode })
        .from(org)
        .where(eq(org.id, orgId))
        .limit(1);

      if (!orgRow) return errorResponse(getErrorInfo("org", "NOT_FOUND"));

      const now = new Date();
      const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);

      // ── Create new invitation ────────────────────────────────────────────────
      const [newInvitation] = await ctx.db
        .insert(orgInvitation)
        .values({
          orgId,
          email: original.email,
          role: original.role,
          status: "pending",
          invitedById: callerId,
          expiresAt,
        })
        .returning();

      if (!newInvitation) {
        return errorResponse(getErrorInfo("general", "INTERNAL_SERVER_ERROR"));
      }

      if (original.role === "manager" && projectIds.length > 0) {
        await ctx.db.insert(orgInvitationProject).values(
          projectIds.map((projectId) => ({
            invitationId: newInvitation.id,
            projectId,
          })),
        );
      }

      // ── Resend email ─────────────────────────────────────────────────────────
      try {
        console.log(`[RESEND EMAIL] invitation email`, {
          email: original.email,
          orgName: orgRow.name,
          inviteCode: orgRow.inviteCode,
          role: original.role,
          inviterName: ctx.session.user.name,
          expiresAt,
        });
        // await sendInvitationEmail({
        //   email: original.email,
        //   orgName: orgRow.name,
        //   inviteCode: orgRow.inviteCode,
        //   role: original.role,
        //   inviterName: ctx.session.user.name,
        //   expiresAt,
        // });
      } catch {
        await ctx.db
          .delete(orgInvitation)
          .where(eq(orgInvitation.id, newInvitation.id));
        return errorResponse(getErrorInfo("invitation", "SEND_FAILED"));
      }

      return successResponse(
        { invitationId: newInvitation.id },
        `Re-invitation sent to ${original.email}.`,
      );
    }),

  // ── Revoke a pending invitation ──────────────────────────────────────────────
  /**
   * Cancels a pending invitation so it can never be accepted.
   * Only pending invitations can be revoked — expired / joined ones cannot.
   * Caller must be owner or admin.
   */
  revokeInvitation: protectedProcedure
    .input(RevokeInvitationSchema)
    .mutation(async ({ ctx, input }) => {
      const { orgId, invitationId } = input;
      const callerId = ctx.session.user.id;

      const guard = await requireOrgAccess(
        ctx.db,
        orgId,
        callerId,
        "member:invite",
      );
      if (!guard.ok) return guard.response;

      const [invitation] = await ctx.db
        .select({
          id: orgInvitation.id,
          status: orgInvitation.status,
          email: orgInvitation.email,
        })
        .from(orgInvitation)
        .where(
          and(
            eq(orgInvitation.id, invitationId),
            eq(orgInvitation.orgId, orgId),
          ),
        )
        .limit(1);

      if (!invitation) {
        return errorResponse(getErrorInfo("invitation", "NOT_FOUND"));
      }

      if (invitation.status !== "pending") {
        return errorResponse(
          getErrorInfo("general", "BAD_REQUEST", {
            message: "Only pending invitations can be revoked.",
          }),
        );
      }

      await ctx.db
        .update(orgInvitation)
        .set({ status: "expired" })
        .where(eq(orgInvitation.id, invitationId));

      return successResponse(
        null,
        `Invitation to ${invitation.email} has been revoked.`,
      );
    }),

  // ── My membership ────────────────────────────────────────────────────────────
  /**
   * Returns the calling user's membership info for a given org.
   * Used by the UI to determine which actions to show/hide.
   */
  myMembership: protectedProcedure
    .input(z.object({ orgId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const membership = await resolveOrgMembership(
        ctx.db,
        input.orgId,
        ctx.session.user.id,
      );

      if (!membership) {
        return errorResponse(getErrorInfo("org", "NOT_FOUND"));
      }

      if (membership.status === "removed") {
        return errorResponse(getErrorInfo("orgMember", "REMOVED"));
      }

      return successResponse(membership, "Membership fetched.");
    }),
});
