/**
 * ABAC (Attribute-Based Access Control) permission layer.
 *
 * Access decisions evaluate:
 *   - Subject attributes  → who is acting (role, membership status)
 *   - Action              → what is being done (namespaced: "resource:verb")
 *   - Environment context → extra scoping (e.g. assigned project IDs for managers)
 *
 * This module is intentionally self-contained so it can be extracted into a
 * shared "core" package in the future without breaking changes.
 */

export type OrgRole = "owner" | "admin" | "manager";
export type MemberStatus = "active" | "removed";

/** All possible actions in the system, namespaced by resource type. */
export type Action =
  // Org resource
  | "org:read"
  | "org:update"
  | "org:delete"
  // Project resource
  | "project:create"
  | "project:read"
  | "project:update"
  | "project:delete"
  // Member management
  | "member:invite"
  | "member:update_role"
  | "member:remove"
  | "member:view"
  | "schema:manage";

/** Attributes of the acting subject (sourced from org_member record). */
export interface SubjectAttributes {
  orgRole: OrgRole;
  status: MemberStatus;
}

/**
 * Optional environment context for scoped permission checks.
 * Used when the action targets a specific project and the subject is a manager.
 */
export interface PermissionContext {
  /** ID of the specific project being acted on. */
  projectId?: string;
  /** All project IDs this manager has been granted access to. */
  assignedProjectIds?: string[];
}

/**
 * Static permission matrix.
 *
 * true     = always allowed for this role
 * false    = always denied
 * "scoped" = allowed only when projectId is present in assignedProjectIds
 */
const POLICY: Record<OrgRole, Record<Action, boolean | "scoped">> = {
  owner: {
    "org:read": true,
    "org:update": true,
    "org:delete": true,
    "project:create": true,
    "project:read": true,
    "project:update": true,
    "project:delete": true,
    "member:invite": true,
    "member:update_role": true,
    "member:remove": true,
    "member:view": true,
    "schema:manage": true,
  },
  admin: {
    "org:read": true,
    "org:update": false,
    "org:delete": false,
    "project:create": true,
    "project:read": true,
    "project:update": true,
    "project:delete": true,
    "member:invite": true,
    "member:update_role": true,
    "member:remove": true,
    "member:view": true,
    "schema:manage": true,
  },
  manager: {
    "org:read": true,
    "org:update": false,
    "org:delete": false,
    "project:create": false,
    "project:read": "scoped",
    "project:update": "scoped",
    "project:delete": "scoped",
    "member:invite": false,
    "member:update_role": false,
    "member:remove": false,
    "member:view": false,
    "schema:manage": false,
  },
};

/**
 * Returns true if the subject is allowed to perform `action`.
 *
 * @example
 * // Owner updating an org — always allowed
 * canPerform({ orgRole: "owner", status: "active" }, "org:update")
 *
 * @example
 * // Manager reading a specific assigned project
 * canPerform(
 *   { orgRole: "manager", status: "active" },
 *   "project:read",
 *   { projectId: "proj-123", assignedProjectIds: ["proj-123", "proj-456"] },
 * )
 *
 * @example
 * // Removed member — always denied regardless of role
 * canPerform({ orgRole: "owner", status: "removed" }, "org:read") // false
 */
export function canPerform(
  subject: SubjectAttributes,
  action: Action,
  context?: PermissionContext,
): boolean {
  // Removed members have zero permissions — checked first, always.
  if (subject.status !== "active") return false;

  const rule = POLICY[subject.orgRole][action];

  if (rule === true) return true;
  if (rule === false) return false;

  // rule === "scoped": manager acting on a specific project
  if (!context?.projectId) return false;
  return context.assignedProjectIds?.includes(context.projectId) ?? false;
}

/**
 * Throws a plain Error("PERMISSION_DENIED") if the subject cannot perform the
 * given action. Intended for use inside tRPC procedures — the router layer maps
 * this to a FORBIDDEN response.
 */
export function assertPermission(
  subject: SubjectAttributes,
  action: Action,
  context?: PermissionContext,
): void {
  if (!canPerform(subject, action, context)) {
    throw new Error("PERMISSION_DENIED");
  }
}

/**
 * Resolves a subject's effective role label for display in the UI.
 */
export function getRoleLabel(role: OrgRole): string {
  const labels: Record<OrgRole, string> = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
  };
  return labels[role];
}
