"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDebounce } from "~/hooks";
import { PAGINATION_LIMIT } from "~/lib/constants";
import { Button, buttonVariants } from "~/components/ui/button";
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

export const OrgSelector: React.FC = () => {
  const router = useRouter();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 400);

  const { data: response, isLoading } = api.org.getAll.useQuery(
    {
      page: 1,
      limit: PAGINATION_LIMIT,
      search: debouncedSearch || undefined,
    },
    { enabled: true },
  );

  const { data: currentOrgResponse } = api.org.getBySlug.useQuery(
    { slug: orgSlug },
    { enabled: !!orgSlug },
  );

  const orgs = response?.data?.items ?? [];
  const activeOrg = currentOrgResponse?.data;

  const handleOrgSwitch = (slug: string, id: string) => {
    if (slug === orgSlug) {
      setOpen(false);
      return;
    }
    router.push(`/dashboard/org/${slug}?orgId=${id}`);
    setOpen(false);
  };

  const handleNewOrg = () => {
    router.push("/dashboard");
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
          {activeOrg?.name ?? orgSlug}
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            className="text-muted-foreground"
          />
        </PopoverTrigger>
      </div>

      <PopoverContent className="w-60 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search organization..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="mt-1">
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup>
              {orgs.map((org) => (
                <CommandItem
                  key={org.id}
                  value={org.id}
                  onSelect={() => handleOrgSwitch(org.slug, org.id)}
                  className="flex items-center justify-between"
                >
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    className={cn(
                      "h-4 w-4",
                      org.slug === orgSlug ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="text-sm">{org.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={handleNewOrg}>
                <HugeiconsIcon icon={PlusSignIcon} />
                New Organization
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
