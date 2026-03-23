"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  Database02Icon,
  FolderLibraryIcon,
  Folder01Icon,
  Alert02Icon,
  FileEditIcon,
} from "@hugeicons/core-free-icons";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

export const ManagerSideMenu: React.FC = () => {
  const params = useParams();
  const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : "";
  const projectSlug =
    typeof params.projectSlug === "string" ? params.projectSlug : "";
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") ?? "";
  const pathname = usePathname();

  const [schemasExpanded, setSchemasExpanded] = useState(true);
  const [blogsExpanded, setBlogsExpanded] = useState(true);

  const { data: projectResponse } = api.project.getBySlug.useQuery(
    { slug: projectSlug, orgId },
    { enabled: !!projectSlug && !!orgId },
  );
  const projectId = projectResponse?.data?.id ?? "";

  const { data: schemasResponse, isLoading: isSchemasLoading } =
    api.cmsSchema.getAll.useQuery(
      { projectId, orgId, page: 1, limit: 50 },
      { enabled: !!projectId && !!orgId },
    );

  const { data: blogsResponse, isLoading: isBlogsLoading } =
    api.blogPost.getAll.useQuery(
      { projectId, orgId, page: 1, limit: 50 },
      { enabled: !!projectId && !!orgId },
    );

  const schemas = schemasResponse?.data?.items ?? [];
  const blogs = blogsResponse?.data?.items ?? [];

  const buildHref = (segment: string) => {
    const base = `/dashboard/org/${orgSlug}/project/${projectSlug}/${segment}`;
    return orgId ? `${base}?orgId=${orgId}` : base;
  };

  const isFilesActive = pathname.includes("/files");
  const activeSchemaSlug = pathname.match(/\/content\/([^/?]+)/)?.[1] ?? null;
  const activeBlogSlug = pathname.match(/\/blog\/([^/?]+)/)?.[1] ?? null;

  return (
    <div className="flex h-full w-56 shrink-0 flex-col gap-1 overflow-y-auto px-3 pt-18 pb-4">
      {/* ── Schemas section ───────────────────────────────────────────────── */}
      <SideSection
        label="Schemas"
        icon={<HugeiconsIcon icon={Database02Icon} size={12} />}
        expanded={schemasExpanded}
        onToggle={() => setSchemasExpanded((v) => !v)}
      >
        {isSchemasLoading ? (
          <LoadingSkeleton />
        ) : schemas.length === 0 ? (
          <EmptyNote>No schemas yet.</EmptyNote>
        ) : (
          schemas.map((schema) => (
            <SideLink
              key={schema.id}
              href={buildHref(`content/${schema.slug}`)}
              active={activeSchemaSlug === schema.slug}
            >
              <HugeiconsIcon
                icon={Folder01Icon}
                size={13}
                className="shrink-0"
              />
              <span className="truncate capitalize">{schema.title}</span>
              {!schema.hasStructure && (
                <HugeiconsIcon
                  icon={Alert02Icon}
                  size={11}
                  className="ml-auto shrink-0 text-amber-500"
                />
              )}
            </SideLink>
          ))
        )}
      </SideSection>

      <div className="bg-border my-1 h-px" />

      {/* ── Blogs section ─────────────────────────────────────────────────── */}
      <SideSection
        label="Blogs"
        icon={<HugeiconsIcon icon={FileEditIcon} size={12} />}
        expanded={blogsExpanded}
        onToggle={() => setBlogsExpanded((v) => !v)}
      >
        {isBlogsLoading ? (
          <LoadingSkeleton />
        ) : blogs.length === 0 ? (
          <EmptyNote>No posts yet.</EmptyNote>
        ) : (
          blogs.map((post) => (
            <SideLink
              key={post.id}
              href={buildHref(`blog/${post.slug}`)}
              active={activeBlogSlug === post.slug}
            >
              <HugeiconsIcon
                icon={FileEditIcon}
                size={13}
                className="shrink-0"
              />
              <span className="truncate text-xs">{post.slug}</span>
            </SideLink>
          ))
        )}
      </SideSection>

      <div className="bg-border my-1 h-px" />

      {/* ── Files ─────────────────────────────────────────────────────────── */}
      <SideLink href={buildHref("files")} active={isFilesActive}>
        <HugeiconsIcon
          icon={FolderLibraryIcon}
          size={13}
          className="shrink-0"
        />
        Files
      </SideLink>
    </div>
  );
};

// ─── Small sub-components ─────────────────────────────────────────────────────

const SideSection: React.FC<{
  label: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ label, icon, expanded, onToggle, children }) => (
  <div>
    <Button
      variant="ghost"
      size="sm"
      type="button"
      onClick={onToggle}
      className="text-muted-foreground hover:bg-muted/50 hover:text-foreground relative flex w-full justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors"
    >
      <div className="flex w-full items-center gap-1.5">
        {icon}
        {label}
      </div>
      <HugeiconsIcon
        icon={expanded ? ArrowDown01Icon : ArrowRight01Icon}
        size={12}
      />
    </Button>

    <div
      className={`mt-1 ml-4 flex flex-col gap-1 overflow-hidden border-l pl-2 transition-all duration-150 ${
        expanded ? "max-h-[1000vh] pt-1" : "max-h-0"
      }`}
    >
      {children}
    </div>
  </div>
);

const SideLink: React.FC<{
  href: string;
  active: boolean;
  children: React.ReactNode;
}> = ({ href, active, children }) => (
  <Link
    href={href}
    className={cn(
      "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
      active
        ? "bg-primary/10 text-foreground font-medium"
        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
    )}
  >
    {children}
  </Link>
);

const LoadingSkeleton: React.FC = () => (
  <div className="flex flex-col gap-1">
    {Array.from({ length: 4 }).map((_, i) => (
      <Skeleton key={i} className="h-7 rounded-lg" />
    ))}
  </div>
);

const EmptyNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-muted-foreground px-2 py-2 text-xs">{children}</p>
);
