"use client";

import type { isUserLandError } from "next/dist/server/app-render/create-error-handler";
import React from "react";
import { ResourceHandler } from "~/components/common";
import { AvailableProjects } from "~/components/dashboard/project";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

interface Props {
  slug: string;
}

export const OrgPage: React.FC<Props> = ({ slug }) => {
  const {
    data: response,
    isLoading,
    isFetching,
  } = api.org.getBySlug.useQuery({ slug });

  if (isLoading) {
    return (
      <div className="flex h-screen w-full flex-col pt-25">
        <div className="container mx-auto flex w-full flex-col gap-5">
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    );
  }

  if (!response?.data) {
    return <ResourceHandler state="not_found" />;
  }

  return (
    <div className="flex h-screen w-full flex-col pt-25">
      <div className="container mx-auto flex w-full flex-col gap-5">
        <h1 className="text-2xl">
          {response.data?.name}
          <span className="text-muted-foreground">&apos;s Dashboard</span>
        </h1>
        <AvailableProjects orgId={response.data?.id} orgSlug={slug} />
      </div>
    </div>
  );
};
