"use client";

import React from "react";
import { ResourceHandler } from "~/components/common";
import { Skeleton } from "~/components/ui/skeleton";
import { AvailableSchemas } from "~/components/dashboard/schema/AvailableSchemas";
import { api } from "~/trpc/react";

interface Props {
  projectSlug: string;
  orgSlug: string;
  orgId: string;
}

const SchemaPage: React.FC<Props> = ({ projectSlug, orgId, orgSlug }) => {
  const { data: response, isLoading } = api.project.getBySlug.useQuery({
    slug: projectSlug,
    orgId,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex w-full flex-col gap-5">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-full max-w-xl" />
          <div className="grid grid-cols-4 gap-5">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!response || response.error) {
    return <ResourceHandler state="not_found" />;
  }

  const project = response.data;

  return (
    <div>
      <AvailableSchemas
        projectId={project.id}
        projectSlug={projectSlug}
        orgSlug={orgSlug}
        orgId={orgId}
        myRole={project.myRole}
      />
    </div>
  );
};

export default SchemaPage;
