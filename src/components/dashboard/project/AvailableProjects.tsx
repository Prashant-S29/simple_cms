"use client";

import React, { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import { useDebounce } from "~/hooks/useDebounce";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { FormDialog } from "../../common";
import { CreateNewProjectForm } from "../forms";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  FolderLibraryIcon,
  PlusSignIcon,
  Search01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { ProjectCard } from "./ProjectCard";
import { PAGINATION_LIMIT } from "~/lib/constants";
import Link from "next/link";
import type { OrgRole } from "~/lib/permissions";

interface Props {
  orgId: string;
  orgSlug: string;
  myRole: OrgRole;
}

export const AvailableProjects: React.FC<Props> = ({
  orgId,
  orgSlug,
  myRole,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const canCreateProject = myRole === "owner" || myRole === "admin";

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const {
    data: response,
    isLoading,
    isFetching,
  } = api.project.getAll.useQuery({
    page,
    limit: PAGINATION_LIMIT,
    search: debouncedSearch || undefined,
    orgId,
  });

  const listData = response?.data;
  const projects = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const hasNext = listData?.hasNext ?? false;
  const hasPrev = page > 1;
  const totalPages = Math.max(1, Math.ceil(total / PAGINATION_LIMIT));
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGINATION_LIMIT + 1;
  const rangeEnd = Math.min(page * PAGINATION_LIMIT, total);

  return (
    <div className="flex w-full flex-col gap-5">
      <div data-fetching={isFetching ? "true" : undefined}>
        <div className="bg-card flex items-center justify-between rounded-t-2xl border p-5">
          <section>
            <h3>Projects</h3>
            <p className="text-muted-foreground">
              All projects in this organization are listed below.
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

            {canCreateProject && (
              <FormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                trigger={
                  <Button>
                    <HugeiconsIcon icon={PlusSignIcon} />
                    New Project
                  </Button>
                }
                title="Create New Project"
                desc="Create a new project inside this organization."
                form={
                  <CreateNewProjectForm
                    orgId={orgId}
                    onSuccess={() => setDialogOpen(false)}
                  />
                }
              />
            )}

            <Button
              variant="secondary"
              size="lg"
              render={
                <Link href={`/dashboard/org/${orgSlug}/settings`}>
                  <HugeiconsIcon icon={Settings01Icon} />
                  Settings
                </Link>
              }
              nativeButton={false}
            />
          </section>
        </div>

        <div className="bg-card overflow-hidden rounded-b-2xl border border-t-0">
          <div className="grid grid-cols-4 gap-3 p-3">
            {isLoading ? (
              <>
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="bg-muted h-50 w-full rounded-xl"
                  />
                ))}
              </>
            ) : (
              <>
                {projects.length === 0 ? (
                  <div className="col-span-4">
                    <EmptyState
                      isFiltered={!!debouncedSearch}
                      query={debouncedSearch}
                      canCreate={canCreateProject}
                    />
                  </div>
                ) : (
                  <>
                    {projects.map((proj) => (
                      <ProjectCard
                        key={proj.id}
                        project={proj}
                        orgSlug={orgSlug}
                        orgId={orgId}
                      />
                    ))}
                  </>
                )}
              </>
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
    </div>
  );
};

const EmptyState: React.FC<{
  isFiltered: boolean;
  query: string;
  canCreate: boolean;
}> = ({ isFiltered, query, canCreate }) => (
  <div className="bg-muted flex w-full flex-col items-center gap-4 rounded-2xl px-5 py-14 text-center">
    <div className="bg-muted-foreground/10 flex size-12 items-center justify-center rounded-xl">
      <HugeiconsIcon icon={FolderLibraryIcon} />
    </div>

    <div>
      <h3 className="font-medium">
        {isFiltered ? `No projects found by "${query}"` : "No projects yet"}
      </h3>
      <p className="text-muted-foreground mt-1 text-sm">
        {isFiltered
          ? "Try a different search term."
          : canCreate
            ? "Create your first project to get started."
            : "No projects have been assigned to you yet."}
      </p>
    </div>
  </div>
);
