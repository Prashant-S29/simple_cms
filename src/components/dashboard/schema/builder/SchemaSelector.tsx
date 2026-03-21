"use client";

import React, { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDebounce } from "~/hooks";
import { PAGINATION_LIMIT } from "~/lib/constants";
import { buttonVariants } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { CreateNewSchemaForm } from "~/components/dashboard/schema/CreateNewSchemaForm";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  Folder,
  PlusSignIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";

export const SchemaSelector: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : "";
  const projectSlug =
    typeof params.projectSlug === "string" ? params.projectSlug : "";
  const schemaSlug =
    typeof params.schemaSlug === "string" ? params.schemaSlug : "";

  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") ?? "";

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  // Need projectId for the create form — fetch from slug
  const { data: projectResponse } = api.project.getBySlug.useQuery(
    { slug: projectSlug, orgId },
    { enabled: !!projectSlug && !!orgId },
  );
  const projectId = projectResponse?.data?.id ?? "";

  const { data: currentSchemaResponse } = api.cmsSchema.getBySlug.useQuery(
    { slug: schemaSlug, projectId, orgId },
    { enabled: !!schemaSlug && !!projectId && !!orgId },
  );

  const { data: response, isLoading } = api.cmsSchema.getAll.useQuery(
    {
      projectId,
      orgId,
      page: 1,
      limit: PAGINATION_LIMIT,
      search: debouncedSearch || undefined,
    },
    { enabled: !!projectId && !!orgId },
  );

  const schemas = response?.data?.items ?? [];
  const currentSchemaTitle = currentSchemaResponse?.data?.title ?? schemaSlug;

  const handleSwitch = (slug: string) => {
    if (slug === schemaSlug) {
      setOpen(false);
      return;
    }
    router.push(
      `/dashboard/org/${orgSlug}/project/${projectSlug}/admin/schema/${slug}?orgId=${orgId}`,
    );
    setOpen(false);
  };

  // On successful schema creation — navigate straight to the new schema page
  const handleCreateSuccess = (newSlug: string) => {
    setCreateOpen(false);
    setOpen(false);
    router.push(
      `/dashboard/org/${orgSlug}/project/${projectSlug}/admin/schema/${newSlug}?orgId=${orgId}`,
    );
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(val) => {
          setOpen(val);
          if (!val) setSearch("");
        }}
      >
        <div className="flex items-center gap-1 text-sm">
          <PopoverTrigger
            nativeButton={false}
            render={<div />}
            aria-expanded={open}
            disabled={isLoading}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "cursor-pointer",
            )}
          >
            {schemaSlug ? currentSchemaTitle : "Select schema"}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              className="text-muted-foreground"
            />
          </PopoverTrigger>
        </div>

        <PopoverContent className="w-60 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search schema..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList className="mt-2">
              <CommandEmpty>No schema found.</CommandEmpty>
              <CommandGroup>
                {schemas.map((schema) => (
                  <CommandItem
                    key={schema.id}
                    value={schema.id}
                    onSelect={() => handleSwitch(schema.slug)}
                    className="flex items-center justify-between"
                  >
                    <HugeiconsIcon
                      icon={Tick01Icon}
                      className={cn(
                        "h-4 w-4 shrink-0",
                        schema.slug === schemaSlug
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    <span className="text-sm">{schema.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setCreateOpen(true);
                  }}
                >
                  <HugeiconsIcon icon={PlusSignIcon} />
                  New Schema
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    router.push(
                      `/dashboard/org/${orgSlug}/project/${projectSlug}/admin/schema?orgId=${orgId}`,
                    );
                  }}
                >
                  <HugeiconsIcon icon={Folder} />
                  All Schemas
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Create schema dialog — stays in place, no page navigation needed */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Schema</DialogTitle>
          </DialogHeader>
          {projectId && (
            <CreateNewSchemaForm
              projectId={projectId}
              orgId={orgId}
              onSuccess={handleCreateSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
