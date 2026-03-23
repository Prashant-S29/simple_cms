import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "~/server/db/schema";
import { activityLog } from "~/server/db/project";

type Db = PostgresJsDatabase<typeof schema>;

export type ActivityAction =
  | "content.saved"
  | "content.reset"
  | "blog.created"
  | "blog.deleted"
  | "blog.saved"
  | "blog.published"
  | "blog.unpublished"
  | "blog.toggled_active"
  | "schema.created"
  | "schema.updated"
  | "schema.deleted"
  | "schema.structure_saved"
  | "schema.structure_reset"
  | "language.added"
  | "language.disabled"
  | "language.enabled"
  | "language.deleted"
  | "api_key.created"
  | "api_key.revoked"
  | "member.invited"
  | "member.removed"
  | "member.role_updated";

export type ActivityResourceType =
  | "schema"
  | "content"
  | "blog"
  | "language"
  | "api_key"
  | "member";

interface LogActivityInput {
  db: Db;
  projectId: string;
  userId: string;
  action: ActivityAction;
  resourceType: ActivityResourceType;
  resourceId: string;
  resourceSlug?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Write an activity log entry.
 *
 * Call this synchronously inside tRPC procedures after the main operation
 * succeeds. It's a single INSERT — negligible overhead.
 *
 * Does NOT throw — if logging fails, the main operation is unaffected.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await input.db.insert(activityLog).values({
      projectId: input.projectId,
      userId: input.userId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      resourceSlug: input.resourceSlug,
      metadata: input.metadata ?? {},
    });
  } catch {
    // Swallow — logging should never break the main flow
    console.warn("[activityLog] Failed to write activity log", {
      action: input.action,
      projectId: input.projectId,
    });
  }
}
