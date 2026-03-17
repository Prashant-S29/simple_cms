import { and, count, desc, eq, ilike, isNotNull, or } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { org } from "~/server/db/org";
import { orgMember } from "~/server/db/orgMember";
import { project } from "~/server/db/project";
import { user } from "~/server/db/schema";
import { generateOrgInviteCode, slugify } from "~/lib/utils";
import {
  CreateOrgSchema,
  GetOrgBySlugSchema,
  GetOrgsSchema,
  UpdateOrgSchema,
} from "~/zodSchema/org";
import { errorResponse, getErrorInfo, successResponse } from "~/lib/errors";
import { requireOrgAccess } from "~/server/api/membershipGuard";

export const orgRouter = createTRPCRouter({
  /**
   * Create a new organization.
   * - Generates an invite code from the slug.
   * - Inserts an org_member record for the creator with role "owner".
   */
  create: protectedProcedure
    .input(CreateOrgSchema)
    .mutation(async ({ ctx, input }) => {
      const slug = slugify(input.name);

      const [existing] = await ctx.db
        .select({ id: org.id })
        .from(org)
        .where(eq(org.slug, slug))
        .limit(1);

      if (existing) {
        return errorResponse(
          getErrorInfo("org", "DUPLICATE_RECORD", {
            message: `"${input.name}" already exists.`,
          }),
        );
      }

      const inviteCode = generateOrgInviteCode(slug);

      const [newOrg] = await ctx.db
        .insert(org)
        .values({
          name: input.name,
          slug,
          inviteCode,
          createdById: ctx.session.user.id,
        })
        .returning();

      await ctx.db.insert(orgMember).values({
        orgId: newOrg!.id,
        userId: ctx.session.user.id,
        role: "owner",
        status: "active",
        invitedById: null,
      });

      return successResponse(newOrg!, `"${input.name}" has been created.`);
    }),

  /**
   * Returns all orgs the user belongs to.
   */
  getAll: protectedProcedure
    .input(GetOrgsSchema)
    .query(async ({ ctx, input }) => {
      const { page, limit, search } = input;
      const offset = (page - 1) * limit;
      const userId = ctx.session.user.id;

      const memberJoinCond = and(
        eq(orgMember.orgId, org.id),
        eq(orgMember.userId, userId),
        eq(orgMember.status, "active"),
      );

      const whereClause = and(
        or(eq(org.createdById, userId), isNotNull(orgMember.id)),
        search ? ilike(org.name, `%${search}%`) : undefined,
      );

      const [items, totalResult] = await Promise.all([
        ctx.db
          .selectDistinct({
            id: org.id,
            name: org.name,
            slug: org.slug,
            inviteCode: org.inviteCode,
            createdAt: org.createdAt,
            projectCount: count(project.id),
          })
          .from(org)
          .leftJoin(orgMember, memberJoinCond)
          .leftJoin(project, eq(project.orgId, org.id))
          .where(whereClause)
          .groupBy(org.id)
          .orderBy(desc(org.createdAt))
          .limit(limit)
          .offset(offset),

        ctx.db
          .selectDistinct({ id: org.id })
          .from(org)
          .leftJoin(orgMember, memberJoinCond)
          .where(whereClause),
      ]);

      const total = totalResult.length;
      const hasNext = offset + items.length < total;

      return successResponse(
        {
          items,
          total,
          page,
          limit,
          hasNext,
          nextPage: hasNext ? page + 1 : null,
        },
        "Organizations fetched successfully.",
      );
    }),

  getBySlug: protectedProcedure
    .input(GetOrgBySlugSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [orgRow] = await ctx.db
        .select({
          id: org.id,
          name: org.name,
          slug: org.slug,
          inviteCode: org.inviteCode,
          createdAt: org.createdAt,
          createdById: org.createdById,
          projectCount: count(project.id),
        })
        .from(org)
        .leftJoin(project, eq(project.orgId, org.id))
        .where(eq(org.slug, input.slug))
        .groupBy(org.id)
        .limit(1);

      if (!orgRow) {
        return errorResponse(getErrorInfo("org", "NOT_FOUND"));
      }

      const guard = await requireOrgAccess(
        ctx.db,
        orgRow.id,
        userId,
        "org:read",
      );
      if (!guard.ok) return guard.response;

      return successResponse(
        {
          id: orgRow.id,
          name: orgRow.name,
          slug: orgRow.slug,
          inviteCode: orgRow.inviteCode,
          createdAt: orgRow.createdAt,
          projectCount: orgRow.projectCount,
          myRole: guard.membership.orgRole,
        },
        "Organization fetched successfully.",
      );
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const [orgRow] = await ctx.db
        .select({
          id: org.id,
          name: org.name,
          slug: org.slug,
          inviteCode: org.inviteCode,
          createdAt: org.createdAt,
          projectCount: count(project.id),
        })
        .from(org)
        .leftJoin(project, eq(project.orgId, org.id))
        .where(eq(org.id, input.id))
        .groupBy(org.id)
        .limit(1);

      if (!orgRow) {
        return errorResponse(getErrorInfo("org", "NOT_FOUND"));
      }

      const guard = await requireOrgAccess(
        ctx.db,
        orgRow.id,
        userId,
        "org:read",
      );
      if (!guard.ok) return guard.response;

      return successResponse(
        {
          ...orgRow,
          myRole: guard.membership.orgRole,
        },
        "Organization fetched successfully.",
      );
    }),

  /**
   * Returns team info for the settings panel.
   *
   * Accessible by all active members (owner, admin, manager).
   * Returns:
   *   - total active member count
   *   - first 5 members (id, name, image) for the avatar stack
   *   - paginated full member list
   */
  getOrgTeamBySlug: protectedProcedure
    .input(
      z.object({
        slug: z.string(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { slug, page, limit } = input;
      const userId = ctx.session.user.id;

      // ── Resolve org from slug ────────────────────────────────────────────────
      const [orgRow] = await ctx.db
        .select({ id: org.id, name: org.name, slug: org.slug })
        .from(org)
        .where(eq(org.slug, slug))
        .limit(1);

      if (!orgRow) {
        return errorResponse(getErrorInfo("org", "NOT_FOUND"));
      }

      // ── Permission check — all roles can read team info ──────────────────────
      const guard = await requireOrgAccess(
        ctx.db,
        orgRow.id,
        userId,
        "org:read",
      );
      if (!guard.ok) return guard.response;

      // ── Total active member count ────────────────────────────────────────────
      const [countResult] = await ctx.db
        .select({ total: count(orgMember.id) })
        .from(orgMember)
        .where(
          and(eq(orgMember.orgId, orgRow.id), eq(orgMember.status, "active")),
        );

      const totalMembers = countResult?.total ?? 0;

      // ── First 5 avatars for the stacked display ──────────────────────────────
      const avatarMembers = await ctx.db
        .select({
          id: orgMember.id,
          userId: orgMember.userId,
          name: user.name,
          image: user.image,
          role: orgMember.role,
        })
        .from(orgMember)
        .innerJoin(user, eq(user.id, orgMember.userId))
        .where(
          and(eq(orgMember.orgId, orgRow.id), eq(orgMember.status, "active")),
        )
        .orderBy(desc(orgMember.createdAt))
        .limit(5);

      // ── Paginated full member list ───────────────────────────────────────────
      const offset = (page - 1) * limit;

      const members = await ctx.db
        .select({
          id: orgMember.id,
          userId: orgMember.userId,
          role: orgMember.role,
          status: orgMember.status,
          joinedAt: orgMember.createdAt,
          name: user.name,
          email: user.email,
          image: user.image,
        })
        .from(orgMember)
        .innerJoin(user, eq(user.id, orgMember.userId))
        .where(
          and(eq(orgMember.orgId, orgRow.id), eq(orgMember.status, "active")),
        )
        .orderBy(desc(orgMember.createdAt))
        .limit(limit)
        .offset(offset);

      const hasNext = offset + members.length < totalMembers;

      return successResponse(
        {
          totalMembers,
          avatarMembers, // max 5, for the stacked avatar UI
          members, // paginated full list
          page,
          limit,
          hasNext,
          nextPage: hasNext ? page + 1 : null,
          myRole: guard.membership.orgRole,
        },
        "Team fetched successfully.",
      );
    }),

  /** Only org owners can update the org. */
  update: protectedProcedure
    .input(UpdateOrgSchema)
    .mutation(async ({ ctx, input }) => {
      const guard = await requireOrgAccess(
        ctx.db,
        input.id,
        ctx.session.user.id,
        "org:update",
      );
      if (!guard.ok) return guard.response;

      const [updated] = await ctx.db
        .update(org)
        .set({ name: input.name })
        .where(eq(org.id, input.id))
        .returning();

      if (!updated) {
        return errorResponse(getErrorInfo("org", "UPDATE_FAILED"));
      }

      return successResponse(updated, `"${input.name}" has been updated.`);
    }),

  /** Only org owners can delete the org. */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const guard = await requireOrgAccess(
        ctx.db,
        input.id,
        ctx.session.user.id,
        "org:delete",
      );
      if (!guard.ok) return guard.response;

      await ctx.db.delete(org).where(eq(org.id, input.id));

      return successResponse(null, "Organization deleted successfully.");
    }),
});
