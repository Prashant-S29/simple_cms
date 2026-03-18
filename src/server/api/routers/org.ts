import { and, count, desc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { alias } from "drizzle-orm/pg-core";

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

      // ── 1. Fetch the org list ────────────────────────────────────────────────
      const [orgRows, totalResult] = await Promise.all([
        ctx.db
          .selectDistinct({
            id: org.id,
            name: org.name,
            slug: org.slug,
            inviteCode: org.inviteCode,
            createdAt: org.createdAt,
          })
          .from(org)
          .leftJoin(orgMember, memberJoinCond)
          .where(whereClause)
          .orderBy(desc(org.createdAt))
          .limit(limit)
          .offset(offset),

        ctx.db
          .selectDistinct({ id: org.id })
          .from(org)
          .leftJoin(orgMember, memberJoinCond)
          .where(whereClause),
      ]);

      if (orgRows.length === 0) {
        return successResponse(
          { items: [], total: 0, page, limit, hasNext: false, nextPage: null },
          "Organizations fetched successfully.",
        );
      }

      const orgIds = orgRows.map((o) => o.id);

      // ── 2. Fetch project counts, admin counts, manager counts in parallel ────
      const [projectCounts, memberCounts] = await Promise.all([
        ctx.db
          .select({
            orgId: project.orgId,
            count: count(project.id),
          })
          .from(project)
          .where(inArray(project.orgId, orgIds))
          .groupBy(project.orgId),

        ctx.db
          .select({
            orgId: orgMember.orgId,
            role: orgMember.role,
            count: count(orgMember.id),
          })
          .from(orgMember)
          .where(
            and(
              inArray(orgMember.orgId, orgIds),
              eq(orgMember.status, "active"),
              inArray(orgMember.role, ["admin", "manager"]),
            ),
          )
          .groupBy(orgMember.orgId, orgMember.role),
      ]);

      // ── 3. Build lookup maps ─────────────────────────────────────────────────
      const projectCountMap = new Map(
        projectCounts.map((r) => [r.orgId, r.count]),
      );

      const adminCountMap = new Map<string, number>();
      const managerCountMap = new Map<string, number>();

      for (const row of memberCounts) {
        if (row.role === "admin") adminCountMap.set(row.orgId, row.count);
        if (row.role === "manager") managerCountMap.set(row.orgId, row.count);
      }

      // ── 4. Merge ─────────────────────────────────────────────────────────────
      const items = orgRows.map((o) => ({
        ...o,
        projectCount: projectCountMap.get(o.id) ?? 0,
        adminCount: adminCountMap.get(o.id) ?? 0,
        managerCount: managerCountMap.get(o.id) ?? 0,
      }));

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

      const [orgRow] = await ctx.db
        .select({ id: org.id, name: org.name, slug: org.slug })
        .from(org)
        .where(eq(org.slug, slug))
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

      const [countResult] = await ctx.db
        .select({ total: count(orgMember.id) })
        .from(orgMember)
        .where(
          and(eq(orgMember.orgId, orgRow.id), eq(orgMember.status, "active")),
        );

      const totalMembers = countResult?.total ?? 0;

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
          avatarMembers,
          members,
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
