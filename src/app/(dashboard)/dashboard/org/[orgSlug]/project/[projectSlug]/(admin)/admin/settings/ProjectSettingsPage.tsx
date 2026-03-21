"use client";

import React from "react";
import { api } from "~/trpc/react";
import { ResourceHandler } from "~/components/common";
import { Skeleton } from "~/components/ui/skeleton";
import {
  ProjectLanguageSettings,
  ProjectExportSettings,
} from "~/components/dashboard/project/settings";

interface Props {
  projectSlug: string;
  orgSlug: string;
  orgId: string;
}

const ProjectSettingsPage: React.FC<Props> = ({ projectSlug, orgId }) => {
  const { data: response, isLoading } = api.project.getBySlug.useQuery({
    slug: projectSlug,
    orgId,
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex w-full flex-col gap-5">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!response?.data || response.error) {
    return <ResourceHandler state="not_found" />;
  }

  const project = response.data;

  return (
    <div>
      <div className="bg-muted sticky top-0 z-20 w-full border-b px-4 py-3">
        <h1 className="font-medium capitalize">Settings</h1>
      </div>

      <div className="flex flex-col gap-6 p-3">
        <ProjectLanguageSettings projectId={project.id} orgId={orgId} />
        <ProjectExportSettings
          projectId={project.id}
          projectSlug={project.slug}
          orgId={orgId}
        />
      </div>
    </div>
  );
};

export default ProjectSettingsPage;
