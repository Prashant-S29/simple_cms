"use client";

import React from "react";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";

type Panel = "admin" | "manager";

export const PanelToggle: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : "";
  const projectSlug =
    typeof params.projectSlug === "string" ? params.projectSlug : "";
  const orgId = searchParams.get("orgId") ?? "";

  const isAdmin = pathname.includes("/admin");
  const currentPanel: Panel = isAdmin ? "admin" : "manager";

  const { data: projectResponse } = api.project.getBySlug.useQuery(
    { slug: projectSlug, orgId },
    { enabled: !!projectSlug && !!orgId },
  );

  const myRole = projectResponse?.data?.myRole;
  const canSeeToggle = myRole === "owner" || myRole === "admin";

  if (!canSeeToggle) return null;

  // ── Extract context from current URL ─────────────────────────────────────
  // Schema context
  const adminSchemaMatch = pathname.match(/\/admin\/schema\/([^/?]+)/);
  const managerSchemaMatch = pathname.match(/\/content\/([^/?]+)/);
  const currentSchemaSlug =
    adminSchemaMatch?.[1] ?? managerSchemaMatch?.[1] ?? null;

  // Blog context — admin: /admin/blog/[slug], manager: /blog/[slug]
  const adminBlogMatch = pathname.match(/\/admin\/blog\/([^/?]+)/);
  const managerBlogMatch = pathname.match(/\/blog\/([^/?]+)/);
  const currentBlogSlug = adminBlogMatch?.[1] ?? managerBlogMatch?.[1] ?? null;

  // ── Detect if we're in the blog section at all (even list) ────────────────
  const isInAdminBlog = pathname.includes("/admin/blog");
  const isInManagerBlog =
    pathname.includes("/blog") && !pathname.includes("/admin");

  const buildUrl = (target: Panel): string => {
    const base = `/dashboard/org/${orgSlug}/project/${projectSlug}`;
    const qs = orgId ? `?orgId=${orgId}` : "";

    if (target === "admin") {
      if (currentBlogSlug) {
        // manager blog post → admin blog post (if admin has a detail page)
        return `${base}/admin/blog/${currentBlogSlug}${qs}`;
      }
      if (isInManagerBlog) {
        // manager blog list → admin blog list
        return `${base}/admin/blog${qs}`;
      }
      if (currentSchemaSlug) {
        return `${base}/admin/schema/${currentSchemaSlug}${qs}`;
      }
      return `${base}/admin${qs}`;
    }

    // target === "manager"
    if (currentBlogSlug) {
      // admin blog post → manager blog editor
      return `${base}/blog/${currentBlogSlug}${qs}`;
    }
    if (isInAdminBlog) {
      // admin blog list → manager blog list
      return `${base}/blog${qs}`;
    }
    if (currentSchemaSlug) {
      return `${base}/content/${currentSchemaSlug}${qs}`;
    }
    return `${base}${qs}`;
  };

  const handleSwitch = (target: Panel) => {
    if (target === currentPanel) return;
    router.push(buildUrl(target));
  };

  return (
    <Tabs
      value={currentPanel}
      onValueChange={(val) => handleSwitch(val as Panel)}
    >
      <TabsList>
        <TabsTrigger value="admin">Admin Panel</TabsTrigger>
        <TabsTrigger value="manager">Manager Panel</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};
