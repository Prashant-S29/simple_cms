"use client";

import React from "react";
import { ResourceHandler } from "~/components/common";
import { AvailableProjects } from "~/components/dashboard/project";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

interface Props {
  slug: string;
}

export const OrgPage: React.FC<Props> = ({ slug }) => {
  const { data: response, isLoading } = api.org.getBySlug.useQuery({ slug });

  if (isLoading) {
    return (
      <div className="w-full pt-25">
        <div className="container mx-auto flex w-full flex-col gap-5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-full max-w-xl" />
          <div className="grid grid-cols-4 gap-5">
            <Skeleton className="h-30 w-full" />
            <Skeleton className="h-30 w-full" />
            <Skeleton className="h-30 w-full" />
            <Skeleton className="h-30 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!response || response.error) {
    return <ResourceHandler state="not_found" />;
  }
  const org = response.data;

  return (
    <div className="flex h-screen w-full flex-col pt-25">
      <div className="container mx-auto flex w-full flex-col gap-5">
        <h1 className="text-2xl">
          {org.name}
          <span className="text-muted-foreground">&apos;s Dashboard</span>
        </h1>
        <AvailableProjects orgId={org.id} orgSlug={slug} />
      </div>
    </div>
  );
};
