import { headers } from "next/headers";
import React from "react";
import { checkAuthServer } from "~/lib/auth";
import { ResourceHandler } from "~/components/common";
import SchemaBuilderPage from "./SchemaBuilderPage";

interface Props {
  params: Promise<{
    projectSlug: string;
    orgSlug: string;
    schemaSlug: string;
  }>;
  searchParams: Promise<{
    orgId: string;
  }>;
}

const SchemaBuilderPageHandler: React.FC<Props> = async ({
  params,
  searchParams,
}) => {
  const { projectSlug, orgSlug, schemaSlug } = await params;
  const { orgId } = await searchParams;

  if (!projectSlug || !orgId || !schemaSlug) {
    return <ResourceHandler state="not_found" />;
  }

  const { session } = await checkAuthServer({
    headers: await headers(),
    redirectTo: "/login",
  });

  if (!session) return <ResourceHandler state="loading" />;

  return (
    <SchemaBuilderPage
      projectSlug={projectSlug}
      orgSlug={orgSlug}
      orgId={orgId}
      schemaSlug={schemaSlug}
    />
  );
};

export default SchemaBuilderPageHandler;
