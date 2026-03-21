"use client";

import React from "react";
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

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowDown01Icon,
  PlusSignIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";

export const ProjectSelector: React.FC = () => {
  const router = useRouter();
  const { orgSlug, projectSlug } = useParams<{
    orgSlug: string;
    projectSlug: string;
  }>();
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") ?? "";
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 400);

  const { data: response, isLoading } = api.project.getAll.useQuery(
    {
      orgId,
      page: 1,
      limit: PAGINATION_LIMIT,
      search: debouncedSearch || undefined,
    },
    { enabled: !!orgId },
  );

  const { data: currentProjectResponse } = api.project.getBySlug.useQuery(
    { slug: projectSlug, orgId },
    { enabled: !!projectSlug && !!orgId },
  );

  const { data: membershipResponse } = api.orgMember.myMembership.useQuery(
    { orgId },
    { enabled: !!orgId },
  );

  const projects = response?.data?.items ?? [];
  const activeProject = currentProjectResponse?.data;
  const myRole = membershipResponse?.data?.orgRole;
  const canCreateProject = myRole === "owner" || myRole === "admin";

  const handleProjectSwitch = (slug: string) => {
    if (slug === projectSlug) {
      setOpen(false);
      return;
    }
    router.push(
      `/dashboard/org/${orgSlug}/project/${slug}/admin?orgId=${orgId}`,
    );
    setOpen(false);
  };

  const handleNewProject = () => {
    router.push(`/dashboard/org/${orgSlug}?orgId=${orgId}`);
    setOpen(false);
  };

  return (
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
          {activeProject?.name ?? projectSlug}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="text-muted-foreground"
          />
        </PopoverTrigger>
      </div>

      <PopoverContent className="w-60 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search project..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="mt-1">
            <CommandEmpty>No project found.</CommandEmpty>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.id}
                  onSelect={() => handleProjectSwitch(project.slug)}
                  className="flex items-center justify-between"
                >
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    className={cn(
                      "h-4 w-4",
                      project.slug === projectSlug
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  <span className="text-sm">{project.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            {canCreateProject && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={handleNewProject}>
                    <HugeiconsIcon icon={PlusSignIcon} />
                    New Project
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
