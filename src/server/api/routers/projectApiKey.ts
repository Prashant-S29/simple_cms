import { and, eq } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { projectApiKey } from "~/server/db/project";
import { errorResponse, getErrorInfo, successResponse } from "~/lib/errors";
import { requireProjectAccess } from "~/server/api/membershipGuard";
import { generateApiKey, getKeyPrefix, hashApiKey } from "~/lib/apiKey";
import { logActivity } from "~/lib/activityLog";
import {
  CreateApiKeySchema,
  GetApiKeysSchema,
  RevokeApiKeySchema,
} from "~/zodSchema/apiKey";

export const projectApiKeyRouter = createTRPCRouter({
  /**
   * Create a new API key for a project.
   * Only owner / admin (schema:manage).
   *
   * Returns the raw key ONCE in the response — it is never retrievable again.
   * The stored keyHash is used for all future auth lookups.
   */
  create: protectedProcedure
    .input(CreateApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "schema:manage",
      );
      if (!guard.ok) return guard.response;

      const rawKey = generateApiKey();
      const keyHash = hashApiKey(rawKey);
      const keyPrefix = getKeyPrefix(rawKey);

      const [newKey] = await ctx.db
        .insert(projectApiKey)
        .values({
          projectId: input.projectId,
          name: input.name,
          keyHash,
          keyPrefix,
          status: "active",
          createdById: ctx.session.user.id,
        })
        .returning();

      // Log activity
      await logActivity({
        db: ctx.db,
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: "api_key.created",
        resourceType: "api_key",
        resourceId: newKey!.id,
        resourceSlug: keyPrefix,
        metadata: { name: input.name, prefix: keyPrefix },
      });

      return successResponse(
        {
          id: newKey!.id,
          name: newKey!.name,
          keyPrefix: newKey!.keyPrefix,
          status: newKey!.status,
          createdAt: newKey!.createdAt,
          // Raw key returned ONCE — not stored, not retrievable again
          rawKey,
        },
        `API key "${input.name}" created. Copy it now — it won't be shown again.`,
      );
    }),

  /**
   * List all API keys for a project.
   * Returns metadata only — never the hash or raw key.
   * Only owner / admin (schema:manage).
   */
  getAll: protectedProcedure
    .input(GetApiKeysSchema)
    .query(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "schema:manage",
      );
      if (!guard.ok) return guard.response;

      const keys = await ctx.db
        .select({
          id: projectApiKey.id,
          name: projectApiKey.name,
          keyPrefix: projectApiKey.keyPrefix,
          status: projectApiKey.status,
          lastUsedAt: projectApiKey.lastUsedAt,
          createdAt: projectApiKey.createdAt,
          revokedAt: projectApiKey.revokedAt,
        })
        .from(projectApiKey)
        .where(eq(projectApiKey.projectId, input.projectId))
        .orderBy(projectApiKey.createdAt);

      return successResponse(keys, "API keys fetched successfully.");
    }),

  /**
   * Revoke an API key.
   * Sets status → revoked. The key immediately stops working for API auth.
   * Only owner / admin (schema:manage).
   */
  revoke: protectedProcedure
    .input(RevokeApiKeySchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireProjectAccess(
        ctx.db,
        input.orgId,
        input.projectId,
        ctx.session.user.id,
        "schema:manage",
      );
      if (!guard.ok) return guard.response;

      const [existing] = await ctx.db
        .select({
          id: projectApiKey.id,
          name: projectApiKey.name,
          keyPrefix: projectApiKey.keyPrefix,
          status: projectApiKey.status,
        })
        .from(projectApiKey)
        .where(
          and(
            eq(projectApiKey.id, input.id),
            eq(projectApiKey.projectId, input.projectId),
          ),
        )
        .limit(1);

      if (!existing) {
        return errorResponse(getErrorInfo("project", "NOT_FOUND"));
      }

      if (existing.status === "revoked") {
        return errorResponse(
          getErrorInfo("general", "VALIDATION_ERROR", {
            message: "This key has already been revoked.",
          }),
        );
      }

      const now = new Date();
      const [updated] = await ctx.db
        .update(projectApiKey)
        .set({
          status: "revoked",
          revokedAt: now,
          revokedById: ctx.session.user.id,
        })
        .where(eq(projectApiKey.id, input.id))
        .returning();

      await logActivity({
        db: ctx.db,
        projectId: input.projectId,
        userId: ctx.session.user.id,
        action: "api_key.revoked",
        resourceType: "api_key",
        resourceId: existing.id,
        resourceSlug: existing.keyPrefix,
        metadata: { name: existing.name, prefix: existing.keyPrefix },
      });

      return successResponse(
        updated!,
        `API key "${existing.name}" has been revoked.`,
      );
    }),
});
