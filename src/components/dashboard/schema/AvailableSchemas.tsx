"use client";

import React, { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { useDebounce } from "~/hooks/useDebounce";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { FormDialog } from "~/components/common";
import { CreateNewSchemaForm } from "./CreateNewSchemaForm";
import { SchemaCard } from "./SchemaCard";
import { SchemaTable } from "./SchemaTable";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PlusSignIcon,
  Search01Icon,
  Database02Icon,
  LayoutGridIcon,
  ListViewIcon,
  Upload04Icon,
  SortingAZ01Icon,
  ArrowDown01Icon,
  Alert02Icon,
} from "@hugeicons/core-free-icons";
import { PAGINATION_LIMIT } from "~/lib/constants";
import type { OrgRole } from "~/lib/permissions";
import Link from "next/link";
import { Tabs, TabsTrigger, TabsList } from "~/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

type Layout = "grid" | "table";
type SortBy = "createdAt" | "title";
type SortOrder = "asc" | "desc";

interface Props {
  projectId: string;
  projectSlug: string;
  orgSlug: string;
  orgId: string;
  myRole: OrgRole;
}

export const AvailableSchemas: React.FC<Props> = ({
  projectId,
  projectSlug,
  orgSlug,
  orgId,
  myRole,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [layout, setLayout] = useState<Layout>("grid");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [noStructureFirst, setNoStructureFirst] = useState(true);

  const canManageSchema = myRole === "owner" || myRole === "admin";
  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortBy, sortOrder, noStructureFirst]);

  const {
    data: response,
    isLoading,
    isFetching,
  } = api.cmsSchema.getAll.useQuery({
    projectId,
    orgId,
    page,
    limit: PAGINATION_LIMIT,
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
    noStructureFirst,
  });

  const listData = response?.data;
  const schemas = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const hasNext = listData?.hasNext ?? false;
  const hasPrev = page > 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGINATION_LIMIT));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGINATION_LIMIT + 1;
  const rangeEnd = Math.min(page * PAGINATION_LIMIT, total);

  const sortLabel = () => {
    if (noStructureFirst) return "Incomplete first";
    if (sortBy === "title") return sortOrder === "asc" ? "A → Z" : "Z → A";
    return sortOrder === "asc" ? "Oldest first" : "Newest first";
  };

  return (
    <>
      <div className="bg-secondary sticky top-0 z-10 w-full">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <section>
            <h3>Schemas</h3>
            <p className="text-muted-foreground text-sm">
              Define the content structure for this project.
            </p>
          </section>

          <section className="flex items-center gap-2">
            {/* Bulk creation */}
            {canManageSchema && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                className="h-9"
                render={
                  <Link
                    href={`/dashboard/org/${orgSlug}/project/${projectSlug}/admin/schema/bulk?orgId=${orgId}`}
                  >
                    <HugeiconsIcon icon={Upload04Icon} size={14} />
                    Bulk
                  </Link>
                }
              />
            )}

            {/* New schema */}
            {canManageSchema && (
              <FormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                trigger={
                  <Button size="sm">
                    <HugeiconsIcon icon={PlusSignIcon} />
                    New Schema
                  </Button>
                }
                title="Create New Schema"
                desc="Define a new content schema for this project."
                form={
                  <CreateNewSchemaForm
                    projectId={projectId}
                    orgId={orgId}
                    onSuccess={() => setDialogOpen(false)}
                  />
                }
              />
            )}
          </section>
        </div>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <HugeiconsIcon
                icon={Search01Icon}
                size={16}
                className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
              />
              <Input
                className="h-8 w-48 pl-8 text-sm"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<div className="flex items-center" />}
                nativeButton={false}
                tabIndex={-1}
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <span className="text-xs">{sortLabel()}</span>
                  <HugeiconsIcon icon={ArrowDown01Icon} size={13} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("createdAt");
                    setSortOrder("desc");
                    setNoStructureFirst(false);
                  }}
                  className={cn(
                    sortBy === "createdAt" &&
                      sortOrder === "desc" &&
                      !noStructureFirst &&
                      "bg-muted",
                  )}
                >
                  Newest first
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("createdAt");
                    setSortOrder("asc");
                    setNoStructureFirst(false);
                  }}
                  className={cn(
                    sortBy === "createdAt" &&
                      sortOrder === "asc" &&
                      !noStructureFirst &&
                      "bg-muted",
                  )}
                >
                  Oldest first
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("title");
                    setSortOrder("asc");
                    setNoStructureFirst(false);
                  }}
                  className={cn(
                    sortBy === "title" &&
                      sortOrder === "asc" &&
                      !noStructureFirst &&
                      "bg-muted",
                  )}
                >
                  <HugeiconsIcon icon={SortingAZ01Icon} size={13} />A → Z
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSortBy("title");
                    setSortOrder("desc");
                    setNoStructureFirst(false);
                  }}
                  className={cn(
                    sortBy === "title" &&
                      sortOrder === "desc" &&
                      !noStructureFirst &&
                      "bg-muted",
                  )}
                >
                  <HugeiconsIcon
                    icon={SortingAZ01Icon}
                    size={13}
                    className="rotate-180"
                  />
                  Z → A
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setNoStructureFirst((v) => !v)}
                  className={cn(noStructureFirst && "bg-muted")}
                >
                  <HugeiconsIcon
                    icon={Alert02Icon}
                    size={13}
                    className="text-amber-500"
                  />
                  Incomplete first
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Tabs
            value={layout}
            defaultValue={layout}
            onValueChange={(val) => setLayout(val as Layout)}
          >
            <TabsList>
              <TabsTrigger value="grid">
                <HugeiconsIcon icon={LayoutGridIcon} size={14} />
              </TabsTrigger>
              <TabsTrigger value="table">
                <HugeiconsIcon icon={ListViewIcon} size={14} />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div data-fetching={isFetching ? "true" : undefined}>
        {isLoading ? (
          <div className="grid grid-cols-4 gap-3 p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="bg-card h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : schemas.length === 0 ? (
          <EmptyState
            isFiltered={!!debouncedSearch}
            query={debouncedSearch}
            canCreate={canManageSchema}
          />
        ) : layout === "grid" ? (
          <div className="grid grid-cols-4 gap-2 p-3">
            {schemas.map((schema) => (
              <SchemaCard
                key={schema.id}
                schema={schema}
                orgSlug={orgSlug}
                projectSlug={projectSlug}
                projectId={projectId}
                orgId={orgId}
              />
            ))}
          </div>
        ) : (
          <SchemaTable
            schemas={schemas}
            orgSlug={orgSlug}
            projectSlug={projectSlug}
            projectId={projectId}
            orgId={orgId}
          />
        )}

        {/* Pagination */}
        {total !== 0 && (
          <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-sm">
            <span>
              Showing {rangeStart} – {rangeEnd} of {total}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={!hasPrev || isFetching}
                onClick={() => setPage((p) => p - 1)}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} />
              </Button>
              <span className="tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={!hasNext || isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                <HugeiconsIcon icon={ArrowRight01Icon} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const EmptyState: React.FC<{
  isFiltered: boolean;
  query: string;
  canCreate: boolean;
}> = ({ isFiltered, query, canCreate }) => (
  <div className="flex w-full flex-col items-center gap-4 px-5 py-14 text-center">
    <div className="bg-muted-foreground/10 flex size-12 items-center justify-center rounded-xl">
      <HugeiconsIcon icon={Database02Icon} />
    </div>
    <div>
      <h3 className="font-medium">
        {isFiltered ? `No schemas found by "${query}"` : "No schemas yet"}
      </h3>
      <p className="text-muted-foreground mt-1 text-sm">
        {isFiltered
          ? "Try a different search term."
          : canCreate
            ? "Create your first schema to define content structure."
            : "No schemas have been created for this project yet."}
      </p>
    </div>
  </div>
);
