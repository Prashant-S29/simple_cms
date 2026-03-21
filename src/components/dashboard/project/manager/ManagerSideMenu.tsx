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

  const schemas = schemasResponse?.data?.items ?? [];

  const buildHref = (segment: string) => {
    const base = `/dashboard/org/${orgSlug}/project/${projectSlug}/${segment}`;
    return orgId ? `${base}?orgId=${orgId}` : base;
  };

  const buildSchemaHref = (schemaSlug: string) =>
    buildHref(`content/${schemaSlug}`);

  const isFilesActive = pathname.includes("/files");
  const activeSchemaSlug = pathname.match(/\/content\/([^/?]+)/)?.[1] ?? null;

  return (
    <div className="flex h-full w-56 shrink-0 flex-col gap-1 overflow-y-auto px-3 pt-18 pb-4">
      {/* ── Schemas section ───────────────────────────────────────────────── */}
      <div>
        {/* Collapsible header */}
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => setSchemasExpanded((v) => !v)}
          className={cn(
            "relative flex w-full justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
            schemasExpanded
              ? "bg-primary/10 text-foreground font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          <div className="flex w-full items-center gap-1.5">
            <HugeiconsIcon icon={Database02Icon} size={12} />
            Schemas
          </div>
          <HugeiconsIcon
            icon={schemasExpanded ? ArrowDown01Icon : ArrowRight01Icon}
            size={12}
            className=""
          />
        </Button>

        {/* Schema list */}
        <div
          className={`mt-1 ml-4 flex ${schemasExpanded ? "max-h-[1000vh] pt-1" : "max-h-0"} flex-col gap-1 overflow-hidden border-l pl-2 duration-150`}
        >
          {isSchemasLoading ? (
            <div className="flex flex-col gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-7 rounded-lg" />
              ))}
            </div>
          ) : schemas.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-xs">
              No schemas yet.
            </p>
          ) : (
            schemas.map((schema) => {
              const isActive = activeSchemaSlug === schema.slug;
              return (
                <Link
                  key={schema.id}
                  href={buildSchemaHref(schema.slug)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <HugeiconsIcon
                    icon={Folder01Icon}
                    size={13}
                    className="shrink-0"
                  />
                  <span className="truncate capitalize">{schema.title}</span>
                  {/* Warn if no structure */}
                  {!schema.hasStructure && (
                    <HugeiconsIcon
                      icon={Alert02Icon}
                      size={11}
                      className="ml-auto shrink-0 text-amber-500"
                    />
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="bg-border my-2 h-px" />

      {/* ── Files ─────────────────────────────────────────────────────────── */}
      <Link
        href={buildHref("files")}
        className={cn(
          "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
          isFilesActive
            ? "bg-primary/10 text-foreground font-medium"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
        )}
      >
        <HugeiconsIcon
          icon={FolderLibraryIcon}
          size={13}
          className="shrink-0"
        />
        Files
      </Link>
    </div>
  );
};
