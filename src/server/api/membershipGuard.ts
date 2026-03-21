import { and, eq } from "drizzle-orm";

import { org } from "~/server/db/org";
import { orgMember, orgMemberProject } from "~/server/db/orgMember";
import { project } from "~/server/db/project";
import {
  canPerform,
  type Action,
  type OrgRole,
  type MemberStatus,
  type PermissionContext,
} from "~/lib/permissions";
import { errorResponse, getErrorInfo } from "~/lib/errors";
import type { db as DB } from "~/server/db";

type DrizzleDb = typeof DB;

// ─── Resolved membership ──────────────────────────────────────────────────────

export interface ResolvedMembership {
  memberId: string;
  orgId: string;
  userId: string;
  orgRole: OrgRole;
  status: MemberStatus;
  /** Only populated for managers — empty for owner / admin. */
  assignedProjectIds: string[];
}

// ─── Core resolver ────────────────────────────────────────────────────────────

/**
 * Resolves the calling user's membership for a given org.
 *
 * Resolution order:
 *   1. Look up org_member record for (orgId, userId).
 *   2. If no record exists, fall back to org.created_by_id so that orgs
 *      created before the member system was introduced still work correctly.
 *
 * Returns null when the user has no relationship to the org whatsoever.
 */
export async function resolveOrgMembership(
  db: DrizzleDb,
  orgId: string,
  userId: string,
): Promise<ResolvedMembership | null> {
  // ── 1. Check org_member table ─────────────────────────────────────────────
  const [member] = await db
    .select({
      id: orgMember.id,
      orgId: orgMember.orgId,
      userId: orgMember.userId,
      role: orgMember.role,
      status: orgMember.status,
    })
    .from(orgMember)
    .where(and(eq(orgMember.orgId, orgId), eq(orgMember.userId, userId)))
    .limit(1);

  if (member) {
    const assignedProjectIds =
      member.role === "manager" && member.status === "active"
        ? await getManagerProjectIds(db, member.id)
        : [];

    return {
      memberId: member.id,
      orgId: member.orgId,
      userId: member.userId,
      orgRole: member.role,
      status: member.status,
      assignedProjectIds,
    };
  }

  // ── 2. Legacy fallback: user is the org creator but has no member record ──
  const [orgRow] = await db
    .select({ id: org.id, createdById: org.createdById })
    .from(org)
    .where(eq(org.id, orgId))
    .limit(1);

  if (!orgRow) return null;

  if (orgRow.createdById === userId) {
    return {
      memberId: "legacy-owner",
      orgId,
      userId,
      orgRole: "owner",
      status: "active",
      assignedProjectIds: [],
    };
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fetches all project IDs a manager member has been granted access to. */
async function getManagerProjectIds(
  db: DrizzleDb,
  orgMemberId: string,
): Promise<string[]> {
  const rows = await db
    .select({ projectId: orgMemberProject.projectId })
    .from(orgMemberProject)
    .where(eq(orgMemberProject.orgMemberId, orgMemberId));

  return rows.map((r) => r.projectId);
}

// ─── Guard functions ──────────────────────────────────────────────────────────

/**
 * Resolves membership and asserts the user can perform `action` on the org.
 * Returns the resolved membership on success.
 * Returns an errorResponse payload on failure (caller should return it early).
 */
export async function requireOrgAccess(
  db: DrizzleDb,
  orgId: string,
  userId: string,
  action: Action,
): Promise<
  | { ok: true; membership: ResolvedMembership }
  | { ok: false; response: ReturnType<typeof errorResponse> }
> {
  const membership = await resolveOrgMembership(db, orgId, userId);

  if (!membership) {
    return {
      ok: false,
      response: errorResponse(getErrorInfo("org", "NOT_FOUND")),
    };
  }

  if (membership.status === "removed") {
    return {
      ok: false,
      response: errorResponse(getErrorInfo("orgMember", "REMOVED")),
    };
  }

  const allowed = canPerform(
    { orgRole: membership.orgRole, status: membership.status },
    action,
  );

  if (!allowed) {
    return {
      ok: false,
      response: errorResponse(
        getErrorInfo("orgMember", "INSUFFICIENT_PERMISSIONS"),
      ),
    };
  }

  return { ok: true, membership };
}

/**
 * Resolves membership and asserts the user can perform a project-scoped action.
 * Also verifies the project belongs to the org.
 *
 * Returns the resolved membership on success.
 * Returns an errorResponse payload on failure.
 */
export async function requireProjectAccess(
  db: DrizzleDb,
  orgId: string,
  projectId: string,
  userId: string,
  action: Action,
): Promise<
  | { ok: true; membership: ResolvedMembership }
  | { ok: false; response: ReturnType<typeof errorResponse> }
> {
  // Ensure the project actually belongs to this org
  const [projectRow] = await db
    .select({ id: project.id })
    .from(project)
    .where(and(eq(project.id, projectId), eq(project.orgId, orgId)))
    .limit(1);

  if (!projectRow) {
    return {
      ok: false,
      response: errorResponse(getErrorInfo("project", "NOT_FOUND")),
    };
  }

  const membership = await resolveOrgMembership(db, orgId, userId);

  if (!membership) {
    return {
      ok: false,
      response: errorResponse(getErrorInfo("org", "NOT_FOUND")),
    };
  }

  if (membership.status === "removed") {
    return {
      ok: false,
      response: errorResponse(getErrorInfo("orgMember", "REMOVED")),
    };
  }

  const context: PermissionContext = {
    projectId,
    assignedProjectIds: membership.assignedProjectIds,
  };

  const allowed = canPerform(
    { orgRole: membership.orgRole, status: membership.status },
    action,
    context,
  );

  if (!allowed) {
    return {
      ok: false,
      response: errorResponse(getErrorInfo("project", "ACCESS_DENIED")),
    };
  }

  return { ok: true, membership };
}

/**
 * Given a list of project IDs, filters it down to only those the user
 * is allowed to see based on their membership.
 *
 * - owner / admin → all project IDs returned unchanged
 * - manager       → intersection of projectIds and assignedProjectIds
 */
export function filterAccessibleProjects(
  projectIds: string[],
  membership: ResolvedMembership,
): string[] {
  if (membership.orgRole === "owner" || membership.orgRole === "admin") {
    return projectIds;
  }
  return projectIds.filter((id) => membership.assignedProjectIds.includes(id));
}
