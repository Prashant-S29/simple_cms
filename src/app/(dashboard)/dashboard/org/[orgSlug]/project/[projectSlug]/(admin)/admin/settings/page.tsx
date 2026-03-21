import { headers } from "next/headers";
import React from "react";
import { checkAuthServer } from "~/lib/auth";
import { ResourceHandler } from "~/components/common";
import ProjectSettingsPage from "./ProjectSettingsPage";

interface Props {
  params: Promise<{ projectSlug: string; orgSlug: string }>;
  searchParams: Promise<{ orgId: string }>;
}

const ProjectSettingsPageHandler: React.FC<Props> = async ({
  params,
  searchParams,
}) => {
  const { projectSlug, orgSlug } = await params;
  const { orgId } = await searchParams;

  if (!projectSlug || !orgId) return <ResourceHandler state="not_found" />;

  const { session } = await checkAuthServer({
    headers: await headers(),
    redirectTo: "/login",
  });

  if (!session) return <ResourceHandler state="loading" />;

  return (
    <ProjectSettingsPage
      projectSlug={projectSlug}
      orgSlug={orgSlug}
      orgId={orgId}
    />
  );
};

export default ProjectSettingsPageHandler;
