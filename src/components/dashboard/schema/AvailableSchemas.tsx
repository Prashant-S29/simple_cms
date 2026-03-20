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
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PlusSignIcon,
  Search01Icon,
  Database02Icon,
} from "@hugeicons/core-free-icons";
import { PAGINATION_LIMIT } from "~/lib/constants";
import type { OrgRole } from "~/lib/permissions";

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

  const canManageSchema = myRole === "owner" || myRole === "admin";

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

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
  });

  const listData = response?.data;
  const schemas = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const hasNext = listData?.hasNext ?? false;
  const hasPrev = page > 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGINATION_LIMIT));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGINATION_LIMIT + 1;
  const rangeEnd = Math.min(page * PAGINATION_LIMIT, total);

  return (
    <>
      <div className="bg-secondary sticky top-0 z-10 flex w-full items-center justify-between border-b px-4 py-3">
        <section>
          <h3>Schemas</h3>
          <p className="text-muted-foreground text-sm">
            Define the content structure for this project.
          </p>
        </section>

        <section className="flex items-center gap-3">
          <div className="relative flex-1">
            <HugeiconsIcon
              icon={Search01Icon}
              size={18}
              className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
            />
            <Input
              className="h-9.5 w-fit pl-9"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {canManageSchema && (
            <FormDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              trigger={
                <Button>
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
      <div className="flex w-full flex-col gap-5">
        <div data-fetching={isFetching ? "true" : undefined}>
          <div className="grid grid-cols-4 gap-3 p-3">
            {isLoading ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="bg-card h-32 w-full rounded-xl"
                  />
                ))}
              </>
            ) : schemas.length === 0 ? (
              <div className="col-span-4">
                <EmptyState
                  isFiltered={!!debouncedSearch}
                  query={debouncedSearch}
                  canCreate={canManageSchema}
                />
              </div>
            ) : (
              schemas.map((schema) => (
                <SchemaCard
                  key={schema.id}
                  schema={schema}
                  orgSlug={orgSlug}
                  projectSlug={projectSlug}
                  orgId={orgId}
                />
              ))
            )}
          </div>

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
                  aria-label="Previous page"
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
                  aria-label="Next page"
                >
                  <HugeiconsIcon icon={ArrowRight01Icon} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const EmptyState: React.FC<{
  isFiltered: boolean;
  query: string;
  canCreate: boolean;
}> = ({ isFiltered, query, canCreate }) => (
  <div className="bg-card flex w-full flex-col items-center gap-4 rounded-2xl px-5 py-14 text-center">
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
