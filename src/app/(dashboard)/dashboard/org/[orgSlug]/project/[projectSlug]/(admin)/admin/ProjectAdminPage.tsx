"use client";

import React from "react";
import { ResourceHandler } from "~/components/common";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

interface Props {
  projectSlug: string;
  orgSlug: string;
  orgId: string;
}

const ProjectAdminPage: React.FC<Props> = ({ projectSlug, orgId }) => {
  const { data: response, isLoading } = api.project.getBySlug.useQuery({
    slug: projectSlug,
    orgId,
  });

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

  return (
    <div>
      <div className="sticky top-0 z-20 w-full border-b px-4 py-3">
        <h1 className="capitalize">Admin Dashboard</h1>
      </div>
    </div>
  );
};

export default ProjectAdminPage;
